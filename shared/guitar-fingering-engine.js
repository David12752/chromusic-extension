/**
 * ChroMusic — Guitar Fingering Engine
 * ===================================
 * Unified façade over triad/seventh/advanced banks plus the deterministic voicing core.
 */

// eslint-disable-next-line no-var
var ChroMusic = window.ChroMusic || {};

try {
(() => {
  'use strict';
  console.log('%c♪ ChroMusic%c guitar-fingering-engine.js loading...', 'color:#9B59B6;font-weight:bold', 'color:#888');

  const GuitarTriadBank = window.ChroMusic?.GuitarTriadBank;
  const GuitarSeventhBank = window.ChroMusic?.GuitarSeventhBank;
  const GuitarScaleBank = window.ChroMusic?.GuitarScaleBank;
  const GuitarAdvancedBank = window.ChroMusic?.GuitarAdvancedBank;
  const ChordParser = window.ChroMusic?.ChordParser;
  const VoicingGenerator = window.ChroMusic?.VoicingGenerator;

  if (!GuitarTriadBank) throw new Error('GuitarTriadBank is required before GuitarFingeringEngine');
  if (!GuitarSeventhBank) throw new Error('GuitarSeventhBank is required before GuitarFingeringEngine');
  if (!GuitarScaleBank) throw new Error('GuitarScaleBank is required before GuitarFingeringEngine');

  const STRICTNESS_TO_MAX_SPAN = Object.freeze({ strict: 3, musical: 4, extended: 5 });
  const TRIAD_QUALITY_ALIASES = Object.freeze({
    '': 'major',
    maj: 'major',
    major: 'major',
    m: 'minor',
    min: 'minor',
    minor: 'minor',
    dim: 'diminished',
    diminished: 'diminished',
    aug: 'augmented',
    augmented: 'augmented',
  });
  const SEVENTH_QUALITY_ALIASES = Object.freeze({
    maj7: 'major7',
    major7: 'major7',
    M7: 'major7',
    m7: 'minor7',
    min7: 'minor7',
    minor7: 'minor7',
    '7': 'dominant7',
    dom7: 'dominant7',
    dominant7: 'dominant7',
    m7b5: 'halfDiminished',
    halfDiminished: 'halfDiminished',
    halfdiminished: 'halfDiminished',
    dim7: 'diminished7',
    diminished7: 'diminished7',
  });
  const ADVANCED_QUALITY_ALIASES = Object.freeze({
    add9: 'add9',
    'maj9#11': 'major9Sharp11',
    major9Sharp11: 'major9Sharp11',
    'maj7#5': 'major7Sharp5',
    major7Sharp5: 'major7Sharp5',
    '6': 'major6',
    maj6: 'major6',
    major6: 'major6',
    maj11: 'major11',
    major11: 'major11',
    maj13: 'major13',
    major13: 'major13',
    m6: 'minor6',
    min6: 'minor6',
    minor6: 'minor6',
    mMaj7: 'minorMajor7',
    minMaj7: 'minorMajor7',
    minorMajor7: 'minorMajor7',
    mMaj9: 'minorMajor9',
    minMaj9: 'minorMajor9',
    minorMajor9: 'minorMajor9',
    maj9: 'major9',
    major9: 'major9',
    m11: 'minor11',
    min11: 'minor11',
    minor11: 'minor11',
    m13: 'minor13',
    min13: 'minor13',
    minor13: 'minor13',
    m9: 'minor9',
    min9: 'minor9',
    minor9: 'minor9',
    '13': 'dominant13',
    dom13: 'dominant13',
    dominant13: 'dominant13',
    '7b5': 'dominantFlat5',
    dominantFlat5: 'dominantFlat5',
    '7#5': 'dominantSharp5',
    dominantSharp5: 'dominantSharp5',
    alt: 'dominantAlt',
    '7alt': 'dominantAlt',
    dominantAlt: 'dominantAlt',
    '7#11': 'dominantSharp11',
    dominantSharp11: 'dominantSharp11',
    '7b13': 'dominantFlat13',
    dominantFlat13: 'dominantFlat13',
    '7b9': 'dominantFlatNine',
    dominantFlatNine: 'dominantFlatNine',
    '7#9': 'dominantSharpNine',
    dominantSharpNine: 'dominantSharpNine',
    m11b5: 'halfDiminished11',
    halfDiminished11: 'halfDiminished11',
    'maj7#11': 'majorSharp11',
    majorSharp11: 'majorSharp11',
  });
  const NOTE_TO_PC = Object.freeze({
    C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3,
    E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6,
    G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10,
    B: 11, Cb: 11, 'B#': 0,
  });

  function normalizeQuality(quality) {
    return TRIAD_QUALITY_ALIASES[String(quality || '').trim()] || String(quality || '').trim();
  }

  function normalizeSeventhQuality(quality) {
    return SEVENTH_QUALITY_ALIASES[String(quality || '').trim()] || null;
  }

  function normalizeAdvancedFamily(quality) {
    return ADVANCED_QUALITY_ALIASES[String(quality || '').trim()] || null;
  }

  function normalizeStrictness(strictness) {
    return STRICTNESS_TO_MAX_SPAN[strictness] ? strictness : 'musical';
  }

  function getDeterministicGuitarVoicingCore() {
    return window.ChroMusic?.DeterministicGuitarVoicingCore || null;
  }

  function getMaxSpan(strictness, explicitMaxSpan) {
    if (Number.isFinite(explicitMaxSpan)) return explicitMaxSpan;
    return STRICTNESS_TO_MAX_SPAN[normalizeStrictness(strictness)] || 4;
  }

  function normalizePitchClass(value) {
    return ((Number(value) % 12) + 12) % 12;
  }

  function extractPitchClassFromNoteName(noteName) {
    const match = String(noteName || '').trim().match(/^([A-G](?:#|b)?)/);
    if (!match) return null;
    const lookup = NOTE_TO_PC[match[1]];
    return lookup === undefined ? null : lookup;
  }

  function getRequestedBassInfo(parsed, request = {}) {
    const bassNote = parsed?.bassNote || request?.bassNote || null;
    const bassPC = Number.isFinite(parsed?.bassPC)
      ? parsed.bassPC
      : (Number.isFinite(request?.bassPC) ? request.bassPC : extractPitchClassFromNoteName(bassNote));
    return {
      bassNote,
      bassPC: Number.isFinite(bassPC) ? normalizePitchClass(bassPC) : null,
    };
  }

  function buildDeterministicTargetInputs(parsed) {
    return (parsed?.intervals || [])
      .map((interval) => {
        const label = interval?.label || interval?.l;
        if (label === 'Bass') return interval?.noteName || null;
        return label || null;
      })
      .filter(Boolean);
  }

  function getLowestPlayedPosition(variant) {
    return (variant?.positions || [])
      .filter((position) => position && position.fret !== 'X' && position.fret !== null && position.fret !== undefined && position.note)
      .sort((a, b) => b.string - a.string)[0] || null;
  }

  function variantMatchesRequestedBass(variant, bassPC) {
    if (!Number.isFinite(bassPC)) return true;
    const lowestPosition = getLowestPlayedPosition(variant);
    if (!lowestPosition) return false;
    const positionPc = extractPitchClassFromNoteName(lowestPosition.note);
    return Number.isFinite(positionPc) && normalizePitchClass(positionPc) === normalizePitchClass(bassPC);
  }

  function filterVariantsForRequestedBass(variants, bassPC) {
    if (!Number.isFinite(bassPC)) return variants;
    const matched = variants.filter((variant) => variantMatchesRequestedBass(variant, bassPC));
    return matched.length ? matched : variants;
  }

  function assignVariantFingers(positions) {
    const fretted = positions.filter((position) => typeof position.fret === 'number' && position.fret > 0);
    const minFret = fretted.length ? Math.min(...fretted.map((position) => position.fret)) : 1;
    return positions.map((position) => {
      if (typeof position.fret !== 'number' || position.fret <= 0) {
        return { ...position, finger: position.fret === 0 ? 0 : 0 };
      }
      return { ...position, finger: Math.max(1, Math.min(4, position.fret - minFret + 1)) };
    });
  }

  function triadEntryToVariant(entry) {
    const positionsByString = new Map(entry.notes.map((note) => [note.string, note]));
    const positions = [6, 5, 4, 3, 2, 1].map((stringNumber) => {
      const note = positionsByString.get(stringNumber);
      if (!note) return { string: stringNumber, fret: 'X', note: '', interval: '', finger: 0 };
      return {
        string: stringNumber,
        fret: note.fret,
        note: note.note,
        interval: note.interval,
      };
    });
    return Object.freeze({
      id: entry.id,
      source: 'triad-bank',
      label: `${entry.stringSet.join('')} • ${entry.inversion} inversion • ${entry.voicingClass}`,
      root: entry.root,
      quality: entry.quality,
      inversion: entry.inversion,
      voicingType: entry.voicingClass,
      stringSet: entry.stringSet,
      fretSpan: entry.fretSpan,
      playableScore: entry.playableScore,
      positions: Object.freeze(assignVariantFingers(positions).map((position) => Object.freeze(position))),
      notes: entry.notes,
    });
  }

  function seventhEntryToVariant(entry) {
    const positionsByString = new Map(entry.notes.map((note) => [note.string, note]));
    const positions = [6, 5, 4, 3, 2, 1].map((stringNumber) => {
      const note = positionsByString.get(stringNumber);
      if (!note) return { string: stringNumber, fret: 'X', note: '', interval: '', finger: 0 };
      return {
        string: stringNumber,
        fret: note.fret,
        note: note.note,
        interval: note.interval,
      };
    });
    return Object.freeze({
      id: entry.id,
      source: 'seventh-bank',
      label: `${entry.stringSet.join('')} • ${entry.inversion} inversion • ${entry.voicingClass}`,
      root: entry.root,
      quality: entry.quality,
      inversion: entry.inversion,
      voicingType: entry.voicingClass,
      stringSet: entry.stringSet,
      fretSpan: entry.fretSpan,
      playableScore: entry.playableScore,
      positions: Object.freeze(assignVariantFingers(positions).map((position) => Object.freeze(position))),
      notes: entry.notes,
    });
  }

  function deterministicVoicingToVariant(voicing, parsed, index = 0) {
    const positionsByString = new Map((voicing?.notes || []).map((note) => [note.string, note]));
    const positions = [6, 5, 4, 3, 2, 1].map((stringNumber) => {
      const note = positionsByString.get(stringNumber);
      if (!note) return { string: stringNumber, fret: 'X', note: '', interval: '', finger: 0 };
      return {
        string: stringNumber,
        fret: note.fret,
        note: note.note,
        interval: note.interval,
      };
    });

    return Object.freeze({
      id: `deterministic:${parsed?.root || 'unknown'}:${parsed?.quality || ''}:${index}`,
      source: 'deterministic-core',
      label: `${(voicing?.stringSet || []).join('')} • ${voicing?.stringSetType || 'generated'} • pos ${voicing?.position || 0}`,
      root: parsed?.root,
      quality: parsed?.quality,
      inversion: 'generated',
      voicingType: voicing?.stringSetType || 'generated',
      stringSet: voicing?.stringSet || [],
      fretSpan: voicing?.stretch || 0,
      playableScore: Number(voicing?.score || 0),
      positions: Object.freeze(assignVariantFingers(positions).map((position) => Object.freeze(position))),
      notes: Object.freeze((voicing?.notes || []).map((note) => Object.freeze({ ...note }))),
    });
  }

  function computeVariantSpan(variant) {
    const frets = (variant?.positions || []).filter((position) => typeof position.fret === 'number').map((position) => position.fret);
    if (!frets.length) return 0;
    return Math.max(...frets) - Math.min(...frets);
  }

  function tonePriorityScore(variant, options = {}) {
    const intervals = new Set((variant?.positions || []).map((position) => position.interval).filter(Boolean));
    let score = Number(variant?.playableScore || 0);
    if (intervals.has('3') || intervals.has('b3')) score += 15;
    if (intervals.has('7') || intervals.has('b7')) score += 14;
    if (intervals.has('R')) score += 8;
    if (intervals.has('5') || intervals.has('b5') || intervals.has('#5')) score += 2;

    const requiredTones = options.requiredTones || [];
    requiredTones.forEach((tone) => {
      score += intervals.has(tone) ? 10 : -18;
    });

    const preferredTensions = options.preferredTensions || [];
    preferredTensions.forEach((tone) => {
      if (intervals.has(tone)) score += 6;
    });

    score -= computeVariantSpan(variant) * 3;
    return score;
  }

  function rankVariants(variants, options = {}) {
    return variants
      .map((variant) => ({ ...variant, engineScore: tonePriorityScore(variant, options) }))
      .sort((a, b) => b.engineScore - a.engineScore || a.fretSpan - b.fretSpan);
  }

  function findTriadFingerings({ root, quality, stringSet, strictness = 'musical', maxSpan, ...options }) {
    const normalizedQuality = normalizeQuality(quality);
    const limit = getMaxSpan(strictness, maxSpan);
    const stringSets = stringSet ? [Array.isArray(stringSet) ? stringSet.join('') : String(stringSet)] : GuitarTriadBank.STRING_SETS;
    const variants = [];
    stringSets.forEach((setKey) => {
      GuitarTriadBank.getTriads(root, normalizedQuality, setKey, { maxSpan: limit }).forEach((entry) => {
        variants.push(triadEntryToVariant(entry));
      });
    });
    return rankVariants(variants, options);
  }

  function findSeventhFingerings({ root, quality, stringSet, strictness = 'musical', maxSpan, ...options }) {
    const normalizedQuality = normalizeSeventhQuality(quality);
    if (!normalizedQuality) return [];
    const limit = getMaxSpan(strictness, maxSpan);
    const stringSets = stringSet ? [Array.isArray(stringSet) ? stringSet.join('') : String(stringSet)] : GuitarSeventhBank.STRING_SETS;
    const variants = [];
    stringSets.forEach((setKey) => {
      GuitarSeventhBank.getSeventhChords(root, normalizedQuality, setKey, { maxSpan: limit }).forEach((entry) => {
        variants.push(seventhEntryToVariant(entry));
      });
    });
    return rankVariants(variants, options);
  }

  function advancedOptionsForFamily(family) {
    const dominantColors = ['9', 'b9', '#9', '13', 'b13', '#11'];
    const mapping = {
      add9: { requiredTones: ['R', '3', '9'], preferredTensions: ['5'] },
      major9Sharp11: { requiredTones: ['3', '7', '#11'], preferredTensions: ['9', 'R'] },
      major6: { requiredTones: ['R', '3', '13'], preferredTensions: ['5', '9'] },
      major7Sharp5: { requiredTones: ['3', '7', '#5'], preferredTensions: ['9', 'R'] },
      halfDiminished11: { requiredTones: ['b3', 'b5', 'b7'], preferredTensions: ['11', 'R'] },
      minor6: { requiredTones: ['R', 'b3', '13'], preferredTensions: ['5', '9'] },
      minorMajor7: { requiredTones: ['b3', '7'], preferredTensions: ['R', '5'] },
      minorMajor9: { requiredTones: ['b3', '7', '9'], preferredTensions: ['R', '5'] },
      major11: { requiredTones: ['3', '7', '11'], preferredTensions: ['9', 'R'] },
      major13: { requiredTones: ['3', '7', '13'], preferredTensions: ['9', 'R'] },
      major9: { requiredTones: ['3', '7', '9'], preferredTensions: ['R', '5'] },
      minor11: { requiredTones: ['b3', 'b7', '11'], preferredTensions: ['9', 'R'] },
      minor13: { requiredTones: ['b3', 'b7', '13'], preferredTensions: ['9', 'R'] },
      minor9: { requiredTones: ['b3', 'b7', '9'], preferredTensions: ['R', '5'] },
      dominant13: { requiredTones: ['3', 'b7', '13'], preferredTensions: ['9', 'R'] },
      dominantFlat5: { requiredTones: ['3', 'b7', 'b5'], preferredTensions: ['9', 'R'] },
      dominantSharp5: { requiredTones: ['3', 'b7', '#5'], preferredTensions: ['9', 'R'] },
      dominantAlt: { requiredTones: ['3', 'b7'], preferredTensions: dominantColors },
      dominantSharp11: { requiredTones: ['3', 'b7', '#11'], preferredTensions: ['9', 'R'] },
      dominantFlat13: { requiredTones: ['3', 'b7', 'b13'], preferredTensions: ['9', 'R'] },
      dominantFlatNine: { requiredTones: ['3', 'b7', 'b9'], preferredTensions: ['R', '5'] },
      dominantSharpNine: { requiredTones: ['3', 'b7', '#9'], preferredTensions: ['R', '5'] },
      majorSharp11: { requiredTones: ['3', '7', '#11'], preferredTensions: ['9', 'R'] },
    };
    return mapping[family] || {};
  }

  function buildDeterministicSearchOptions(request = {}) {
    const maxSpan = getMaxSpan(request.strictness, request.maxSpan);
    return {
      ...request,
      maxStretch: maxSpan,
      allowAdvancedStretch: maxSpan > 4,
      advancedMaxStretch: Math.max(5, maxSpan),
      maxResults: Number.isFinite(request.maxResults) ? request.maxResults : 32,
      preferRootInBass: Number.isFinite(request.requiredBassPitchClass) ? false : request.preferRootInBass !== false,
      sortBy: request.sortBy === 'position' ? 'position' : 'playability',
    };
  }

  function dedupeVariants(variants) {
    const seen = new Set();
    return variants.filter((variant) => {
      const key = (variant?.positions || [])
        .map((position) => `${position.string}:${position.fret}:${position.interval || ''}`)
        .join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getVoicings(notesArray, rootNote, options = {}) {
    const core = getDeterministicGuitarVoicingCore();
    if (!core?.getVoicings) return [];
    return core.getVoicings(notesArray, rootNote, buildDeterministicSearchOptions(options));
  }

  function findDeterministicChordFingerings(request = {}) {
    const parsed = parsedChordFromRequest(request);
    if (!parsed) return [];

    const intervalLabels = buildDeterministicTargetInputs(parsed);
    const bass = getRequestedBassInfo(parsed, request);

    if (!intervalLabels.length) return [];

    try {
      const searchRequest = Number.isFinite(bass.bassPC)
        ? { ...request, requiredBassPitchClass: bass.bassPC, preferRootInBass: false }
        : request;
      const voicings = getVoicings(intervalLabels, parsed.root, searchRequest);

      return rankVariants(
        filterVariantsForRequestedBass(
          voicings.map((voicing, index) => deterministicVoicingToVariant(voicing, parsed, index)),
          bass.bassPC
        ),
        searchRequest
      );
    } catch (error) {
      console.warn('[ChroMusic] Deterministic voicing core failed:', error);
      return [];
    }
  }

  function findAdvancedFingerings({ root, quality, family, strictness = 'musical', maxSpan, ...options }) {
    const resolvedFamily = family || normalizeAdvancedFamily(quality);
    if (!resolvedFamily || !GuitarAdvancedBank?.getVariants) return [];
    const limit = getMaxSpan(strictness, maxSpan);
    const variants = GuitarAdvancedBank.getVariants(root, resolvedFamily, { maxSpan: limit, ...options });
    return rankVariants(variants, advancedOptionsForFamily(resolvedFamily));
  }

  function parsedChordFromRequest(request) {
    if (request?.symbol && ChordParser?.parseChordSymbol) {
      return ChordParser.parseChordSymbol(request.symbol);
    }
    if (request?.root) {
      const symbol = `${request.root}${request.quality || ''}${request.bassNote ? `/${request.bassNote}` : ''}`;
      return ChordParser?.parseChordSymbol ? ChordParser.parseChordSymbol(symbol) : null;
    }
    return null;
  }

  function getExactBookShapeBank() {
    return window.ChroMusic?.BookExactShapeBank || null;
  }

  function findExactBookFingerings(request = {}) {
    const exactBank = getExactBookShapeBank();
    if (!exactBank?.getShapesForSymbol) return [];
    const parsed = parsedChordFromRequest(request);
    if (!parsed?.root) return [];
    const symbol = request.symbol || `${parsed.root}${parsed.quality || ''}`;
    const exact = exactBank.getShapesForSymbol(symbol);
    return Array.isArray(exact) ? exact : [];
  }

  function findGeneratedChordFingerings(request = {}) {
    const parsed = parsedChordFromRequest(request);
    if (!parsed) return [];
    const bass = getRequestedBassInfo(parsed, request);

    const deterministicVariants = findDeterministicChordFingerings(request);
    if (!VoicingGenerator?.buildChroMusicItem) return deterministicVariants;

    const item = VoicingGenerator.buildChroMusicItem(parsed);
    const maxSpan = getMaxSpan(request.strictness, request.maxSpan);
    const generatedVariants = (item?.guitar?.variants || (item?.guitar ? [item.guitar] : []))
      .map((variant) => {
        const span = computeVariantSpan(variant);
        return {
          ...variant,
          source: 'voicing-generator',
          fretSpan: span,
          playableScore: 100 - (span * 4),
        };
      })
      .filter((variant) => variant.fretSpan <= maxSpan);

    return rankVariants(
      filterVariantsForRequestedBass(dedupeVariants([...deterministicVariants, ...generatedVariants]), bass.bassPC),
      request
    );
  }

  function findChordFingerings(request = {}) {
    const parsed = parsedChordFromRequest(request);
    const effectiveRequest = parsed
      ? {
        ...request,
        root: parsed.root,
        quality: parsed.quality,
        bassNote: parsed.bassNote || request.bassNote || null,
        bassPC: Number.isFinite(parsed.bassPC) ? parsed.bassPC : request.bassPC,
      }
      : request;

    const exactBookFingerings = !parsed?.bassNote ? findExactBookFingerings({ ...effectiveRequest, symbol: request.symbol || (parsed ? `${parsed.root}${parsed.quality || ''}` : request.symbol) }) : [];
    if (exactBookFingerings.length) return exactBookFingerings;

    if (parsed?.bassNote) {
      return findGeneratedChordFingerings({
        ...effectiveRequest,
        symbol: request.symbol || `${parsed.root}${parsed.quality || ''}/${parsed.bassNote}`,
        bassNote: parsed.bassNote,
        bassPC: parsed.bassPC,
      });
    }

    const normalizedQuality = normalizeQuality(effectiveRequest.quality);
    const normalizedSeventhQuality = normalizeSeventhQuality(effectiveRequest.quality);
    const normalizedAdvancedFamily = effectiveRequest.family || normalizeAdvancedFamily(effectiveRequest.quality);
    if (Object.prototype.hasOwnProperty.call(TRIAD_QUALITY_ALIASES, String(effectiveRequest.quality || '').trim()) || ['major', 'minor', 'diminished', 'augmented'].includes(normalizedQuality)) {
      const triads = findTriadFingerings({ ...effectiveRequest, quality: normalizedQuality });
      return triads.length ? triads : findGeneratedChordFingerings(effectiveRequest);
    }
    if (normalizedSeventhQuality) {
      const sevenths = findSeventhFingerings({ ...effectiveRequest, quality: normalizedSeventhQuality });
      return sevenths.length ? sevenths : findGeneratedChordFingerings(effectiveRequest);
    }
    if (normalizedAdvancedFamily) {
      const advanced = findAdvancedFingerings({ ...effectiveRequest, family: normalizedAdvancedFamily });
      return advanced.length ? advanced : findGeneratedChordFingerings(effectiveRequest);
    }
    return findGeneratedChordFingerings(effectiveRequest);
  }

  function chooseDefaultFingering(request = {}) {
    return findChordFingerings(request)[0] || null;
  }

  function getScaleFingerings(root, scaleType = 'major') {
    return GuitarScaleBank.getScalePositions(root, scaleType);
  }

  function getScalePosition(root, scaleType = 'major', positionIndex = 1) {
    return GuitarScaleBank.getScalePosition(root, scaleType, positionIndex);
  }

  ChroMusic.GuitarFingeringEngine = Object.freeze({
    STRICTNESS_TO_MAX_SPAN,
    normalizeQuality,
    normalizeSeventhQuality,
    normalizeAdvancedFamily,
    findTriadFingerings,
    findSeventhFingerings,
    findAdvancedFingerings,
    getVoicings,
    findDeterministicChordFingerings,
    findGeneratedChordFingerings,
    findChordFingerings,
    chooseDefaultFingering,
    getScaleFingerings,
    getScalePosition,
  });

  window.ChroMusic = ChroMusic;
  console.log('%c♪ ChroMusic%c guitar-fingering-engine.js loaded ✓', 'color:#9B59B6;font-weight:bold', 'color:#2ecc71');
})();
} catch (e) {
  console.error('[ChroMusic] guitar-fingering-engine.js FAILED:', e);
}
