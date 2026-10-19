# Chord Book Audit

This audit re-checked all 145 pages of `chord-book.pdf` after the chord-book catalog was added.

## Method

1. Extract full PDF text page-by-page.
2. Re-scan each page with the project normalization pipeline from `ChordParser`.
3. Compare detected canonical chord symbols against `ChordBookCatalog.CHORD_SYMBOLS`.
4. Validate each catalogued chord symbol against `GuitarFingeringEngine.findChordFingerings(...)`.

## Results

- Total PDF pages inspected: 145
- Pages with chord content detected after normalization: 128
- Book layout now mapped as 12 root blocks: A, Bb, B, C, Db, D, Eb, E, F, Gb, G, Ab
- No extra canonical chord symbols were found outside the mapped catalog.
- All catalogued symbols currently resolve through the guitar engine.
- Late-book special chords explicitly added after second pass:
	- `Badd4` from page 141
	- `Emaj9` from page 142

## Catalog coverage summary

- Catalog size: 326 supported chord symbols
- Engine-resolved symbols: 326 / 326
- Unresolved symbols after fallback pass: 0

## Notes

- The PDF text extraction is noisy on some pages because the source is image-heavy and OCR spacing is inconsistent.
- Several pages use textual forms such as “Major 7”, “Minor 11”, or spaced tokens like `B 7 9`; these are normalized into the catalog’s canonical symbols.
- The remaining non-detected pages are primarily front matter, instructions, tips, page references, or pages where OCR is too degraded to recover clean chord tokens directly.

## Current canonical families in catalog

- major
- sus2
- add9
- sus4
- 6
- 6/9
- maj7
- 7
- 7sus4
- 7#5
- 7b5
- 7#9
- 7b9
- 9
- 11
- 13
- aug
- minor
- m6
- m7
- m7b5
- m9
- mMaj7
- m11
- m13
- dim
- dim7

## Special explicit symbols from late pages

- `Badd4`
- `Emaj9`
