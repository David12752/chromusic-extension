/**
 * ChroMusic — Book Exact Shape Bank
 * =================================
 * Pins exact book/image chord diagrams where the source provides a fixed grip,
 * instead of relying only on generated voicings.
 */

// eslint-disable-next-line no-var
var ChroMusic = window.ChroMusic || {};

try {
(() => {
  'use strict';
  console.log('%c♪ ChroMusic%c book-exact-shape-bank.js loading...', 'color:#9B59B6;font-weight:bold', 'color:#888');

  const GuitarNoteMap = window.ChroMusic?.GuitarNoteMap;
  const ChordBookCatalog = window.ChroMusic?.ChordBookCatalog;
  const ChordParser = window.ChroMusic?.ChordParser;

  if (!GuitarNoteMap) throw new Error('GuitarNoteMap is required before BookExactShapeBank');
  if (!ChordBookCatalog) throw new Error('ChordBookCatalog is required before BookExactShapeBank');
  if (!ChordParser?.parseChordSymbol) throw new Error('ChordParser is required before BookExactShapeBank');

  const STRINGS_LOW_TO_HIGH = Object.freeze([6, 5, 4, 3, 2, 1]);

  const FAMILY_BASES = Object.freeze({
    E: Object.freeze({
      '': '0 2 2 1 0 0',
      m: '0 2 2 0 0 0',
      '6': '0 2 2 1 2 0',
      '7': '0 2 0 1 0 0',
      '9': '0 2 0 1 0 2',
      m6: '0 2 2 0 2 0',
      m7: '0 2 0 0 0 0',
      maj7: '0 2 1 1 0 0',
      dim: 'X X 2 3 2 3',
      aug: '0 3 2 1 1 0',
      sus4: '0 2 2 2 0 0',
    }),
    A: Object.freeze({
      '': 'X 0 2 2 2 0',
      m: 'X 0 2 2 1 0',
      '6': 'X 0 2 2 2 2',
      '7': 'X 0 2 0 2 0',
      '9': 'X 0 2 4 2 3',
      m6: 'X 0 2 2 1 2',
      m7: 'X 0 2 0 1 0',
      maj7: 'X 0 2 1 2 0',
      dim: 'X 0 1 2 1 2',
      aug: 'X 0 3 2 2 1',
      sus4: 'X 0 2 2 3 0',
    }),
    C: Object.freeze({
      '': 'X 3 2 0 1 0',
      m: 'X 3 5 5 4 3',
      '6': 'X 3 2 2 1 0',
      '7': 'X 3 2 3 1 0',
      '9': 'X 3 2 3 3 3',
      m6: 'X 3 1 2 1 3',
      m7: 'X 3 5 3 4 3',
      maj7: 'X 3 2 0 0 0',
      dim: 'X 3 4 2 4 2',
      aug: 'X 3 2 1 1 0',
      sus4: 'X 3 3 0 1 1',
    }),
    D: Object.freeze({
      '': 'X X 0 2 3 2',
      m: 'X X 0 2 3 1',
      '6': 'X X 0 2 0 2',
      '7': 'X X 0 2 1 2',
      '9': 'X X 0 2 1 0',
      m6: 'X X 0 2 0 1',
      m7: 'X X 0 2 1 1',
      maj7: 'X X 0 2 2 2',
      dim: 'X X 0 1 0 1',
      aug: 'X X 0 3 3 2',
      sus4: 'X X 0 2 3 3',
    }),
    G: Object.freeze({
      '': '3 2 0 0 0 3',
      m: '3 5 5 3 3 3',
      '6': '3 2 0 0 0 0',
      '7': '3 2 0 0 0 1',
      '9': '3 X 3 2 3 X',
      m6: '3 X 2 3 3 3',
      m7: '3 5 3 3 3 3',
      maj7: '3 X 4 4 3 2',
      dim: '3 X 2 3 2 3',
      aug: '3 2 1 0 0 3',
      sus4: '3 3 0 0 1 3',
    }),
  });

  const IMAGE_GRID_DEFINITIONS = Object.freeze([
    Object.freeze({ imageRef: 'image-1', family: 'E', roots: Object.freeze(['E', 'F', 'F#']) }),
    Object.freeze({ imageRef: 'image-1', family: 'G', roots: Object.freeze(['G']) }),
    Object.freeze({ imageRef: 'image-2', family: 'C', roots: Object.freeze(['C', 'Db']) }),
    Object.freeze({ imageRef: 'image-2', family: 'D', roots: Object.freeze(['D', 'Eb']) }),
    Object.freeze({ imageRef: 'image-3', family: 'E', roots: Object.freeze(['Ab']) }),
    Object.freeze({ imageRef: 'image-3', family: 'A', roots: Object.freeze(['A', 'Bb', 'B']) }),
  ]);

  const FAMILY_ROOTS = Object.freeze({ E: 'E', A: 'A', C: 'C', D: 'D', G: 'G' });
  const ROOT_TO_PC = Object.freeze({ C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 });

  function normalizePitchClass(value) {
    return ((Number(value) % 12) + 12) % 12;
  }

  function splitCode(code) {
    return String(code || '').trim().split(/\s+/g);
  }

  function transposeCode(code, semitones) {
    return splitCode(code).map((token) => {
      if (/^x$/i.test(token)) return 'X';
      const value = Number(token);
      return Number.isFinite(value) ? String(value + semitones) : 'X';
    }).join(' ');
  }

  function familyCodeForRoot(family, root, quality) {
    const baseRoot = FAMILY_ROOTS[family];
    const baseCode = FAMILY_BASES[family]?.[quality];
    if (!baseRoot || !baseCode) return null;
    const delta = normalizePitchClass(ROOT_TO_PC[root] - ROOT_TO_PC[baseRoot]);
    return transposeCode(baseCode, delta);
  }

  function buildShapeCodeMap() {
    const map = Object.create(null);
    IMAGE_GRID_DEFINITIONS.forEach((definition) => {
      definition.roots.forEach((root) => {
        Object.keys(FAMILY_BASES[definition.family]).forEach((quality) => {
          const symbol = `${root}${quality}`;
          const code = familyCodeForRoot(definition.family, root, quality);
          if (!code) return;
          map[symbol] = Object.freeze({
            symbol,
            quality,
            imageRef: definition.imageRef,
            fretCode: code,
          });
        });
      });
    });
    return Object.freeze(map);
  }

  const SHAPE_CODE_MAP = buildShapeCodeMap();

  function pickIntervalLabel(parsed, pitchClass) {
    const direct = (parsed?.intervals || []).find((interval) => interval && interval.label !== 'Bass' && normalizePitchClass(interval.notePC) === normalizePitchClass(pitchClass));
    return direct?.label || '';
  }

  function inferBarres(positions) {
    const fretted = positions.filter((position) => typeof position.fret === 'number' && position.fret > 0);
    if (!fretted.length) return [];
    const byFret = fretted.reduce((map, position) => {
      const key = position.fret;
      if (!map[key]) map[key] = [];
      map[key].push(position.string);
      return map;
    }, Object.create(null));

    return Object.keys(byFret).map(Number).sort((a, b) => a - b).flatMap((fret) => {
      const strings = byFret[fret].slice().sort((a, b) => b - a);
      if (strings.length < 2) return [];
      const contiguous = [];
      let run = [strings[0]];
      for (let index = 1; index < strings.length; index += 1) {
        if (strings[index] === strings[index - 1] - 1) run.push(strings[index]);
        else {
          if (run.length >= 2) contiguous.push(run.slice());
          run = [strings[index]];
        }
      }
      if (run.length >= 2) contiguous.push(run.slice());
      return contiguous.map((runStrings) => Object.freeze({
        fret,
        fromString: Math.max(...runStrings),
        toString: Math.min(...runStrings),
      }));
    });
  }

  function assignFingers(positions, barres) {
    const barreStrings = new Map();
    (barres || []).forEach((barre) => {
      for (let stringNumber = barre.fromString; stringNumber >= barre.toString; stringNumber -= 1) {
        barreStrings.set(stringNumber, 1);
      }
    });
    const fretted = positions.filter((position) => typeof position.fret === 'number' && position.fret > 0 && !barreStrings.has(position.string));
    const uniqueFrets = [...new Set(fretted.map((position) => position.fret))].sort((a, b) => a - b);
    const fingerMap = new Map(uniqueFrets.map((fret, index) => [fret, Math.max(1, Math.min(4, index + 2))]));

    return positions.map((position) => {
      if (typeof position.fret !== 'number' || position.fret <= 0) return Object.freeze({ ...position, finger: 0 });
      if (barreStrings.has(position.string)) return Object.freeze({ ...position, finger: 1 });
      return Object.freeze({ ...position, finger: fingerMap.get(position.fret) || 1 });
    });
  }

  function buildVariant(symbol, shapeDefinition) {
    const parsed = ChordParser.parseChordSymbol(symbol);
    if (!parsed) return null;
    const entry = ChordBookCatalog.getEntry(symbol);
    if (!entry) return null;

    const positions = splitCode(shapeDefinition.fretCode).map((token, index) => {
      const stringNumber = STRINGS_LOW_TO_HIGH[index];
      if (/^x$/i.test(token)) return Object.freeze({ string: stringNumber, fret: 'X', note: '', interval: '', finger: 0 });
      const fret = Number(token);
      if (!Number.isFinite(fret)) return Object.freeze({ string: stringNumber, fret: 'X', note: '', interval: '', finger: 0 });
      const noteCell = GuitarNoteMap.getNoteAt(stringNumber, fret);
      return Object.freeze({
        string: stringNumber,
        fret,
        note: noteCell?.scientific || noteCell?.sharpName || '',
        interval: pickIntervalLabel(parsed, noteCell?.pitchClass),
        finger: 0,
      });
    });

    const fretted = positions.filter((position) => typeof position.fret === 'number' && position.fret > 0);
    const startFret = fretted.length ? Math.min(...fretted.map((position) => position.fret)) : 1;
    const fretSpan = fretted.length ? Math.max(...fretted.map((position) => position.fret)) - startFret : 0;
    const barres = Object.freeze(inferBarres(positions));
    const fingeredPositions = Object.freeze(assignFingers(positions, barres));

    return Object.freeze({
      id: `book-exact:${symbol}`,
      source: 'book-exact-image-grid',
      label: `${symbol} • exact book/image grip`,
      root: parsed.root,
      quality: parsed.quality,
      inversion: 'book-exact',
      voicingType: 'book-exact',
      stringSet: Object.freeze(fingeredPositions.filter((position) => typeof position.fret === 'number').map((position) => position.string)),
      fretSpan,
      playableScore: 1000,
      positions: fingeredPositions,
      startFret,
      barres,
      bookSymbol: symbol,
      bookPages: Object.freeze((entry.pages || []).slice()),
      bookAliases: Object.freeze((entry.aliases || [symbol]).slice()),
      bookSourceRefs: Object.freeze((entry.sourceRefs || []).slice()),
      imageRef: shapeDefinition.imageRef,
      exactFromBookImage: true,
    });
  }

  const EXACT_VARIANTS = Object.freeze(Object.keys(SHAPE_CODE_MAP).reduce((map, symbol) => {
    const variant = buildVariant(symbol, SHAPE_CODE_MAP[symbol]);
    if (variant) map[symbol] = Object.freeze([variant]);
    return map;
  }, Object.create(null)));

  function getShapesForSymbol(symbol) {
    return EXACT_VARIANTS[String(symbol || '').trim()] || [];
  }

  function hasShapesForSymbol(symbol) {
    return getShapesForSymbol(symbol).length > 0;
  }

  ChroMusic.BookExactShapeBank = Object.freeze({
    SHAPE_CODE_MAP,
    getShapesForSymbol,
    hasShapesForSymbol,
  });

  window.ChroMusic = ChroMusic;
  console.log('%c♪ ChroMusic%c book-exact-shape-bank.js loaded ✓', 'color:#9B59B6;font-weight:bold', 'color:#2ecc71');
})();
} catch (e) {
  console.error('[ChroMusic] book-exact-shape-bank.js FAILED:', e);
}
