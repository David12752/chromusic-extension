/**
 * ChroMusic — Deterministic Guitar Voicing Engine
 * ===============================================
 * Builds physically playable guitar voicings from explicit target notes or intervals.
 *
 * Core guarantees:
 * - standard tuning fretboard matrix
 * - one note per string
 * - max stretch filter across fretted notes only
 * - single hand-position validation
 * - deterministic search / deterministic sort
 * - jazz-string-set prioritization (drop 2, drop 3, drop 2 & 4)
 *
 * Browser usage:
 *   window.ChroMusic.DeterministicGuitarVoicingCore.getVoicings(['C', 'E', 'Bb', 'D#'], 'C', { maxStretch: 5 })
 *
 * Node usage:
 *   const GuitarVoicingEngine = require('./shared/GuitarVoicingEngine');
 *   const voicings = GuitarVoicingEngine.getVoicings(['F', 'Ab', 'C', 'Eb', 'G', 'Bb'], 'F', { maxStretch: 5 });
 */
(function initGuitarVoicingEngine(globalScope, factory) {
  'use strict';

  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.ChroMusic = globalScope.ChroMusic || {};
    if (!globalScope.ChroMusic.DeterministicGuitarVoicingCore) {
      globalScope.ChroMusic.DeterministicGuitarVoicingCore = Object.freeze(api);
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGuitarVoicingEngine() {
  'use strict';

  const ExistingChroMusic = typeof globalThis !== 'undefined' ? globalThis.ChroMusic : null;
  const ExistingMusicTheory = ExistingChroMusic?.MusicTheory || null;
  const ExistingGuitarNoteMap = ExistingChroMusic?.GuitarNoteMap || null;

  const NATURAL_PITCH_CLASS = Object.freeze({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 });
  const LETTERS = Object.freeze(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  const SHARP_NOTE_NAMES = Object.freeze((ExistingMusicTheory?.PITCH_CLASSES || ExistingGuitarNoteMap?.SHARP_NAMES || ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']).slice());
  const FLAT_NOTE_NAMES = Object.freeze((ExistingGuitarNoteMap?.FLAT_NAMES || ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']).slice());

  const STANDARD_TUNING = Object.freeze((ExistingMusicTheory?.STANDARD_TUNING || [
    { string: 6, note: 'E2', midi: 40 },
    { string: 5, note: 'A2', midi: 45 },
    { string: 4, note: 'D3', midi: 50 },
    { string: 3, note: 'G3', midi: 55 },
    { string: 2, note: 'B3', midi: 59 },
    { string: 1, note: 'E4', midi: 64 },
  ]).map((entry) => Object.freeze({ ...entry })));

  const DEFAULT_OPTIONS = Object.freeze({
    fretLimit: 24,
    maxStretch: null,
    allowAdvancedStretch: false,
    advancedMaxStretch: 5,
    allowOpenStrings: true,
    allowDoublings: false,
    maxVoices: null,
    requireAscendingPitches: true,
    sortBy: 'playability',
    preferRootInBass: true,
    requiredBassPitchClass: null,
    maxResults: Infinity,
  });

  const PREFERRED_STRING_SETS = Object.freeze([
    Object.freeze({ key: '1234', label: 'drop2', strings: Object.freeze([1, 2, 3, 4]), priority: 320 }),
    Object.freeze({ key: '2345', label: 'drop2', strings: Object.freeze([2, 3, 4, 5]), priority: 320 }),
    Object.freeze({ key: '2346', label: 'drop3', strings: Object.freeze([2, 3, 4, 6]), priority: 300 }),
    Object.freeze({ key: '1245', label: 'drop2and4', strings: Object.freeze([1, 2, 4, 5]), priority: 285 }),
    Object.freeze({ key: '2356', label: 'drop2and4', strings: Object.freeze([2, 3, 5, 6]), priority: 285 }),
  ]);

  const INTERVAL_SPECS = Object.freeze({
    R: Object.freeze({ semitones: 0, degree: 1 }),
    '1': Object.freeze({ semitones: 0, degree: 1 }),
    b9: Object.freeze({ semitones: 1, degree: 2 }),
    b2: Object.freeze({ semitones: 1, degree: 2 }),
    '9': Object.freeze({ semitones: 2, degree: 2 }),
    '2': Object.freeze({ semitones: 2, degree: 2 }),
    '#9': Object.freeze({ semitones: 3, degree: 2 }),
    b3: Object.freeze({ semitones: 3, degree: 3 }),
    '3': Object.freeze({ semitones: 4, degree: 3 }),
    '11': Object.freeze({ semitones: 5, degree: 4 }),
    '4': Object.freeze({ semitones: 5, degree: 4 }),
    '#11': Object.freeze({ semitones: 6, degree: 4 }),
    b5: Object.freeze({ semitones: 6, degree: 5 }),
    '5': Object.freeze({ semitones: 7, degree: 5 }),
    '#5': Object.freeze({ semitones: 8, degree: 5 }),
    b13: Object.freeze({ semitones: 8, degree: 6 }),
    b6: Object.freeze({ semitones: 8, degree: 6 }),
    '13': Object.freeze({ semitones: 9, degree: 6 }),
    '6': Object.freeze({ semitones: 9, degree: 6 }),
    dim7: Object.freeze({ semitones: 9, degree: 7 }),
    b7: Object.freeze({ semitones: 10, degree: 7 }),
    '7': Object.freeze({ semitones: 11, degree: 7 }),
  });

  const DEGREE_BASE_SEMITONES = Object.freeze({ 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 });
  const SEMITONE_FALLBACK_LABELS = Object.freeze(['R', 'b9', '9', '#9', '3', '11', '#11', '5', 'b13', '13', 'b7', '7']);
  const STRINGS_LOW_TO_HIGH = Object.freeze([6, 5, 4, 3, 2, 1]);

  function normalizePitchClass(value) {
    return ((Number(value) % 12) + 12) % 12;
  }

  function accidentalOffset(accidental) {
    if (!accidental) return 0;
    return accidental.split('').reduce((sum, symbol) => sum + (symbol === '#' ? 1 : -1), 0);
  }

  function parseSpelledNote(noteName) {
    if (typeof noteName !== 'string') return null;
    const match = noteName.trim().match(/^([A-Ga-g])(#{1,2}|b{1,2})?$/);
    if (!match) return null;

    const letter = match[1].toUpperCase();
    const accidental = match[2] || '';
    const pitchClass = normalizePitchClass(NATURAL_PITCH_CLASS[letter] + accidentalOffset(accidental));

    return Object.freeze({
      raw: noteName.trim(),
      letter,
      accidental,
      pitchClass,
      letterIndex: LETTERS.indexOf(letter),
    });
  }

  function pitchClassToName(pitchClass, preferSharps) {
    const names = preferSharps ? SHARP_NOTE_NAMES : FLAT_NOTE_NAMES;
    return names[normalizePitchClass(pitchClass)];
  }

  function prefersSharps(noteName, intervalLabel) {
    if (intervalLabel && intervalLabel.includes('#')) return true;
    if (intervalLabel && intervalLabel.includes('b')) return false;
    return !String(noteName || '').includes('b');
  }

  function normalizeIntervalLabel(interval) {
    const clean = String(interval || '').trim();
    if (!clean) return null;
    if (INTERVAL_SPECS[clean]) return clean;
    const upper = clean.toUpperCase();
    if (upper === 'ROOT') return 'R';
    return INTERVAL_SPECS[upper] ? upper : null;
  }

  function intervalToSemitones(interval) {
    const label = normalizeIntervalLabel(interval);
    return label ? INTERVAL_SPECS[label].semitones : null;
  }

  function fallbackIntervalLabelFromSemitones(semitones) {
    return SEMITONE_FALLBACK_LABELS[normalizePitchClass(semitones)] || null;
  }

  function normalizeDifferenceToSmallRange(value) {
    let diff = Number(value);
    while (diff > 6) diff -= 12;
    while (diff < -6) diff += 12;
    return diff;
  }

  function determineIntervalLabel(rootNote, targetNote) {
    const root = parseSpelledNote(rootNote);
    const target = parseSpelledNote(targetNote);
    if (!root || !target) return null;

    const degree = ((target.letterIndex - root.letterIndex + 7) % 7) + 1;
    const actualSemitones = normalizePitchClass(target.pitchClass - root.pitchClass);
    const baseSemitones = DEGREE_BASE_SEMITONES[degree];
    const diff = normalizeDifferenceToSmallRange(actualSemitones - baseSemitones);

    if (degree === 1 && diff === 0) return 'R';
    if (degree === 2 && diff === -1) return 'b9';
    if (degree === 2 && diff === 0) return '9';
    if (degree === 2 && diff === 1) return '#9';
    if (degree === 3 && diff === -1) return 'b3';
    if (degree === 3 && diff === 0) return '3';
    if (degree === 4 && diff === 0) return '11';
    if (degree === 4 && diff === 1) return '#11';
    if (degree === 5 && diff === -1) return 'b5';
    if (degree === 5 && diff === 0) return '5';
    if (degree === 5 && diff === 1) return '#5';
    if (degree === 6 && diff === -1) return 'b13';
    if (degree === 6 && diff === 0) return '13';
    if (degree === 7 && diff === -2) return 'dim7';
    if (degree === 7 && diff === -1) return 'b7';
    if (degree === 7 && diff === 0) return '7';

    return fallbackIntervalLabelFromSemitones(actualSemitones);
  }

  function spellNoteForInterval(rootNote, intervalLabel) {
    const root = parseSpelledNote(rootNote);
    const spec = INTERVAL_SPECS[normalizeIntervalLabel(intervalLabel)];
    if (!root || !spec) return null;

    const targetLetter = LETTERS[(root.letterIndex + spec.degree - 1) % LETTERS.length];
    const naturalTargetPitchClass = NATURAL_PITCH_CLASS[targetLetter];
    const desiredPitchClass = normalizePitchClass(root.pitchClass + spec.semitones);
    const accidentalDiff = normalizeDifferenceToSmallRange(desiredPitchClass - naturalTargetPitchClass);

    if (accidentalDiff < -2 || accidentalDiff > 2) {
      return pitchClassToName(desiredPitchClass, prefersSharps(rootNote, intervalLabel));
    }

    const accidental = accidentalDiff === -2 ? 'bb'
      : accidentalDiff === -1 ? 'b'
      : accidentalDiff === 1 ? '#'
      : accidentalDiff === 2 ? '##'
      : '';

    return `${targetLetter}${accidental}`;
  }

  function parseScientificNote(note) {
    if (typeof note !== 'string') return null;
    const match = note.trim().match(/^([A-Ga-g])(#{1,2}|b{1,2})?(-?\d+)$/);
    if (!match) return null;
    const pitch = parseSpelledNote(`${match[1]}${match[2] || ''}`);
    const octave = Number(match[3]);
    if (!pitch || !Number.isFinite(octave)) return null;
    return Object.freeze({
      note: `${pitch.letter}${pitch.accidental}${octave}`,
      pitchClass: pitch.pitchClass,
      octave,
      midi: ((octave + 1) * 12) + pitch.pitchClass,
    });
  }

  function midiToScientific(noteName, midi) {
    const octave = Math.floor(Number(midi) / 12) - 1;
    return `${noteName}${octave}`;
  }

  function buildFretboard(options = {}) {
    const fretLimit = Number.isInteger(options.fretLimit) ? options.fretLimit : DEFAULT_OPTIONS.fretLimit;
    const tuning = Array.isArray(options.tuning) && options.tuning.length === 6 ? options.tuning : STANDARD_TUNING;
    const fretboard = {};

    tuning.forEach((openString) => {
      fretboard[openString.string] = [];
      for (let fret = 0; fret <= fretLimit; fret += 1) {
        const midi = openString.midi + fret;
        const pitchClass = normalizePitchClass(midi);
        fretboard[openString.string].push(Object.freeze({
          string: openString.string,
          fret,
          midi,
          pitchClass,
          octave: Math.floor(midi / 12) - 1,
          noteSharp: midiToScientific(SHARP_NOTE_NAMES[pitchClass], midi),
          noteFlat: midiToScientific(FLAT_NOTE_NAMES[pitchClass], midi),
        }));
      }
      fretboard[openString.string] = Object.freeze(fretboard[openString.string]);
    });

    return Object.freeze(fretboard);
  }

  function parseTargets(notesArray, rootNote) {
    if (!Array.isArray(notesArray) || notesArray.length === 0) {
      throw new Error('`notesArray` must be a non-empty array of note names or interval labels.');
    }

    const root = parseSpelledNote(rootNote);
    if (!root) {
      throw new Error('`rootNote` must be a valid note name such as C, F#, or Bb.');
    }

    const seen = new Set();
    const parsedTargets = [];

    notesArray.forEach((value, index) => {
      const raw = String(value || '').trim();
      if (!raw) return;

      const intervalLabel = normalizeIntervalLabel(raw);
      let noteName = null;
      let label = null;
      let pitchClass = null;

      if (intervalLabel) {
        label = intervalLabel;
        noteName = spellNoteForInterval(rootNote, intervalLabel) || pitchClassToName(root.pitchClass + INTERVAL_SPECS[intervalLabel].semitones, true);
        pitchClass = normalizePitchClass(root.pitchClass + INTERVAL_SPECS[intervalLabel].semitones);
      } else {
        const parsedNote = parseSpelledNote(raw);
        if (!parsedNote) {
          throw new Error(`Unsupported note or interval: ${raw}`);
        }
        noteName = `${parsedNote.letter}${parsedNote.accidental}`;
        pitchClass = parsedNote.pitchClass;
        label = determineIntervalLabel(rootNote, noteName) || fallbackIntervalLabelFromSemitones(pitchClass - root.pitchClass);
      }

      const dedupeKey = `${label}|${pitchClass}|${noteName}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      parsedTargets.push(Object.freeze({
        id: index,
        input: raw,
        noteName,
        pitchClass,
        interval: label,
      }));
    });

    if (!parsedTargets.length) {
      throw new Error('No playable targets were derived from `notesArray`.');
    }

    if (parsedTargets.length > 6) {
      throw new Error('A maximum of 6 unique targets can be voiced on a 6-string guitar.');
    }

    return Object.freeze(parsedTargets);
  }

  function getTargetLocations(target, options = {}) {
    const fretboard = options.fretboard || buildFretboard(options);
    const allowOpenStrings = options.allowOpenStrings !== false;
    const locations = [];

    STRINGS_LOW_TO_HIGH.forEach((stringNumber) => {
      (fretboard[stringNumber] || []).forEach((cell) => {
        if (cell.pitchClass !== target.pitchClass) return;
        if (!allowOpenStrings && cell.fret === 0) return;
        locations.push(Object.freeze({
          string: cell.string,
          fret: cell.fret,
          midi: cell.midi,
          note: prefersSharps(target.noteName, target.interval)
            ? midiToScientific(target.noteName, cell.midi)
            : midiToScientific(target.noteName, cell.midi),
          noteName: target.noteName,
          interval: target.interval,
          pitchClass: target.pitchClass,
          targetId: target.id,
        }));
      });
    });

    return Object.freeze(locations);
  }

  function getTargetLocationsByString(targets, options = {}) {
    const byTarget = {};
    const fretboard = options.fretboard || buildFretboard(options);

    targets.forEach((target) => {
      byTarget[target.id] = {};
      getTargetLocations(target, { ...options, fretboard }).forEach((location) => {
        byTarget[target.id][location.string] = byTarget[target.id][location.string] || [];
        byTarget[target.id][location.string].push(location);
      });
      Object.keys(byTarget[target.id]).forEach((key) => {
        byTarget[target.id][key] = Object.freeze(byTarget[target.id][key].slice().sort((a, b) => a.fret - b.fret || a.midi - b.midi));
      });
      byTarget[target.id] = Object.freeze(byTarget[target.id]);
    });

    return Object.freeze(byTarget);
  }

  function generateCombinations(source, size, startIndex = 0, prefix = [], result = []) {
    if (prefix.length === size) {
      result.push(prefix.slice());
      return result;
    }

    for (let index = startIndex; index <= source.length - (size - prefix.length); index += 1) {
      prefix.push(source[index]);
      generateCombinations(source, size, index + 1, prefix, result);
      prefix.pop();
    }

    return result;
  }

  function getEffectiveMaxStretch(options = {}) {
    if (Number.isFinite(options.maxStretch)) return Number(options.maxStretch);
    if (options.allowAdvancedStretch) return Number(options.advancedMaxStretch || DEFAULT_OPTIONS.advancedMaxStretch);
    return 4;
  }

  function getFrettedSpan(assignments) {
    const fretted = assignments.filter((item) => item.fret > 0).map((item) => item.fret);
    if (!fretted.length) return 0;
    return Math.max(...fretted) - Math.min(...fretted);
  }

  function getHandPosition(assignments) {
    const fretted = assignments.filter((item) => item.fret > 0).map((item) => item.fret);
    if (!fretted.length) return 0;
    return Math.min(...fretted);
  }

  function getMutedFretsMap(assignments) {
    const frets = { 6: 'X', 5: 'X', 4: 'X', 3: 'X', 2: 'X', 1: 'X' };
    assignments.forEach((assignment) => {
      frets[assignment.string] = assignment.fret;
    });
    return frets;
  }

  function getLowestAssignment(assignments) {
    return assignments.slice().sort((a, b) => b.string - a.string || a.midi - b.midi)[0] || null;
  }

  function matchesRequiredBassPitchClass(assignment, options = {}) {
    if (!Number.isFinite(options.requiredBassPitchClass)) return true;
    if (!assignment) return false;
    return normalizePitchClass(assignment.pitchClass) === normalizePitchClass(options.requiredBassPitchClass);
  }

  function hasAscendingPitches(assignments) {
    const ordered = assignments.slice().sort((a, b) => b.string - a.string);
    for (let index = 1; index < ordered.length; index += 1) {
      if (ordered[index].midi <= ordered[index - 1].midi) return false;
    }
    return true;
  }

  function classifyStringSet(strings) {
    const key = strings.slice().sort((a, b) => a - b).join('');
    const preferred = PREFERRED_STRING_SETS.find((entry) => entry.key === key);
    return preferred || Object.freeze({ key, label: 'unclassified', strings: Object.freeze(strings.slice().sort((a, b) => a - b)), priority: 0 });
  }

  function countInteriorSkips(strings) {
    const sorted = strings.slice().sort((a, b) => a - b);
    let skips = 0;
    for (let index = 1; index < sorted.length; index += 1) {
      skips += Math.max(0, sorted[index] - sorted[index - 1] - 1);
    }
    return skips;
  }

  function validatePhysicalConstraints(assignments, options = {}) {
    if (!Array.isArray(assignments) || assignments.length === 0) return false;

    const usedStrings = new Set();
    for (const assignment of assignments) {
      if (usedStrings.has(assignment.string)) return false;
      usedStrings.add(assignment.string);
    }

    const stretch = getFrettedSpan(assignments);
    const maxStretch = getEffectiveMaxStretch(options);
    if (stretch > maxStretch) return false;

    if (options.requireAscendingPitches !== false && !hasAscendingPitches(assignments)) {
      return false;
    }

    if (!matchesRequiredBassPitchClass(getLowestAssignment(assignments), options)) {
      return false;
    }

    const fretted = assignments.filter((item) => item.fret > 0);
    if (fretted.length) {
      const lowest = Math.min(...fretted.map((item) => item.fret));
      const highest = Math.max(...fretted.map((item) => item.fret));
      if ((highest - lowest) > maxStretch) return false;
    }

    return true;
  }

  function scoreVoicing(assignments, targets, rootNote, options = {}) {
    const strings = assignments.map((item) => item.string);
    const stringSet = classifyStringSet(strings);
    const stretch = getFrettedSpan(assignments);
    const position = getHandPosition(assignments);
    const lowestStringAssignment = getLowestAssignment(assignments);
    const lowestIsRoot = !!lowestStringAssignment && lowestStringAssignment.interval === 'R';
    const lowestMatchesRequestedBass = matchesRequiredBassPitchClass(lowestStringAssignment, options);
    const openStrings = assignments.filter((item) => item.fret === 0).length;
    const interiorSkips = countInteriorSkips(strings);
    const uniqueIntervals = new Set(assignments.map((item) => item.interval));
    const targetCoverageBonus = targets.reduce((sum, target) => sum + (uniqueIntervals.has(target.interval) ? 12 : -40), 0);

    let score = 1000;
    score += stringSet.priority;
    score += targetCoverageBonus;
    score -= stretch * 32;
    score -= position * 3;
    score -= openStrings * 16;
    score -= interiorSkips * 10;
    score -= Math.max(0, assignments.length - 4) * 6;

    if (Number.isFinite(options.requiredBassPitchClass)) {
      if (lowestMatchesRequestedBass) score += 180;
      else score -= 320;
    } else {
      if (options.preferRootInBass !== false && lowestIsRoot) score += 90;
      if (options.preferRootInBass !== false && lowestStringAssignment && !lowestIsRoot) score -= 45;
    }
    if (assignments.length === 4 && stringSet.priority > 0) score += 22;
    if (rootNote && assignments.some((item) => item.interval === '3' || item.interval === 'b3')) score += 16;
    if (assignments.some((item) => item.interval === '7' || item.interval === 'b7' || item.interval === 'dim7')) score += 16;
    if (openStrings === 0) score += 10;

    return score;
  }

  function sortVoicings(voicings, sortBy = DEFAULT_OPTIONS.sortBy) {
    const cloned = voicings.slice();
    cloned.sort((a, b) => {
      if (sortBy === 'position') {
        return a.position - b.position
          || a.stretch - b.stretch
          || b.score - a.score
          || a.fretSignature.localeCompare(b.fretSignature);
      }

      return b.score - a.score
        || a.position - b.position
        || a.stretch - b.stretch
        || a.fretSignature.localeCompare(b.fretSignature);
    });
    return cloned;
  }

  function buildVoicing(assignments, targets, rootNote, options = {}) {
    const orderedAssignments = assignments.slice().sort((a, b) => b.string - a.string);
    const stringSet = classifyStringSet(orderedAssignments.map((item) => item.string));
    const frets = getMutedFretsMap(orderedAssignments);
    const position = getHandPosition(orderedAssignments);
    const stretch = getFrettedSpan(orderedAssignments);
    const score = scoreVoicing(orderedAssignments, targets, rootNote, options);
    const fretSignature = STRINGS_LOW_TO_HIGH.map((stringNumber) => String(frets[stringNumber])).join('-');

    return Object.freeze({
      frets: Object.freeze(frets),
      position,
      stretch,
      stringSet: Object.freeze(orderedAssignments.map((item) => item.string)),
      stringSetType: stringSet.label,
      score,
      fretSignature,
      notes: Object.freeze(orderedAssignments.map((item) => Object.freeze({
        string: item.string,
        fret: item.fret,
        note: item.note,
        interval: item.interval,
        pitchClass: item.pitchClass,
        midi: item.midi,
      }))),
    });
  }

  function buildCandidatePool(stringSubset, targets, locationsByTarget, options = {}) {
    return stringSubset.map((stringNumber) => {
      const perString = [];
      targets.forEach((target) => {
        const locations = locationsByTarget[target.id]?.[stringNumber] || [];
        locations.forEach((location) => {
          if (location.fret > options.fretLimit) return;
          perString.push(location);
        });
      });
      return Object.freeze(perString.slice().sort((a, b) => a.fret - b.fret || a.midi - b.midi || a.interval.localeCompare(b.interval)));
    });
  }

  function searchAssignments(stringSubset, targets, locationsByTarget, options = {}) {
    const results = [];
    const maxStretch = getEffectiveMaxStretch(options);
    const targetCount = targets.length;
    const maxVoices = Math.min(6, Number.isInteger(options.maxVoices) ? options.maxVoices : (options.allowDoublings ? Math.min(6, targetCount + 1) : targetCount));

    if (stringSubset.length > maxVoices) return results;

    const candidatePool = buildCandidatePool(stringSubset, targets, locationsByTarget, options);
    const targetIds = targets.map((target) => target.id);

    function walk(stringIndex, assignments, usedTargetIds, minFret, maxFret, lastMidi) {
      if (results.length >= options.maxResults) return;

      if (stringIndex >= stringSubset.length) {
        const coveredAllTargets = targetIds.every((targetId) => usedTargetIds.has(targetId));
        if (!coveredAllTargets) return;
        if (!validatePhysicalConstraints(assignments, options)) return;
        results.push(buildVoicing(assignments, targets, options.rootNote, options));
        return;
      }

      const remainingStrings = stringSubset.length - stringIndex;
      const uncoveredTargets = targetIds.filter((targetId) => !usedTargetIds.has(targetId)).length;
      if (uncoveredTargets > remainingStrings) return;

      const candidates = candidatePool[stringIndex];
      for (const candidate of candidates) {
        const alreadyUsed = usedTargetIds.has(candidate.targetId);
        if (alreadyUsed && !options.allowDoublings) continue;

        const nextUsedTargetIds = new Set(usedTargetIds);
        nextUsedTargetIds.add(candidate.targetId);

        const candidateFret = candidate.fret > 0 ? candidate.fret : null;
        const nextMinFret = candidateFret === null ? minFret : Math.min(minFret === null ? candidateFret : minFret, candidateFret);
        const nextMaxFret = candidateFret === null ? maxFret : Math.max(maxFret === null ? candidateFret : maxFret, candidateFret);
        if (nextMinFret !== null && nextMaxFret !== null && (nextMaxFret - nextMinFret) > maxStretch) continue;

        if (options.requireAscendingPitches !== false && lastMidi !== null && candidate.midi <= lastMidi) continue;

        assignments.push(candidate);
        walk(stringIndex + 1, assignments, nextUsedTargetIds, nextMinFret, nextMaxFret, candidate.midi);
        assignments.pop();

        if (results.length >= options.maxResults) return;
      }
    }

    walk(0, [], new Set(), null, null, null);
    return results;
  }

  function dedupeVoicings(voicings) {
    const seen = new Set();
    const deduped = [];
    voicings.forEach((voicing) => {
      const key = `${voicing.fretSignature}|${voicing.notes.map((note) => note.interval).join(',')}`;
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(voicing);
    });
    return deduped;
  }

  function getVoicings(notesArray, rootNote, options = {}) {
    const resolvedOptions = Object.freeze({ ...DEFAULT_OPTIONS, ...options, rootNote });
    const targets = parseTargets(notesArray, rootNote);
    const fretboard = buildFretboard(resolvedOptions);
    const locationsByTarget = getTargetLocationsByString(targets, { ...resolvedOptions, fretboard });
    const minVoices = targets.length;
    const maxVoices = Math.min(6, Number.isInteger(resolvedOptions.maxVoices)
      ? resolvedOptions.maxVoices
      : (resolvedOptions.allowDoublings ? Math.min(6, targets.length + 1) : targets.length));

    const allVoicings = [];
    for (let voiceCount = minVoices; voiceCount <= maxVoices; voiceCount += 1) {
      const stringSubsets = generateCombinations(STRINGS_LOW_TO_HIGH, voiceCount);
      stringSubsets.forEach((stringSubset) => {
        const subsetResults = searchAssignments(stringSubset, targets, locationsByTarget, { ...resolvedOptions, fretboard });
        subsetResults.forEach((voicing) => allVoicings.push(voicing));
      });
    }

    return sortVoicings(dedupeVoicings(allVoicings), resolvedOptions.sortBy)
      .slice(0, Number.isFinite(resolvedOptions.maxResults) ? resolvedOptions.maxResults : undefined);
  }

  const TEST_CASES = Object.freeze([
    Object.freeze({
      name: 'C7#9',
      notesArray: Object.freeze(['C', 'E', 'G', 'Bb', 'D#']),
      rootNote: 'C',
      options: Object.freeze({ maxStretch: 5, maxResults: 8 }),
    }),
    Object.freeze({
      name: 'Fmin11',
      notesArray: Object.freeze(['F', 'Ab', 'C', 'Eb', 'G', 'Bb']),
      rootNote: 'F',
      options: Object.freeze({ maxStretch: 5, maxResults: 8 }),
    }),
  ]);

  function runSelfTest() {
    return TEST_CASES.map((testCase) => Object.freeze({
      name: testCase.name,
      inputs: Object.freeze({
        notesArray: testCase.notesArray.slice(),
        rootNote: testCase.rootNote,
        options: { ...testCase.options },
      }),
      totalVoicings: getVoicings(testCase.notesArray.slice(), testCase.rootNote, { ...testCase.options, maxResults: Infinity }).length,
      preview: Object.freeze(getVoicings(testCase.notesArray.slice(), testCase.rootNote, { ...testCase.options }).slice(0, 3)),
    }));
  }

  return Object.freeze({
    STANDARD_TUNING,
    DEFAULT_OPTIONS,
    PREFERRED_STRING_SETS,
    INTERVAL_SPECS,
    parseSpelledNote,
    parseScientificNote,
    determineIntervalLabel,
    spellNoteForInterval,
    buildFretboard,
    parseTargets,
    getTargetLocations,
    getTargetLocationsByString,
    generateCombinations,
    validatePhysicalConstraints,
    classifyStringSet,
    scoreVoicing,
    getVoicings,
    TEST_CASES,
    runSelfTest,
  });
});

if (typeof module === 'object' && module.exports && require.main === module) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(module.exports.runSelfTest(), null, 2));
}
