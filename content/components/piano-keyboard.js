(() => {
/**
 * ChroMusic — <piano-keyboard> Web Component
 * =============================================
 * Canvas-rendered piano keyboard with:
 *  • 88-key range (A0–C8), auto-windowed to relevant octaves
 *  • Separate left-hand / right-hand highlighting
 *  • Interval color-coded key highlights
 *  • Note labels on active keys
 *  • Proper black/white key geometry
 *
 * Uses Shadow DOM for full encapsulation.
 */

const customElementRegistry = globalThis.customElements;

if (typeof window === 'undefined' || !customElementRegistry || typeof customElementRegistry.get !== 'function') {
  console.error('[ChroMusic] customElements API unavailable for <piano-keyboard>.');
  return;
}

if (customElementRegistry.get('piano-keyboard')) {
  return;
}

class PianoKeyboard extends HTMLElement {
  static get observedAttributes() {
    return ['data-voicing'];
  }

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._data = null;
    this._canvas = null;
    this._ctx = null;
    this._resizeObserver = null;
    this._dpr = window.devicePixelRatio || 1;
  }

  connectedCallback() {
    this._render();
    this._resizeObserver = new ResizeObserver(() => this._paint());
    this._resizeObserver.observe(this._canvas);
  }

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'data-voicing' && newVal) {
      try {
        this._data = JSON.parse(newVal);
        this._paint();
      } catch (_) { /* ignore */ }
    }
  }

  set voicing(data) {
    this._data = data;
    this._paint();
  }

  get voicing() {
    return this._data;
  }

  /* ─────────────────────────────────────────────
   *  DOM Setup
   * ───────────────────────────────────────────── */
  _render() {
    this._shadow.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          contain: layout style;
        }
        .piano-wrapper {
          position: relative;
          width: 100%;
          background: #1a1a2e;
          border-radius: 8px;
          overflow: hidden;
        }
        canvas {
          display: block;
          width: 100%;
          height: auto;
        }
        .piano-label {
          text-align: center;
          font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
          font-size: 14px;
          font-weight: 700;
          color: #e0e0e0;
          padding: 8px 0 2px;
          letter-spacing: 0.5px;
          background: #1a1a2e;
        }
        .piano-hands {
          display: flex;
          justify-content: center;
          gap: 20px;
          padding: 2px 0 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #999;
          background: #1a1a2e;
        }
        .hand-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .hand-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
      </style>
      <div class="piano-wrapper">
        <div class="piano-label"></div>
        <canvas></canvas>
        <div class="piano-hands">
          <span class="hand-indicator">
            <span class="hand-dot" style="background: rgba(255,255,255,0.15); border: 1.5px solid #888;"></span>
            L.H.
          </span>
          <span class="hand-indicator">
            <span class="hand-dot" style="background: rgba(255,255,255,0.35); border: 1.5px solid #ccc;"></span>
            R.H.
          </span>
        </div>
      </div>
    `;
    this._canvas = this._shadow.querySelector('canvas');
    this._ctx = this._canvas.getContext('2d');
    this._labelEl = this._shadow.querySelector('.piano-label');
  }

  /* ─────────────────────────────────────────────
   *  Painting
   * ───────────────────────────────────────────── */
  _paint() {
    if (!this._ctx || !this._data) return;

    const MusicTheory = window.ChroMusic?.MusicTheory;
    if (!MusicTheory) return;
    const data = this._data;
    const allNotes = [
      ...(data.leftHand || []).map(n => ({ ...n, hand: 'L' })),
      ...(data.rightHand || []).map(n => ({ ...n, hand: 'R' })),
    ];

    // Determine display range
    const range = MusicTheory.getPianoRange(allNotes);
    const allKeys = MusicTheory.getPianoKeys();
    const visibleKeys = allKeys.filter(k => k.midi >= range.low && k.midi <= range.high);
    const whiteKeys = visibleKeys.filter(k => !k.isBlack);
    const blackKeys = visibleKeys.filter(k => k.isBlack);

    // Build active notes map: midi → { interval, hand, note, color }
    const activeMap = new Map();
    allNotes.forEach(n => {
      const parsed = MusicTheory.parseNote(n.note);
      if (!parsed) return;
      const existing = activeMap.get(parsed.midi);
      const color = MusicTheory.getIntervalColor(n.interval);
      if (existing) {
        // If both hands play the same note, mark as 'B' (both)
        existing.hand = 'B';
      } else {
        activeMap.set(parsed.midi, {
          interval: n.interval || '',
          hand: n.hand,
          note: n.note,
          color,
          originalName: parsed.name,
        });
      }
    });

    // ── Layout ──
    const dpr = this._dpr;
    const containerWidth = this._canvas.clientWidth || 500;
    const numWhite = whiteKeys.length;
    const wKeyW = Math.max(18, Math.min(30, (containerWidth - 20) / numWhite));
    const wKeyH = wKeyW * 4.5;
    const bKeyW = wKeyW * 0.6;
    const bKeyH = wKeyH * 0.62;
    const padLeft = 10;
    const padTop = 10;

    const totalW = padLeft * 2 + numWhite * wKeyW;
    const totalH = padTop + wKeyH + 30; // Extra for labels

    this._canvas.width = totalW * dpr;
    this._canvas.height = totalH * dpr;
    this._canvas.style.width = `${totalW}px`;
    this._canvas.style.height = `${totalH}px`;

    const ctx = this._ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, totalW, totalH);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, totalW, totalH);

    // Build white key position map
    const whiteKeyPositions = new Map();
    whiteKeys.forEach((key, i) => {
      whiteKeyPositions.set(key.midi, {
        x: padLeft + i * wKeyW,
        y: padTop,
        w: wKeyW,
        h: wKeyH,
        key,
      });
    });

    // ── Draw white keys ──
    whiteKeys.forEach((key, i) => {
      const x = padLeft + i * wKeyW;
      const y = padTop;
      const active = activeMap.get(key.midi);

      // Key body
      if (active) {
        ctx.fillStyle = active.color;
        ctx.globalAlpha = active.hand === 'L' ? 0.55 : 0.85;
      } else {
        ctx.fillStyle = '#f5f5f0';
        ctx.globalAlpha = 1;
      }

      this._roundRect(ctx, x + 0.5, y, wKeyW - 1, wKeyH, [0, 0, 3, 3]);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Key border
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 0.5;
      this._roundRect(ctx, x + 0.5, y, wKeyW - 1, wKeyH, [0, 0, 3, 3]);
      ctx.stroke();

      // Label on active keys
      if (active) {
        const label = active.interval || active.originalName;
        ctx.fillStyle = active.hand === 'L' ? '#ccc' : '#fff';
        ctx.font = `bold ${label.length > 2 ? 7 : 9}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + wKeyW / 2, y + wKeyH - 14);

        // Hand indicator dot
        ctx.fillStyle = active.hand === 'L' ? 'rgba(255,255,255,0.3)' :
                        active.hand === 'R' ? 'rgba(255,255,255,0.7)' :
                        'rgba(255,255,200,0.8)';
        ctx.beginPath();
        ctx.arc(x + wKeyW / 2, y + wKeyH - 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Octave C labels
      if (key.name === 'C') {
        ctx.fillStyle = '#777';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`C${key.octave}`, x + wKeyW / 2, padTop + wKeyH + 4);
      }
    });

    // ── Draw black keys ──
    blackKeys.forEach(key => {
      // Position black key between the two adjacent white keys
      // Black key sits to the right of the white key at pitch-1
      const leftWhiteMidi = key.midi - 1;
      // Adjust: some black keys sit between non-adjacent midi values
      // We need to find the white key just below this black key
      const prevWhite = this._findAdjacentWhiteKey(key.midi, whiteKeyPositions, -1);
      const nextWhite = this._findAdjacentWhiteKey(key.midi, whiteKeyPositions, 1);

      if (!prevWhite && !nextWhite) return;

      let bx;
      if (prevWhite && nextWhite) {
        bx = (prevWhite.x + prevWhite.w + nextWhite.x) / 2 - bKeyW / 2;
      } else if (prevWhite) {
        bx = prevWhite.x + prevWhite.w - bKeyW / 2;
      } else {
        bx = nextWhite.x - bKeyW / 2;
      }

      const by = padTop;
      const active = activeMap.get(key.midi);

      // Key body
      if (active) {
        ctx.fillStyle = active.color;
        ctx.globalAlpha = active.hand === 'L' ? 0.7 : 1.0;
      } else {
        ctx.fillStyle = '#2a2a2a';
        ctx.globalAlpha = 1;
      }

      this._roundRect(ctx, bx, by, bKeyW, bKeyH, [0, 0, 2, 2]);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Subtle edge highlight
      ctx.strokeStyle = active ? 'rgba(255,255,255,0.3)' : '#444';
      ctx.lineWidth = 0.5;
      this._roundRect(ctx, bx, by, bKeyW, bKeyH, [0, 0, 2, 2]);
      ctx.stroke();

      // Label
      if (active) {
        const label = active.interval || active.originalName;
        const textColor = MusicTheory.contrastText(active.color);
        ctx.fillStyle = textColor;
        ctx.font = `bold ${label.length > 2 ? 6 : 8}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, bx + bKeyW / 2, by + bKeyH - 10);
      }
    });

    // ── Label ──
    if (this._labelEl && data._parentLabel) {
      this._labelEl.textContent = data._parentLabel;
    } else if (this._labelEl) {
      this._labelEl.textContent = '';
    }
  }

  /**
   * Find the nearest white key position in a given direction.
   */
  _findAdjacentWhiteKey(blackMidi, posMap, direction) {
    for (let offset = 1; offset <= 2; offset++) {
      const pos = posMap.get(blackMidi + direction * offset);
      if (pos) return pos;
    }
    return null;
  }

  /**
   * Draw a rounded rectangle path.
   */
  _roundRect(ctx, x, y, w, h, radii) {
    const [tl, tr, br, bl] = Array.isArray(radii) ? radii : [radii, radii, radii, radii];
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }
}

try {
  customElementRegistry.define('piano-keyboard', PianoKeyboard);
} catch (e) {
  console.error('[ChroMusic] Failed to register <piano-keyboard>:', e);
}
})();
