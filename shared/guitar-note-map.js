/**
 * ChroMusic — Guitar Note Map
 * ===========================
 * Builds a complete 24-fret note map for standard guitar tuning.
 */

// eslint-disable-next-line no-var
var ChroMusic = window.ChroMusic || {};

try {
(() => {
  'use strict';
  console.log('%c♪ ChroMusic%c guitar-note-map.js loading...', 'color:#9B59B6;font-weight:bold', 'color:#888');

  const MusicTheory = window.ChroMusic?.MusicTheory;
  const STANDARD_TUNING = MusicTheory?.STANDARD_TUNING || [
    { string: 6, note: 'E2', midi: 40 },
    { string: 5, note: 'A2', midi: 45 },
    { string: 4, note: 'D3', midi: 50 },
    { string: 3, note: 'G3', midi: 55 },
    { string: 2, note: 'B3', midi: 59 },
    { string: 1, note: 'E4', midi: 64 },
  ];

  const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const ENHARMONIC_GROUPS = Object.freeze({
    0: Object.freeze(['C', 'B#', 'Dbb']),
    1: Object.freeze(['C#', 'Db', 'B##']),
    2: Object.freeze(['D', 'C##', 'Ebb']),
    3: Object.freeze(['D#', 'Eb', 'Fbb']),
    4: Object.freeze(['E', 'Fb', 'D##']),
    5: Object.freeze(['F', 'E#', 'Gbb']),
    6: Object.freeze(['F#', 'Gb', 'E##']),
    7: Object.freeze(['G', 'F##', 'Abb']),
    8: Object.freeze(['G#', 'Ab']),
    9: Object.freeze(['A', 'G##', 'Bbb']),
    10: Object.freeze(['A#', 'Bb', 'Cbb']),
    11: Object.freeze(['B', 'Cb', 'A##']),
  });
  const FRET_COUNT = 24;
  const B_STRING_BREAK_SETS = new Set(['123', '234']);

  function normalizePitchClass(value) {
    return ((Number(value) % 12) + 12) % 12;
  }

  function midiToScientific(midi) {
    const pitchClass = normalizePitchClass(midi);
    const octave = Math.floor(midi / 12) - 1;
    return `${SHARP_NAMES[pitchClass]}${octave}`;
  }

  function normalizeNoteName(name) {
    if (!name || typeof name !== 'string') return null;
    const trimmed = name.trim();
    const canonical = MusicTheory?.ENHARMONIC_MAP?.[trimmed] || MusicTheory?.ENHARMONIC_MAP?.[trimmed[0]?.toUpperCase() + trimmed.slice(1)] || null;
    return canonical || trimmed;
  }

  function buildNoteCell(openString, fret) {
    const midi = openString.midi + fret;
    const pitchClass = normalizePitchClass(midi);
    const octave = Math.floor(midi / 12) - 1;
    return Object.freeze({
      string: openString.string,
      fret,
      midi,
      pitchClass,
      sharpName: SHARP_NAMES[pitchClass],
      flatName: FLAT_NAMES[pitchClass],
      enharmonicGroup: ENHARMONIC_GROUPS[pitchClass],
      octave,
      scientific: `${SHARP_NAMES[pitchClass]}${octave}`,
      intervalFromOpenString: fret,
      openStringNote: openString.note,
      openStringMidi: openString.midi,
    });
  }

  function buildMap() {
    const byString = {};
    const byPitchClass = {};
    const byName = {};
    const allNotes = [];

    for (let pc = 0; pc < 12; pc++) byPitchClass[pc] = [];

    STANDARD_TUNING.forEach((openString) => {
      byString[openString.string] = [];
      for (let fret = 0; fret <= FRET_COUNT; fret++) {
        const cell = buildNoteCell(openString, fret);
        byString[openString.string][fret] = cell;
        byPitchClass[cell.pitchClass].push(cell);
        allNotes.push(cell);

        const aliases = new Set([cell.sharpName, cell.flatName, ...cell.enharmonicGroup]);
        aliases.forEach((alias) => {
          byName[alias] = byName[alias] || [];
          byName[alias].push(cell);
        });
      }
      byString[openString.string] = Object.freeze(byString[openString.string]);
    });

    Object.keys(byPitchClass).forEach((pc) => {
      byPitchClass[pc] = Object.freeze(byPitchClass[pc].slice());
    });
    Object.keys(byName).forEach((name) => {
      byName[name] = Object.freeze(byName[name].slice());
    });

    return Object.freeze({
      tuning: Object.freeze(STANDARD_TUNING.map((entry) => Object.freeze({ ...entry }))),
      fretCount: FRET_COUNT,
      byString: Object.freeze(byString),
      byPitchClass: Object.freeze(byPitchClass),
      byName: Object.freeze(byName),
      allNotes: Object.freeze(allNotes),
    });
  }

  const NOTE_MAP = buildMap();

  function getAllNotes() {
    return NOTE_MAP.allNotes;
  }

  function getNoteAt(stringNumber, fret) {
    return NOTE_MAP.byString?.[stringNumber]?.[fret] || null;
  }

  function getNotesOnString(stringNumber) {
    return NOTE_MAP.byString?.[stringNumber] || [];
  }

  function getOccurrencesByPitchClass(pitchClass) {
    return NOTE_MAP.byPitchClass?.[normalizePitchClass(pitchClass)] || [];
  }

  function getOccurrencesByName(name) {
    const normalized = normalizeNoteName(name);
    return (normalized && NOTE_MAP.byName?.[normalized]) || NOTE_MAP.byName?.[name] || [];
  }

  function getOpenString(stringNumber) {
    return STANDARD_TUNING.find((entry) => entry.string === stringNumber) || null;
  }

  function getStringSetInfo(stringSet) {
    const key = Array.isArray(stringSet) ? [...stringSet].sort((a, b) => a - b).join('') : String(stringSet || '');
    return {
      key,
      crossesBString: B_STRING_BREAK_SETS.has(key),
      lowToHighStrings: key.split('').map(Number).sort((a, b) => b - a),
    };
  }

  ChroMusic.GuitarNoteMap = Object.freeze({
    FRET_COUNT,
    SHARP_NAMES: Object.freeze(SHARP_NAMES),
    FLAT_NAMES: Object.freeze(FLAT_NAMES),
    ENHARMONIC_GROUPS,
    tuning: NOTE_MAP.tuning,
    noteMap: NOTE_MAP,
    normalizePitchClass,
    normalizeNoteName,
    midiToScientific,
    getAllNotes,
    getNoteAt,
    getNotesOnString,
    getOccurrencesByPitchClass,
    getOccurrencesByName,
    getOpenString,
    getStringSetInfo,
  });

  window.ChroMusic = ChroMusic;
  console.log('%c♪ ChroMusic%c guitar-note-map.js loaded ✓', 'color:#9B59B6;font-weight:bold', 'color:#2ecc71');
})();
} catch (e) {
  console.error('[ChroMusic] guitar-note-map.js FAILED:', e);
}
