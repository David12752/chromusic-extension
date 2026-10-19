/**
 * ChroMusic — Algorithmic Voicing Generator
 * ==========================================
 * Takes a parsed chord (root PC + interval formula) and generates
 * playable guitar and piano voicings in ChroMusic item format.
 * No JSON from the AI is required — works purely from chord name detection.
 */
(() => {
  'use strict';

  const OPEN_MIDI = [40, 45, 50, 55, 59, 64];
  const STRING_TO_INDEX = { 6: 0, 5: 1, 4: 2, 3: 3, 2: 4, 1: 5 };
  const POSITION_TARGETS = { low: 3, mid: 8, high: 12 };
  const PIANO_REGISTER_BASE = { low: 52, mid: 60, high: 67 };
  const PIANO_BASS_BASE = { low: 38, mid: 45, high: 50 };

  const NOTE_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const NOTE_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const FLAT_ROOTS = new Set(['F','Bb','Eb','Ab','Db','Gb','Fb','Cb']);

  /** Semitones from root for each interval label — drives correct fret computation. */
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
    const n = Number(key);
    return Number.isFinite(n) ? ((n % 12) + 12) % 12 : null;
  }

  /**
   * Compute fret on `targetStringIndex` that sounds `intervalSemitones` above
   * the root at `rootFret` on `rootStringIndex`. Chooses octave nearest rootFret.
   */
  function computeFretFromInterval(rootFret, rootStringIndex, targetStringIndex, intervalSemitones) {
    if (intervalSemitones === null || intervalSemitones === undefined) return null;
    let fret = rootFret + intervalSemitones + (OPEN_MIDI[rootStringIndex] - OPEN_MIDI[targetStringIndex]);
    const anchor = rootFret;
    while (fret < anchor - 6) fret += 12;
    while (fret > anchor + 7) fret -= 12;
    if (fret < 0) fret += 12;
    if (fret > 24) fret -= 12;
    if (fret < 0 || fret > 24) return null;
    return fret;
  }

  function noteNames(rootName) {
    return (FLAT_ROOTS.has(rootName) || rootName.endsWith('b'))
      ? NOTE_FLAT : NOTE_SHARP;
  }

  function midiToNoteName(midi, names) {
    const pc  = ((midi % 12) + 12) % 12;
    const oct = Math.floor(midi / 12) - 1; // MIDI octave: C4=60
    return names[pc] + oct;
  }

  function noteToMidi(note) {
    const match = String(note || '').trim().match(/^([A-G](?:#|b)?)(-?\d+)$/);
    if (!match) return null;
    const pitch = match[1];
    const octave = Number(match[2]);
    const pcMap = {
      C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, F: 5, 'F#': 6, Gb: 6,
      G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11,
    };
    const pc = pcMap[pitch];
    if (pc === undefined || !Number.isFinite(octave)) return null;
    return (octave + 1) * 12 + pc;
  }

  function labelOf(iv) {
    return iv.l || iv.label || '';
  }

  function semitonesOf(iv) {
    return iv.s !== undefined ? iv.s : iv.semitones;
  }

  function buildIntervalMap(intervals) {
    const byLabel = {};
    const bySemitone = {};
    for (const iv of intervals) {
      const label = labelOf(iv);
      const semitones = ((semitonesOf(iv) % 12) + 12) % 12;
      if (label) byLabel[label] = semitones;
      bySemitone[semitones] = label;
    }
    return { byLabel, bySemitone };
  }

  function hasLabel(intervalMap, label) {
    return Object.prototype.hasOwnProperty.call(intervalMap.byLabel, label);
  }

  function chooseFirstExisting(intervalMap, options, fallback = null) {
    for (const option of options) {
      if (hasLabel(intervalMap, option)) return option;
    }
    return fallback;
  }

  function uniqueCompact(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function getVoicingLibrary() {
    return window.ChroMusic?.VoicingLibrary || null;
  }

  function getGuitarFingeringEngine() {
    return window.ChroMusic?.GuitarFingeringEngine || null;
  }

  function getGuitarTriadBank() {
    return window.ChroMusic?.GuitarTriadBank || null;
  }

  function getGuitarSeventhBank() {
    return window.ChroMusic?.GuitarSeventhBank || null;
  }

  function getGuitarAdvancedBank() {
    return window.ChroMusic?.GuitarAdvancedBank || null;
  }

  function getGuitarScaleBank() {
    return window.ChroMusic?.GuitarScaleBank || null;
  }

  function detectChordFamily(intervalMap) {
    const library = getVoicingLibrary();
    if (typeof library?.familyFromLabels === 'function') {
      const family = library.familyFromLabels(Object.keys(intervalMap.byLabel));
      if (family) return family;
    }
    if (hasLabel(intervalMap, 'b3') && hasLabel(intervalMap, 'b5') && hasLabel(intervalMap, 'b7')) return 'halfDiminished';
    if (hasLabel(intervalMap, 'b3') && hasLabel(intervalMap, 'dim7')) return 'diminished';
    if (hasLabel(intervalMap, 'b3') && hasLabel(intervalMap, 'b5')) return 'diminished';
    if (hasLabel(intervalMap, '3') && hasLabel(intervalMap, '#5')) return 'augmented';
    if (hasLabel(intervalMap, 'b3') && (hasLabel(intervalMap, 'b7') || hasLabel(intervalMap, '13'))) return 'minor7';
    if (hasLabel(intervalMap, 'b3')) return 'minor';
    if (hasLabel(intervalMap, '11') && !hasLabel(intervalMap, '3') && !hasLabel(intervalMap, 'b3')) return 'sus';
    if (hasLabel(intervalMap, '3') && hasLabel(intervalMap, 'b7')) return 'dominant';
    if (hasLabel(intervalMap, '3') && hasLabel(intervalMap, '7')) return 'major7';
    if (hasLabel(intervalMap, '3')) return 'major';
    return 'other';
  }

  function isPureTriadFamily(intervalMap, family) {
    const labels = Object.keys(intervalMap.byLabel);
    if (!['major', 'minor', 'diminished', 'augmented'].includes(family) && !(family === 'other' && hasLabel(intervalMap, '#5'))) {
      return false;
    }
    return !labels.some((label) => ['7', 'b7', 'dim7', '9', 'b9', '#9', '11', '#11', '13', 'b13', '6'].includes(label));
  }

  function triadQualityFromFamily(intervalMap, family) {
    if (family === 'major') return 'major';
    if (family === 'minor') return 'minor';
    if (family === 'diminished') return 'diminished';
    if (family === 'augmented' || ((family === 'other' || family === 'major') && hasLabel(intervalMap, '3') && hasLabel(intervalMap, '#5'))) return 'augmented';
    return null;
  }

  function isPureSeventhFamily(intervalMap, family) {
    if (!['major7', 'minor7', 'dominant', 'halfDiminished', 'diminished'].includes(family)) return false;
    return !Object.keys(intervalMap.byLabel).some((label) => ['9', 'b9', '#9', '11', '#11', '13', 'b13', '6'].includes(label));
  }

  function seventhQualityFromFamily(intervalMap, family) {
    if (family === 'major7') return 'major7';
    if (family === 'minor7') return 'minor7';
    if (family === 'dominant') return 'dominant7';
    if (family === 'halfDiminished') return 'halfDiminished';
    if (family === 'diminished' && hasLabel(intervalMap, 'dim7')) return 'diminished7';
    return null;
  }

  function findCandidateMidisForPc(targetPc, minMidi = 0, maxMidi = 127) {
    const result = [];
    for (let midi = minMidi; midi <= maxMidi; midi++) {
      if (((midi % 12) + 12) % 12 === ((targetPc % 12) + 12) % 12) {
        result.push(midi);
      }
    }
    return result;
  }

  function closestMidiForPc(targetPc, minimumMidi, preferredMidi, maximumMidi = 127) {
    const candidates = findCandidateMidisForPc(targetPc, minimumMidi, maximumMidi);
    if (!candidates.length) return null;
    let best = candidates[0];
    let bestScore = Math.abs(best - preferredMidi);
    for (const midi of candidates) {
      const score = Math.abs(midi - preferredMidi);
      if (score < bestScore) {
        best = midi;
        bestScore = score;
      }
    }
    return best;
  }

  function assignFingerNumbers(positions) {
    const frettedFrets = positions
      .filter((p) => typeof p.fret === 'number' && p.fret > 0)
      .map((p) => p.fret);
    const uniqueFrets = [...new Set(frettedFrets)].sort((a, b) => a - b);
    // More than 4 unique fret positions means unplayable in a single hand
    if (uniqueFrets.length > 4) {
      return positions.map((p) => ({ ...p, finger: 0 }));
    }
    const fingerMap = {};
    uniqueFrets.forEach((fret, index) => {
      fingerMap[fret] = index + 1; // 1-4
    });
    return positions.map((p) => ({
      ...p,
      // Always recompute — never preserve stale finger values from pattern definitions
      finger: (typeof p.fret === 'number' && p.fret > 0) ? (fingerMap[p.fret] || 1) : 0,
    }));
  }

  function classifyNeckPosition(startFret) {
    if (startFret <= 4) return 'low';
    if (startFret >= 10) return 'high';
    return 'mid';
  }

  function deriveRootStringFromPositions(positions) {
    const rootPosition = (positions || []).find((position) => position.interval === 'R' && typeof position.fret === 'number');
    if (rootPosition) return rootPosition.string;
    const firstFretted = (positions || []).find((position) => typeof position.fret === 'number');
    return firstFretted?.string || 5;
  }

  function normalizeEngineTriadVariant(variant) {
    const positions = assignFingerNumbers((variant?.positions || []).map((position) => ({ ...position })));
    const fretted = positions.filter((position) => typeof position.fret === 'number' && position.fret > 0);
    const startFret = fretted.length ? Math.min(...fretted.map((position) => position.fret)) : 1;
    return {
      id: variant.id,
      label: variant.label,
      rootString: deriveRootStringFromPositions(positions),
      voicingType: variant.voicingType || 'closed',
      neckPosition: classifyNeckPosition(startFret),
      source: variant.source || 'triad-bank',
      intervals: uniqueCompact(positions.map((position) => position.interval)),
      tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
      startFret,
      positions,
      barres: [],
      playableScore: variant.playableScore || 0,
      inversion: variant.inversion || 'root',
      fretSpan: variant.fretSpan || 0,
    };
  }

  function getTriadDrivenVariants(rootName, intervalMap, family) {
    const triadQuality = triadQualityFromFamily(intervalMap, family);
    if (!triadQuality) return [];

    const engine = getGuitarFingeringEngine();
    if (typeof engine?.findTriadFingerings === 'function') {
      return engine.findTriadFingerings({ root: rootName, quality: triadQuality, strictness: 'extended' })
        .map(normalizeEngineTriadVariant);
    }

    const triadBank = getGuitarTriadBank();
    if (!triadBank) return [];

    const variants = [];
    (triadBank.STRING_SETS || []).forEach((stringSet) => {
      const entries = triadBank.getTriads(rootName, triadQuality, stringSet, { maxSpan: 5 });
      entries.forEach((entry) => {
        const positionsByString = new Map(entry.notes.map((note) => [note.string, note]));
        const positions = [6, 5, 4, 3, 2, 1].map((stringNumber) => {
          const note = positionsByString.get(stringNumber);
          if (!note) return { string: stringNumber, fret: 'X', note: '', interval: '', finger: 0 };
          return { string: stringNumber, fret: note.fret, note: note.note, interval: note.interval };
        });
        variants.push(normalizeEngineTriadVariant({
          id: entry.id,
          label: `${entry.stringSet.join('')} • ${entry.inversion} inversion • ${entry.voicingClass}`,
          positions,
          playableScore: entry.playableScore,
          inversion: entry.inversion,
          voicingType: entry.voicingClass,
          fretSpan: entry.fretSpan,
          source: 'triad-bank',
        }));
      });
    });
    return variants;
  }

  function normalizeEngineSeventhVariant(variant) {
    return normalizeEngineTriadVariant({
      ...variant,
      voicingType: variant.voicingType || 'closed',
    });
  }

  function getSeventhDrivenVariants(rootName, intervalMap, family) {
    const seventhQuality = seventhQualityFromFamily(intervalMap, family);
    if (!seventhQuality) return [];

    const engine = getGuitarFingeringEngine();
    if (typeof engine?.findSeventhFingerings === 'function') {
      return engine.findSeventhFingerings({ root: rootName, quality: seventhQuality, strictness: 'extended' })
        .map(normalizeEngineSeventhVariant);
    }

    const seventhBank = getGuitarSeventhBank();
    if (!seventhBank) return [];

    const variants = [];
    (seventhBank.STRING_SETS || []).forEach((stringSet) => {
      const entries = seventhBank.getSeventhChords(rootName, seventhQuality, stringSet, { maxSpan: 5 });
      entries.forEach((entry) => {
        const positionsByString = new Map(entry.notes.map((note) => [note.string, note]));
        const positions = [6, 5, 4, 3, 2, 1].map((stringNumber) => {
          const note = positionsByString.get(stringNumber);
          if (!note) return { string: stringNumber, fret: 'X', note: '', interval: '', finger: 0 };
          return { string: stringNumber, fret: note.fret, note: note.note, interval: note.interval };
        });
        variants.push(normalizeEngineSeventhVariant({
          id: entry.id,
          label: `${entry.stringSet.join('')} • ${entry.inversion} inversion • ${entry.voicingClass}`,
          positions,
          playableScore: entry.playableScore,
          inversion: entry.inversion,
          voicingType: entry.voicingClass,
          fretSpan: entry.fretSpan,
          source: 'seventh-bank',
        }));
      });
    });
    return variants;
  }

  function isAdvancedBankFamily(family) {
    return !!getGuitarAdvancedBank()?.getFamilies?.().includes(family);
  }

  function getAdvancedDrivenVariants(rootName, family) {
    const bank = getGuitarAdvancedBank();
    if (!bank?.getVariants || !isAdvancedBankFamily(family)) return [];
    return bank.getVariants(rootName, family).map((variant) => normalizeEngineSeventhVariant({ ...variant, source: 'advanced-bank' }));
  }

  function getDeterministicDrivenVariants(rootName, quality) {
    const engine = getGuitarFingeringEngine();
    if (!quality || typeof engine?.findDeterministicChordFingerings !== 'function') return [];
    return engine.findDeterministicChordFingerings({ root: rootName, quality, strictness: 'extended', maxResults: 24 })
      .map(normalizeEngineSeventhVariant);
  }

  function getSuggestedScale(rootName, quality, family) {
    const scaleBank = getGuitarScaleBank();
    if (!scaleBank) return null;

    let scaleType = 'major';
    const normalizedQuality = String(quality || '').toLowerCase();
    if (family === 'minor' || (normalizedQuality.startsWith('m') && !normalizedQuality.startsWith('maj') && !normalizedQuality.startsWith('major'))) scaleType = 'naturalMinor';
    if (family === 'diminished') scaleType = 'locrian';
    if (family === 'minor7') scaleType = 'dorian';
    if (family === 'major7') scaleType = 'major';
    if (family === 'halfDiminished') scaleType = 'locrian';
    if (family === 'major9' || family === 'major11' || family === 'major13' || family === 'add9' || family === 'major6') scaleType = 'major';
    if (family === 'major9Sharp11' || family === 'majorSharp11') scaleType = 'lydian';
    if (family === 'majorSharp11') scaleType = 'lydian';
    if (family === 'major7Sharp5') scaleType = 'melodicMinor';
    if (family === 'minor9' || family === 'minor11' || family === 'minor13' || family === 'minor6') scaleType = 'dorian';
    if (family === 'minorMajor7' || family === 'minorMajor9') scaleType = 'melodicMinor';
    if (family === 'halfDiminished11') scaleType = 'locrianNatural2';
    if (family === 'dominantSharp11') scaleType = 'lydianDominant';
    if (family === 'dominantAlt') scaleType = 'altered';
    if (family === 'dominantSharp5') scaleType = 'wholeTone';
    if (family === 'dominantFlat5') scaleType = 'lydianDominant';
    if (normalizedQuality.includes('maj') && normalizedQuality.includes('#11')) scaleType = 'lydian';
    if (family === 'dominant' || family === 'dominant13' || family === 'dominantFlat13' || family === 'dominantFlatNine' || family === 'dominantSharpNine' || normalizedQuality.includes('sus')) scaleType = 'mixolydian';

    const scale = scaleBank.getScale(rootName, scaleType);
    if (!scale) return null;
    return {
      type: scaleType,
      mode: scale.mode,
      parentScale: scale.parentScale,
      positions: scale.positions || [],
    };
  }

  function withAssignedPianoFingers(leftHand, rightHand, voicingType) {
    const leftPatterns = {
      1: [5],
      2: [5, 2],
      3: [5, 3, 1],
      4: [5, 3, 2, 1],
      5: [5, 4, 3, 2, 1],
    };
    const rightPatterns = {
      1: [1],
      2: [1, 5],
      3: [1, 2, 5],
      4: voicingType === 'rootless' ? [1, 2, 4, 5] : [1, 2, 3, 5],
      5: [1, 2, 3, 4, 5],
    };

    const lhPattern = leftPatterns[leftHand.length] || leftPatterns[5];
    const rhPattern = rightPatterns[rightHand.length] || rightPatterns[5];

    return {
      leftHand: leftHand.map((note, index) => ({ ...note, finger: lhPattern[index] || null })),
      rightHand: rightHand.map((note, index) => ({ ...note, finger: rhPattern[index] || null })),
    };
  }

  function buildAscendingMidiStack(rootPC, intervalMap, labels, baseMidi, minGap = 3, maxMidi = 92) {
    const result = [];
    let lastMidi = baseMidi - minGap;
    for (const label of labels) {
      const semitones = intervalMap.byLabel[label];
      if (semitones === undefined) continue;
      const targetPc = (rootPC + semitones + 120) % 12;
      let midi = closestMidiForPc(targetPc, lastMidi + minGap, Math.max(baseMidi, lastMidi + minGap), maxMidi);
      if (midi === null) {
        midi = closestMidiForPc(targetPc, 0, baseMidi, maxMidi);
      }
      if (midi === null) continue;
      result.push({ label, midi });
      lastMidi = midi;
    }
    return result;
  }

  function rotate(array, count) {
    if (!array.length) return [];
    const normalized = ((count % array.length) + array.length) % array.length;
    return array.slice(normalized).concat(array.slice(0, normalized));
  }

  function resolveSlotChoice(intervalMap, slot, fallback = null) {
    if (!Array.isArray(slot)) return slot || fallback;
    return chooseFirstExisting(intervalMap, slot, fallback);
  }

  function resolveSlots(intervalMap, slots) {
    return (slots || []).map((slot) => resolveSlotChoice(intervalMap, slot)).filter(Boolean);
  }

  function getGuitarTemplate(family, rootString, voicingType, neckPosition, intervalMap) {
    const library = getVoicingLibrary();
    const descriptor = library?.getGuitarDescriptors?.(family)?.find((entry) => (
      entry.rootString === rootString
      && entry.voicingType === voicingType
      && (!Array.isArray(entry.positions) || entry.positions.includes(neckPosition))
    ));

    if (descriptor) {
      return {
        strings: descriptor.strings,
        labels: resolveSlots(intervalMap, descriptor.slots),
      };
    }

    const third = chooseFirstExisting(intervalMap, ['3', 'b3', '11', '4'], '3');
    const seventh = chooseFirstExisting(intervalMap, ['7', 'b7', 'dim7', '6'], chooseFirstExisting(intervalMap, ['5', 'b5', '#5'], '5'));
    const fifth = chooseFirstExisting(intervalMap, ['5', 'b5', '#5'], chooseFirstExisting(intervalMap, ['11', '#11', '9'], '5'));
    const topColor = chooseFirstExisting(intervalMap, ['13', 'b13', '#11', '11', '9', 'b9', '#9', '5'], fifth);

    const templates = {
      6: {
        root:  { strings: [6, 4, 3, 2], labels: ['R', fifth, third, seventh] },
        drop2: { strings: [6, 4, 3, 2, 1], labels: ['R', seventh, third, fifth, topColor] },
        drop3: { strings: [6, 5, 4, 3, 2], labels: ['R', fifth, seventh, third, topColor] },
        shell: { strings: [6, 4, 3, 2], labels: ['R', seventh, third, topColor] },
      },
      5: {
        root:  { strings: [5, 4, 3, 2], labels: ['R', fifth, seventh, third] },
        drop2: { strings: [5, 4, 3, 2, 1], labels: ['R', seventh, third, fifth, topColor] },
        drop3: { strings: [5, 3, 2, 1], labels: ['R', seventh, third, topColor] },
        shell: { strings: [5, 4, 3, 2], labels: ['R', seventh, third, topColor] },
      },
      4: {
        root:  { strings: [4, 3, 2, 1], labels: ['R', fifth, seventh, third] },
        drop2: { strings: [4, 3, 2, 1], labels: ['R', seventh, third, topColor] },
        drop3: { strings: [4, 3, 2, 1], labels: ['R', fifth, third, topColor] },
        shell: { strings: [4, 3, 2, 1], labels: ['R', seventh, third, topColor] },
      },
    };

    const familyAdjustedType = family === 'major' || family === 'minor' ? (voicingType === 'drop3' ? 'root' : voicingType) : voicingType;
    return templates[rootString]?.[familyAdjustedType] || templates[5].root;
  }

  function getGuitarLibraryVariants(family) {
    const library = getVoicingLibrary();
    return library?.getGuitarDescriptors?.(family) || [];
  }

  function buildVariantFromPattern(rootPC, intervalMap, rootName, descriptor, neckPosition) {
    if (!Array.isArray(descriptor?.pattern) || !descriptor.pattern.length) return null;

    const names = noteNames(rootName);
    const rootStringIndex = STRING_TO_INDEX[descriptor.rootString];
    const rootOpenPc = OPEN_MIDI[rootStringIndex] % 12;
    const target = POSITION_TARGETS[neckPosition] ?? POSITION_TARGETS.mid;
    let rootFret = (rootPC - rootOpenPc + 12) % 12;
    while (rootFret < target - 2) rootFret += 12;
    while (rootFret > target + 5 && rootFret - 12 >= 0) rootFret -= 12;
    if (rootFret > 15) rootFret -= 12;
    if (rootFret < 0) rootFret += 12;

    const positionsMap = new Map();
    for (const entry of descriptor.pattern) {
      const label = resolveSlotChoice(intervalMap, entry.slot || entry.label, null);
      if (label === null) return null;
      const targetStringIndex = STRING_TO_INDEX[entry.string];
      if (targetStringIndex === undefined) return null;
      // Derive fret from interval label — ignores stale entry.offset values
      const n = slotSemitones(label);
      const fret = (n !== null)
        ? computeFretFromInterval(rootFret, rootStringIndex, targetStringIndex, n)
        : (rootFret + (entry.offset || 0));
      if (fret === null || fret < 0 || fret > 20) return null;
      positionsMap.set(entry.string, {
        string: entry.string,
        fret,
        note: midiToNoteName(OPEN_MIDI[targetStringIndex] + fret, names),
        interval: label,
        finger: null, // computed by assignFingerNumbers from fret position
      });
    }

    const positions = [6, 5, 4, 3, 2, 1].map((stringNumber) => positionsMap.get(stringNumber) || {
      string: stringNumber,
      fret: 'X',
      note: '',
      interval: '',
      finger: 0,
    });

    const fretted = positions.filter((p) => typeof p.fret === 'number' && p.fret > 0);
    if (!fretted.length) return null;
    const fretValues = fretted.map((p) => p.fret);
    const fretSpan = Math.max(...fretValues) - Math.min(...fretValues);
    if (fretSpan > 5) return null; // unplayable span
    const startFret = Math.max(1, Math.min(...fretValues));

    // Detect barre at the lowest fret if 2+ strings share it
    const lowestFret = Math.min(...fretValues);
    const atLowest = fretted.filter((p) => p.fret === lowestFret);
    const barres = atLowest.length >= 2 && lowestFret > 0
      ? [{ fret: lowestFret, fromString: Math.max(...atLowest.map((p) => p.string)), toString: Math.min(...atLowest.map((p) => p.string)) }]
      : [];

    return {
      id: `gtr-${descriptor.rootString}-${descriptor.voicingType}-${neckPosition}`,
      label: `${descriptor.rootString}th string • ${descriptor.voicingType} • ${neckPosition}`,
      rootString: descriptor.rootString,
      voicingType: descriptor.voicingType,
      neckPosition,
      intervals: uniqueCompact(positions.map((p) => p.interval)),
      tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
      startFret,
      fretSpan,
      positions: assignFingerNumbers(positions),
      barres,
    };
  }

  function chooseFretForLabel(rootPC, intervalMap, rootName, stringNumber, label, anchorFret, rangeMin, rangeMax, preferredCenter) {
    const semitones = label === 'R' ? 0 : intervalMap.byLabel[label];
    if (semitones === undefined) return null;
    const stringIndex = STRING_TO_INDEX[stringNumber];
    const openPc = OPEN_MIDI[stringIndex] % 12;
    const targetPc = (rootPC + semitones + 120) % 12;
    let best = null;
    let bestScore = Infinity;

    for (let fret = 0; fret <= 20; fret++) {
      if (((openPc + fret) % 12 + 12) % 12 !== targetPc) continue;
      const penalty = fret < rangeMin || fret > rangeMax ? 8 : 0;
      const score = Math.abs(fret - preferredCenter) + penalty + Math.abs(fret - anchorFret) * 0.35;
      if (score < bestScore) {
        best = fret;
        bestScore = score;
      }
    }

    if (best === null) return null;
    const names = noteNames(rootName);
    const midi = OPEN_MIDI[stringIndex] + best;
    return {
      string: stringNumber,
      fret: best,
      note: midiToNoteName(midi, names),
      interval: label,
    };
  }

  function buildGuitarVariant(rootPC, intervalMap, rootName, family, rootString, voicingType, neckPosition) {
    const descriptor = getGuitarLibraryVariants(family).find((entry) => (
      entry.rootString === rootString
      && entry.voicingType === voicingType
      && (!Array.isArray(entry.positions) || entry.positions.includes(neckPosition))
      && Array.isArray(entry.pattern)
    ));

    if (descriptor) {
      const explicit = buildVariantFromPattern(rootPC, intervalMap, rootName, descriptor, neckPosition);
      if (explicit) return explicit;
    }

    const names = noteNames(rootName);
    const rootStringIndex = STRING_TO_INDEX[rootString];
    const rootOpenPc = OPEN_MIDI[rootStringIndex] % 12;
    const target = POSITION_TARGETS[neckPosition] ?? POSITION_TARGETS.mid;

    let rootFret = (rootPC - rootOpenPc + 12) % 12;
    while (rootFret < target - 2) rootFret += 12;
    while (rootFret > target + 5 && rootFret - 12 >= 0) rootFret -= 12;
    if (rootFret > 15) rootFret -= 12;
    if (rootFret < 0) rootFret += 12;

    const template = getGuitarTemplate(family, rootString, voicingType, neckPosition, intervalMap);
    const rangeMin = Math.max(0, rootFret - 2);
    const rangeMax = Math.min(18, rootFret + (rootString === 4 ? 5 : 4));
    const positionsMap = new Map();

    positionsMap.set(rootString, {
      string: rootString,
      fret: rootFret,
      note: midiToNoteName(OPEN_MIDI[rootStringIndex] + rootFret, names),
      interval: 'R',
    });

    template.strings.forEach((stringNumber, index) => {
      const label = template.labels[index];
      if (!label || positionsMap.has(stringNumber)) return;
      const preferredCenter = rootFret + (stringNumber < rootString ? 1.5 : 0.5);
      const position = chooseFretForLabel(rootPC, intervalMap, rootName, stringNumber, label, rootFret, rangeMin, rangeMax, preferredCenter);
      if (position) positionsMap.set(stringNumber, position);
    });

    const positions = [6, 5, 4, 3, 2, 1].map((stringNumber) => {
      const value = positionsMap.get(stringNumber);
      return value || { string: stringNumber, fret: 'X', note: '', interval: '' };
    });

    const fretted = positions.filter((p) => typeof p.fret === 'number' && p.fret > 0);
    const span = fretted.length ? Math.max(...fretted.map((p) => p.fret)) - Math.min(...fretted.map((p) => p.fret)) : 0;
    if (span > 5) return null;

    const finalPositions = assignFingerNumbers(positions);
    const startFret = fretted.length ? Math.max(1, Math.min(...fretted.map((p) => p.fret))) : 1;
    const usedLabels = uniqueCompact(finalPositions.map((p) => p.interval));

    return {
      id: `gtr-${rootString}-${voicingType}-${neckPosition}`,
      label: `${rootString}th string • ${voicingType} • ${neckPosition}`,
      rootString,
      voicingType,
      neckPosition,
      intervals: usedLabels,
      tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
      startFret,
      positions: finalPositions,
      barres: [],
    };
  }

  function generateGuitarVariants(rootPC, intervals, rootName, quality = '') {
    const intervalMap = buildIntervalMap(intervals);
    const family = detectChordFamily(intervalMap);
    const variants = [];
    const triadDrivenVariants = isPureTriadFamily(intervalMap, family)
      ? getTriadDrivenVariants(rootName, intervalMap, family)
      : [];
    const seventhDrivenVariants = isPureSeventhFamily(intervalMap, family)
      ? getSeventhDrivenVariants(rootName, intervalMap, family)
      : [];
    const advancedDrivenVariants = isAdvancedBankFamily(family)
      ? getAdvancedDrivenVariants(rootName, family)
      : [];
    const deterministicDrivenVariants = getDeterministicDrivenVariants(rootName, quality);

    triadDrivenVariants.forEach((variant) => variants.push(variant));
    seventhDrivenVariants.forEach((variant) => variants.push(variant));
    advancedDrivenVariants.forEach((variant) => variants.push(variant));
    deterministicDrivenVariants.forEach((variant) => variants.push(variant));
    const libraryVariants = getGuitarLibraryVariants(family);

    if (libraryVariants.length) {
      libraryVariants.forEach((descriptor) => {
        const positions = Array.isArray(descriptor.positions) && descriptor.positions.length
          ? descriptor.positions
          : ['mid'];
        positions.forEach((neckPosition) => {
          const variant = buildGuitarVariant(rootPC, intervalMap, rootName, family, descriptor.rootString, descriptor.voicingType, neckPosition);
          if (variant) variants.push(variant);
        });
      });
    } else {
      [6, 5, 4].forEach((rootString) => {
        ['root', 'drop2', 'drop3', 'shell'].forEach((voicingType) => {
          ['low', 'mid', 'high'].forEach((neckPosition) => {
            const variant = buildGuitarVariant(rootPC, intervalMap, rootName, family, rootString, voicingType, neckPosition);
            if (variant) variants.push(variant);
          });
        });
      });
    }

    const deduped = [];
    const seen = new Set();
    for (const variant of variants) {
      const key = variant.positions.map((p) => `${p.string}:${p.fret}:${p.interval}`).join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(variant);
    }

    const defaultVariant = deduped.find((variant) => variant.source === 'deterministic-core' && variant.fretSpan <= 4)
      || deduped.find((variant) => (variant.source === 'triad-bank' || variant.source === 'seventh-bank' || variant.source === 'advanced-bank') && variant.fretSpan <= 3)
      || deduped.find((variant) => variant.rootString === 5 && variant.voicingType === 'root' && variant.neckPosition === 'low')
      || deduped.find((variant) => variant.rootString === 5 && variant.voicingType === 'shell' && variant.neckPosition === 'low')
      || deduped.find((variant) => variant.rootString === 5 && variant.voicingType === 'rootless' && variant.neckPosition === 'low')
      || deduped.find((variant) => variant.rootString === 5 && variant.voicingType === 'shell' && variant.neckPosition === 'low')
      || deduped.find((variant) => variant.rootString === 6 && variant.voicingType === 'shell' && variant.neckPosition === 'mid')
      || deduped[0];

    return {
      ...(defaultVariant || {
        tuning: ['E2','A2','D3','G3','B3','E4'],
        startFret: 1,
        positions: [6, 5, 4, 3, 2, 1].map((string) => ({ string, fret: 'X', finger: 0, note: '', interval: '' })),
        barres: [],
      }),
      variants: deduped,
    };
  }

  function buildPianoBaseLabels(intervalMap, family, voicingType) {
    const library = getVoicingLibrary();
    const descriptor = library?.getPianoDescriptors?.(family)?.find((entry) => entry.voicingType === voicingType && entry.inversion === 'root' && entry.register === 'mid');
    if (descriptor?.right) {
      return resolveSlots(intervalMap, descriptor.right);
    }

    const third = chooseFirstExisting(intervalMap, ['3', 'b3', '11'], '3');
    const seventh = chooseFirstExisting(intervalMap, ['7', 'b7', 'dim7', '6'], null);
    const fifth = chooseFirstExisting(intervalMap, ['5', 'b5', '#5'], '5');
    const color1 = chooseFirstExisting(intervalMap, ['9', '11', '#11', '13', 'b13', 'b9', '#9'], fifth);
    const color2 = chooseFirstExisting(intervalMap, ['13', '11', '#11', '9', 'b13', 'b9', '#9', fifth], null);

    if (voicingType === 'shell') {
      return uniqueCompact([third, seventh, color1]);
    }
    if (voicingType === 'rootless') {
      return uniqueCompact([third, seventh, color1, color2]);
    }
    return uniqueCompact(['R', third, fifth, seventh || color1, color1]);
  }

  function buildHandFromLabels(rootPC, intervalMap, rootName, labels, preferredBase, minGap, maxMidi) {
    const names = noteNames(rootName);
    const stack = buildAscendingMidiStack(rootPC, intervalMap, labels, preferredBase, minGap, maxMidi);
    return stack.map((entry) => ({
      note: midiToNoteName(entry.midi, names),
      interval: entry.label,
    }));
  }

  function buildPianoLeftHand(rootPC, intervalMap, rootName, register) {
    const names = noteNames(rootName);
    const rootMidi = closestMidiForPc(rootPC, 24, PIANO_BASS_BASE[register] || 45, 60);
    const supportLabel = chooseFirstExisting(intervalMap, ['7', 'b7', '5', '3', 'b3'], '5');
    const supportPc = (rootPC + (intervalMap.byLabel[supportLabel] ?? 7) + 120) % 12;
    let supportMidi = closestMidiForPc(supportPc, (rootMidi || 36) + 6, (rootMidi || 36) + 10, 72);
    if (supportMidi !== null && rootMidi !== null && supportMidi - rootMidi < 5) {
      supportMidi += 12;
    }

    return [
      rootMidi === null ? null : { note: midiToNoteName(rootMidi, names), interval: 'R' },
      supportMidi === null ? null : { note: midiToNoteName(supportMidi, names), interval: supportLabel },
    ].filter(Boolean);
  }

  function getPianoDescriptor(family, voicingType, inversion, register) {
    const library = getVoicingLibrary();
    return library?.getPianoDescriptors?.(family)?.find((entry) => (
      entry.voicingType === voicingType
      && entry.inversion === inversion
      && entry.register === register
    )) || null;
  }

  function getPianoLibraryVariants(family) {
    const library = getVoicingLibrary();
    return library?.getPianoDescriptors?.(family) || [];
  }

  function calculateGuitarVariantProfile(variant) {
    const fretted = (variant?.positions || []).filter((p) => typeof p.fret === 'number');
    return {
      avgFret: fretted.length ? fretted.reduce((sum, p) => sum + p.fret, 0) / fretted.length : 0,
      activeStrings: fretted.map((p) => p.string).sort((a, b) => a - b),
      rootString: variant?.rootString || 5,
      voicingType: variant?.voicingType || 'root',
      neckPosition: variant?.neckPosition || 'mid',
    };
  }

  function calculatePianoVariantProfile(variant) {
    const midis = [...(variant?.leftHand || []), ...(variant?.rightHand || [])]
      .map((n) => noteToMidi(n.note))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    return {
      avgMidi: midis.length ? midis.reduce((sum, value) => sum + value, 0) / midis.length : 60,
      lowMidi: midis[0] ?? 48,
      highMidi: midis[midis.length - 1] ?? 72,
      voicingType: variant?.voicingType || 'rootless',
      inversion: variant?.inversion || 'root',
      register: variant?.register || 'mid',
    };
  }

  function scoreGuitarTransition(previousVariant, nextVariant) {
    if (!previousVariant) {
      const profile = calculateGuitarVariantProfile(nextVariant);
      let score = 0;
      if (profile.rootString === 5) score += 20;
      if (profile.voicingType === 'shell') score += 12;
      if (profile.neckPosition === 'low') score += 10;
      score -= Math.abs(profile.avgFret - 5);
      return score;
    }

    const prev = calculateGuitarVariantProfile(previousVariant);
    const next = calculateGuitarVariantProfile(nextVariant);
    const sharedStrings = next.activeStrings.filter((value) => prev.activeStrings.includes(value)).length;
    let score = 0;
    score -= Math.abs(next.avgFret - prev.avgFret) * 6;
    score += sharedStrings * 4;
    if (next.rootString === prev.rootString) score += 8;
    if (next.voicingType === prev.voicingType) score += 5;
    if (next.neckPosition === prev.neckPosition) score += 4;
    if (next.voicingType === 'shell') score += 2;
    return score;
  }

  function scorePianoTransition(previousVariant, nextVariant) {
    if (!previousVariant) {
      const profile = calculatePianoVariantProfile(nextVariant);
      let score = 0;
      if (profile.voicingType === 'rootless') score += 18;
      if (profile.register === 'mid') score += 10;
      score -= Math.abs(profile.avgMidi - 62) * 0.75;
      return score;
    }

    const prev = calculatePianoVariantProfile(previousVariant);
    const next = calculatePianoVariantProfile(nextVariant);
    let score = 0;
    score -= Math.abs(next.avgMidi - prev.avgMidi) * 1.5;
    score -= Math.abs(next.lowMidi - prev.lowMidi) * 0.5;
    score -= Math.abs(next.highMidi - prev.highMidi) * 0.5;
    if (next.voicingType === prev.voicingType) score += 6;
    if (next.register === prev.register) score += 4;
    if (next.voicingType === 'rootless') score += 3;
    return score;
  }

  function chooseBestVariant(variants, previousVariant, scorer) {
    if (!Array.isArray(variants) || !variants.length) return null;
    let best = variants[0];
    let bestScore = scorer(previousVariant, best);
    for (let index = 1; index < variants.length; index++) {
      const candidate = variants[index];
      const score = scorer(previousVariant, candidate);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  }

  function applyProgressionVoiceLeading(items) {
    let previousGuitar = null;
    let previousPiano = null;

    return items.map((item) => {
      const guitarVariants = item?.guitar?.variants || (item?.guitar ? [item.guitar] : []);
      const pianoVariants = item?.piano?.variants || (item?.piano ? [item.piano] : []);
      const selectedGuitar = chooseBestVariant(guitarVariants, previousGuitar, scoreGuitarTransition) || item.guitar;
      const selectedPiano = chooseBestVariant(pianoVariants, previousPiano, scorePianoTransition) || item.piano;

      previousGuitar = selectedGuitar;
      previousPiano = selectedPiano;

      return {
        ...item,
        guitar: item.guitar ? { ...item.guitar, ...selectedGuitar, variants: guitarVariants } : item.guitar,
        piano: item.piano ? { ...item.piano, ...selectedPiano, variants: pianoVariants } : item.piano,
      };
    });
  }

  function buildPianoVariant(rootPC, intervalMap, rootName, family, voicingType, inversion, register) {
    const names = noteNames(rootName);
    const descriptor = getPianoDescriptor(family, voicingType, inversion, register);
    const baseLabels = descriptor?.right ? resolveSlots(intervalMap, descriptor.right) : buildPianoBaseLabels(intervalMap, family, voicingType);
    if (!baseLabels.length) return null;

    const inversionIndex = inversion === 'root' ? 0 : Number(String(inversion).replace(/[^0-9]/g, '')) || 0;
    const rotated = descriptor?.right ? baseLabels : rotate(baseLabels, Math.min(inversionIndex, Math.max(baseLabels.length - 1, 0)));
    const stacked = buildAscendingMidiStack(rootPC, intervalMap, rotated, PIANO_REGISTER_BASE[register] || 60, 3, 96);
    if (!stacked.length) return null;

    let rightHand = stacked;
    if (voicingType === 'drop2' && stacked.length >= 4) {
      const copied = [...stacked];
      copied[copied.length - 2] = { ...copied[copied.length - 2], midi: copied[copied.length - 2].midi - 12 };
      copied.sort((a, b) => a.midi - b.midi);
      rightHand = copied;
    }

    const leftHand = descriptor?.left
      ? buildHandFromLabels(rootPC, intervalMap, rootName, resolveSlots(intervalMap, descriptor.left), PIANO_BASS_BASE[register] || 45, 5, 72)
      : buildPianoLeftHand(rootPC, intervalMap, rootName, register);
    const assigned = withAssignedPianoFingers(leftHand, rightHand.map((entry) => ({
      note: midiToNoteName(entry.midi, names),
      interval: entry.label,
    })), voicingType);

    return {
      id: `pno-${voicingType}-${inversion}-${register}`,
      label: `${voicingType} • ${inversion} inversion • ${register}`,
      voicingType,
      inversion,
      register,
      leftHand: assigned.leftHand,
      rightHand: assigned.rightHand,
    };
  }

  function generatePianoVoicing(rootPC, intervals, rootName) {
    const intervalMap = buildIntervalMap(intervals);
    const family = detectChordFamily(intervalMap);
    const variants = [];
    const libraryVariants = getPianoLibraryVariants(family);

    if (libraryVariants.length) {
      libraryVariants.forEach((descriptor) => {
        const variant = buildPianoVariant(rootPC, intervalMap, rootName, family, descriptor.voicingType, descriptor.inversion, descriptor.register);
        if (variant) variants.push(variant);
      });
    } else {
      ['closed', 'rootless', 'drop2', 'shell'].forEach((voicingType) => {
        ['root', '1st', '2nd', '3rd'].forEach((inversion) => {
          ['low', 'mid', 'high'].forEach((register) => {
            const variant = buildPianoVariant(rootPC, intervalMap, rootName, family, voicingType, inversion, register);
            if (variant) variants.push(variant);
          });
        });
      });
    }

    const deduped = [];
    const seen = new Set();
    for (const variant of variants) {
      const key = [...variant.leftHand, ...variant.rightHand].map((n) => `${n.note}:${n.interval}`).join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(variant);
    }

    const defaultVariant = deduped.find((variant) => variant.voicingType === 'rootless' && variant.inversion === 'root' && variant.register === 'mid')
      || deduped.find((variant) => variant.voicingType === 'shell' && variant.register === 'mid')
      || deduped.find((variant) => variant.voicingType === 'closed' && variant.inversion === 'root' && variant.register === 'mid')
      || deduped[0];

    return {
      ...(defaultVariant || { leftHand: [], rightHand: [] }),
      variants: deduped,
    };
  }

  /* ── Combine into a ChroMusic item ───────────────────── */
  function buildChroMusicItem(parsed) {
    const { root, quality, rootPC, intervals, symbol, bassNote = null, bassPC = null } = parsed;
    const musicalIntervals = (intervals || []).filter((iv) => (iv?.label || iv?.l) !== 'Bass');

    // Adapt intervals to look like the internal format (s/l fields)
    const ivs = musicalIntervals.map(iv => ({
      s: iv.semitones,
      l: iv.label,
      label: iv.label,
    }));

    const intervalMap = buildIntervalMap(ivs);
    const family = detectChordFamily(intervalMap);
    const guitar = generateGuitarVariants(rootPC, ivs, root, quality);
    const piano  = generatePianoVoicing(rootPC, ivs, root);
    const suggestedScale = getSuggestedScale(root, quality, family);

    const displaySymbol = symbol || `${root}${quality || ''}${bassNote ? `/${bassNote}` : ''}`;
    return {
      type: 'voicing',
      label: displaySymbol,
      symbol: displaySymbol,
      root,
      quality,
      bassNote,
      bassPC,
      context: 'Auto-generated from chat',
      family,
      suggestedScale,
      guitar,
      piano,
    };
  }

  /**
   * Convert an array of parsed chord objects (from ChordParser.findChordsInText)
   * into a full ChroMusic-validated items array.
   */
  function generateItemsFromChords(parsedChords) {
    const items = [];
    for (const parsed of parsedChords) {
      try {
        items.push(buildChroMusicItem(parsed));
      } catch (e) {
        console.warn('[ChroMusic] VoicingGenerator skipped', parsed.symbol, e);
      }
    }
    return applyProgressionVoiceLeading(items);
  }

  /* ── Export ─────────────────────────────────────────── */
  try {
    if (typeof window !== 'undefined') {
      window.ChroMusic = window.ChroMusic || {};
      window.ChroMusic.VoicingGenerator = {
        generateItemsFromChords,
        buildChroMusicItem,
        generateGuitarVoicing: generateGuitarVariants,
        generatePianoVoicing,
      };
    }
    console.log('%c♪ ChroMusic', 'color:#9B59B6;font-weight:bold', 'VoicingGenerator loaded');
  } catch (e) {
    console.error('[ChroMusic] voicing-generator.js init failed:', e);
  }
})();
