/**
 * ChroMusic — Guitar Advanced Voicing Bank
 * =======================================
 * Curated bank of practical extended / altered guitar voicings derived
 * from the descriptor library and materialized into concrete fretboard shapes.
 */

// eslint-disable-next-line no-var
var ChroMusic = window.ChroMusic || {};

try {
(() => {
  'use strict';
  console.log('%c♪ ChroMusic%c guitar-advanced-bank.js loading...', 'color:#9B59B6;font-weight:bold', 'color:#888');

  const VoicingLibrary = window.ChroMusic?.VoicingLibrary;
  if (!VoicingLibrary) {
    throw new Error('VoicingLibrary is required before GuitarAdvancedBank');
  }

  const OPEN_MIDI = Object.freeze([40, 45, 50, 55, 59, 64]);
  const STRING_TO_INDEX = Object.freeze({ 6: 0, 5: 1, 4: 2, 3: 3, 2: 4, 1: 5 });
  const POSITION_TARGETS = Object.freeze({ low: 3, mid: 8, high: 12 });
  const NOTE_SHARP = Object.freeze(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
  const NOTE_FLAT = Object.freeze(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);
  const FLAT_ROOTS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Fb', 'Cb']);
  const ADVANCED_FAMILIES = Object.freeze([
    'add9',
    'major6',
    'major9Sharp11',
    'major7Sharp5',
    'minor6',
    'halfDiminished11',
    'minorMajor7',
    'minorMajor9',
    'major11',
    'major13',
    'major9',
    'minor11',
    'minor13',
    'minor9',
    'dominant13',
    'dominantAlt',
    'dominantFlat5',
    'dominantSharp5',
    'dominantSharp11',
    'dominantFlat13',
    'dominantFlatNine',
    'dominantSharpNine',
    'majorSharp11',
  ]);

  function noteNames(rootName) {
    return (FLAT_ROOTS.has(rootName) || String(rootName || '').endsWith('b')) ? NOTE_FLAT : NOTE_SHARP;
  }

  function midiToNoteName(midi, names) {
    const pitchClass = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return `${names[pitchClass]}${octave}`;
  }

  function noteNameToPitchClass(rootName) {
    const normalized = String(rootName || '').trim();
    if (!normalized) return null;
    const sharpIndex = NOTE_SHARP.indexOf(normalized);
    if (sharpIndex >= 0) return sharpIndex;
    const flatIndex = NOTE_FLAT.indexOf(normalized);
    return flatIndex >= 0 ? flatIndex : null;
  }

  /**
   * Semitone distance from root for each interval label.
   * Primary labels are listed first; aliases follow.
   */
  const SLOT_SEMITONES = Object.freeze({
    R: 0, root: 0,
    b2: 1, b9: 1,
    2: 2, 9: 2,
    'b3': 3, '#2': 3, '#9': 3,
    3: 4,
    4: 5, 11: 5,
    'b5': 6, '#4': 6, '#11': 6,
    5: 7,
    '#5': 8, 'b6': 8, 'b13': 8,
    6: 9, 13: 9, dim7: 9,
    'b7': 10,
    7: 11,
  });

  function slotSemitones(label) {
    const key = String(label || '').trim();
    if (Object.prototype.hasOwnProperty.call(SLOT_SEMITONES, key)) return SLOT_SEMITONES[key];
    // numeric fallback
    const n = Number(key);
    return Number.isFinite(n) ? n % 12 : null;
  }

  /**
   * Return the fret on `targetStringIndex` that sounds `intervalSemitones` above
   * the root note located at `rootFret` on `rootStringIndex`.
   * Chooses the octave closest to rootFret while staying in [0, 24].
   */
  function computeFretFromInterval(rootFret, rootStringIndex, targetStringIndex, intervalSemitones) {
    if (intervalSemitones === null || intervalSemitones === undefined) return null;
    // base fret (may be outside [0,24] before octave adjustment)
    let fret = rootFret + intervalSemitones + (OPEN_MIDI[rootStringIndex] - OPEN_MIDI[targetStringIndex]);
    // adjust by whole octaves to land as close to rootFret as possible
    const anchor = rootFret;
    while (fret < anchor - 6) fret += 12;
    while (fret > anchor + 7) fret -= 12;
    // clamp to fretboard
    if (fret < 0) fret += 12;
    if (fret > 24) fret -= 12;
    if (fret < 0 || fret > 24) return null;
    return fret;
  }

  function pickSlotLabel(slot) {
    if (Array.isArray(slot)) return slot.find(Boolean) || null;
    return slot || null;
  }

  /**
   * Assign finger numbers 1-4 based on sorted unique fret positions.
   * All notes sharing the same fret get the same finger (barre semantics).
   * Variants with > 4 distinct fret levels are considered unplayable.
   */
  function assignFingerNumbers(positions) {
    const fretted = positions.filter((position) => typeof position.fret === 'number' && position.fret > 0);
    const uniqueFrets = [...new Set(fretted.map((p) => p.fret))].sort((a, b) => a - b);
    // more than 4 unique fret levels → unplayable, mark all 0
    if (uniqueFrets.length > 4) {
      return positions.map((p) => ({ ...p, finger: 0 }));
    }
    const fretToFinger = new Map(uniqueFrets.map((fret, i) => [fret, i + 1]));
    return positions.map((position) => {
      if (typeof position.fret !== 'number' || position.fret <= 0) {
        return { ...position, finger: 0 };
      }
      return { ...position, finger: fretToFinger.get(position.fret) ?? 0 };
    });
  }

  function classifyNeckPosition(startFret) {
    if (startFret <= 4) return 'low';
    if (startFret >= 10) return 'high';
    return 'mid';
  }

  function scoreVariant(positions, descriptor, family) {
    const fretted = positions.filter((position) => typeof position.fret === 'number');
    if (!fretted.length) return 0;

    const frets = fretted.map((position) => position.fret);
    const intervals = new Set(fretted.map((position) => position.interval).filter(Boolean));
    const span = Math.max(...frets) - Math.min(...frets);
    const avgFret = frets.reduce((sum, fret) => sum + fret, 0) / frets.length;

    let score = 124;
    score -= span * 5;
    score -= Math.max(0, avgFret - 12) * 0.8;
    if (descriptor.voicingType === 'shell') score += 18;
    if (descriptor.voicingType === 'rootless') score += 15;
    if (descriptor.voicingType === 'drop2') score += 12;
    if (intervals.has('3') || intervals.has('b3')) score += 12;
    if (intervals.has('7') || intervals.has('b7')) score += 12;
    if (intervals.has('9') || intervals.has('b9') || intervals.has('#9')) score += 8;
    if (intervals.has('13') || intervals.has('b13')) score += 6;
    if (intervals.has('#11')) score += 5;
    if (family === 'dominantAlt') score += 6;
    if (Math.min(...frets) <= 5) score += 8;
    return Math.max(1, Math.round(score));
  }

  function buildVariantFromDescriptor(rootName, family, descriptor, neckPosition) {
    if (!Array.isArray(descriptor?.pattern) || !descriptor.pattern.length) return null;

    const rootPc = noteNameToPitchClass(rootName);
    if (rootPc === null) return null;

    const names = noteNames(rootName);
    const rootStringIndex = STRING_TO_INDEX[descriptor.rootString];
    if (rootStringIndex === undefined) return null;

    const rootOpenPc = OPEN_MIDI[rootStringIndex] % 12;
    const target = POSITION_TARGETS[neckPosition] ?? POSITION_TARGETS.mid;
    let rootFret = (rootPc - rootOpenPc + 12) % 12;
    while (rootFret < target - 2) rootFret += 12;
    while (rootFret > target + 5 && rootFret - 12 >= 0) rootFret -= 12;
    if (rootFret > 19) rootFret -= 12;
    if (rootFret < 0) rootFret += 12;

    const positionsMap = new Map();
    descriptor.pattern.forEach((entry, index) => {
      const interval = pickSlotLabel(entry.slot || entry.label || descriptor.slots?.[index]);
      if (!interval) return;
      const targetStringIndex = STRING_TO_INDEX[entry.string];
      if (targetStringIndex === undefined) return;
      // Use interval label to derive the correct fret (ignores stale entry.offset)
      const n = slotSemitones(interval);
      const fret = (n !== null)
        ? computeFretFromInterval(rootFret, rootStringIndex, targetStringIndex, n)
        : (rootFret + (entry.offset || 0)); // fallback for unknown labels
      if (fret === null || fret < 0 || fret > 24) return;
      const midi = OPEN_MIDI[targetStringIndex] + fret;
      positionsMap.set(entry.string, {
        string: entry.string,
        fret,
        note: midiToNoteName(midi, names),
        interval,
        finger: null, // will be assigned by assignFingerNumbers
      });
    });

    if (!positionsMap.size) return null;

    const positions = [6, 5, 4, 3, 2, 1].map((stringNumber) => positionsMap.get(stringNumber) || {
      string: stringNumber,
      fret: 'X',
      note: '',
      interval: '',
      finger: 0,
    });

    const fretted = positions.filter((position) => typeof position.fret === 'number');
    if (!fretted.length) return null;

    const fretValues = fretted.map((position) => position.fret);
    const startFret = Math.max(1, Math.min(...fretValues));
    const fretSpan = Math.max(...fretValues) - Math.min(...fretValues);
    if (fretSpan > 5) return null;

    const normalizedPositions = assignFingerNumbers(positions);
    // Reject unplayable variants (> 4 unique fret levels → all fingers set to 0)
    const allFingersZero = normalizedPositions
      .filter((p) => typeof p.fret === 'number' && p.fret > 0)
      .every((p) => p.finger === 0);
    if (allFingersZero && fretted.length > 0) return null;

    // Detect barres: any fret > 0 that is shared by 2+ non-adjacent strings
    const barreFrets = [...new Set(fretted.filter((p) => p.fret > 0 && p.fret === startFret).map((p) => p.fret))];
    const barres = barreFrets.length && fretted.filter((p) => p.fret === barreFrets[0]).length >= 2
      ? [Object.freeze({ fret: barreFrets[0], fromString: Math.max(...fretted.filter((p) => p.fret === barreFrets[0]).map((p) => p.string)), toString: Math.min(...fretted.filter((p) => p.fret === barreFrets[0]).map((p) => p.string)) })]
      : [];

    return Object.freeze({
      id: `advanced-${rootName}-${family}-${descriptor.rootString}-${descriptor.voicingType}-${neckPosition}-${startFret}`,
      source: 'advanced-bank',
      family,
      label: `${descriptor.rootString}th string • ${descriptor.voicingType} • ${neckPosition}`,
      root: rootName,
      rootString: descriptor.rootString,
      voicingType: descriptor.voicingType,
      neckPosition: classifyNeckPosition(startFret),
      intervals: Object.freeze([...new Set(normalizedPositions.map((position) => position.interval).filter(Boolean))]),
      tuning: Object.freeze(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']),
      startFret,
      fretSpan,
      playableScore: scoreVariant(normalizedPositions, descriptor, family),
      positions: Object.freeze(normalizedPositions.map((position) => Object.freeze(position))),
      barres: Object.freeze(barres),
    });
  }

  function buildBank() {
    const byKey = {};
    const allVariants = [];

    ADVANCED_FAMILIES.forEach((family) => {
      const descriptors = (VoicingLibrary.getGuitarDescriptors?.(family) || [])
        .filter((descriptor) => Array.isArray(descriptor.pattern) && descriptor.pattern.length);

      NOTE_SHARP.forEach((rootSharp, index) => {
        const rootFlat = NOTE_FLAT[index];
        const variants = [];
        descriptors.forEach((descriptor) => {
          const positions = Array.isArray(descriptor.positions) && descriptor.positions.length
            ? descriptor.positions
            : ['mid'];
          positions.forEach((neckPosition) => {
            const variant = buildVariantFromDescriptor(rootSharp, family, descriptor, neckPosition);
            if (variant) {
              variants.push(variant);
              allVariants.push(variant);
            }
          });
        });

        variants.sort((a, b) => b.playableScore - a.playableScore || a.startFret - b.startFret || a.fretSpan - b.fretSpan);
        byKey[`${rootSharp}:${family}`] = Object.freeze(variants);
        if (rootFlat !== rootSharp) {
          byKey[`${rootFlat}:${family}`] = Object.freeze(variants);
        }
      });
    });

    return Object.freeze({
      byKey: Object.freeze(byKey),
      allVariants: Object.freeze(allVariants),
    });
  }

  const ADVANCED_BANK = buildBank();

  function getVariants(rootName, family, options = {}) {
    const variants = ADVANCED_BANK.byKey[`${rootName}:${family}`] || [];
    return variants.filter((variant) => {
      if (options.rootString && Number(options.rootString) !== Number(variant.rootString)) return false;
      if (options.voicingType && options.voicingType !== variant.voicingType) return false;
      if (options.neckPosition && options.neckPosition !== variant.neckPosition) return false;
      if (Number.isFinite(options.maxSpan) && variant.fretSpan > options.maxSpan) return false;
      return true;
    });
  }

  function getFamilies() {
    return ADVANCED_FAMILIES;
  }

  function getAllVariants() {
    return ADVANCED_BANK.allVariants;
  }

  ChroMusic.GuitarAdvancedBank = Object.freeze({
    ADVANCED_FAMILIES,
    advancedBank: ADVANCED_BANK,
    getFamilies,
    getVariants,
    getAllVariants,
  });

  window.ChroMusic = ChroMusic;
  console.log('%c♪ ChroMusic%c guitar-advanced-bank.js loaded ✓', 'color:#9B59B6;font-weight:bold', 'color:#2ecc71');
})();
} catch (e) {
  console.error('[ChroMusic] guitar-advanced-bank.js FAILED:', e);
}
