/**
 * ChroMusic — Music Theory Utilities
 * ====================================
 * Enharmonic-aware note handling, interval classification, and color mapping.
 * Written to the standard a jazz/fusion musician would expect.
 */

// eslint-disable-next-line no-var
var ChroMusic = window.ChroMusic || {};

try {
(() => {
  'use strict';
  console.log('%c♪ ChroMusic%c music-theory.js loading...', 'color:#9B59B6;font-weight:bold', 'color:#888');

  /* ─────────────────────────────────────────────
   *  Constants
   * ───────────────────────────────────────────── */

  /** Chromatic pitch-class indices (sharps canonical) */
  const PITCH_CLASSES = [
    'C', 'C#', 'D', 'D#', 'E', 'F',
    'F#', 'G', 'G#', 'A', 'A#', 'B'
  ];

  /** Enharmonic equivalence map → canonical sharp spelling */
  const ENHARMONIC_MAP = Object.freeze({
    'Cb':  'B',  'C':   'C',  'C#':  'C#', 'C##': 'D',
    'Dbb': 'C',  'Db':  'C#', 'D':   'D',  'D#':  'D#', 'D##': 'E',
    'Ebb': 'D',  'Eb':  'D#', 'E':   'E',  'E#':  'F',  'E##': 'F#',
    'Fbb': 'Eb', 'Fb':  'E',  'F':   'F',  'F#':  'F#', 'F##': 'G',
    'Gbb': 'F',  'Gb':  'F#', 'G':   'G',  'G#':  'G#', 'G##': 'A',
    'Abb': 'G',  'Ab':  'G#', 'A':   'A',  'A#':  'A#', 'A##': 'B',
    'Bbb': 'A',  'Bb':  'A#', 'B':   'B',  'B#':  'C',  'B##': 'C#',
  });

  /**
   * Interval → Color Category
   * ──────────────────────────
   * Root         → Red    (#E74C3C)
   * Guide Tones  → Blue   (#3498DB)   (3, b3, 7, maj7, b7)
   * Tensions     → Purple (#9B59B6)   (b9, 9, #9, 11, #11, b13, 13)
   * Fifth        → Grey   (#7F8C8D)   (5, b5, #5)
   * Other        → Teal   (#1ABC9C)   (2, 4, 6, sus)
   */
  const INTERVAL_COLORS = Object.freeze({
    // Root
    'R':     '#E74C3C', '1':     '#E74C3C', 'P1':    '#E74C3C',

    // Guide tones — thirds
    '3':     '#3498DB', 'b3':    '#3498DB', '#3':    '#3498DB',
    'min3':  '#3498DB', 'maj3':  '#3498DB',
    // Guide tones — sevenths
    '7':     '#3498DB', 'b7':    '#3498DB', 'bb7':   '#3498DB',
    'maj7':  '#3498DB', 'min7':  '#3498DB', 'dim7':  '#3498DB',

    // Tensions
    'b9':    '#9B59B6', '9':     '#9B59B6', '#9':    '#9B59B6',
    '11':    '#9B59B6', '#11':   '#9B59B6', 'b11':   '#9B59B6',
    'b13':   '#9B59B6', '13':    '#9B59B6', '#13':   '#9B59B6',

    // Fifths
    '5':     '#7F8C8D', 'b5':    '#7F8C8D', '#5':    '#7F8C8D',
    'P5':    '#7F8C8D', 'dim5':  '#7F8C8D', 'aug5':  '#7F8C8D',

    // Other diatonic
    '2':     '#1ABC9C', '4':     '#1ABC9C', '6':     '#1ABC9C',
    'b6':    '#1ABC9C', 'sus2':  '#1ABC9C', 'sus4':  '#1ABC9C',
    'b2':    '#9B59B6', // enharmonic with b9, treat as tension
  });

  /** Fallback color for unknown intervals */
  const DEFAULT_COLOR = '#BDC3C7';

  /** Category labels for legend rendering */
  const INTERVAL_CATEGORIES = Object.freeze([
    { label: 'Root',        color: '#E74C3C', intervals: ['R', '1'] },
    { label: 'Guide Tones', color: '#3498DB', intervals: ['3', 'b3', '7', 'b7', 'maj7'] },
    { label: 'Tensions',    color: '#9B59B6', intervals: ['b9', '9', '#9', '11', '#11', 'b13', '13'] },
    { label: '5th',         color: '#7F8C8D', intervals: ['5', 'b5', '#5'] },
    { label: 'Other',       color: '#1ABC9C', intervals: ['2', '4', '6'] },
  ]);

  /* ─────────────────────────────────────────────
   *  Utility Functions
   * ───────────────────────────────────────────── */

  /**
   * Parse a note string like "C#4", "Eb2", "B##5" into
   * { name: "C#", octave: 4, pitchClass: 1, midi: 49 }
   */
  function parseNote(noteStr) {
    if (!noteStr || typeof noteStr !== 'string') return null;
    const match = noteStr.trim().match(/^([A-Ga-g])(#{1,2}|b{1,2})?(-?\d)?$/);
    if (!match) return null;

    const letter = match[1].toUpperCase();
    const accidental = match[2] || '';
    const octave = match[3] !== undefined ? parseInt(match[3], 10) : 4;
    const name = letter + accidental;
    const canonical = ENHARMONIC_MAP[name];
    if (canonical === undefined) return null;

    const pitchClass = PITCH_CLASSES.indexOf(canonical);
    const midi = (octave + 1) * 12 + pitchClass;

    return Object.freeze({ name, canonical, octave, pitchClass, midi });
  }

  /**
   * Return the color for a given interval string.
   * Normalises common aliases first.
   */
  function getIntervalColor(interval) {
    if (!interval) return DEFAULT_COLOR;
    const clean = interval.trim().replace(/^M/, 'maj').replace(/^m(?!aj|in)/, 'min');
    return INTERVAL_COLORS[clean] || INTERVAL_COLORS[interval.trim()] || DEFAULT_COLOR;
  }

  /**
   * Derive a high-contrast text color for a given background hex.
   * Uses W3C relative luminance formula.
   */
  function contrastText(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.4 ? '#1a1a2e' : '#FFFFFF';
  }

  /**
   * Standard guitar tuning MIDI values (6th string to 1st).
   */
  const STANDARD_TUNING = Object.freeze([
    { string: 6, note: 'E2', midi: 40 },
    { string: 5, note: 'A2', midi: 45 },
    { string: 4, note: 'D3', midi: 50 },
    { string: 3, note: 'G3', midi: 55 },
    { string: 2, note: 'B3', midi: 59 },
    { string: 1, note: 'E4', midi: 64 },
  ]);

  /**
   * Piano key metadata — 88 keys, A0 (MIDI 21) to C8 (MIDI 108).
   * Lazily generated.
   */
  let _pianoKeys = null;
  function getPianoKeys() {
    if (_pianoKeys) return _pianoKeys;
    const keys = [];
    for (let midi = 21; midi <= 108; midi++) {
      const pitchClass = (midi) % 12;
      const octave = Math.floor(midi / 12) - 1;
      const name = PITCH_CLASSES[pitchClass];
      const isBlack = [1, 3, 6, 8, 10].includes(pitchClass);
      keys.push(Object.freeze({ midi, name, octave, pitchClass, isBlack, label: `${name}${octave}` }));
    }
    _pianoKeys = Object.freeze(keys);
    return _pianoKeys;
  }

  /**
   * Find the MIDI value range for a set of note objects,
   * returning a sensible display window for the piano.
   */
  function getPianoRange(noteObjects, padding = 5) {
    if (!noteObjects || noteObjects.length === 0) {
      return { low: 48, high: 84 }; // C3 to C6 default
    }
    const midis = noteObjects.map(n => {
      const parsed = parseNote(n.note);
      return parsed ? parsed.midi : null;
    }).filter(m => m !== null);

    if (midis.length === 0) return { low: 48, high: 84 };

    let low = Math.min(...midis) - padding;
    let high = Math.max(...midis) + padding;

    // Snap to white-key boundaries for cleaner rendering
    low = Math.max(21, low);
    high = Math.min(108, high);

    // Ensure minimum 2-octave span
    if (high - low < 24) {
      const center = Math.round((low + high) / 2);
      low = Math.max(21, center - 14);
      high = Math.min(108, center + 14);
    }

    return { low, high };
  }

  /* ─────────────────────────────────────────────
   *  Export to global namespace
   * ───────────────────────────────────────────── */
  ChroMusic.MusicTheory = Object.freeze({
    PITCH_CLASSES,
    ENHARMONIC_MAP,
    INTERVAL_COLORS,
    INTERVAL_CATEGORIES,
    DEFAULT_COLOR,
    STANDARD_TUNING,
    parseNote,
    getIntervalColor,
    contrastText,
    getPianoKeys,
    getPianoRange,
  });

  window.ChroMusic = ChroMusic;
  console.log('%c♪ ChroMusic%c music-theory.js loaded ✓', 'color:#9B59B6;font-weight:bold', 'color:#2ecc71');
})();
} catch (e) {
  console.error('[ChroMusic] music-theory.js FAILED:', e);
}
