/**
 * ChroMusic — Book Chord Shape Bank
 * =================================
 * Materializes the attached chord-book catalog into a searchable bank of
 * source-backed guitar shapes with page references and all generated positions.
 */

// eslint-disable-next-line no-var
var ChroMusic = window.ChroMusic || {};

try {
(() => {
  'use strict';
  console.log('%c♪ ChroMusic%c book-chord-shape-bank.js loading...', 'color:#9B59B6;font-weight:bold', 'color:#888');

  const ChordBookCatalog = window.ChroMusic?.ChordBookCatalog;
  const GuitarFingeringEngine = window.ChroMusic?.GuitarFingeringEngine;
  const BookExactShapeBank = window.ChroMusic?.BookExactShapeBank;

  if (!ChordBookCatalog) {
    throw new Error('ChordBookCatalog is required before BookChordShapeBank');
  }
  if (!GuitarFingeringEngine) {
    throw new Error('GuitarFingeringEngine is required before BookChordShapeBank');
  }

  const DEFAULT_OPTIONS = Object.freeze({
    strictness: 'extended',
    maxResults: Infinity,
  });

  const cache = new Map();

  function getCacheKey(symbol, options = {}) {
    return `${symbol}::${options.strictness || DEFAULT_OPTIONS.strictness}::${Number.isFinite(options.maxResults) ? options.maxResults : 'all'}`;
  }

  function cloneVariant(variant, symbol, pages) {
    const entry = ChordBookCatalog.getEntry(symbol);
    return Object.freeze({
      ...variant,
      bookSymbol: symbol,
      bookPages: Object.freeze((pages || []).slice()),
      bookAliases: Object.freeze((entry?.aliases || [symbol]).slice()),
      bookSourceRefs: Object.freeze((entry?.sourceRefs || []).slice()),
      source: variant?.source || 'book-shape-bank',
    });
  }

  function getShapesForSymbol(symbol, options = {}) {
    const resolvedSymbol = String(symbol || '').trim();
    if (!resolvedSymbol || !ChordBookCatalog.CHORD_SYMBOLS.includes(resolvedSymbol)) return [];

    const resolvedOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
    const cacheKey = getCacheKey(resolvedSymbol, resolvedOptions);
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const entry = ChordBookCatalog.getEntry(resolvedSymbol);
    const pages = entry?.pages || [];
    const exactShapes = BookExactShapeBank?.getShapesForSymbol?.(resolvedSymbol) || [];
    if (exactShapes.length) {
      const exact = Object.freeze(exactShapes.map((variant) => cloneVariant(variant, resolvedSymbol, pages)));
      cache.set(cacheKey, exact);
      return exact;
    }
    const variants = GuitarFingeringEngine.findChordFingerings({
      symbol: resolvedSymbol,
      strictness: resolvedOptions.strictness,
      maxResults: resolvedOptions.maxResults,
    }) || [];

    const shaped = Object.freeze(variants.map((variant) => cloneVariant(variant, resolvedSymbol, pages)));
    cache.set(cacheKey, shaped);
    return shaped;
  }

  function getBookEntry(symbol, options = {}) {
    const entry = ChordBookCatalog.getEntry(symbol);
    if (!entry) return null;

    return Object.freeze({
      ...entry,
      pages: Object.freeze((entry.pages || []).slice()),
      aliases: Object.freeze((entry.aliases || [entry.symbol]).slice()),
      sourceRefs: Object.freeze((entry.sourceRefs || []).slice()),
      variants: getShapesForSymbol(entry.symbol, options),
    });
  }

  function getAllEntries(options = {}) {
    return Object.freeze(ChordBookCatalog.CHORD_SYMBOLS.map((symbol) => Object.freeze(getBookEntry(symbol, options))));
  }

  function summarizeCoverage(options = {}) {
    const rows = ChordBookCatalog.CHORD_SYMBOLS.map((symbol) => ({
      symbol,
      pages: ChordBookCatalog.getPageReferences(symbol),
      count: getShapesForSymbol(symbol, options).length,
    }));

    return Object.freeze({
      totalSymbols: rows.length,
      resolvedSymbols: rows.filter((row) => row.count > 0).length,
      unresolvedSymbols: Object.freeze(rows.filter((row) => row.count === 0)),
      minVariants: rows.length ? Math.min(...rows.map((row) => row.count)) : 0,
      maxVariants: rows.length ? Math.max(...rows.map((row) => row.count)) : 0,
      rows: Object.freeze(rows.map((row) => Object.freeze(row))),
    });
  }

  ChroMusic.BookChordShapeBank = Object.freeze({
    DEFAULT_OPTIONS,
    getShapesForSymbol,
    getBookEntry,
    getAllEntries,
    summarizeCoverage,
  });

  window.ChroMusic = ChroMusic;
  console.log('%c♪ ChroMusic%c book-chord-shape-bank.js loaded ✓', 'color:#9B59B6;font-weight:bold', 'color:#2ecc71');
})();
} catch (e) {
  console.error('[ChroMusic] book-chord-shape-bank.js FAILED:', e);
}
