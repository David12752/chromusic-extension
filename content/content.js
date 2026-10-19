/**
 * ChroMusic — Content Script (v2 — hardened)
 * =============================================
 * Injected into ChatGPT, Claude, Gemini, and other AI chat pages.
 *
 * v2 fixes:
 *  - Massively broadened DOM selectors for modern chat UIs
 *  - extractCompleteJSON handles bare JSON, fenced, and mixed text
 *  - Full debug logging (toggle with window.CHROMUSIC_DEBUG=true in console)
 *  - Resilient observer startup with retry
 *  - Robust button injection that handles all DOM structures
 *  - Global error boundary so one failure can't kill the whole extension
 */

(() => {
  'use strict';

  /* ─────────────────────────────────────────────
   *  Debug Logging
   * ───────────────────────────────────────────── */
  const LOG_PREFIX = '♪ ChroMusic';

  function log(...args) {
    console.log(`%c${LOG_PREFIX}`, 'color:#9B59B6;font-weight:bold', ...args);
  }
  function debug(...args) {
    if (window.CHROMUSIC_DEBUG) {
      console.log(`%c${LOG_PREFIX} [DBG]`, 'color:#8e44ad;font-weight:bold', ...args);
    }
  }
  function warn(...args) {
    console.warn(`%c${LOG_PREFIX}`, 'color:#9B59B6;font-weight:bold', ...args);
  }
  function err(...args) {
    console.error(`%c${LOG_PREFIX}`, 'color:#E74C3C;font-weight:bold', ...args);
  }

  /* ─────────────────────────────────────────────
   *  Safety: verify shared modules loaded
   * ───────────────────────────────────────────── */
  if (typeof ChroMusic === 'undefined' || !window.ChroMusic) {
    console.error('[ChroMusic] FATAL: ChroMusic global not found — shared/music-theory.js failed to load.');
    return;
  }
  if (!window.ChroMusic.Schema) {
    console.error('[ChroMusic] FATAL: ChroMusic.Schema not found — shared/schema.js failed to load.');
    return;
  }
  if (!window.ChroMusic.MusicTheory) {
    console.error('[ChroMusic] FATAL: ChroMusic.MusicTheory not found — shared/music-theory.js incomplete.');
    return;
  }
  // Soft warnings for optional enhancement modules
  if (!window.ChroMusic.ChordParser) {
    warn('ChordParser not loaded — auto chord detection disabled.');
  }
  if (!window.ChroMusic.VoicingGenerator) {
    warn('VoicingGenerator not loaded — auto chord detection disabled.');
  }

  const customElementRegistry = null;

  /* ─────────────────────────────────────────────
   *  Configuration
   * ───────────────────────────────────────────── */
  const DEBOUNCE_MS = 350;
  const PROCESSED_ATTR = 'data-chromusic-processed';
  const BUTTON_CLASS = 'chromusic-visualize-btn';
  const PANEL_TAG = 'chromusic-panel';
  const FLOATING_BUTTON_ID = 'chromusic-floating-launcher';

  /* ─────────────────────────────────────────────
   *  Broadened selectors for ALL modern chat UIs
   *
   *  Chat apps change their DOM constantly, so we
   *  use many overlapping selectors to maximize
   *  the chance of matching.
   * ───────────────────────────────────────────── */
  const UNIVERSAL_CODE_SELECTORS = [
    // Standard
    'pre code',
    'pre > code',
    'pre > div > code',
    // ChatGPT (2024-2026 variants)
    '[class*="code-block"] code',
    '[class*="CodeBlock"] code',
    '[class*="codeblock"] code',
    'div.code-block code',
    '.markdown pre code',
    '.markdown-body pre code',
    '[data-code-block] code',
    'pre[class*="language-"] code',
    'code[class*="language-json"]',
    'code[class*="language-"]',
    // Claude (2024-2026 variants)
    '[class*="code_block"] code',
    '.code-block__code code',
    '[class*="CodeBlock"] pre code',
    '[data-testid*="code"] code',
    // Gemini
    'code-block code',
    'ms-code-block code',
    '.code-container code',
    // Catch-all: any <pre> that might contain JSON
    'pre',
  ].join(', ');

  const UNIVERSAL_MESSAGE_SELECTORS = [
    // ChatGPT
    '[data-message-author-role="assistant"]',
    '[data-message-id]',
    '.agent-turn',
    'article',
    // Claude
    '[class*="assistant"]',
    '[class*="message-content"]',
    '[class*="response"]',
    '[data-is-streaming]',
    // Gemini
    '.model-response-text',
    '[class*="model-response"]',
    'message-content',
    // Generic
    '[role="presentation"]',
  ].join(', ');

  /* ─────────────────────────────────────────────
   *  Streaming-Safe JSON Extraction (v2)
   *
   *  KEY INSIGHT: Inside <code> elements, the text
   *  is BARE JSON without ``` fences. The fences
   *  are rendered by the chat UI wrapper. So we
   *  must handle both bare JSON and fenced blocks.
   * ───────────────────────────────────────────── */

  function extractCompleteJSON(text) {
    if (!text || typeof text !== 'string') return null;

    const trimmed = text.trim();
    if (trimmed.length < 20) return null;

    // Quick bail
    if (!ChroMusic.Schema.looksLikeChroMusic(trimmed)) return null;

    const candidates = [];

    // Strategy 1: Fenced code blocks (from message-level scanning)
    const fencePattern = /```(?:json)?\s*\n?([\s\S]*?)```/g;
    let match;
    while ((match = fencePattern.exec(trimmed)) !== null) {
      const inner = match[1].trim();
      if (inner.length > 10) candidates.push(inner);
    }

    // Strategy 2: Entire text is bare JSON (COMMON for <code> elements)
    if (/^\s*\{/.test(trimmed) && /\}\s*$/.test(trimmed)) {
      candidates.push(trimmed);
    }
    if (/^\s*\[/.test(trimmed) && /\]\s*$/.test(trimmed)) {
      candidates.push(trimmed);
    }

    // Strategy 3: Extract largest { ... } substring
    const braceStart = trimmed.indexOf('{');
    const braceEnd = trimmed.lastIndexOf('}');
    if (braceStart >= 0 && braceEnd > braceStart) {
      const sub = trimmed.slice(braceStart, braceEnd + 1);
      if (sub.length > 20) candidates.push(sub);
    }

    // Deduplicate
    const seen = new Set();
    const unique = candidates.filter(c => {
      if (seen.has(c)) return false;
      seen.add(c);
      return true;
    });

    // Try to parse each candidate
    for (const candidate of unique) {
      if (!ChroMusic.Schema.looksLikeChroMusic(candidate)) continue;
      try {
        const obj = JSON.parse(candidate);
        const result = ChroMusic.Schema.validateChroMusicJSON(obj);
        if (result.valid) {
          debug('✓ Valid ChroMusic JSON found, items:', result.items.length);
          return { raw: candidate, parsed: obj, validated: result };
        } else {
          debug('✗ Parsed but validation failed:', result.errors.join('; '));
        }
      } catch (e) {
        debug('✗ JSON.parse failed:', e.message?.slice(0, 80));
        continue;
      }
    }

    return null;
  }

  /** Extract text content from an element */
  function getCodeText(el) {
    return el.textContent || el.innerText || '';
  }

  /* ─────────────────────────────────────────────
   *  Button Injection (v2 — robust)
   * ───────────────────────────────────────────── */

  function createVisualizeButton(anchorEl, validatedResult) {
    try {
      const text = getCodeText(anchorEl);
      const hash = simpleHash(text);

      // Already processed with same content? Skip.
      if (anchorEl.hasAttribute(PROCESSED_ATTR)) {
        if (anchorEl.getAttribute(PROCESSED_ATTR) === hash) return;
        removeOldButton(anchorEl);
      }

      anchorEl.setAttribute(PROCESSED_ATTR, hash);

      const btn = document.createElement('button');
      btn.className = BUTTON_CLASS;
      btn.textContent = '\uD83C\uDFB5 Visualize'; // 🎵
      btn.title = `ChroMusic: ${validatedResult.items.length} voicing(s) detected`;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showPanel(validatedResult.items, btn);
      });

      insertButtonNearElement(anchorEl, btn);
      log(`Button injected (${validatedResult.items.length} voicing(s))`);
    } catch (e) {
      err('Failed to inject button:', e);
    }
  }

  function removeOldButton(el) {
    const parent = el.closest('pre') || el.parentElement;
    if (!parent) return;
    const container = parent.parentElement || parent;
    const oldBtn = container.querySelector(`.${BUTTON_CLASS}`);
    if (oldBtn) oldBtn.remove();
  }

  function insertButtonNearElement(el, btn) {
    // Walk up to find the code block wrapper
    const pre = el.closest('pre');
    const codeBlock = el.closest(
      '[class*="code-block"], [class*="CodeBlock"], [class*="code_block"], [data-code-block]'
    );
    const wrapper = codeBlock || pre;

    if (wrapper && wrapper.parentElement) {
      if (wrapper.nextSibling) {
        wrapper.parentElement.insertBefore(btn, wrapper.nextSibling);
      } else {
        wrapper.parentElement.appendChild(btn);
      }
      return;
    }

    // Fallback: after the element itself
    if (el.parentElement) {
      if (el.nextSibling) {
        el.parentElement.insertBefore(btn, el.nextSibling);
      } else {
        el.parentElement.appendChild(btn);
      }
    }
  }

  function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return h.toString(36);
  }

  /* ─────────────────────────────────────────────
   *  Panel Management
   * ───────────────────────────────────────────── */

  let currentPanel = null;
  let floatingItems = [];

  function createFallbackPanel(items, anchorEl) {
    function escapeHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function intervalColor(interval) {
      return window.ChroMusic?.MusicTheory?.getIntervalColor?.(interval) || '#9B59B6';
    }

    function contrastColor(interval) {
      const color = intervalColor(interval);
      return window.ChroMusic?.MusicTheory?.contrastText?.(color) || '#fff';
    }

    function renderFallbackGuitarTable(item) {
      const guitar = item?.guitar;
      if (!guitar?.positions?.length) {
        return '<div style="padding:16px;color:#888;text-align:center;">No guitar voicing available.</div>';
      }

      const rows = [...guitar.positions]
        .sort((a, b) => b.string - a.string)
        .map((pos) => {
          const badgeStyle = pos.interval
            ? `background:${intervalColor(pos.interval)};color:${contrastColor(pos.interval)};`
            : 'background:rgba(255,255,255,0.08);color:#bbb;';

          return `
            <div style="display:grid;grid-template-columns:50px 70px 1fr 70px;gap:8px;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="color:#aaa;font-size:12px;">Str ${pos.string}</div>
              <div style="font-weight:700;color:#fff;">${escapeHtml(pos.fret)}</div>
              <div style="color:#cfcfcf;font-size:12px;">${escapeHtml(pos.note || 'Muted')}</div>
              <div style="justify-self:end;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;${badgeStyle}">${escapeHtml(pos.interval || '—')}</div>
            </div>
          `;
        })
        .join('');

      return `
        <div style="border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;background:#1a1a30;">
          <div style="display:grid;grid-template-columns:50px 70px 1fr 70px;gap:8px;padding:8px 10px;background:rgba(255,255,255,0.04);font-size:11px;color:#8e8e8e;text-transform:uppercase;letter-spacing:.6px;">
            <div>String</div>
            <div>Fret</div>
            <div>Note</div>
            <div style="text-align:right;">Int.</div>
          </div>
          ${rows}
        </div>
      `;
    }

    function renderFallbackPianoTable(item) {
      const piano = item?.piano;
      const notes = [
        ...(piano?.leftHand || []).map((n) => ({ ...n, hand: 'L.H.' })),
        ...(piano?.rightHand || []).map((n) => ({ ...n, hand: 'R.H.' })),
      ];

      if (!notes.length) {
        return '<div style="padding:16px;color:#888;text-align:center;">No piano voicing available.</div>';
      }

      const rows = notes.map((note) => `
        <div style="display:grid;grid-template-columns:64px 1fr 80px;gap:8px;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="color:#7ec8e3;font-size:12px;font-weight:700;">${note.hand}</div>
          <div style="color:#fff;font-size:13px;">${escapeHtml(note.note)}</div>
          <div style="justify-self:end;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;background:${intervalColor(note.interval)};color:${contrastColor(note.interval)};">${escapeHtml(note.interval || '—')}</div>
        </div>
      `).join('');

      return `
        <div style="border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;background:#1a1a30;">
          <div style="display:grid;grid-template-columns:64px 1fr 80px;gap:8px;padding:8px 10px;background:rgba(255,255,255,0.04);font-size:11px;color:#8e8e8e;text-transform:uppercase;letter-spacing:.6px;">
            <div>Hand</div>
            <div>Note</div>
            <div style="text-align:right;">Int.</div>
          </div>
          ${rows}
        </div>
      `;
    }

    function renderRealInstrument(activeInstrument, host, item) {
      const renderers = window.ChroMusic?.InstrumentRenderers;
      try {
        if (activeInstrument === 'guitar' && typeof renderers?.renderGuitar === 'function') {
          renderers.renderGuitar(host, item);
          return true;
        }
        if (activeInstrument === 'scale' && typeof renderers?.renderGuitarScale === 'function') {
          renderers.renderGuitarScale(host, item);
          return true;
        }
        if (activeInstrument === 'piano' && typeof renderers?.renderPiano === 'function') {
          renderers.renderPiano(host, item);
          return true;
        }
      } catch (e) {
        console.error('[ChroMusic] instrument render failed:', e);
      }
      return false;
    }

    function createAlphaTabSettings() {
      const scriptFile = chrome.runtime.getURL('node_modules/@coderline/alphatab/dist/alphaTab.js');
      const fontDirectory = chrome.runtime.getURL('node_modules/@coderline/alphatab/dist/font/');
      return {
        core: {
          logLevel: 1,
          scriptFile,
          fontDirectory,
        },
        player: { enablePlayer: false },
      };
    }

    const panel = document.createElement('div');
    panel.id = 'chromusic-fallback-panel';
    panel.style.position = 'fixed';
    panel.style.zIndex = '2147483647';
    panel.style.right = '20px';
    panel.style.top = anchorEl
      ? `${Math.max(10, Math.min(anchorEl.getBoundingClientRect().bottom + 10, window.innerHeight - 460))}px`
      : '80px';
    panel.style.width = 'min(480px, 95vw)';
    panel.style.maxHeight = '80vh';
    panel.style.overflow = 'auto';
    panel.style.background = '#16162a';
    panel.style.border = '1px solid #333';
    panel.style.borderRadius = '12px';
    panel.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)';
    panel.style.padding = '12px';
    panel.style.color = '#e0e0e0';
    panel.style.fontFamily = "'JetBrains Mono', 'Consolas', monospace";

    let index = 0;
    let activeTab = 'guitar';
    let scoreApi = null;
    const selectionState = new Map();
    const engineVariantCache = new Map();

    function inferDefaultScaleType(item) {
      const quality = String(item?.quality || '').trim().toLowerCase();
      if (!quality) return 'major';
      if (quality.includes('maj') && quality.includes('#11')) return 'lydian';
      if (quality.includes('m7b5') || quality.includes('ø') || quality.includes('half')) return 'locrian';
      if (quality.includes('dim')) return 'locrian';
      if (quality.includes('sus')) return 'mixolydian';
      if (quality.includes('7') && !quality.startsWith('maj') && !quality.startsWith('m')) return 'mixolydian';
      if (quality.startsWith('m') && quality !== 'maj' && quality !== 'major') {
        return quality.includes('7') || quality.includes('9') || quality.includes('11') || quality.includes('13')
          ? 'dorian'
          : 'naturalMinor';
      }
      return 'major';
    }

    function getScaleDefinitions() {
      return window.ChroMusic?.GuitarScaleBank?.getScaleDefinitions?.() || {};
    }

    function getScaleTypeOptions() {
      return Object.values(getScaleDefinitions()).map((definition) => ({
        value: definition.id,
        text: definition.mode === definition.id ? definition.id : `${definition.id} • ${definition.mode}`,
      }));
    }

    function getEngineGuitarVariants(item, itemIndex) {
      const engine = window.ChroMusic?.GuitarFingeringEngine;
      if (!engine || !item?.root) return [];
      const symbol = item.symbol || `${item.root}${item.quality || ''}${item.bassNote ? `/${item.bassNote}` : ''}`;
      const cacheKey = `${itemIndex}:${symbol}`;
      if (engineVariantCache.has(cacheKey)) return engineVariantCache.get(cacheKey);

      let variants = [];
      try {
        variants = engine.findChordFingerings({
          symbol,
          root: item.root,
          quality: item.quality || '',
          bassNote: item.bassNote || null,
          strictness: 'musical',
        }) || [];
      } catch (e) {
        console.error('[ChroMusic] GuitarFingeringEngine failed:', e);
      }

      engineVariantCache.set(cacheKey, variants);
      return variants;
    }

    function getMergedGuitarVariants(item, itemIndex) {
      const engineVariants = getEngineGuitarVariants(item, itemIndex);
      const itemVariants = item?.guitar?.variants || (item?.guitar ? [item.guitar] : []);
      const seen = new Set();
      const merged = [];

      [...itemVariants, ...engineVariants].forEach((variant) => {
        const signature = (variant?.positions || [])
          .map((pos) => `${pos.string}:${pos.fret}:${pos.interval || ''}`)
          .join('|');
        if (!signature || seen.has(signature)) return;
        seen.add(signature);
        merged.push(variant);
      });

      return merged;
    }

    function buildScaleDisplay(item, state) {
      const scaleBank = window.ChroMusic?.GuitarScaleBank;
      if (!scaleBank || !item?.root) return null;
      const scaleType = state?.scale?.scaleType || inferDefaultScaleType(item);
      const positionIndex = Number(state?.scale?.positionIndex || 1);
      const scale = scaleBank.getScale(item.root, scaleType);
      const position = scaleBank.getScalePosition(item.root, scaleType, positionIndex);
      if (!scale || !position) return null;

      return {
        root: item.root,
        scaleType,
        mode: scale.mode,
        parentScale: scale.parentScale,
        position,
        positions: scale.positions || [],
      };
    }

    function getSelectionState(itemIndex, item) {
      if (!selectionState.has(itemIndex)) {
        const guitarVariants = getMergedGuitarVariants(item, itemIndex);
        const firstGuitar = item?.guitar || guitarVariants[0] || item?.guitar?.variants?.[0] || null;
        const firstPiano = item?.piano?.variants?.[0] || null;
        const defaultScaleType = inferDefaultScaleType(item);
        selectionState.set(itemIndex, {
          guitar: {
            rootString: firstGuitar?.rootString || item?.guitar?.rootString || 5,
            voicingType: firstGuitar?.voicingType || 'root',
            neckPosition: firstGuitar?.neckPosition || 'mid',
          },
          piano: {
            voicingType: firstPiano?.voicingType || 'closed',
            inversion: firstPiano?.inversion || 'root',
            register: firstPiano?.register || 'mid',
          },
          score: {
            instrument: item?.guitar?.positions?.length ? 'guitar' : 'piano',
            renderer: 'native',
          },
          scale: {
            scaleType: defaultScaleType,
            positionIndex: 1,
          },
        });
      }
      return selectionState.get(itemIndex);
    }

    function uniqueBy(items, key) {
      return [...new Set((items || []).map((item) => item?.[key]).filter(Boolean))];
    }

    function pickGuitarVariant(item, itemIndex, state) {
      const variants = getMergedGuitarVariants(item, itemIndex);
      return variants.find((variant) =>
        String(variant.rootString) === String(state.rootString)
        && variant.voicingType === state.voicingType
        && variant.neckPosition === state.neckPosition
      ) || variants[0] || item?.guitar || null;
    }

    function pickPianoVariant(item, state) {
      const variants = item?.piano?.variants || [];
      return variants.find((variant) =>
        variant.voicingType === state.voicingType
        && variant.inversion === state.inversion
        && variant.register === state.register
      ) || variants[0] || item?.piano || null;
    }

    function buildDisplayItem(item, itemIndex) {
      const state = getSelectionState(itemIndex, item);
      const mergedGuitarVariants = getMergedGuitarVariants(item, itemIndex);
      return {
        ...item,
        guitar: item?.guitar ? { ...item.guitar, ...pickGuitarVariant(item, itemIndex, state.guitar), variants: mergedGuitarVariants } : item?.guitar,
        piano: item?.piano ? { ...item.piano, ...pickPianoVariant(item, state.piano), variants: item.piano.variants || [] } : item?.piano,
        scale: buildScaleDisplay(item, state),
      };
    }

    function buildNoteSummaryMarkup(displayItem) {
      if (activeTab === 'guitar') {
        const notes = (displayItem?.guitar?.positions || [])
          .filter((pos) => pos.note)
          .map((pos) => `${pos.note} (${pos.interval || '—'})`);
        if (!notes.length) return '';
        return `
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
            ${notes.map((note) => `<span style="padding:6px 10px;border-radius:999px;background:rgba(155,89,182,.14);border:1px solid rgba(155,89,182,.28);color:#ddd;font-size:12px;">${escapeHtml(note)}</span>`).join('')}
          </div>
        `;
      }

      if (activeTab === 'piano') {
        const notes = [
          ...(displayItem?.piano?.leftHand || []).map((note) => `${note.note} (${note.interval || '—'}) LH${note.finger ? ` f${note.finger}` : ''}`),
          ...(displayItem?.piano?.rightHand || []).map((note) => `${note.note} (${note.interval || '—'}) RH${note.finger ? ` f${note.finger}` : ''}`),
        ];
        if (!notes.length) return '';
        return `
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
            ${notes.map((note) => `<span style="padding:6px 10px;border-radius:999px;background:rgba(52,152,219,.14);border:1px solid rgba(52,152,219,.28);color:#ddd;font-size:12px;">${escapeHtml(note)}</span>`).join('')}
          </div>
        `;
      }

      if (activeTab === 'scale') {
        const scaleNotes = displayItem?.scale?.position?.notes || [];
        if (!scaleNotes.length) return '';
        return `
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
            ${scaleNotes.map((note) => `<span style="padding:6px 10px;border-radius:999px;background:${note.isRoot ? 'rgba(231,76,60,.18)' : 'rgba(46,204,113,.14)'};border:1px solid ${note.isRoot ? 'rgba(231,76,60,.35)' : 'rgba(46,204,113,.25)'};color:#ddd;font-size:12px;">${escapeHtml(`${note.note} (${note.degreeLabel})${note.finger ? ` f${note.finger}` : ''}`)}</span>`).join('')}
          </div>
        `;
      }

      return '';
    }

    function renderOptionSelect(id, label, options, selected) {
      if (!options.length) return '';
      return `
        <label style="display:flex;flex-direction:column;gap:4px;min-width:110px;flex:1;">
          <span style="font-size:11px;color:#9f9fb0;text-transform:uppercase;letter-spacing:.5px;">${label}</span>
          <select id="${id}" style="background:#22233b;color:#f1f1f1;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 10px;font:12px 'JetBrains Mono',monospace;">
            ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(selected) ? 'selected' : ''}>${escapeHtml(option.text)}</option>`).join('')}
          </select>
        </label>
      `;
    }

    function buildControlsMarkup(item, itemIndex) {
      const state = getSelectionState(itemIndex, item);
      if (activeTab === 'guitar') {
        const variants = getMergedGuitarVariants(item, itemIndex);
        return `
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 12px;">
            ${renderOptionSelect('chromusic-gtr-root-string', 'Root string', uniqueBy(variants, 'rootString').map((value) => ({ value, text: `String ${value}` })), state.guitar.rootString)}
            ${renderOptionSelect('chromusic-gtr-voicing', 'Voicing', uniqueBy(variants, 'voicingType').map((value) => ({ value, text: value })), state.guitar.voicingType)}
            ${renderOptionSelect('chromusic-gtr-position', 'Neck', uniqueBy(variants, 'neckPosition').map((value) => ({ value, text: value })), state.guitar.neckPosition)}
          </div>
        `;
      }

      if (activeTab === 'piano') {
        const variants = item?.piano?.variants || [];
        return `
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 12px;">
            ${renderOptionSelect('chromusic-pno-voicing', 'Voicing', uniqueBy(variants, 'voicingType').map((value) => ({ value, text: value })), state.piano.voicingType)}
            ${renderOptionSelect('chromusic-pno-inversion', 'Inversion', uniqueBy(variants, 'inversion').map((value) => ({ value, text: value })), state.piano.inversion)}
            ${renderOptionSelect('chromusic-pno-register', 'Register', uniqueBy(variants, 'register').map((value) => ({ value, text: value })), state.piano.register)}
          </div>
        `;
      }

      if (activeTab === 'scale') {
        const scale = buildScaleDisplay(item, state);
        const scaleOptions = getScaleTypeOptions();
        const positionOptions = (scale?.positions || []).map((position) => ({
          value: position.positionIndex,
          text: `P${position.positionIndex} • ${position.cagedShape} • fret ${position.startFret}-${position.endFret}`,
        }));

        return `
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 12px;">
            ${renderOptionSelect('chromusic-scale-type', 'Scale', scaleOptions, state.scale.scaleType)}
            ${renderOptionSelect('chromusic-scale-position', 'Position', positionOptions, state.scale.positionIndex)}
          </div>
          <div style="margin:-2px 0 12px;color:#9f9fb0;font-size:11px;line-height:1.5;">
            ${scale ? `Mode: <strong style="color:#fff;">${escapeHtml(scale.mode)}</strong> · Parent: <strong style="color:#fff;">${escapeHtml(scale.parentScale?.root || item.root)} ${escapeHtml(scale.parentScale?.mode || '')}</strong>` : 'No scale data available.'}
          </div>
        `;
      }

      if (activeTab === 'score') {
        const rendererOptions = [
          { value: 'native', text: 'Native renderer' },
          ...(globalThis.alphaTab?.AlphaTabApi ? [{ value: 'alphatab', text: 'alphaTab renderer' }] : []),
        ];
        const scoreOptions = [
          item?.guitar?.positions?.length ? { value: 'guitar', text: 'Guitar score/tabs' } : null,
          item?.piano ? { value: 'piano', text: 'Piano score' } : null,
        ].filter(Boolean);

        return `
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 12px;">
            ${renderOptionSelect('chromusic-score-instrument', 'Score', scoreOptions, state.score.instrument)}
            ${renderOptionSelect('chromusic-score-renderer', 'Renderer', rendererOptions, state.score.renderer)}
          </div>
        `;
      }

      return '';
    }

    function bindControlEvents(item, itemIndex) {
      const state = getSelectionState(itemIndex, item);
      panel.querySelector('#chromusic-gtr-root-string')?.addEventListener('change', (event) => {
        state.guitar.rootString = event.target.value;
        render();
      });
      panel.querySelector('#chromusic-gtr-voicing')?.addEventListener('change', (event) => {
        state.guitar.voicingType = event.target.value;
        render();
      });
      panel.querySelector('#chromusic-gtr-position')?.addEventListener('change', (event) => {
        state.guitar.neckPosition = event.target.value;
        render();
      });
      panel.querySelector('#chromusic-pno-voicing')?.addEventListener('change', (event) => {
        state.piano.voicingType = event.target.value;
        render();
      });
      panel.querySelector('#chromusic-pno-inversion')?.addEventListener('change', (event) => {
        state.piano.inversion = event.target.value;
        render();
      });
      panel.querySelector('#chromusic-pno-register')?.addEventListener('change', (event) => {
        state.piano.register = event.target.value;
        render();
      });
      panel.querySelector('#chromusic-score-instrument')?.addEventListener('change', (event) => {
        state.score.instrument = event.target.value;
        render();
      });
      panel.querySelector('#chromusic-score-renderer')?.addEventListener('change', (event) => {
        state.score.renderer = event.target.value;
        render();
      });
      panel.querySelector('#chromusic-scale-type')?.addEventListener('change', (event) => {
        state.scale.scaleType = event.target.value;
        state.scale.positionIndex = 1;
        render();
      });
      panel.querySelector('#chromusic-scale-position')?.addEventListener('change', (event) => {
        state.scale.positionIndex = Number(event.target.value) || 1;
        render();
      });
    }

    function render() {
      if (scoreApi && typeof scoreApi.destroy === 'function') {
        try { scoreApi.destroy(); } catch (_) { /* ignore */ }
      }
      scoreApi = null;

      const item = items[index];
      const state = getSelectionState(index, item);
      const displayItem = buildDisplayItem(item, index);
      const nativeScoreAvailable = !!window.ChroMusic?.Notation?.generateNativeScoreMarkup?.(displayItem, state.score.instrument);
      const alphaTabScoreAvailable = !!window.ChroMusic?.Notation?.generateAlphaTexFromItem?.(displayItem, state.score.instrument) && !!globalThis.alphaTab?.AlphaTabApi;
      const scoreAvailable = nativeScoreAvailable || alphaTabScoreAvailable;
      panel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:12px;">
          <div>
            <div style="font-weight:800;font-size:16px;color:#fff;">♪ ChroMusic</div>
            <div style="font-size:12px;color:#bdbdbd;">${displayItem?.label || ''} ${items.length > 1 ? `(${index + 1}/${items.length})` : ''}</div>
          </div>
          <div style="display:flex;gap:6px;">
            <button id="chromusic-prev" style="padding:4px 8px;${items.length > 1 ? '' : 'display:none;'}">◀</button>
            <button id="chromusic-next" style="padding:4px 8px;${items.length > 1 ? '' : 'display:none;'}">▶</button>
            <button id="chromusic-close" style="padding:4px 8px;">✕</button>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <button id="chromusic-tab-guitar" style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid ${activeTab === 'guitar' ? 'rgba(155,89,182,.7)' : 'rgba(255,255,255,.12)'};background:${activeTab === 'guitar' ? 'rgba(155,89,182,.18)' : 'rgba(255,255,255,.04)'};color:${activeTab === 'guitar' ? '#fff' : '#aaa'};font-weight:700;">🎸 Guitar</button>
          <button id="chromusic-tab-piano" style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid ${activeTab === 'piano' ? 'rgba(52,152,219,.7)' : 'rgba(255,255,255,.12)'};background:${activeTab === 'piano' ? 'rgba(52,152,219,.18)' : 'rgba(255,255,255,.04)'};color:${activeTab === 'piano' ? '#fff' : '#aaa'};font-weight:700;">🎹 Piano</button>
          <button id="chromusic-tab-scale" style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid ${activeTab === 'scale' ? 'rgba(46,204,113,.7)' : 'rgba(255,255,255,.12)'};background:${activeTab === 'scale' ? 'rgba(46,204,113,.16)' : 'rgba(255,255,255,.04)'};color:${activeTab === 'scale' ? '#fff' : '#aaa'};font-weight:700;">🪜 Scale</button>
          <button id="chromusic-tab-score" style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid ${activeTab === 'score' ? 'rgba(241,196,15,.7)' : 'rgba(255,255,255,.12)'};background:${activeTab === 'score' ? 'rgba(241,196,15,.16)' : 'rgba(255,255,255,.04)'};color:${activeTab === 'score' ? '#fff' : '#aaa'};font-weight:700;${scoreAvailable ? '' : 'opacity:.4;pointer-events:none;'}">🎼 Score/Tabs</button>
        </div>
        ${buildControlsMarkup(item, index)}
        <div id="chromusic-fallback-content"></div>
      `;

      panel.querySelector('#chromusic-close')?.addEventListener('click', () => {
        panel.remove();
        currentPanel = null;
      });
      panel.querySelector('#chromusic-prev')?.addEventListener('click', () => {
        if (index > 0) {
          index--;
          render();
        }
      });
      panel.querySelector('#chromusic-next')?.addEventListener('click', () => {
        if (index < items.length - 1) {
          index++;
          render();
        }
      });

      panel.querySelector('#chromusic-tab-guitar')?.addEventListener('click', () => {
        activeTab = 'guitar';
        render();
      });
      panel.querySelector('#chromusic-tab-piano')?.addEventListener('click', () => {
        activeTab = 'piano';
        render();
      });
      panel.querySelector('#chromusic-tab-scale')?.addEventListener('click', () => {
        activeTab = 'scale';
        render();
      });
      panel.querySelector('#chromusic-tab-score')?.addEventListener('click', () => {
        activeTab = 'score';
        render();
      });

      bindControlEvents(item, index);

      const contentMount = panel.querySelector('#chromusic-fallback-content');
      if (activeTab === 'score' && scoreAvailable) {
        if (state.score.renderer === 'alphatab' && alphaTabScoreAvailable) {
          contentMount.innerHTML = '<div style="min-height:220px;background:#11111f;border-radius:10px;padding:8px;"><div id="chromusic-score-host"></div></div>';
          const tex = window.ChroMusic.Notation.generateAlphaTexFromItem(displayItem, state.score.instrument);
          const host = contentMount.querySelector('#chromusic-score-host');
          try {
            scoreApi = new globalThis.alphaTab.AlphaTabApi(host, createAlphaTabSettings());
            scoreApi.tex(tex);
          } catch (e) {
            console.error('[ChroMusic] alphaTab fallback render failed:', e);
            const nativeMarkup = window.ChroMusic.Notation.generateNativeScoreMarkup(displayItem, state.score.instrument);
            contentMount.innerHTML = nativeMarkup || '<div style="padding:16px;color:#888;text-align:center;">Failed to render score/tab.</div>';
          }
        } else {
          const nativeMarkup = window.ChroMusic.Notation.generateNativeScoreMarkup(displayItem, state.score.instrument);
          contentMount.innerHTML = nativeMarkup || '<div style="padding:16px;color:#888;text-align:center;">Failed to render score/tab.</div>';
        }
      } else {
        contentMount.innerHTML = '<div id="chromusic-instrument-host"></div>';
        const host = contentMount.querySelector('#chromusic-instrument-host');
        const rendered = renderRealInstrument(activeTab, host, displayItem);
        if (!rendered) {
          host.innerHTML = activeTab === 'guitar'
            ? renderFallbackGuitarTable(displayItem)
            : activeTab === 'piano'
              ? renderFallbackPianoTable(displayItem)
              : '<div style="padding:16px;color:#888;text-align:center;">No scale view available.</div>';
        }
        contentMount.insertAdjacentHTML('beforeend', buildNoteSummaryMarkup(displayItem));
      }
    }

    render();
    document.body.appendChild(panel);
    currentPanel = panel;
    return panel;
  }

  function showPanel(items, anchorEl) {
    try {
      if (currentPanel) {
        currentPanel.remove();
        currentPanel = null;
      }

      createFallbackPanel(items, anchorEl);
      log('Fallback panel opened with', items.length, 'item(s)');
    } catch (e) {
      err('Failed to show panel:', e);
    }
  }

  function removeFloatingLauncher() {
    const old = document.getElementById(FLOATING_BUTTON_ID);
    if (old) old.remove();
    floatingItems = [];
  }

  function updateFloatingLauncher(items, label) {
    if (!Array.isArray(items) || items.length === 0) {
      removeFloatingLauncher();
      return;
    }

    floatingItems = items;

    let btn = document.getElementById(FLOATING_BUTTON_ID);
    if (!btn) {
      btn = document.createElement('button');
      btn.id = FLOATING_BUTTON_ID;
      btn.className = `${BUTTON_CLASS} chromusic-floating-btn`;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showPanel(floatingItems, btn);
      });
      document.body.appendChild(btn);
    }

    btn.textContent = `🎸 Visualize ${items.length} Chord${items.length > 1 ? 's' : ''}`;
    btn.title = label || `ChroMusic: ${items.length} detected chord(s)`;
  }

  /* ─────────────────────────────────────────────
   *  Main Scanner
   * ───────────────────────────────────────────── */

  let scanCount = 0;

  function scanForChroMusicBlocks() {
    scanCount++;
    let found = 0;

    try {
      // Phase 1: All code-like elements
      const codeElements = document.querySelectorAll(UNIVERSAL_CODE_SELECTORS);
      debug(`Scan #${scanCount}: ${codeElements.length} code elements on page`);

      codeElements.forEach(el => {
        if (el.hasAttribute(PROCESSED_ATTR)) {
          const oldH = el.getAttribute(PROCESSED_ATTR);
          const newH = simpleHash(getCodeText(el));
          if (oldH === newH) return;
        }

        const text = getCodeText(el);
        if (!text || text.length < 20) return;
        if (!ChroMusic.Schema.looksLikeChroMusic(text)) return;

        debug('Candidate block in <' + el.tagName.toLowerCase() + '>', 'length:', text.length);

        const result = extractCompleteJSON(text);
        if (result && result.validated) {
          const target = el.tagName === 'PRE' ? (el.querySelector('code') || el) : el;
          createVisualizeButton(target, result.validated);
          found++;
        }
      });

      // Phase 2: Message containers (fallback for non-standard code rendering)
      scanMessageContainers();

      // Phase 3: Auto chord name detection from plain AI text
      scanMessageContainersForChordNames();
    } catch (e) {
      err('Scan error:', e);
    }

    if (found > 0) {
      log(`Scan #${scanCount}: ${found} new block(s)`);
    }
  }

  function scanMessageContainers() {
    try {
      const containers = document.querySelectorAll(UNIVERSAL_MESSAGE_SELECTORS);

      containers.forEach(container => {
        const key = PROCESSED_ATTR + '-msg';
        if (container.hasAttribute(key)) {
          const oldH = container.getAttribute(key);
          const newH = simpleHash(getCodeText(container).slice(0, 500));
          if (oldH === newH) return;
        }

        const fullText = getCodeText(container);
        if (!fullText || fullText.length < 30) return;
        if (!ChroMusic.Schema.looksLikeChroMusic(fullText)) return;

        // Skip if a child was already processed
        if (container.querySelector(`[${PROCESSED_ATTR}]`)) {
          container.setAttribute(PROCESSED_ATTR + '-msg', simpleHash(fullText.slice(0, 500)));
          return;
        }

        const result = extractCompleteJSON(fullText);
        if (result && result.validated) {
          if (!container.querySelector(`.${BUTTON_CLASS}`)) {
            const btn = document.createElement('button');
            btn.className = BUTTON_CLASS;
            btn.textContent = '\uD83C\uDFB5 Visualize';
            btn.title = `ChroMusic: ${result.validated.items.length} voicing(s)`;
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              showPanel(result.validated.items, btn);
            });
            container.appendChild(btn);
            log('Button injected (message container fallback)');
          }
          container.setAttribute(PROCESSED_ATTR + '-msg', simpleHash(fullText.slice(0, 500)));
        }
      });
    } catch (e) {
      err('Message scan error:', e);
    }
  }

  /* ─────────────────────────────────────────────
   *  Phase 3 — Auto Chord Name Detection (no JSON needed)
   *
   *  Scans AI message text for chord symbols (Cmaj7, G7alt, Dm9 …)
   *  and auto-generates guitar + piano voicings without requiring
   *  the AI to output any special JSON.
   * ───────────────────────────────────────────── */
  const CHORD_PROCESSED_ATTR = 'data-chromusic-chord';

  // Containers that hold only the AI's own text (exclude code blocks when reading)
  const AI_TEXT_SELECTORS = [
    '[data-message-author-role="assistant"]',
    '.agent-turn',
    '[class*="assistant-message"]',
    '[class*="model-response"]',
    '.model-response-text',
    '.response-content',
    '.markdown, .markdown-body',
    'message-content',
    'ms-code-block + *',          // Gemini: text node after code block
    '.model-response-text p',
    'article[data-message-id]',
    'main p',
    'main li',
    'main h1, main h2, main h3',
  ].join(', ');

  function getAIMessageText(container) {
    // Clone so we can strip code blocks without mutating DOM
    const clone = container.cloneNode(true);
    clone.querySelectorAll('pre, code, script, style').forEach(n => n.remove());
    return clone.textContent || clone.innerText || '';
  }

  function getTextScanContainers() {
    const candidates = new Set();

    document.querySelectorAll(UNIVERSAL_MESSAGE_SELECTORS).forEach((el) => candidates.add(el));
    document.querySelectorAll(AI_TEXT_SELECTORS).forEach((el) => candidates.add(el));

    const filtered = Array.from(candidates).filter((el) => {
      if (!el || !el.isConnected) return false;
      const text = getAIMessageText(el).trim();
      if (text.length < 8 || text.length > 2500) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    return filtered.filter((el) => {
      return !filtered.some((other) => {
        if (other === el) return false;
        if (!other.contains(el)) return false;
        const otherTextLength = getAIMessageText(other).trim().length;
        const elTextLength = getAIMessageText(el).trim().length;
        return otherTextLength >= elTextLength && otherTextLength <= (elTextLength * 6);
      });
    });
  }

  function getWholePageChordMatches() {
    try {
      const bodyText = (document.body?.innerText || '').trim();
      if (!bodyText || bodyText.length < 8) return [];
      return window.ChroMusic.ChordParser.findChordsInText(bodyText.slice(0, 30000), { minConfidence: 4 });
    } catch (e) {
      debug('Whole-page chord scan failed:', e?.message || e);
      return [];
    }
  }

  function scanMessageContainersForChordNames() {
    if (!window.ChroMusic.ChordParser || !window.ChroMusic.VoicingGenerator) return;

    const P = window.ChroMusic.ChordParser;
    const V = window.ChroMusic.VoicingGenerator;

    try {
      const containers = getTextScanContainers();
      const aggregated = [];
      const seenSymbols = new Set();

      containers.forEach(container => {
        const hash = simpleHash(getAIMessageText(container).slice(0, 600));

        // Already processed this version of the message?
        if (container.getAttribute(CHORD_PROCESSED_ATTR) === hash) return;
        container.setAttribute(CHORD_PROCESSED_ATTR, hash);

        const text = getAIMessageText(container);
        if (!text || text.length < 10) return;

        const chords = P.findChordsInText(text, { minConfidence: 3 });
        if (chords.length === 0) return;

        chords.forEach((chord) => {
          if (seenSymbols.has(chord.symbol)) return;
          seenSymbols.add(chord.symbol);
          aggregated.push(chord);
        });

        // Skip inline injection if JSON-based button already added
        if (container.querySelector(`.${BUTTON_CLASS}`)) return;

        debug(`Auto chord scan: found ${chords.length} chord(s) in message:`,
          chords.map(c => `${c.symbol}(${c.confidence})`).join(', '));

        const items = V.generateItemsFromChords(chords);
        if (!items || items.length === 0) return;

        // Inject the Visualize button at the bottom of the message container
        if (container.querySelector(`.${BUTTON_CLASS}`)) return; // double-check

        const btn = document.createElement('button');
        btn.className = BUTTON_CLASS;
        btn.textContent = '\uD83C\uDFB8 Visualize Chords'; // 🎸
        btn.title = `ChroMusic: ${items.length} chord(s) — ${chords.map(c => c.symbol).join(', ')}`;
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showPanel(items, btn);
        });

        container.appendChild(btn);
        log(`Auto-chord button injected: ${chords.map(c => c.symbol).join(', ')}`);
      });

      if (aggregated.length > 0) {
        const items = V.generateItemsFromChords(aggregated.slice(0, 8));
        updateFloatingLauncher(
          items,
          `ChroMusic: ${aggregated.map((c) => c.symbol).slice(0, 8).join(', ')}`
        );
      } else {
        const fallbackChords = getWholePageChordMatches();
        if (fallbackChords.length > 0) {
          const items = V.generateItemsFromChords(fallbackChords.slice(0, 8));
          updateFloatingLauncher(
            items,
            `ChroMusic: ${fallbackChords.map((c) => c.symbol).slice(0, 8).join(', ')}`
          );
        } else {
          removeFloatingLauncher();
        }
      }
    } catch (e) {
      err('scanMessageContainersForChordNames error:', e);
    }
  }

  /* ─────────────────────────────────────────────
   *  Debounced MutationObserver
   * ───────────────────────────────────────────── */

  let debounceTimer = null;

  function debouncedScan() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      scanForChroMusicBlocks();
    }, DEBOUNCE_MS);
  }

  let observer = null;
  let startAttempts = 0;

  function startObserver() {
    startAttempts++;

    if (!document.body) {
      if (startAttempts < 30) {
        setTimeout(startObserver, 500);
      } else {
        err('document.body not available after 30 attempts');
      }
      return;
    }

    if (observer) return; // already running

    observer = new MutationObserver((mutations) => {
      let dominated = false;
      for (const m of mutations) {
        if (m.type === 'childList' && m.addedNodes.length > 0) { dominated = true; break; }
        if (m.type === 'characterData') { dominated = true; break; }
      }
      if (dominated) debouncedScan();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Initial scan
    scanForChroMusicBlocks();

    log(
      `Loaded on ${window.location.hostname}`,
      `| ${document.querySelectorAll(UNIVERSAL_CODE_SELECTORS).length} code elements found`,
      `| Tip: window.__chromusic.debug() for verbose logs`
    );
  }

  /* ─────────────────────────────────────────────
   *  Keyboard Shortcut
   * ───────────────────────────────────────────── */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentPanel) {
      currentPanel.remove();
      currentPanel = null;
    }
  });

  /* ─────────────────────────────────────────────
   *  Message Listener (popup / service worker)
   * ───────────────────────────────────────────── */
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      try {
        if (msg.action === 'chromusic-ping') {
          sendResponse({ ok: true, hostname: window.location.hostname });
        }
        if (msg.action === 'chromusic-rescan') {
          scanForChroMusicBlocks();
          sendResponse({
            status: 'scanned',
            found: document.querySelectorAll(`.${BUTTON_CLASS}`).length,
          });
        }
        if (msg.action === 'chromusic-status') {
          sendResponse({
            active: true,
            panelOpen: !!currentPanel,
            detectedBlocks: document.querySelectorAll(`.${BUTTON_CLASS}`).length,
            hostname: window.location.hostname,
          });
        }
      } catch (e) {
        sendResponse({ error: e.message });
      }
      return true;
    });
  }

  /* ─────────────────────────────────────────────
   *  Console helpers for debugging
   * ───────────────────────────────────────────── */
  window.__chromusic = {
    /** Force an immediate scan */
    scan: scanForChroMusicBlocks,
    /** Turn on verbose debug logging */
    debug: () => { window.CHROMUSIC_DEBUG = true; log('Debug mode ON'); },
    /** Show current status */
    status: () => {
      const s = {
        buttons: document.querySelectorAll(`.${BUTTON_CLASS}`).length,
        codeElements: document.querySelectorAll(UNIVERSAL_CODE_SELECTORS).length,
        messageContainers: document.querySelectorAll(UNIVERSAL_MESSAGE_SELECTORS).length,
        panelOpen: !!currentPanel,
        observerActive: !!observer,
        scanCount,
        hostname: window.location.hostname,
      };
      console.table(s);
      return s;
    },
    /** Manually test a JSON string */
    testJSON: (jsonStr) => {
      const result = extractCompleteJSON(jsonStr);
      if (result) {
        log('✓ Valid! Items:', result.validated.items.length);
        showPanel(result.validated.items, null);
      } else {
        warn('✗ No valid ChroMusic JSON found in input');
        // Try raw parse for diagnostics
        try {
          const obj = JSON.parse(jsonStr);
          const v = ChroMusic.Schema.validateChroMusicJSON(obj);
          log('Parse OK, validation:', v.valid ? 'PASS' : 'FAIL', v.errors);
        } catch (e) {
          log('JSON.parse error:', e.message);
        }
      }
      return result;
    },
  };

  /* ─────────────────────────────────────────────
   *  Initialise
   * ───────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }

  // Safety-net periodic rescan (SPAs, lazy loading, navigation)
  setInterval(() => {
    try { scanForChroMusicBlocks(); } catch (e) { /* silent */ }
  }, 4000);

})();
