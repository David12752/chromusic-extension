/**
 * ChroMusic — Guitar Vertical Interval Bank
 * =========================================
 * Builds vertical interval data between strings, up to two octaves.
 */

// eslint-disable-next-line no-var
var ChroMusic = window.ChroMusic || {};

try {
(() => {
  'use strict';
  console.log('%c♪ ChroMusic%c guitar-vertical-interval-bank.js loading...', 'color:#9B59B6;font-weight:bold', 'color:#888');

  const GuitarNoteMap = window.ChroMusic?.GuitarNoteMap;
  if (!GuitarNoteMap) {
    throw new Error('GuitarNoteMap is required before GuitarVerticalIntervalBank');
  }

  const MAX_VERTICAL_SEMITONES = 24;
  const CHROMATIC_INTERVAL_LABELS = Object.freeze({
    0: '1',
    1: 'b2',
    2: '2',
    3: 'b3',
    4: '3',
    5: '4',
    6: '#4',
    7: '5',
    8: 'b6',
    9: '6',
    10: 'b7',
    11: '7',
    12: '8',
    13: 'b9',
    14: '9',
    15: 'b10',
    16: '10',
    17: '11',
    18: '#11',
    19: '12',
    20: 'b13',
    21: '13',
    22: 'b14',
    23: '14',
    24: '15',
  });

  function degreeDistanceOf(intervalLabel) {
    const match = String(intervalLabel || '').match(/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  function buildIntervalEntry(noteA, noteB) {
    const from = noteA.midi <= noteB.midi ? noteA : noteB;
    const to = noteA.midi <= noteB.midi ? noteB : noteA;
    const semitones = to.midi - from.midi;
    if (from.string === to.string || semitones > MAX_VERTICAL_SEMITONES) return null;
    const lowString = Math.max(from.string, to.string);
    const highString = Math.min(from.string, to.string);
    const stringSet = [];
    for (let string = lowString; string >= highString; string--) {
      stringSet.push(string);
    }
    const intervalLabel = CHROMATIC_INTERVAL_LABELS[semitones] || null;
    return Object.freeze({
      from: Object.freeze({
        string: from.string,
        fret: from.fret,
        midi: from.midi,
        name: from.scientific,
        sharpName: from.sharpName,
        flatName: from.flatName,
      }),
      to: Object.freeze({
        string: to.string,
        fret: to.fret,
        midi: to.midi,
        name: to.scientific,
        sharpName: to.sharpName,
        flatName: to.flatName,
      }),
      semitones,
      intervalLabel,
      degreeDistance: degreeDistanceOf(intervalLabel),
      direction: 'ascending',
      stringSet: Object.freeze(stringSet),
      fretSpan: Math.abs(to.fret - from.fret),
      crossesBString: stringSet.includes(3) && stringSet.includes(2),
    });
  }

  function buildBank() {
    const allIntervals = [];
    const byLabel = {};
    const bySemitones = {};
    const byFromKey = {};
    const allNotes = GuitarNoteMap.getAllNotes();

    Object.keys(CHROMATIC_INTERVAL_LABELS).forEach((semitones) => {
      bySemitones[semitones] = [];
    });

    for (let i = 0; i < allNotes.length; i++) {
      const noteA = allNotes[i];
      for (let j = i + 1; j < allNotes.length; j++) {
        const noteB = allNotes[j];
        if (noteA.string === noteB.string) continue;
        const entry = buildIntervalEntry(noteA, noteB);
        if (!entry) continue;
        allIntervals.push(entry);
        if (entry.intervalLabel) {
          byLabel[entry.intervalLabel] = byLabel[entry.intervalLabel] || [];
          byLabel[entry.intervalLabel].push(entry);
        }
        bySemitones[entry.semitones] = bySemitones[entry.semitones] || [];
        bySemitones[entry.semitones].push(entry);
        const fromKey = `${entry.from.string}:${entry.from.fret}`;
        byFromKey[fromKey] = byFromKey[fromKey] || [];
        byFromKey[fromKey].push(entry);
      }
    }

    Object.keys(byLabel).forEach((key) => { byLabel[key] = Object.freeze(byLabel[key].slice()); });
    Object.keys(bySemitones).forEach((key) => { bySemitones[key] = Object.freeze((bySemitones[key] || []).slice()); });
    Object.keys(byFromKey).forEach((key) => { byFromKey[key] = Object.freeze(byFromKey[key].slice()); });

    return Object.freeze({
      maxVerticalSemitones: MAX_VERTICAL_SEMITONES,
      allIntervals: Object.freeze(allIntervals),
      byLabel: Object.freeze(byLabel),
      bySemitones: Object.freeze(bySemitones),
      byFromKey: Object.freeze(byFromKey),
    });
  }

  const INTERVAL_BANK = buildBank();

  function getAllIntervals() {
    return INTERVAL_BANK.allIntervals;
  }

  function getIntervalsByLabel(intervalLabel) {
    return INTERVAL_BANK.byLabel?.[intervalLabel] || [];
  }

  function getIntervalsBySemitones(semitones) {
    return INTERVAL_BANK.bySemitones?.[semitones] || [];
  }

  function getIntervalsFrom(stringNumber, fret, options = {}) {
    const sourceKey = `${stringNumber}:${fret}`;
    const intervals = INTERVAL_BANK.byFromKey?.[sourceKey] || [];
    return intervals.filter((entry) => {
      if (options.intervalLabel && entry.intervalLabel !== options.intervalLabel) return false;
      if (options.maxFretSpan !== undefined && entry.fretSpan > options.maxFretSpan) return false;
      if (options.stringSet && String(entry.stringSet.join('')) !== String(options.stringSet).replace(/[^1-6]/g, '')) return false;
      return true;
    });
  }

  function findVerticalIntervalLocations(noteName, intervalLabel, options = {}) {
    const anchors = GuitarNoteMap.getOccurrencesByName(noteName);
    const results = [];
    anchors.forEach((anchor) => {
      getIntervalsFrom(anchor.string, anchor.fret, { intervalLabel, maxFretSpan: options.maxFretSpan, stringSet: options.stringSet }).forEach((entry) => {
        results.push(entry);
      });
    });
    return results;
  }

  ChroMusic.GuitarVerticalIntervalBank = Object.freeze({
    MAX_VERTICAL_SEMITONES,
    CHROMATIC_INTERVAL_LABELS,
    intervalBank: INTERVAL_BANK,
    getAllIntervals,
    getIntervalsByLabel,
    getIntervalsBySemitones,
    getIntervalsFrom,
    findVerticalIntervalLocations,
  });

  window.ChroMusic = ChroMusic;
  console.log('%c♪ ChroMusic%c guitar-vertical-interval-bank.js loaded ✓', 'color:#9B59B6;font-weight:bold', 'color:#2ecc71');
})();
} catch (e) {
  console.error('[ChroMusic] guitar-vertical-interval-bank.js FAILED:', e);
}
