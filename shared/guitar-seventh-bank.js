/**
 * ChroMusic — Guitar Seventh Chord Bank
 * =====================================
 * Builds a bank of playable 7th chords across adjacent 4-string sets.
 */

// eslint-disable-next-line no-var
var ChroMusic = window.ChroMusic || {};

try {
(() => {
  'use strict';
  console.log('%c♪ ChroMusic%c guitar-seventh-bank.js loading...', 'color:#9B59B6;font-weight:bold', 'color:#888');

  const GuitarNoteMap = window.ChroMusic?.GuitarNoteMap;
  if (!GuitarNoteMap) {
    throw new Error('GuitarNoteMap is required before GuitarSeventhBank');
  }

  const ROOTS_SHARP = Object.freeze(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
  const ROOTS_FLAT = Object.freeze(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);
  const STRING_SETS = Object.freeze(['1234', '2345', '3456']);
  const SEVENTH_QUALITIES = Object.freeze({
    major7: Object.freeze({ intervals: [0, 4, 7, 11], labels: Object.freeze({ 0: 'R', 4: '3', 7: '5', 11: '7' }) }),
    minor7: Object.freeze({ intervals: [0, 3, 7, 10], labels: Object.freeze({ 0: 'R', 3: 'b3', 7: '5', 10: 'b7' }) }),
    dominant7: Object.freeze({ intervals: [0, 4, 7, 10], labels: Object.freeze({ 0: 'R', 4: '3', 7: '5', 10: 'b7' }) }),
    halfDiminished: Object.freeze({ intervals: [0, 3, 6, 10], labels: Object.freeze({ 0: 'R', 3: 'b3', 6: 'b5', 10: 'b7' }) }),
    diminished7: Object.freeze({ intervals: [0, 3, 6, 9], labels: Object.freeze({ 0: 'R', 3: 'b3', 6: 'b5', 9: 'dim7' }) }),
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
    return SEVENTH_QUALITIES[quality]?.labels?.[distance] || null;
  }

  function inversionFromBassInterval(label) {
    if (label === 'R') return 'root';
    if (label === '3' || label === 'b3') return '1st';
    if (label === '5' || label === 'b5' || label === '#5') return '2nd';
    if (label === '7' || label === 'b7' || label === 'dim7') return '3rd';
    return 'unknown';
  }

  function classifyVoicing(notes) {
    const midiSpan = notes[notes.length - 1].midi - notes[0].midi;
    return midiSpan <= 12 ? 'closed' : 'open';
  }

  function shapeSignature(notes) {
    const frets = notes.map((note) => note.fret);
    const minFret = Math.min(...frets);
    return frets.map((fret) => fret - minFret).join('-');
  }

  function scoreSeventh(notes, inversion, fretSpan, crossesBString) {
    let score = 110;
    if (fretSpan <= 3) score += 22;
    else if (fretSpan === 4) score += 10;
    else score -= 8;

    if (notes.some((note) => note.fret === 0)) score += 4;
    if (inversion === 'root') score += 8;
    if (crossesBString) score -= 1;
    if (notes.some((note) => note.interval === '3' || note.interval === 'b3')) score += 10;
    if (notes.some((note) => note.interval === '7' || note.interval === 'b7' || note.interval === 'dim7')) score += 10;

    const fretMean = notes.reduce((sum, note) => sum + note.fret, 0) / notes.length;
    score -= Math.max(0, fretMean - 12) * 0.5;
    score -= Math.max(0, fretSpan - 3) * 4;
    return Math.max(1, Math.round(score));
  }

  function buildSeventhEntry(rootPc, quality, stringSetKey, selectedNotes) {
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
    const requiredIntervals = new Set(Object.values(SEVENTH_QUALITIES[quality].labels));
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
    const crossesBString = stringSetKey === '1234' || stringSetKey === '2345';
    const playableScore = scoreSeventh(orderedNotes, inversion, fretSpan, crossesBString);

    return Object.freeze({
      id: `seventh-${rootSharp}-${quality}-${stringSetKey}-${inversion}-${shapeSignature(orderedNotes)}-${fretMin}`,
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
    const allChords = [];

    STRING_SETS.forEach((stringSetKey) => {
      const strings = lowToHighStrings(stringSetKey);
      Object.keys(SEVENTH_QUALITIES).forEach((quality) => {
        ROOTS_SHARP.forEach((_, rootPc) => {
          const formula = SEVENTH_QUALITIES[quality].intervals;
          const allowedPitchClasses = new Set(formula.map((interval) => normalizePitchClass(rootPc + interval)));
          const candidatesPerString = strings.map((stringNumber) => (
            GuitarNoteMap.getNotesOnString(stringNumber).filter((note) => allowedPitchClasses.has(note.pitchClass))
          ));

          const entries = [];
          const seen = new Set();
          for (const note1 of candidatesPerString[0]) {
            for (const note2 of candidatesPerString[1]) {
              for (const note3 of candidatesPerString[2]) {
                for (const note4 of candidatesPerString[3]) {
                  const seventh = buildSeventhEntry(rootPc, quality, stringSetKey, [note1, note2, note3, note4]);
                  if (!seventh) continue;
                  const signature = seventh.notes.map((note) => `${note.string}:${note.fret}`).join('|');
                  if (seen.has(signature)) continue;
                  seen.add(signature);
                  entries.push(seventh);
                  allChords.push(seventh);
                }
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
      allChords: Object.freeze(allChords),
      byKey: Object.freeze(byKey),
    });
  }

  const SEVENTH_BANK = buildBank();

  function getSeventhChords(rootName, quality, stringSet, options = {}) {
    const stringSetKey = Array.isArray(stringSet) ? stringSet.join('') : String(stringSet || '');
    const rootPc = normalizeRootName(rootName);
    if (rootPc === null || rootPc < 0) return [];
    const rootSharp = ROOTS_SHARP[rootPc];
    const chords = SEVENTH_BANK.byKey?.[`${rootSharp}:${quality}:${stringSetKey}`] || [];
    return chords.filter((entry) => {
      if (options.maxSpan !== undefined && entry.fretSpan > options.maxSpan) return false;
      if (options.inversion && entry.inversion !== options.inversion) return false;
      if (options.voicingClass && entry.voicingClass !== options.voicingClass) return false;
      if (options.standardRange && entry.standardRange !== options.standardRange) return false;
      return true;
    });
  }

  function getPreferredSeventhChords(rootName, quality, stringSet) {
    const standard = getSeventhChords(rootName, quality, stringSet, { maxSpan: 3 });
    if (standard.length) return standard;
    const extended = getSeventhChords(rootName, quality, stringSet, { maxSpan: 4 });
    if (extended.length) return extended;
    return getSeventhChords(rootName, quality, stringSet, { maxSpan: 5 });
  }

  function getAllSeventhChords() {
    return SEVENTH_BANK.allChords;
  }

  ChroMusic.GuitarSeventhBank = Object.freeze({
    STRING_SETS,
    SEVENTH_QUALITIES,
    seventhBank: SEVENTH_BANK,
    getSeventhChords,
    getPreferredSeventhChords,
    getAllSeventhChords,
  });

  window.ChroMusic = ChroMusic;
  console.log('%c♪ ChroMusic%c guitar-seventh-bank.js loaded ✓', 'color:#9B59B6;font-weight:bold', 'color:#2ecc71');
})();
} catch (e) {
  console.error('[ChroMusic] guitar-seventh-bank.js FAILED:', e);
}
