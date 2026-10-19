# ChroMusic — Guitar Fingering Correctness Plan

## Problem Statement

The advanced voicing bank (`guitar-advanced-bank.js`) generates **wrong fret positions and wrong fingering numbers** for every chord family. Chords look unplayable because the underlying math is fundamentally broken.

### Root Cause: offset ≠ interval

The current `buildVariantFromDescriptor` function computes each string's fret as:

```js
fret = rootFret + entry.offset
```

This silently assumes that the **same offset value produces the same interval on every string**, which is false. Guitar strings are tuned in 4ths (EADGBE = 40,45,50,55,59,64 MIDI). A fret-offset of `0` on string 4 relative to the root on string 6 is:

```
interval = (50 − 40 + 0) % 12 = 10 semitones = ♭7
```

But the pattern label says `'5'` (7 semitones). The displayed interval is wrong; the fingering shape is wrong.

**Only the advanced-bank is affected.** The triad bank and seventh bank enumerate actual fret positions per string and filter by pitch class — they produce correct notes.

---

## Correct Formula

### Fret from interval

For root on string `rs` at `rootFret`, the fret that produces interval `n` semitones on target string `ts` is:

```
fret = rootFret + n + (OPEN_MIDI[rs] − OPEN_MIDI[ts]) + 12k
```

Choose integer `k` so that `fret` is in `[0, 24]` and as close to `rootFret` as possible (prefer same neck locality).

### Open MIDI table

| String | Number | Open MIDI |
|--------|--------|-----------|
| Low E  | 6      | 40        |
| A      | 5      | 45        |
| D      | 4      | 50        |
| G      | 3      | 55        |
| B      | 2      | 59        |
| High e | 1      | 64        |

### Interval semitone table

| Label      | Semitones |
|------------|-----------|
| R          | 0         |
| b9 / b2    | 1         |
| 9 / 2      | 2         |
| #9 / b3    | 3         |
| 3          | 4         |
| 11 / 4     | 5         |
| #11 / b5   | 6         |
| 5          | 7         |
| #5 / b13   | 8         |
| 6 / 13     | 9         |
| dim7       | 9         |
| b7         | 10        |
| 7          | 11        |

---

## Finger Number Assignment

### Current (wrong) algorithm

```js
finger = clamp(fret − minFret + 1, 1, 4)
```

Assigns finger 1 to every note at the minimum fret, finger 2 to every note one fret higher, etc. This breaks when:
- Multiple notes share the same fret across non-adjacent strings (needs barre detection)
- Notes skip frets (e.g., frets 3,5,7 → must use fingers 1,3,4 not 1,2,3)
- Standard jazz voicings use specific finger disciplines

### Correct algorithm

1. Collect all fretted notes (fret > 0).
2. Get sorted unique fret values: `[f1, f2, f3, f4]`.
3. Map each unique fret to a finger number 1-4 in ascending order.
4. All notes sharing the same fret get the same finger (barre or partial barre).
5. If only 1 unique fret → finger 1 is a full barre.
6. If entries exceed 4 unique frets → flag as `unplayable` and omit.
7. Cap: never assign finger > 4.

### Example: Dm9 on strings 6-4-3-2-1 at frets 10-10-10-10-12

- Unique frets: [10, 12]
- f10 → finger 1 (barre across strings 6,4,3,2)
- f12 → finger 3 or 4 (pinky on string 1)
- Result: barre + pinky. Very playable.

---

## Implementation Changes

### 1. `guitar-advanced-bank.js` — `buildVariantFromDescriptor`

Replace:
```js
const fret = rootFret + (entry.offset || 0);
```
With:
```js
const fret = computeFretFromInterval(rootFret, rootStringIndex, STRING_TO_INDEX[entry.string], slotSemitones);
```
Where `computeFretFromInterval` uses the formula above and the `SLOT_SEMITONES` lookup table.

### 2. `guitar-advanced-bank.js` — `assignFingerNumbers`

Replace the round-robin approach with:
- Collect unique frets → sort ascending → map to fingers 1-4
- Reject variants with > 4 unique fret levels

### 3. `voicing-library.js` — pattern `offset` fields

After fixing the engine, the `offset` fields in descriptor patterns become irrelevant
(the engine ignores them and computes from slot labels). They can be left as-is or cleaned up.

The slot labels (`'R'`, `'b7'`, `'3'`, etc.) are correct in the library — only the
offset numbers were wrong. **No slot label changes needed.**

---

## Expected Results (After Fix)

All families should produce real, sounding jazz guitar chords:

| Chord     | Family          | Expected shape (C root, string 5)         |
|-----------|-----------------|-------------------------------------------|
| Cmaj7     | major7          | frets 3-2-4-5 (strings 5-4-3-2)          |
| Cm7       | minor7          | frets 3-5-4-3 (strings 5-4-3-2)          |
| C7        | dominant        | frets 3-2-3-2 (strings 5-4-3-2)          |
| Cm7b5     | halfDiminished  | frets 3-4-3-4 (strings 5-4-3-2)          |
| Cdim7     | diminished7     | frets 3-4-2-4 (strings 5-4-3-2)          |
| Cmaj9     | major9          | frets 3-2-4-3 (strings 5-4-3-2)          |
| Cm9       | minor9          | frets 3-5-4-3-5 (strings 5-4-3-2-1)      |
| C13       | dominant13      | frets 3-2-2-2 (strings 5-4-3-2)          |
| C7alt     | dominantAlt     | rootless 3-2-1-2 (strings 4-3-2-1)       |

---

## Validation After Fix

Run smoke test with:
```
Cmaj7  Cm7  C7  Cm7b5  Cdim7  Cmaj9  Cm9  C13  C7alt  C7#11  C7#5  Cmaj9#11  Bm11b5
```

Expected: all families classified correctly, all fret spans ≤ 5, all finger counts ≤ 4.

---

## Files Changed

| File                          | Change                                              |
|-------------------------------|-----------------------------------------------------|
| `shared/guitar-advanced-bank.js` | Fix `buildVariantFromDescriptor` + `assignFingerNumbers` |
| `docs/GUITAR_FINGERING_CORRECTNESS_PLAN.md` | This document |
