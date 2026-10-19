(() => {
  'use strict';

  const ENHARMONIC_MAP = Object.freeze({
    'C#': 'Db',
    'D#': 'Eb',
    'F#': 'Gb',
    'G#': 'Ab',
    'A#': 'Bb',
  });
  const BOOK_ROOTS = Object.freeze(['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab']);
  const ROOT_PAGE_BLOCKS = Object.freeze({
    A: 4,
    Bb: 14,
    B: 24,
    C: 34,
    Db: 44,
    D: 54,
    Eb: 64,
    E: 74,
    F: 84,
    Gb: 94,
    G: 104,
    Ab: 114,
  });
  const IMAGE_SOURCE_REFS = Object.freeze([
    Object.freeze({ id: 'image-1', label: 'Attached image 1' }),
    Object.freeze({ id: 'image-2', label: 'Attached image 2' }),
    Object.freeze({ id: 'image-3', label: 'Attached image 3' }),
  ]);
  const IMAGE_GRID_QUALITIES = Object.freeze(['', 'm', '6', '7', '9', 'm6', 'm7', 'maj7', 'dim', 'aug', 'sus4']);
  const IMAGE_SOURCE_GROUPS = Object.freeze([
    Object.freeze({ id: 'image-1', roots: Object.freeze(['E', 'F', 'F#', 'G']), qualities: IMAGE_GRID_QUALITIES }),
    Object.freeze({ id: 'image-2', roots: Object.freeze(['C', 'Db', 'D', 'Eb']), qualities: IMAGE_GRID_QUALITIES }),
    Object.freeze({ id: 'image-3', roots: Object.freeze(['Ab', 'A', 'Bb', 'B']), qualities: IMAGE_GRID_QUALITIES }),
  ]);
  const IMAGE_QUALITY_ALIAS_BUILDERS = Object.freeze({
    '': Object.freeze([]),
    m: Object.freeze([(root) => `${root} m`]),
    '6': Object.freeze([]),
    '7': Object.freeze([]),
    '9': Object.freeze([]),
    m6: Object.freeze([(root) => `${root} m6`]),
    m7: Object.freeze([(root) => `${root} m7`]),
    maj7: Object.freeze([]),
    dim: Object.freeze([
      (root) => `${root}°(add6)`,
      (root) => `${root}° (add 6)`,
      (root) => `${root}dim(add6)`,
      (root) => `${root}dim (add 6)`,
      (root) => `${root}o(add6)`,
      (root) => `${root}o (add 6)`,
    ]),
    aug: Object.freeze([]),
    sus4: Object.freeze([(root) => `${root}sus 4`]),
  });
  const PAGE_PATTERN_DEFINITIONS = Object.freeze([
    Object.freeze({ offset: 0, qualities: Object.freeze(['', 'sus2', 'add9']) }),
    Object.freeze({ offset: 1, qualities: Object.freeze(['sus4', '6', '6/9']) }),
    Object.freeze({ offset: 2, qualities: Object.freeze(['7', 'maj7']) }),
    Object.freeze({ offset: 3, qualities: Object.freeze(['7sus4', '7#5', '7b5']) }),
    Object.freeze({ offset: 4, qualities: Object.freeze(['7#9', '7b9', '9']) }),
    Object.freeze({ offset: 5, qualities: Object.freeze(['11', '13', 'aug']) }),
    Object.freeze({ offset: 6, qualities: Object.freeze(['m', 'm6']) }),
    Object.freeze({ offset: 7, qualities: Object.freeze(['m7', 'm7b5']) }),
    Object.freeze({ offset: 8, qualities: Object.freeze(['m9', 'mMaj7']) }),
    Object.freeze({ offset: 9, qualities: Object.freeze(['m11', 'm13', 'dim', 'dim7']) }),
  ]);
  const QUALITY_DEFINITIONS = Object.freeze([
    Object.freeze({ canonical: '', aliases: ['', 'maj', 'major'] }),
    Object.freeze({ canonical: 'sus2', aliases: ['sus2'] }),
    Object.freeze({ canonical: 'add9', aliases: ['add9'] }),
    Object.freeze({ canonical: 'sus4', aliases: ['sus4'] }),
    Object.freeze({ canonical: '6', aliases: ['6', 'maj6', 'major6'] }),
    Object.freeze({ canonical: '6/9', aliases: ['6/9', 'maj6/9', 'major6/9'] }),
    Object.freeze({ canonical: 'maj7', aliases: ['maj7', 'M7', 'major7'] }),
    Object.freeze({ canonical: '7', aliases: ['7', 'dom7', 'dominant7'] }),
    Object.freeze({ canonical: '7sus4', aliases: ['7sus4'] }),
    Object.freeze({ canonical: '7#5', aliases: ['7#5'] }),
    Object.freeze({ canonical: '7b5', aliases: ['7b5'] }),
    Object.freeze({ canonical: '7#9', aliases: ['7#9'] }),
    Object.freeze({ canonical: '7b9', aliases: ['7b9'] }),
    Object.freeze({ canonical: '9', aliases: ['9'] }),
    Object.freeze({ canonical: '11', aliases: ['11'] }),
    Object.freeze({ canonical: '13', aliases: ['13'] }),
    Object.freeze({ canonical: 'aug', aliases: ['aug', '+'] }),
    Object.freeze({ canonical: 'm6', aliases: ['m6', 'min6', 'minor6'] }),
    Object.freeze({ canonical: 'm7', aliases: ['m7', 'min7', 'minor7'] }),
    Object.freeze({ canonical: 'm7b5', aliases: ['m7b5', 'min7b5', 'minor7b5', 'ø'] }),
    Object.freeze({ canonical: 'm9', aliases: ['m9', 'min9', 'minor9'] }),
    Object.freeze({ canonical: 'mMaj7', aliases: ['mMaj7', 'minMaj7', 'minorMajor7', 'minormajor7'] }),
    Object.freeze({ canonical: 'm11', aliases: ['m11', 'min11', 'minor11'] }),
    Object.freeze({ canonical: 'm13', aliases: ['m13', 'min13', 'minor13'] }),
    Object.freeze({ canonical: 'dim', aliases: ['dim', 'diminished', '°'] }),
    Object.freeze({ canonical: 'dim7', aliases: ['dim7', 'diminished7', '°7'] }),
    Object.freeze({ canonical: 'm', aliases: ['m', 'min', 'minor'] }),
  ]);
  const SPECIAL_CHORDS = Object.freeze([
    Object.freeze({ root: 'B', quality: 'add4', symbol: 'Badd4', aliases: ['Badd4'], pages: Object.freeze([141]), source: 'book-special-pages' }),
    Object.freeze({ root: 'E', quality: 'maj9', symbol: 'Emaj9', aliases: ['Emaj9', 'EM9'], pages: Object.freeze([142]), source: 'book-special-pages' }),
  ]);
  const IMAGE_ATTACHMENT_CHORDS = Object.freeze([
    Object.freeze({ root: 'F#', quality: '', symbol: 'F#', aliases: ['F#'], pages: Object.freeze([]), source: 'image-attachment', imageRef: 'image-1' }),
    Object.freeze({ root: 'F#', quality: 'm', symbol: 'F#m', aliases: ['F#m', 'F#min', 'F#minor'], pages: Object.freeze([]), source: 'image-attachment', imageRef: 'image-1' }),
    Object.freeze({ root: 'F#', quality: '6', symbol: 'F#6', aliases: ['F#6', 'F#maj6', 'F#major6'], pages: Object.freeze([]), source: 'image-attachment', imageRef: 'image-1' }),
    Object.freeze({ root: 'F#', quality: '7', symbol: 'F#7', aliases: ['F#7'], pages: Object.freeze([]), source: 'image-attachment', imageRef: 'image-1' }),
    Object.freeze({ root: 'F#', quality: '9', symbol: 'F#9', aliases: ['F#9'], pages: Object.freeze([]), source: 'image-attachment', imageRef: 'image-1' }),
    Object.freeze({ root: 'F#', quality: 'm6', symbol: 'F#m6', aliases: ['F#m6', 'F#min6', 'F#minor6'], pages: Object.freeze([]), source: 'image-attachment', imageRef: 'image-1' }),
    Object.freeze({ root: 'F#', quality: 'm7', symbol: 'F#m7', aliases: ['F#m7', 'F#min7', 'F#minor7'], pages: Object.freeze([]), source: 'image-attachment', imageRef: 'image-1' }),
    Object.freeze({ root: 'F#', quality: 'maj7', symbol: 'F#maj7', aliases: ['F#maj7', 'F#M7', 'F#major7'], pages: Object.freeze([]), source: 'image-attachment', imageRef: 'image-1' }),
    Object.freeze({ root: 'F#', quality: 'dim', symbol: 'F#dim', aliases: ['F#dim', 'F#°'], pages: Object.freeze([]), source: 'image-attachment', imageRef: 'image-1' }),
    Object.freeze({ root: 'F#', quality: 'aug', symbol: 'F#aug', aliases: ['F#aug', 'F#+'], pages: Object.freeze([]), source: 'image-attachment', imageRef: 'image-1' }),
    Object.freeze({ root: 'F#', quality: 'sus4', symbol: 'F#sus4', aliases: ['F#sus4', 'F#sus 4'], pages: Object.freeze([]), source: 'image-attachment', imageRef: 'image-1' }),
  ]);
  const REVERSE_ENHARMONIC_MAP = Object.freeze(Object.entries(ENHARMONIC_MAP).reduce((map, [sharpRoot, flatRoot]) => {
    map[flatRoot] = sharpRoot;
    return map;
  }, Object.create(null)));

  function isDirectlySupportedRoot(root) {
    const normalizedRoot = String(root || '').trim();
    return BOOK_ROOTS.includes(normalizedRoot)
      || SPECIAL_CHORDS.some((entry) => entry.root === normalizedRoot)
      || IMAGE_ATTACHMENT_CHORDS.some((entry) => entry.root === normalizedRoot);
  }

  function canonicalizeRoot(root) {
    const normalizedRoot = String(root || '').trim();
    if (!normalizedRoot) return null;
    if (isDirectlySupportedRoot(normalizedRoot)) return normalizedRoot;
    const mappedRoot = ENHARMONIC_MAP[normalizedRoot];
    return isDirectlySupportedRoot(mappedRoot) ? mappedRoot : null;
  }

  function getStandardPages(root, quality) {
    const startPage = ROOT_PAGE_BLOCKS[String(root || '').trim()];
    if (!Number.isFinite(startPage)) return [];
    const match = PAGE_PATTERN_DEFINITIONS.find((entry) => entry.qualities.includes(String(quality || '').trim()));
    return match ? [startPage + match.offset] : [];
  }

  function getImageSymbols(imageId) {
    const group = IMAGE_SOURCE_GROUPS.find((entry) => entry.id === imageId);
    if (!group) return [];
    return Object.freeze(group.roots.flatMap((root) => group.qualities.map((quality) => `${root}${quality}`)));
  }

  function buildImageSymbolSourceMap() {
    return IMAGE_SOURCE_GROUPS.reduce((map, group) => {
      getImageSymbols(group.id).forEach((symbol) => {
        if (!map[symbol]) map[symbol] = [];
        if (!map[symbol].includes(group.id)) map[symbol].push(group.id);
      });
      return map;
    }, Object.create(null));
  }

  const IMAGE_SYMBOL_SOURCE_MAP = Object.freeze(Object.entries(buildImageSymbolSourceMap()).reduce((map, [symbol, sourceIds]) => {
    map[symbol] = Object.freeze(sourceIds.slice());
    return map;
  }, Object.create(null)));

  function getImageStyleAliases(root, quality, symbol) {
    if (!(IMAGE_SYMBOL_SOURCE_MAP[symbol] || []).length) return [];
    const builders = IMAGE_QUALITY_ALIAS_BUILDERS[String(quality || '').trim()] || [];
    const aliases = [];
    builders.forEach((buildAlias) => {
      const value = String(buildAlias(root) || '').trim();
      if (value && !aliases.includes(value)) aliases.push(value);
    });
    return aliases;
  }

  function buildSourceRefs(entry) {
    const refs = [];
    const seen = new Set();
    function pushRef(type, value) {
      const refValue = String(value || '').trim();
      if (!refValue) return;
      const key = `${type}:${refValue}`;
      if (seen.has(key)) return;
      seen.add(key);
      refs.push(Object.freeze({ type, value: value }));
    }
    (entry.pages || []).forEach((page) => {
      pushRef('pdf-page', page);
    });
    if (entry.imageRef) {
      pushRef('image-attachment', entry.imageRef);
    }
    (IMAGE_SYMBOL_SOURCE_MAP[entry.symbol] || []).forEach((imageId) => {
      pushRef('image-attachment', imageId);
    });
    if (entry.source && refs.length === 0) {
      pushRef('source-tag', entry.source);
    }
    return Object.freeze(refs);
  }

  function buildAliases(entry) {
    const aliases = [];
    const enharmonicRoot = REVERSE_ENHARMONIC_MAP[String(entry?.root || '').trim()] || null;
    const enharmonicAliases = enharmonicRoot
      ? (entry.aliases || [entry.symbol]).map((alias) => {
        const normalizedAlias = String(alias || '').trim();
        return normalizedAlias.startsWith(entry.root) ? `${enharmonicRoot}${normalizedAlias.slice(entry.root.length)}` : normalizedAlias;
      })
      : [];
    const candidateAliases = []
      .concat(entry.aliases || [entry.symbol])
      .concat(enharmonicAliases)
      .concat(getImageStyleAliases(entry.root, entry.quality, entry.symbol));
    candidateAliases.forEach((alias) => {
      const value = String(alias || '').trim();
      if (value && !aliases.includes(value)) aliases.push(value);
    });
    return Object.freeze(aliases);
  }

  function normalizeToken(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/major/gi, 'maj')
      .replace(/minor/gi, 'min');
  }

  const qualityAliasMap = QUALITY_DEFINITIONS.reduce((map, definition) => {
    definition.aliases.forEach((alias) => {
      map[normalizeToken(alias)] = definition.canonical;
    });
    map[normalizeToken(definition.canonical)] = definition.canonical;
    return map;
  }, Object.create(null));

  SPECIAL_CHORDS.forEach((entry) => {
    entry.aliases.forEach((alias) => {
      qualityAliasMap[normalizeToken(alias.replace(/^[A-G](?:#|b)?/, ''))] = entry.quality;
    });
    qualityAliasMap[normalizeToken(entry.quality)] = entry.quality;
  });

  IMAGE_ATTACHMENT_CHORDS.forEach((entry) => {
    entry.aliases.forEach((alias) => {
      qualityAliasMap[normalizeToken(alias.replace(/^[A-G](?:#|b)?/, ''))] = entry.quality;
    });
    qualityAliasMap[normalizeToken(entry.quality)] = entry.quality;
  });

  const QUALITY_ALIAS_MAP = Object.freeze(qualityAliasMap);

  const BOOK_CHORDS = Object.freeze(BOOK_ROOTS.flatMap((root) => (
    QUALITY_DEFINITIONS.map((definition) => Object.freeze({
      root,
      quality: definition.canonical,
      symbol: `${root}${definition.canonical}`,
      pages: Object.freeze(getStandardPages(root, definition.canonical)),
      aliases: Object.freeze(definition.aliases.map((alias) => `${root}${alias}`)),
      source: 'book-standard-pages',
    }))
  )).concat(SPECIAL_CHORDS, IMAGE_ATTACHMENT_CHORDS));

  const NORMALIZED_BOOK_CHORDS = Object.freeze(BOOK_CHORDS.map((entry) => Object.freeze({
    ...entry,
    aliases: buildAliases(entry),
    pages: Object.freeze((entry.pages || []).slice()),
    sourceRefs: buildSourceRefs(entry),
  })));

  const BOOK_CHORD_SYMBOLS = Object.freeze(NORMALIZED_BOOK_CHORDS.map((entry) => entry.symbol));
  const BOOK_CHORD_SET = new Set(BOOK_CHORD_SYMBOLS);
  const BOOK_ROOT_SET = new Set(BOOK_ROOTS);

  function getExactEntry(symbol) {
    const normalizedSymbol = String(symbol || '').trim();
    return NORMALIZED_BOOK_CHORDS.find((entry) => entry.symbol === normalizedSymbol) || null;
  }

  function canonicalizeSymbol(symbol) {
    const normalizedSymbol = String(symbol || '').trim();
    const match = /^([A-G][#b]?)(.*)$/.exec(normalizedSymbol);
    if (!match) return normalizedSymbol;
    const canonicalRoot = canonicalizeRoot(match[1]);
    if (!canonicalRoot) return normalizedSymbol;
    return `${canonicalRoot}${match[2]}`;
  }

  function canonicalizeQuality(quality) {
    const normalized = normalizeToken(quality);
    return Object.prototype.hasOwnProperty.call(QUALITY_ALIAS_MAP, normalized)
      ? QUALITY_ALIAS_MAP[normalized]
      : null;
  }

  function isSupportedRoot(root) {
    return Boolean(canonicalizeRoot(root));
  }

  function isSupportedChord(root, quality, bassNote = null) {
    if (bassNote) return false;
    const requestedRoot = String(root || '').trim();
    const canonicalQuality = canonicalizeQuality(quality);
    if (canonicalQuality === null) return false;
    if (BOOK_CHORD_SET.has(`${requestedRoot}${canonicalQuality}`)) return true;
    const canonicalRoot = canonicalizeRoot(requestedRoot);
    if (!canonicalRoot) return false;
    return BOOK_CHORD_SET.has(`${canonicalRoot}${canonicalQuality}`);
  }

  function getEntry(symbolOrRoot, quality) {
    if (quality === undefined) {
      const symbol = String(symbolOrRoot || '').trim();
      return getExactEntry(symbol) || getExactEntry(canonicalizeSymbol(symbol)) || null;
    }
    const canonicalRoot = canonicalizeRoot(symbolOrRoot);
    const canonicalQuality = canonicalizeQuality(quality);
    if (!canonicalRoot || canonicalQuality === null) return null;
    return getExactEntry(`${canonicalRoot}${canonicalQuality}`);
  }

  function getPageReferences(symbolOrRoot, quality) {
    return Object.freeze((getEntry(symbolOrRoot, quality)?.pages || []).slice());
  }

  function getSourceReferences(symbolOrRoot, quality) {
    return Object.freeze((getEntry(symbolOrRoot, quality)?.sourceRefs || []).slice());
  }

  function getAliases(symbolOrRoot, quality) {
    return Object.freeze((getEntry(symbolOrRoot, quality)?.aliases || []).slice());
  }

  function getEntriesByRoot(root) {
    const normalizedRoot = String(root || '').trim();
    const exactMatches = NORMALIZED_BOOK_CHORDS.filter((entry) => entry.root === normalizedRoot);
    if (exactMatches.length) return Object.freeze(exactMatches);
    const canonicalRoot = canonicalizeRoot(normalizedRoot);
    return Object.freeze(NORMALIZED_BOOK_CHORDS.filter((entry) => entry.root === canonicalRoot));
  }

  function getEntriesBySourceRef(sourceId) {
    const normalizedSourceId = String(sourceId || '').trim();
    return Object.freeze(NORMALIZED_BOOK_CHORDS.filter((entry) => (entry.sourceRefs || []).some((ref) => ref.value === normalizedSourceId)));
  }

  const api = Object.freeze({
    ENHARMONIC_MAP,
    ROOTS: BOOK_ROOTS,
    ROOT_PAGE_BLOCKS,
    IMAGE_SOURCE_REFS,
    IMAGE_GRID_QUALITIES,
    IMAGE_SOURCE_GROUPS,
    PAGE_PATTERN_DEFINITIONS,
    QUALITY_DEFINITIONS,
    SPECIAL_CHORDS,
    IMAGE_ATTACHMENT_CHORDS,
    QUALITY_ALIASES: Object.freeze({ ...QUALITY_ALIAS_MAP }),
    CHORDS: NORMALIZED_BOOK_CHORDS,
    CHORD_SYMBOLS: BOOK_CHORD_SYMBOLS,
    canonicalizeRoot,
    canonicalizeQuality,
    isSupportedRoot,
    isSupportedChord,
    getEntry,
    getPageReferences,
    getSourceReferences,
    getAliases,
    getEntriesByRoot,
    getEntriesBySourceRef,
    getImageSymbols,
  });

  if (typeof window !== 'undefined') {
    window.ChroMusic = window.ChroMusic || {};
    window.ChroMusic.ChordBookCatalog = api;
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})();
