/**
 * ChroMusic — Guitar Scale Bank
 * =============================
 * Builds 5-position guitar scale layouts for major, natural minor, and modal systems.
 */

// eslint-disable-next-line no-var
var ChroMusic = window.ChroMusic || {};

try {
(() => {
  'use strict';
  console.log('%c♪ ChroMusic%c guitar-scale-bank.js loading...', 'color:#9B59B6;font-weight:bold', 'color:#888');

  const GuitarNoteMap = window.ChroMusic?.GuitarNoteMap;
  if (!GuitarNoteMap) {
    throw new Error('GuitarNoteMap is required before GuitarScaleBank');
  }

  const ROOTS_SHARP = Object.freeze(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
  const ROOTS_FLAT = Object.freeze(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);
  const POSITION_SHAPES = Object.freeze(['C', 'A', 'G', 'E', 'D']);
  const SCALE_DEFINITIONS = Object.freeze({
    major: Object.freeze({ id: 'major', mode: 'ionian', family: 'major', intervals: Object.freeze([0, 2, 4, 5, 7, 9, 11]), parentSystem: 'major-diatonic', parentOffset: 0, avoidDegrees: Object.freeze(['4']) }),
    ionian: Object.freeze({ id: 'ionian', mode: 'ionian', family: 'major', intervals: Object.freeze([0, 2, 4, 5, 7, 9, 11]), parentSystem: 'major-diatonic', parentOffset: 0, avoidDegrees: Object.freeze(['4']) }),
    dorian: Object.freeze({ id: 'dorian', mode: 'dorian', family: 'major-mode', intervals: Object.freeze([0, 2, 3, 5, 7, 9, 10]), parentSystem: 'major-diatonic', parentOffset: 2, avoidDegrees: Object.freeze([]) }),
    phrygian: Object.freeze({ id: 'phrygian', mode: 'phrygian', family: 'major-mode', intervals: Object.freeze([0, 1, 3, 5, 7, 8, 10]), parentSystem: 'major-diatonic', parentOffset: 4, avoidDegrees: Object.freeze(['b2']) }),
    lydian: Object.freeze({ id: 'lydian', mode: 'lydian', family: 'major-mode', intervals: Object.freeze([0, 2, 4, 6, 7, 9, 11]), parentSystem: 'major-diatonic', parentOffset: 5, avoidDegrees: Object.freeze([]) }),
    mixolydian: Object.freeze({ id: 'mixolydian', mode: 'mixolydian', family: 'major-mode', intervals: Object.freeze([0, 2, 4, 5, 7, 9, 10]), parentSystem: 'major-diatonic', parentOffset: 7, avoidDegrees: Object.freeze(['4']) }),
    naturalMinor: Object.freeze({ id: 'naturalMinor', mode: 'aeolian', family: 'minor', intervals: Object.freeze([0, 2, 3, 5, 7, 8, 10]), parentSystem: 'major-diatonic', parentOffset: 9, avoidDegrees: Object.freeze(['b6']) }),
    aeolian: Object.freeze({ id: 'aeolian', mode: 'aeolian', family: 'minor', intervals: Object.freeze([0, 2, 3, 5, 7, 8, 10]), parentSystem: 'major-diatonic', parentOffset: 9, avoidDegrees: Object.freeze(['b6']) }),
    locrian: Object.freeze({ id: 'locrian', mode: 'locrian', family: 'major-mode', intervals: Object.freeze([0, 1, 3, 5, 6, 8, 10]), parentSystem: 'major-diatonic', parentOffset: 11, avoidDegrees: Object.freeze(['b2', 'b5']) }),
    harmonicMinor: Object.freeze({ id: 'harmonicMinor', mode: 'harmonicMinor', family: 'harmonicMinor', intervals: Object.freeze([0, 2, 3, 5, 7, 8, 11]), parentSystem: 'harmonic-minor', parentOffset: 0, avoidDegrees: Object.freeze([]) }),
    melodicMinor: Object.freeze({ id: 'melodicMinor', mode: 'melodicMinor', family: 'melodicMinor', intervals: Object.freeze([0, 2, 3, 5, 7, 9, 11]), parentSystem: 'melodic-minor', parentOffset: 0, avoidDegrees: Object.freeze([]) }),
    locrianNatural2: Object.freeze({ id: 'locrianNatural2', mode: 'locrianNatural2', family: 'melodicMinor-mode', intervals: Object.freeze([0, 2, 3, 5, 6, 8, 10]), parentSystem: 'melodic-minor', parentOffset: 11, avoidDegrees: Object.freeze(['b5']) }),
    lydianDominant: Object.freeze({ id: 'lydianDominant', mode: 'lydianDominant', family: 'melodicMinor-mode', intervals: Object.freeze([0, 2, 4, 6, 7, 9, 10]), parentSystem: 'melodic-minor', parentOffset: 7, avoidDegrees: Object.freeze([]) }),
    altered: Object.freeze({ id: 'altered', mode: 'altered', family: 'melodicMinor-mode', intervals: Object.freeze([0, 1, 3, 4, 6, 8, 10]), parentSystem: 'melodic-minor', parentOffset: 1, avoidDegrees: Object.freeze([]) }),
    wholeTone: Object.freeze({ id: 'wholeTone', mode: 'wholeTone', family: 'symmetric', intervals: Object.freeze([0, 2, 4, 6, 8, 10]), parentSystem: 'whole-tone', parentOffset: 0, avoidDegrees: Object.freeze([]) }),
  });

  function normalizePitchClass(value) {
    return GuitarNoteMap.normalizePitchClass(value);
  }

  function rootPitchClass(rootName) {
    const canonical = GuitarNoteMap.normalizeNoteName(rootName);
    if (!canonical) return null;
    const sharpIndex = ROOTS_SHARP.indexOf(canonical);
    if (sharpIndex >= 0) return sharpIndex;
    return ROOTS_FLAT.findIndex((name) => GuitarNoteMap.normalizeNoteName(name) === canonical);
  }

  function normalizeScaleType(scaleType) {
    const raw = String(scaleType || 'major').trim();
    const aliases = {
      minor: 'naturalMinor',
      major: 'major',
      ionian: 'ionian',
      dorian: 'dorian',
      phrygian: 'phrygian',
      lydian: 'lydian',
      mixolydian: 'mixolydian',
      aeolian: 'aeolian',
      locrian: 'locrian',
      naturalminor: 'naturalMinor',
      harmonicminor: 'harmonicMinor',
      melodicminor: 'melodicMinor',
      locriannatural2: 'locrianNatural2',
      lydiandominant: 'lydianDominant',
      altered: 'altered',
      wholetone: 'wholeTone',
    };
    const key = raw.replace(/[^a-z]/gi, '').toLowerCase();
    return aliases[key] || raw;
  }

  function degreeLabel(definition, pitchClass, rootPc) {
    const delta = normalizePitchClass(pitchClass - rootPc);
    const majorDegrees = {
      0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4', 6: '#4', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7',
    };
    const label = majorDegrees[delta] || '?';
    const degreeIndex = definition.intervals.findIndex((value) => value === delta);
    return {
      degree: degreeIndex >= 0 ? degreeIndex + 1 : null,
      interval: degreeIndex === 0 ? 'R' : label,
      degreeLabel: label,
    };
  }

  function assignScaleFinger(fret, windowMin) {
    if (fret === 0) return 0;
    return Math.max(1, Math.min(4, fret - windowMin + 1));
  }

  function buildPosition(definition, rootPc, anchor, positionIndex) {
    const windowMin = Math.max(0, anchor.fret);
    const windowMax = Math.min(GuitarNoteMap.FRET_COUNT, windowMin + 4);
    const allowedPitchClasses = new Set(definition.intervals.map((interval) => normalizePitchClass(rootPc + interval)));
    const notes = [];
    const stringsWithNotes = new Set();
    const degreeCoverage = new Set();

    for (let stringNumber = 6; stringNumber >= 1; stringNumber--) {
      const stringNotes = GuitarNoteMap.getNotesOnString(stringNumber)
        .filter((note) => note.fret >= windowMin && note.fret <= windowMax && allowedPitchClasses.has(note.pitchClass))
        .map((note) => {
          const degreeInfo = degreeLabel(definition, note.pitchClass, rootPc);
          degreeCoverage.add(degreeInfo.degreeLabel);
          stringsWithNotes.add(stringNumber);
          return Object.freeze({
            string: note.string,
            fret: note.fret,
            note: note.scientific,
            sharpName: note.sharpName,
            flatName: note.flatName,
            pitchClass: note.pitchClass,
            degree: degreeInfo.degree,
            degreeLabel: degreeInfo.degreeLabel,
            interval: degreeInfo.interval,
            finger: assignScaleFinger(note.fret, windowMin),
            isRoot: note.pitchClass === rootPc,
          });
        });
      notes.push(...stringNotes);
    }

    if (degreeCoverage.size < 6 || stringsWithNotes.size < 4) return null;

    const targetRoots = notes.filter((note) => note.isRoot);
    const playableScore = Math.round((degreeCoverage.size * 12) + (stringsWithNotes.size * 3) - (windowMax - windowMin) - (windowMin > 12 ? 4 : 0));
    return Object.freeze({
      id: `scale-${ROOTS_SHARP[rootPc]}-${definition.id}-p${positionIndex}`,
      root: ROOTS_SHARP[rootPc],
      rootSharp: ROOTS_SHARP[rootPc],
      rootFlat: ROOTS_FLAT[rootPc],
      rootPitchClass: rootPc,
      scaleType: definition.id,
      mode: definition.mode,
      family: definition.family,
      parentSystem: definition.parentSystem,
      positionIndex,
      cagedShape: POSITION_SHAPES[(positionIndex - 1) % POSITION_SHAPES.length],
      startFret: windowMin,
      endFret: windowMax,
      fretSpan: windowMax - windowMin,
      anchorRoot: Object.freeze({ string: anchor.string, fret: anchor.fret, note: anchor.scientific }),
      targetRoots: Object.freeze(targetRoots.map((note) => Object.freeze({ string: note.string, fret: note.fret, note: note.note }))),
      secondaryRoots: Object.freeze(targetRoots.slice(1).map((note) => Object.freeze({ string: note.string, fret: note.fret, note: note.note }))),
      avoidNotes: definition.avoidDegrees,
      transitionTargets: Object.freeze({ previous: Math.max(0, windowMin - 1), next: Math.min(GuitarNoteMap.FRET_COUNT, windowMax + 1) }),
      playableScore,
      notes: Object.freeze(notes.sort((a, b) => (b.string - a.string) || (a.fret - b.fret))),
    });
  }

  function selectFivePositions(definition, rootPc) {
    const anchors = GuitarNoteMap.getOccurrencesByPitchClass(rootPc)
      .filter((note) => note.fret <= 20)
      .sort((a, b) => a.fret - b.fret || b.string - a.string);
    const positions = [];
    const seenWindows = new Set();

    for (const anchor of anchors) {
      const position = buildPosition(definition, rootPc, anchor, positions.length + 1);
      if (!position) continue;
      const key = `${position.startFret}-${position.endFret}`;
      if (seenWindows.has(key)) continue;
      seenWindows.add(key);
      positions.push(position);
      if (positions.length === 5) break;
    }

    if (positions.length < 5) {
      for (const anchor of anchors) {
        const position = buildPosition(definition, rootPc, anchor, positions.length + 1);
        if (!position) continue;
        const key = `${position.anchorRoot.string}:${position.anchorRoot.fret}`;
        if (positions.some((entry) => `${entry.anchorRoot.string}:${entry.anchorRoot.fret}` === key)) continue;
        positions.push(position);
        if (positions.length === 5) break;
      }
    }

    return Object.freeze(positions
      .sort((a, b) => a.startFret - b.startFret || a.anchorRoot.string - b.anchorRoot.string)
      .map((position, index) => Object.freeze({ ...position, positionIndex: index + 1, cagedShape: POSITION_SHAPES[index % POSITION_SHAPES.length], id: `scale-${ROOTS_SHARP[rootPc]}-${definition.id}-p${index + 1}` })));
  }

  function parentScaleInfo(rootPc, definition) {
    if (definition.parentSystem !== 'major-diatonic') {
      return Object.freeze({ root: ROOTS_SHARP[rootPc], system: definition.parentSystem, mode: definition.mode });
    }
    const parentPc = normalizePitchClass(rootPc - definition.parentOffset);
    return Object.freeze({
      root: ROOTS_SHARP[parentPc],
      system: 'major',
      mode: 'ionian',
    });
  }

  function buildBank() {
    const byKey = {};
    const allPositions = [];

    Object.values(SCALE_DEFINITIONS).forEach((definition) => {
      ROOTS_SHARP.forEach((_, rootPc) => {
        const positions = selectFivePositions(definition, rootPc);
        const payload = Object.freeze({
          root: ROOTS_SHARP[rootPc],
          rootSharp: ROOTS_SHARP[rootPc],
          rootFlat: ROOTS_FLAT[rootPc],
          rootPitchClass: rootPc,
          scaleType: definition.id,
          mode: definition.mode,
          family: definition.family,
          parentScale: parentScaleInfo(rootPc, definition),
          positions,
        });
        byKey[`${ROOTS_SHARP[rootPc]}:${definition.id}`] = payload;
        if (ROOTS_FLAT[rootPc] !== ROOTS_SHARP[rootPc]) {
          byKey[`${ROOTS_FLAT[rootPc]}:${definition.id}`] = payload;
        }
        positions.forEach((position) => allPositions.push(position));
      });
    });

    return Object.freeze({
      definitions: SCALE_DEFINITIONS,
      byKey: Object.freeze(byKey),
      allPositions: Object.freeze(allPositions),
    });
  }

  const SCALE_BANK = buildBank();

  function getScaleDefinitions() {
    return SCALE_DEFINITIONS;
  }

  function getScale(rootName, scaleType = 'major') {
    const normalizedScaleType = normalizeScaleType(scaleType);
    const rootPc = rootPitchClass(rootName);
    if (rootPc === null || rootPc < 0) return null;
    return SCALE_BANK.byKey?.[`${ROOTS_SHARP[rootPc]}:${normalizedScaleType}`] || null;
  }

  function getScalePositions(rootName, scaleType = 'major') {
    return getScale(rootName, scaleType)?.positions || [];
  }

  function getScalePosition(rootName, scaleType = 'major', positionIndex = 1) {
    return getScalePositions(rootName, scaleType).find((position) => position.positionIndex === positionIndex) || null;
  }

  function getScaleNotes(rootName, scaleType = 'major') {
    const scale = getScale(rootName, scaleType);
    if (!scale) return [];
    const definition = SCALE_DEFINITIONS[normalizeScaleType(scaleType)];
    return definition.intervals.map((interval) => normalizePitchClass(scale.rootPitchClass + interval));
  }

  ChroMusic.GuitarScaleBank = Object.freeze({
    SCALE_DEFINITIONS,
    POSITION_SHAPES,
    scaleBank: SCALE_BANK,
    normalizeScaleType,
    getScaleDefinitions,
    getScale,
    getScalePositions,
    getScalePosition,
    getScaleNotes,
  });

  window.ChroMusic = ChroMusic;
  console.log('%c♪ ChroMusic%c guitar-scale-bank.js loaded ✓', 'color:#9B59B6;font-weight:bold', 'color:#2ecc71');
})();
} catch (e) {
  console.error('[ChroMusic] guitar-scale-bank.js FAILED:', e);
}
