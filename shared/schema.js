/**
 * ChroMusic — JSON Schema Validation
 * =====================================
 * Validates incoming AI-generated JSON against the ChroMusic schema.
 * Designed to be lenient on optional fields but strict on structural integrity.
 */

var ChroMusic = window.ChroMusic || {};

try {
(() => {
  'use strict';
  console.log('%c♪ ChroMusic%c schema.js loading...', 'color:#9B59B6;font-weight:bold', 'color:#888');

  /** Accept these as the `type` discriminator */
  const VALID_TYPES = new Set([
    'chord', 'voicing', 'scale', 'arpeggio', 'progression', 'fragment'
  ]);

  /** Marker that identifies a JSON block as ChroMusic data */
  const SCHEMA_MARKER = 'chromusic';

  /**
   * Validate a single guitar position object.
   * { string: 1-8, fret: number|"X"|"O", finger?: 0-4, note?: string, interval?: string }
   */
  function validateGuitarPosition(pos, errors) {
    if (typeof pos !== 'object' || pos === null) {
      errors.push('Guitar position must be an object');
      return false;
    }

    if (typeof pos.string !== 'number' || pos.string < 1 || pos.string > 8) {
      errors.push(`Invalid string number: ${pos.string}`);
      return false;
    }

    const fret = pos.fret;
    const validFret =
      fret === 'X' || fret === 'x' ||
      fret === 'O' || fret === 'o' ||
      (typeof fret === 'number' && Number.isInteger(fret) && fret >= 0 && fret <= 24);

    if (!validFret) {
      errors.push(`Invalid fret value for string ${pos.string}: ${fret}`);
      return false;
    }

    // finger is optional but must be 0-4 if present (0 = open/muted, T = thumb sometimes)
    if (pos.finger !== undefined && pos.finger !== null) {
      if (typeof pos.finger === 'string' && pos.finger.toUpperCase() === 'T') {
        // Thumb — acceptable for jazz voicings
      } else if (typeof pos.finger !== 'number' || pos.finger < 0 || pos.finger > 4) {
        errors.push(`Invalid finger for string ${pos.string}: ${pos.finger}`);
      }
    }

    return true;
  }

  /**
   * Validate a piano note entry.
   * { note: "C4", interval: "R" }
   */
  function validatePianoNote(entry, hand, errors) {
    if (typeof entry !== 'object' || entry === null) {
      errors.push(`${hand} piano entry must be an object`);
      return false;
    }
    if (typeof entry.note !== 'string' || entry.note.trim().length === 0) {
      errors.push(`${hand} piano entry missing 'note' string`);
      return false;
    }
    if (entry.finger !== undefined && entry.finger !== null) {
      if (typeof entry.finger !== 'number' || entry.finger < 1 || entry.finger > 5) {
        errors.push(`${hand} piano entry has invalid finger: ${entry.finger}`);
      }
    }
    // Interval is recommended but not strictly required
    return true;
  }

  /**
   * Validate a single ChroMusic data item (chord/voicing/scale).
   * Returns { valid: boolean, errors: string[], data: object|null }
   */
  function validateItem(item) {
    const errors = [];

    if (typeof item !== 'object' || item === null) {
      return { valid: false, errors: ['Item is not an object'], data: null };
    }

    // Type check (lenient – default to 'voicing' if missing)
    if (item.type && !VALID_TYPES.has(item.type)) {
      errors.push(`Unknown type "${item.type}", expected one of: ${[...VALID_TYPES].join(', ')}`);
    }

    // Label
    if (!item.label || typeof item.label !== 'string') {
      errors.push('Missing or invalid "label" (e.g. "Cmaj7#11")');
    }

    // At least one instrument must be present
    const hasGuitar = item.guitar && typeof item.guitar === 'object';
    const hasPiano = item.piano && typeof item.piano === 'object';

    if (!hasGuitar && !hasPiano) {
      errors.push('At least one of "guitar" or "piano" must be present');
      return { valid: false, errors, data: null };
    }

    // ── Guitar validation ──
    if (hasGuitar) {
      const g = item.guitar;
      if (!Array.isArray(g.positions) || g.positions.length === 0) {
        errors.push('guitar.positions must be a non-empty array');
      } else {
        g.positions.forEach((pos, i) => validateGuitarPosition(pos, errors));
      }
      // startFret optional, default to min fretted position
      if (g.startFret !== undefined && (typeof g.startFret !== 'number' || g.startFret < 0)) {
        errors.push('guitar.startFret must be a non-negative number');
      }
    }

    // ── Piano validation ──
    if (hasPiano) {
      const p = item.piano;
      const hasLH = Array.isArray(p.leftHand);
      const hasRH = Array.isArray(p.rightHand);

      if (!hasLH && !hasRH) {
        errors.push('piano must have at least "leftHand" or "rightHand" arrays');
      }
      if (hasLH) {
        p.leftHand.forEach((n, i) => validatePianoNote(n, 'leftHand', errors));
      }
      if (hasRH) {
        p.rightHand.forEach((n, i) => validatePianoNote(n, 'rightHand', errors));
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      data: normalizeItem(item),
    };
  }

  /**
   * Normalise an item: fill defaults, clean up casing, etc.
   */
  function normalizeItem(item) {
    const out = { ...item };
    out.type = out.type || 'voicing';
    out.label = (out.label || 'Unknown').trim();
    out.root = (out.root || '').trim();

    if (out.guitar) {
      const g = { ...out.guitar };
      g.positions = (g.positions || []).map(p => ({
        string: p.string,
        fret: typeof p.fret === 'string' ? p.fret.toUpperCase() : p.fret,
        finger: p.finger ?? null,
        note: (p.note || '').trim(),
        interval: (p.interval || '').trim(),
      }));
      // Sort positions by string number descending (6→1) for consistent rendering
      g.positions.sort((a, b) => b.string - a.string);
      g.startFret = g.startFret ?? null;
      g.barres = g.barres || [];
      g.tuning = g.tuning || ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
      out.guitar = g;
    }

    if (out.piano) {
      const p = { ...out.piano };
      p.leftHand = (p.leftHand || []).map(n => ({
        note: (n.note || '').trim(),
        interval: (n.interval || '').trim(),
        finger: n.finger ?? null,
      }));
      p.rightHand = (p.rightHand || []).map(n => ({
        note: (n.note || '').trim(),
        interval: (n.interval || '').trim(),
        finger: n.finger ?? null,
      }));
      out.piano = p;
    }

    return out;
  }

  /**
   * Top-level parse + validate.
   * Accepts either a single item or a `{ chromusic: true, items: [...] }` wrapper.
   * Returns { valid: boolean, items: validatedItem[], errors: string[] }
   */
  function validateChroMusicJSON(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return { valid: false, items: [], errors: ['Root is not an object'] };
    }

    let items = [];

    // Wrapped format: { chromusic: true, items: [...] }
    if (obj[SCHEMA_MARKER] === true || obj._chromusic === true) {
      if (Array.isArray(obj.items)) {
        items = obj.items;
      } else {
        // Maybe it's a single item in the wrapper
        items = [obj];
      }
    }
    // Progression shorthand: { type: "progression", chords: [...] }
    else if (obj.type === 'progression' && Array.isArray(obj.chords)) {
      items = obj.chords;
    }
    // Single item
    else if (obj.label || obj.guitar || obj.piano) {
      items = [obj];
    }
    // Unknown format
    else {
      return { valid: false, items: [], errors: ['Unrecognised ChroMusic JSON structure'] };
    }

    const allErrors = [];
    const validatedItems = [];

    for (let i = 0; i < items.length; i++) {
      const result = validateItem(items[i]);
      if (result.valid) {
        validatedItems.push(result.data);
      } else {
        allErrors.push(`Item ${i}: ${result.errors.join('; ')}`);
      }
    }

    return {
      valid: validatedItems.length > 0,
      items: validatedItems,
      errors: allErrors,
    };
  }

  /**
   * Detect whether a raw text string looks like it might be ChroMusic JSON.
   * Used as a fast pre-filter before attempting full parse.
   */
  function looksLikeChroMusic(text) {
    if (!text || typeof text !== 'string') return false;
    // Check with quotes (standard JSON)
    const hasChromusic = text.includes('"chromusic"') || text.includes('"_chromusic"');
    const hasGuitar = (text.includes('"guitar"') || text.includes('guitar')) &&
                      (text.includes('"positions"') || text.includes('positions'));
    const hasPiano = (text.includes('"piano"') || text.includes('piano')) &&
                     (text.includes('"leftHand"') || text.includes('leftHand') ||
                      text.includes('"rightHand"') || text.includes('rightHand'));
    return hasChromusic || hasGuitar || hasPiano;
  }

  /* ─────────────────────────────────────────────
   *  Export
   * ───────────────────────────────────────────── */
  ChroMusic.Schema = Object.freeze({
    SCHEMA_MARKER,
    VALID_TYPES,
    validateChroMusicJSON,
    validateItem,
    looksLikeChroMusic,
  });

  window.ChroMusic = ChroMusic;
  console.log('%c♪ ChroMusic%c schema.js loaded ✓', 'color:#9B59B6;font-weight:bold', 'color:#2ecc71');
})();
} catch (e) {
  console.error('[ChroMusic] schema.js FAILED:', e);
}
