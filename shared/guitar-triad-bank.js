/**
 * ChroMusic — Guitar Triad Bank
 * =============================
 * Builds a bank of playable triads across 123 / 234 / 345 / 456 string sets.
 */

// eslint-disable-next-line no-var
var ChroMusic = window.ChroMusic || {};

try {
(() => {
  'use strict';
  console.log('%c♪ ChroMusic%c guitar-triad-bank.js loading...', 'color:#9B59B6;font-weight:bold', 'color:#888');

  const GuitarNoteMap = window.ChroMusic?.GuitarNoteMap;
  if (!GuitarNoteMap) {
    throw new Error('GuitarNoteMap is required before GuitarTriadBank');
  }

  const ROOTS_SHARP = Object.freeze(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
  const ROOTS_FLAT = Object.freeze(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);
  const STRING_SETS = Object.freeze(['123', '234', '345', '456']);
  const TRIAD_QUALITIES = Object.freeze({
    major: Object.freeze({ intervals: [0, 4, 7], labels: Object.freeze({ 0: 'R', 4: '3', 7: '5' }) }),
    minor: Object.freeze({ intervals: [0, 3, 7], labels: Object.freeze({ 0: 'R', 3: 'b3', 7: '5' }) }),
    diminished: Object.freeze({ intervals: [0, 3, 6], labels: Object.freeze({ 0: 'R', 3: 'b3', 6: 'b5' }) }),
    augmented: Object.freeze({ intervals: [0, 4, 8], labels: Object.freeze({ 0: 'R', 4: '3', 8: '#5' }) }),
  });

  function normalizePitchClass(value) {
    return GuitarNoteMap.normalizePitchClass(value);
  }

  function normalizeRootName(rootName) {
    const canonical = GuitarNoteMap.normalizeNoteName(rootName);
    if (!canonical) return null;
    const foundIndex = ROOTS_SHARP.indexOf(canonical);
    return foundIndex >= 0 ? foundIndex : ROOTS_SHARP.indexOf(ROOTS_FLAT.find((name) => GuitarNoteMap.normalizeNoteName(name) === canonical));
  }

  function lowToHighStrings(stringSetKey) {
    return String(stringSetKey).split('').map(Number).sort((a, b) => b - a);
  }

  function intervalLabelForPc(rootPc, notePc, quality) {
    const distance = normalizePitchClass(notePc - rootPc);
    return TRIAD_QUALITIES[quality]?.labels?.[distance] || null;
  }

  function inversionFromBassInterval(label) {
    if (label === 'R') return 'root';
    if (label === '3' || label === 'b3') return '1st';
    if (label === '5' || label === 'b5' || label === '#5') return '2nd';
    return 'unknown';
  }

  function classifyVoicing(notes) {
    const midiSpan = notes[notes.length - 1].midi - notes[0].midi;
    const intervalChain = notes.map((note) => note.interval).join('-');
    const closedShapes = new Set(['R-3-5', 'R-b3-5', 'R-b3-b5', 'R-3-#5', '3-5-R', 'b3-5-R', 'b3-b5-R', '3-#5-R', '5-R-3', '5-R-b3', 'b5-R-b3', '#5-R-3']);
    return closedShapes.has(intervalChain) && midiSpan <= 12 ? 'closed' : 'open';
  }

  function shapeSignature(notes) {
    const frets = notes.map((note) => note.fret);
    const minFret = Math.min(...frets);
    return frets.map((fret) => fret - minFret).join('-');
  }

  function scoreTriad(notes, inversion, fretSpan, crossesBString) {
    let score = 100;
    if (fretSpan <= 3) score += 18;
    else if (fretSpan === 4) score += 6;
    else score -= 10;

    if (notes.some((note) => note.fret === 0)) score += 3;
    if (inversion === 'root') score += 10;
    if (crossesBString) score -= 1;

    const fretMean = notes.reduce((sum, note) => sum + note.fret, 0) / notes.length;
    score -= Math.max(0, fretMean - 12) * 0.5;
    score -= Math.max(0, fretSpan - 3) * 4;

    const repeatedFrets = new Set();
    notes.forEach((note) => {
      if (note.fret > 0 && notes.filter((candidate) => candidate.fret === note.fret).length > 1) repeatedFrets.add(note.fret);
    });
    if (repeatedFrets.size) score += 2;

    return Math.max(1, Math.round(score));
  }

  function buildTriadEntry(rootPc, quality, stringSetKey, selectedNotes) {
    const orderedNotes = selectedNotes.slice().sort((a, b) => a.midi - b.midi).map((note) => ({
      string: note.string,
      fret: note.fret,
      midi: note.midi,
      note: note.scientific,
      sharpName: note.sharpName,
      flatName: note.flatName,
      pitchClass: note.pitchClass,
      interval: intervalLabelForPc(rootPc, note.pitchClass, quality),
    }));

    const intervalsPresent = new Set(orderedNotes.map((note) => note.interval));
    const requiredIntervals = new Set(Object.values(TRIAD_QUALITIES[quality].labels));
    if (intervalsPresent.size !== requiredIntervals.size) return null;
    for (const required of requiredIntervals) {
      if (!intervalsPresent.has(required)) return null;
    }

    const frets = orderedNotes.map((note) => note.fret);
    const fretMin = Math.min(...frets);
    const fretMax = Math.max(...frets);
    const fretSpan = fretMax - fretMin;
    if (fretSpan > 5) return null;

    const inversion = inversionFromBassInterval(orderedNotes[0].interval);
    const voicingClass = classifyVoicing(orderedNotes);
    const rootSharp = ROOTS_SHARP[rootPc];
    const rootFlat = ROOTS_FLAT[rootPc];
    const crossesBString = stringSetKey === '123' || stringSetKey === '234';
    const playableScore = scoreTriad(orderedNotes, inversion, fretSpan, crossesBString);

    return Object.freeze({
      id: `triad-${rootSharp}-${quality}-${stringSetKey}-${inversion}-${shapeSignature(orderedNotes)}-${fretMin}`,
      root: rootSharp,
      rootSharp,
      rootFlat,
      rootPitchClass: rootPc,
      quality,
      stringSet: stringSetKey.split('').map(Number),
      lowToHighStrings: lowToHighStrings(stringSetKey),
      inversion,
      voicingClass,
      notes: Object.freeze(orderedNotes.map((note) => Object.freeze(note))),
      fretMin,
      fretMax,
      fretSpan,
      playableScore,
      crossesBString,
      familyShape: `${quality}:${stringSetKey}:${inversion}:${shapeSignature(orderedNotes)}`,
      shapeSignature: shapeSignature(orderedNotes),
      standardRange: fretSpan <= 3 ? 'standard' : (fretSpan === 4 ? 'extended' : 'rare'),
    });
  }

  function buildBank() {
    const byKey = {};
    const allTriads = [];

    STRING_SETS.forEach((stringSetKey) => {
      const strings = lowToHighStrings(stringSetKey);
      Object.keys(TRIAD_QUALITIES).forEach((quality) => {
        ROOTS_SHARP.forEach((_, rootPc) => {
          const formula = TRIAD_QUALITIES[quality].intervals;
          const allowedPitchClasses = new Set(formula.map((interval) => normalizePitchClass(rootPc + interval)));
          const candidatesPerString = strings.map((stringNumber) => {
            return GuitarNoteMap.getNotesOnString(stringNumber).filter((note) => allowedPitchClasses.has(note.pitchClass));
          });

          const entries = [];
          const seen = new Set();
          for (const note1 of candidatesPerString[0]) {
            for (const note2 of candidatesPerString[1]) {
              for (const note3 of candidatesPerString[2]) {
                const triad = buildTriadEntry(rootPc, quality, stringSetKey, [note1, note2, note3]);
                if (!triad) continue;
                const signature = triad.notes.map((note) => `${note.string}:${note.fret}`).join('|');
                if (seen.has(signature)) continue;
                seen.add(signature);
                entries.push(triad);
                allTriads.push(triad);
              }
            }
          }

          entries.sort((a, b) => b.playableScore - a.playableScore || a.fretMin - b.fretMin || a.fretSpan - b.fretSpan);
          byKey[`${ROOTS_SHARP[rootPc]}:${quality}:${stringSetKey}`] = Object.freeze(entries);
          if (ROOTS_FLAT[rootPc] !== ROOTS_SHARP[rootPc]) {
            byKey[`${ROOTS_FLAT[rootPc]}:${quality}:${stringSetKey}`] = Object.freeze(entries);
          }
        });
      });
    });

    return Object.freeze({
      allTriads: Object.freeze(allTriads),
      byKey: Object.freeze(byKey),
    });
  }

  const TRIAD_BANK = buildBank();

  function getTriads(rootName, quality, stringSet, options = {}) {
    const stringSetKey = Array.isArray(stringSet) ? stringSet.join('') : String(stringSet || '');
    const rootPc = normalizeRootName(rootName);
    if (rootPc === null || rootPc < 0) return [];
    const rootSharp = ROOTS_SHARP[rootPc];
    const triads = TRIAD_BANK.byKey?.[`${rootSharp}:${quality}:${stringSetKey}`] || [];
    return triads.filter((entry) => {
      if (options.maxSpan !== undefined && entry.fretSpan > options.maxSpan) return false;
      if (options.inversion && entry.inversion !== options.inversion) return false;
      if (options.voicingClass && entry.voicingClass !== options.voicingClass) return false;
      if (options.standardRange && entry.standardRange !== options.standardRange) return false;
      return true;
    });
  }

  function getPreferredTriads(rootName, quality, stringSet) {
    const standard = getTriads(rootName, quality, stringSet, { maxSpan: 3 });
    if (standard.length) return standard;
    const extended = getTriads(rootName, quality, stringSet, { maxSpan: 4 });
    if (extended.length) return extended;
    return getTriads(rootName, quality, stringSet, { maxSpan: 5 });
  }

  function getAllTriads() {
    return TRIAD_BANK.allTriads;
  }

  ChroMusic.GuitarTriadBank = Object.freeze({
    STRING_SETS,
    TRIAD_QUALITIES,
    triadBank: TRIAD_BANK,
    getTriads,
    getPreferredTriads,
    getAllTriads,
  });

  window.ChroMusic = ChroMusic;
  console.log('%c♪ ChroMusic%c guitar-triad-bank.js loaded ✓', 'color:#9B59B6;font-weight:bold', 'color:#2ecc71');
})();
} catch (e) {
  console.error('[ChroMusic] guitar-triad-bank.js FAILED:', e);
}
