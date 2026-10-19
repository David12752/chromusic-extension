/**
 * ChroMusic — Chord Symbol Parser
 * ================================
 * Detects and parses chord symbols from plain AI chat text.
 * No JSON required — works on natural language like "let's voice a Cmaj7#11".
 */
(() => {
  'use strict';

  /* ── Pitch class maps ─────────────────────────────────────── */
  const NOTE_TO_PC = {
    'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,
    'E':4,'Fb':4,'E#':5,'F':5,'F#':6,'Gb':6,
    'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,
    'B':11,'Cb':11,'B#':0,
  };

  const PC_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const PC_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const ChordBookCatalog = window.ChroMusic?.ChordBookCatalog || null;
  const FALLBACK_BOOK_QUALITIES = Object.freeze([
    '', 'sus2', 'add9', 'add4', 'sus4', '6', '6/9', 'maj7', 'maj9', '7', '7sus4',
    '7#5', '7b5', '7#9', '7b9', '9', '11', '13', 'aug',
    'm', 'm6', 'm7', 'm7b5', 'm9', 'mMaj7', 'm11', 'm13', 'dim', 'dim7',
  ]);
  const BOOK_ALLOWED_QUALITIES = new Set((ChordBookCatalog?.QUALITY_DEFINITIONS || FALLBACK_BOOK_QUALITIES).map((entry) => typeof entry === 'string' ? entry : entry.canonical));

  // Prefer flat names for flat-rooted chords
  const FLAT_ROOTS = new Set(['F','Bb','Eb','Ab','Db','Gb','Fb','Cb']);

  function pcToName(pc, rootName) {
    return (FLAT_ROOTS.has(rootName) || rootName.endsWith('b'))
      ? PC_FLAT[((pc % 12) + 12) % 12]
      : PC_SHARP[((pc % 12) + 12) % 12];
  }

  // Jazz spelling fix: altered tensions keep their explicit accidental spelling
  // instead of inheriting the root's flat/sharp bias.
  function spellIntervalNoteName(pc, rootName, intervalLabel) {
    const normalizedPc = ((pc % 12) + 12) % 12;
    const label = String(intervalLabel || '').trim();

    if (label.includes('#')) return PC_SHARP[normalizedPc];
    if (label.includes('b')) return PC_FLAT[normalizedPc];
    return pcToName(normalizedPc, rootName);
  }

  // Book-only strategy: accept only chord families that were indexed from the
  // attached chord book, so unsupported modern/jazz extensions are filtered out.
  function isBookQualitySupported(quality) {
    const normalized = String(quality || '').trim();
    if (ChordBookCatalog?.canonicalizeQuality) {
      return ChordBookCatalog.canonicalizeQuality(normalized) !== null;
    }
    return BOOK_ALLOWED_QUALITIES.has(normalized);
  }

  function isBookChordSymbolSupported(root, quality, bassNote = null) {
    if (ChordBookCatalog?.isSupportedChord) {
      return ChordBookCatalog.isSupportedChord(root, quality, bassNote);
    }

    if (!NOTE_TO_PC[root] && NOTE_TO_PC[root] !== 0) return false;
    if (bassNote) return false;
    return isBookQualitySupported(quality);
  }

  /* ── Chord quality → interval formulas ────────────────────── */
  // Each entry: { s: semitones_from_root, l: interval_label }
  const QF = {
    // Major family
    'maj9#11':[{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:11,l:'7'},{s:2,l:'9'},{s:6,l:'#11'}],
    'maj7#11':[{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:11,l:'7'},{s:6,l:'#11'}],
    'maj7#5': [{s:0,l:'R'},{s:4,l:'3'},{s:8,l:'#5'},{s:11,l:'7'}],
    'maj13': [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:11,l:'7'},{s:2,l:'9'},{s:9,l:'13'}],
    'maj11': [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:11,l:'7'},{s:2,l:'9'},{s:5,l:'11'}],
    'maj9':  [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:11,l:'7'},{s:2,l:'9'}],
    'maj7':  [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:11,l:'7'}],
    'maj6':  [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:9,l:'13'}],
    '6/9':   [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:9,l:'13'},{s:2,l:'9'}],
    '6':     [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:9,l:'13'}],
    'maj':   [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'}],
    // Minor family
    'mMaj9': [{s:0,l:'R'},{s:3,l:'b3'},{s:7,l:'5'},{s:11,l:'7'},{s:2,l:'9'}],
    'mMaj7': [{s:0,l:'R'},{s:3,l:'b3'},{s:7,l:'5'},{s:11,l:'7'}],
    'm13':   [{s:0,l:'R'},{s:3,l:'b3'},{s:7,l:'5'},{s:10,l:'b7'},{s:2,l:'9'},{s:9,l:'13'}],
    'm11b5': [{s:0,l:'R'},{s:3,l:'b3'},{s:6,l:'b5'},{s:10,l:'b7'},{s:5,l:'11'}],
    'm11':   [{s:0,l:'R'},{s:3,l:'b3'},{s:7,l:'5'},{s:10,l:'b7'},{s:2,l:'9'},{s:5,l:'11'}],
    'm9':    [{s:0,l:'R'},{s:3,l:'b3'},{s:7,l:'5'},{s:10,l:'b7'},{s:2,l:'9'}],
    'm7b5':  [{s:0,l:'R'},{s:3,l:'b3'},{s:6,l:'b5'},{s:10,l:'b7'}],
    'm7':    [{s:0,l:'R'},{s:3,l:'b3'},{s:7,l:'5'},{s:10,l:'b7'}],
    'm6':    [{s:0,l:'R'},{s:3,l:'b3'},{s:7,l:'5'},{s:9,l:'13'}],
    'm':     [{s:0,l:'R'},{s:3,l:'b3'},{s:7,l:'5'}],
    // Dominant family
    '7alt':  [{s:0,l:'R'},{s:4,l:'3'},{s:10,l:'b7'},{s:1,l:'b9'},{s:3,l:'#9'},{s:8,l:'b13'}],
    '7#11':  [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:10,l:'b7'},{s:2,l:'9'},{s:6,l:'#11'}],
    '7b13':  [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:10,l:'b7'},{s:8,l:'b13'}],
    '7b9':   [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:10,l:'b7'},{s:1,l:'b9'}],
    '7#9':   [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:10,l:'b7'},{s:3,l:'#9'}],
    '7#5':   [{s:0,l:'R'},{s:4,l:'3'},{s:8,l:'#5'},{s:10,l:'b7'}],
    '7b5':   [{s:0,l:'R'},{s:4,l:'3'},{s:6,l:'b5'},{s:10,l:'b7'}],
    '7sus4': [{s:0,l:'R'},{s:5,l:'11'},{s:7,l:'5'},{s:10,l:'b7'}],
    '7sus2': [{s:0,l:'R'},{s:2,l:'9'},{s:7,l:'5'},{s:10,l:'b7'}],
    '13':    [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:10,l:'b7'},{s:2,l:'9'},{s:9,l:'13'}],
    '11':    [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:10,l:'b7'},{s:2,l:'9'},{s:5,l:'11'}],
    '9':     [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:10,l:'b7'},{s:2,l:'9'}],
    '7':     [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:10,l:'b7'}],
    // Misc
    'sus4':  [{s:0,l:'R'},{s:5,l:'11'},{s:7,l:'5'}],
    'sus2':  [{s:0,l:'R'},{s:2,l:'9'},{s:7,l:'5'}],
    'add9':  [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:2,l:'9'}],
    'add4':  [{s:0,l:'R'},{s:4,l:'3'},{s:5,l:'11'},{s:7,l:'5'}],
    'add11': [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'},{s:5,l:'11'}],
    'aug':   [{s:0,l:'R'},{s:4,l:'3'},{s:8,l:'#5'}],
    'dim7':  [{s:0,l:'R'},{s:3,l:'b3'},{s:6,l:'b5'},{s:9,l:'dim7'}],
    'dim':   [{s:0,l:'R'},{s:3,l:'b3'},{s:6,l:'b5'}],
    // Plain major (fallback — empty quality)
    '':      [{s:0,l:'R'},{s:4,l:'3'},{s:7,l:'5'}],
  };

  // Spelling aliases → canonical quality key
  const Q_ALIAS = {
    'min':'m','min7':'m7','min9':'m9','min11':'m11','min13':'m13',
    'minmaj7':'mMaj7','minmaj9':'mMaj9',
    'ø11':'m11b5',
    'min7b5':'m7b5','min6':'m6',
    'M7#11':'maj7#11','M9#11':'maj9#11',
    'M':'maj','M7':'maj7','M9':'maj9','M11':'maj11','M13':'maj13',
    '\u0394':'maj7','\u03947':'maj7',      // Δ, Δ7
    '\u00f8':'m7b5',                        // ø
    '\u00b07':'dim7','\u00b0':'dim',       // °7, °
    '+':'aug',
  };

  /* ── Chord symbol regex ───────────────────────────────────── */
  // Qualities listed longest-first to avoid partial matches
  const Q_LIST = [
    'maj9#11','maj7#11',
    'maj7#5',
    'maj13','maj11','maj9','maj7','maj6','maj',
    'mMaj9','mMaj7',
    'min13','min11','min9','min7b5','min7','min6','min',
    'M13','M11','M9','M7','M',
    'm13','m11b5','m11','m9','m7b5','m7','m6',
    '7alt','7#11','7b13','7b9','7#9','7#5','7b5','7sus4','7sus2',
    '13','11','9','7',
    '6\\/9','6',
    'sus4','sus2','add9','add4','add11',
    'aug','\\+',
    'dim7','dim',
    'm',
    '\\u0394','\\u00f8','\\u00b07','\\u00b0',
  ];

  const _Q_PATTERN = Q_LIST.join('|');
  const SLASH_BASS_PATTERN = '[A-G][#b]?';
  const ROOTED_CHORD_TOKEN_PATTERN = `[A-G][#b]?(?:${_Q_PATTERN})?`;
  const MUSICAL_CONTEXT_RE = /\b(chord|voicing|progression|cadence|ii[-\s]?v[-\s]?i|arpeggio|scale|mode|tonic|dominant|subdominant|tritone|substitution|resolve|resolution|comp|comping|vamp|riff|harmony|harmonic|reharmon|tension|altered|lydian|mixolydian|dorian|phrygian|locrian|major|minor|diminished|augmented|triad|seventh|inversion|rootless|drop\s*2|drop\s*3|guitar|piano|bass|fretboard|key\s+of|in\s+[A-G][#b]?\s+(major|minor)|אקורד|אקורדים|הרמונ|סולם|קדנצה|וייסינג|מודוס|טוניקה|דומיננט|סאב[-\s]?דומיננט)\b/i;
  const HARD_SEPARATOR_RE = new RegExp(`(^|[\\s,;:()[\\]{}|\\\\→\\-])([A-G][#b]?(?:(?:maj|m|dim|aug|sus|add|alt|6\\/9|13|11|9|7)?(?:\\/${SLASH_BASS_PATTERN})?))`);
  const AMBIGUOUS_CHORD_RE = /^(?:[A-G](?:m|7|9|11|13)|[A-G][b#]?m)$/;

  // Build the master chord-detection regex
  // Supports optional slash-bass inversions without breaking qualities like 6/9.
  const CHORD_RE_SRC =
    '(?<![A-Za-z])' +                    // not preceded by a letter
    '([A-G][#b]?)' +                     // root (capture group 1)
    '(?=(?:' + _Q_PATTERN + '|\\/' + SLASH_BASS_PATTERN + '))' +
    '(' + _Q_PATTERN + ')?' +            // quality (capture group 2)
    '(?:\\/(' + SLASH_BASS_PATTERN + '))?' + // slash bass (capture group 3)
    '(?![A-Za-z0-9])';                   // not followed by alphanum

  function normalizeNaturalLanguageChordText(text) {
    if (!text || typeof text !== 'string') return '';

    let normalized = ` ${text} `;

    const tokenWrap = (pattern, replacement) => {
      normalized = normalized.replace(
        new RegExp(`(^|[\\s,.:;()\\-"'])${pattern}(?=$|[\\s,.:;()\\-"'])`, 'g'),
        `$1${replacement}`
      );
    };

    normalized = normalized
      .replace(/[׳’‘`]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\bchord\s+of\s+/gi, '')
      .replace(/\bthe\s+chord\s+/gi, '')
      .replace(/ה?אקורד\s+/g, '')
      .replace(/אקורד\s+/g, '')
      .replace(/דיאז/g, '#')
      .replace(/במול/g, 'b')
      .replace(/חצי\s+מוקטן/g, 'm7b5')
      .replace(/מוקטן\s*7/g, 'dim7')
      .replace(/מוקטן/g, 'dim')
      .replace(/מינור/g, 'm')
      .replace(/מז'?ור|מג'?ור|מזור/g, 'maj')
      .replace(/אלטרד|אלטרדד|אלטרדית/g, 'alt')
      .replace(/major/gi, 'maj')
      .replace(/minor/gi, 'm')
      .replace(/minor\s+major/gi, 'mMaj')
      .replace(/half\s+diminished/gi, 'm7b5')
      .replace(/diminished\s*7/gi, 'dim7')
      .replace(/diminished/gi, 'dim')
      .replace(/augmented/gi, 'aug')
      .replace(/altered/gi, 'alt');

    tokenWrap('ו?דו', 'C');
    tokenWrap('ו?רה', 'D');
    tokenWrap('ו?מי', 'E');
    tokenWrap('ו?(?:פא|פה)', 'F');
    tokenWrap('ו?סול', 'G');
    tokenWrap('ו?לה', 'A');
    tokenWrap('ו?סי', 'B');

    normalized = normalized
      .replace(/\b([A-G])\s*([#b])\s*(maj|m|dim|aug|sus|add|alt)?\s*(6\/9|13|11|9|7|6|2|4|b5|#5|b9|#9|#11|b13)?\b/g,
        (_, root, accidental, quality = '', ext = '') => `${root}${accidental}${quality}${ext}`)
      .replace(/\b([A-G][#b]?)\s*m\s*maj\s*(9|7)\b/gi, (_, root, ext) => `${root}mMaj${ext}`)
      .replace(/\b([A-G][#b]?)\s*m\s*11\s*b\s*5\b/gi, '$1m11b5')
      .replace(/\b([A-G][#b]?)\s*maj7\s*#\s*5\b/gi, '$1maj7#5')
      .replace(/\b([A-G])\s+(maj|m|dim|aug|sus4|sus2|sus|add9|add4|add11|alt)\s*(6\/9|13|11|9|7|6|2|4|b5|#5|b9|#9|#11|b13)?\b/g,
        (_, root, quality, ext = '') => `${root}${quality}${ext}`)
      .replace(/\b([A-G][#b]?)\s+(maj7#5|mMaj9|mMaj7|maj7|maj9|maj11|maj13|m11b5|m7b5|m13|m11|m9|m7|m6|7alt|7#11|7b13|7b9|7#9|7#5|7b5|13|11|9|7|6|dim7|dim|aug|sus4|sus2|add9|add4|add11)\b/g,
        (_, root, quality) => `${root}${quality}`)
      .replace(/\b([A-G][#b]?)\s*7\s*alt\b/g, '$17alt')
      .replace(/\b([A-G][#b]?)\s*m7\s*b\s*5\b/g, '$1m7b5')
      .replace(/\b([A-G][#b]?)\s*7\s*b\s*9\b/g, '$17b9')
      .replace(/\b([A-G][#b]?)\s*7\s*#\s*9\b/g, '$17#9')
      .replace(/\b([A-G][#b]?)\s*7\s*#\s*11\b/g, '$17#11')
      .replace(/\b([A-G][#b]?)\s*7\s*b\s*13\b/g, '$17b13');

    // Slash-chord fix: preserve / bass notes and compact spaced inversions like Cmaj7 / E.
    normalized = normalized.replace(
      new RegExp(`\\b(${ROOTED_CHORD_TOKEN_PATTERN})\\s*\\/\\s*([A-G])\\s*([#b]?)\\b`, 'g'),
      (_, chordToken, bassRoot, bassAccidental = '') => `${chordToken}/${bassRoot}${bassAccidental}`
    );

    return normalized;
  }

  function getMatchWindow(text, index, length, radius = 24) {
    const start = Math.max(0, index - radius);
    const end = Math.min(text.length, index + length + radius);
    return {
      before: text.slice(start, index),
      after: text.slice(index + length, end),
      full: text.slice(start, end),
    };
  }

  function isAmbiguousChordSymbol(symbol, quality) {
    const cleanSymbol = String(symbol || '').trim();
    const cleanQuality = String(quality || '').trim();
    if (cleanQuality === 'm' || cleanQuality === '7' || cleanQuality === '9' || cleanQuality === '11' || cleanQuality === '13') {
      return true;
    }
    return AMBIGUOUS_CHORD_RE.test(cleanSymbol);
  }

  function hasNearbyChordLikeText(before, after) {
    return HARD_SEPARATOR_RE.test(before) || HARD_SEPARATOR_RE.test(after);
  }

  function getChordMatchConfidence(text, matchIndex, symbol, quality) {
    const window = getMatchWindow(text, matchIndex, symbol.length);
    const compactBefore = window.before.trimEnd();
    const compactAfter = window.after.trimStart();
    const ambiguous = isAmbiguousChordSymbol(symbol, quality);

    let confidence = 0;

    if (String(symbol).includes('#') || String(symbol).includes('b')) confidence += 2;
    if (String(symbol).includes('/')) confidence += 3;
    if (/[0-9]/.test(String(quality)) || /maj|dim|aug|sus|add|alt|#|b|\//i.test(String(quality))) confidence += 3;
    if (MUSICAL_CONTEXT_RE.test(window.full)) confidence += 3;
    if (hasNearbyChordLikeText(compactBefore, compactAfter)) confidence += 2;
    if (/[:=\-–—>]/.test(compactBefore.slice(-3)) || /^[,:;).\]]/.test(compactAfter)) confidence += 1;
    if (/^\s*(?:->|→|,|\/|\||then|to|into)\s*/i.test(compactAfter)) confidence += 1;
    if (/\b(?:play|use|voice|try|spell|build|analyze|show|render|visualize|resolve|comp(?:ing)?\s+on|outline)\b/i.test(window.full)) confidence += 2;
    if (ambiguous && /(?:\b(chord|voicing|triad|arpeggio|progression|cadence|vamp|bar|measure)\b|(?:^|\s)(אקורד|האקורד|וייסינג|קדנצה)(?=$|\s))/i.test(window.full)) confidence += 4;

    if (ambiguous) confidence -= 3;
    if (/\bI\s+am\b/i.test(window.full) && /^Am$/.test(String(symbol))) confidence -= 6;

    return confidence;
  }

  /* ── Public API ───────────────────────────────────────────── */

  /**
   * Parse a single chord symbol string (e.g. "Cmaj7#11") into its components.
   * Returns null if unrecognised.
   */
  function parseChordSymbol(symbol) {
    if (!symbol || typeof symbol !== 'string') return null;
    const m = /^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/.exec(symbol.trim());
    if (!m) return null;

    const root = m[1];
    let quality = m[2].trim();
    const bassNote = m[3] ? m[3].trim() : null;
    quality = Q_ALIAS[quality] !== undefined ? Q_ALIAS[quality].trim() : quality;
    if (ChordBookCatalog?.canonicalizeQuality) {
      quality = ChordBookCatalog.canonicalizeQuality(quality);
    }

    if (!isBookChordSymbolSupported(root, quality, bassNote)) return null;

    const rootPC = NOTE_TO_PC[root];
    if (rootPC === undefined) return null;

    let bassPC = null;
    if (bassNote) {
      bassPC = NOTE_TO_PC[bassNote];
      if (bassPC === undefined) return null;
    }

    const formula = QF[quality];
    if (!formula) return null;

    const intervals = formula.map(({s, l}) => ({
      semitones: s,
      label: l,
      notePC: (rootPC + s + 120) % 12,
      noteName: spellIntervalNoteName((rootPC + s + 120) % 12, root, l),
    }));

    // Slash-chord fix: expose the inversion bass explicitly so downstream engines
    // can force it as the lowest voiced pitch.
    if (bassNote) {
      intervals.unshift({
        semitones: 'bass',
        label: 'Bass',
        notePC: bassPC,
        noteName: bassNote,
      });
    }

    return { root, quality, rootPC, bassNote, bassPC, intervals };
  }

  /**
   * Scan a block of text and return all uniquely recognised chord symbols.
   * Returns array of { symbol, root, quality, rootPC, intervals, index }.
   */
  function findChordsInText(text, options = {}) {
    if (!text || typeof text !== 'string') return [];

    const minConfidence = Number.isFinite(options.minConfidence) ? Number(options.minConfidence) : 2;
    const results = [];
    const seen = new Set();

    const normalizedText = normalizeNaturalLanguageChordText(text);
    const variants = [
      { text, source: 'raw' },
      { text: normalizedText, source: 'normalized' },
    ];

    variants.forEach(({ text: variant, source }) => {
      const re = new RegExp(CHORD_RE_SRC, 'g');
      let match;

      while ((match = re.exec(variant)) !== null) {
        const [, root, rawQuality = '', bassNote = ''] = match;
        let canonQ = Q_ALIAS[rawQuality] !== undefined
          ? Q_ALIAS[rawQuality].trim()
          : rawQuality;
        if (ChordBookCatalog?.canonicalizeQuality) {
          canonQ = ChordBookCatalog.canonicalizeQuality(canonQ);
        }
        if (QF[canonQ] === undefined) continue;
        if (!isBookChordSymbolSupported(root, canonQ, bassNote || null)) continue;

        if (!bassNote && /^\s*\/\s*[A-G][#b]?\b/.test(variant.slice(match.index + match[0].length))) {
          continue;
        }

        const symbol = root + rawQuality + (bassNote ? `/${bassNote}` : '');
        if (seen.has(symbol)) continue;

        const parsed = parseChordSymbol(symbol);
        if (!parsed) continue;

        const confidence = getChordMatchConfidence(variant, match.index, symbol, canonQ);
        if (confidence < minConfidence) continue;

        seen.add(symbol);
        if (parsed) {
          results.push({ symbol, ...parsed, index: match.index, confidence, source });
        }
      }
    });

    return results.sort((a, b) => b.confidence - a.confidence || a.index - b.index);
  }

  /* ── Export ──────────────────────────────────────────────── */
  try {
    if (typeof window !== 'undefined') {
      window.ChroMusic = window.ChroMusic || {};
      window.ChroMusic.ChordParser = {
        normalizeNaturalLanguageChordText,
        getChordMatchConfidence,
        isBookChordSymbolSupported,
        parseChordSymbol,
        findChordsInText,
        NOTE_TO_PC,
        BOOK_ROOTS: Object.freeze(ChordBookCatalog?.ROOTS ? ChordBookCatalog.ROOTS.slice() : []),
        BOOK_CHORD_SYMBOLS: Object.freeze(ChordBookCatalog?.CHORD_SYMBOLS ? ChordBookCatalog.CHORD_SYMBOLS.slice() : []),
        BOOK_ALLOWED_QUALITIES: Object.freeze(Array.from(BOOK_ALLOWED_QUALITIES)),
        QUALITY_FORMULAS: QF,
      };
    }
    console.log('%c♪ ChroMusic', 'color:#9B59B6;font-weight:bold', 'ChordParser loaded');
  } catch (e) {
    console.error('[ChroMusic] chord-parser.js init failed:', e);
  }
})();
