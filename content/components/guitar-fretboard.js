(() => {
/**
 * ChroMusic — <guitar-fretboard> Web Component
 * ===============================================
 * Canvas-rendered guitar fretboard with:
 *  • 6 strings (extensible to 7/8)
 *  • 24 frets with proper fret markers (dots)
 *  • Muted (X) and open (O) string indicators
 *  • Interval color-coded note bubbles
 *  • Finger number labels
 *  • Barre chord indicators
 *  • Auto viewport windowing for wide jazz stretches
 *
 * Uses Shadow DOM for full encapsulation.
 */

const customElementRegistry = globalThis.customElements;

if (typeof window === 'undefined' || !customElementRegistry || typeof customElementRegistry.get !== 'function') {
  console.error('[ChroMusic] customElements API unavailable for <guitar-fretboard>.');
  return;
}

if (customElementRegistry.get('guitar-fretboard')) {
  return;
}

class GuitarFretboard extends HTMLElement {
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
      } catch (_) { /* ignore malformed attr */ }
    }
  }

  /** Programmatic data setter */
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
        .fretboard-wrapper {
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
        .fb-label {
          text-align: center;
          font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
          font-size: 14px;
          font-weight: 700;
          color: #e0e0e0;
          padding: 8px 0 2px;
          letter-spacing: 0.5px;
          background: #1a1a2e;
        }
        .fb-legend {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
          padding: 4px 8px 8px;
          background: #1a1a2e;
        }
        .fb-legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #aaa;
        }
        .fb-legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
      </style>
      <div class="fretboard-wrapper">
        <div class="fb-label"></div>
        <canvas></canvas>
        <div class="fb-legend"></div>
      </div>
    `;
    this._canvas = this._shadow.querySelector('canvas');
    this._ctx = this._canvas.getContext('2d');
    this._labelEl = this._shadow.querySelector('.fb-label');
    this._legendEl = this._shadow.querySelector('.fb-legend');
  }

  /* ─────────────────────────────────────────────
   *  Painting
   * ───────────────────────────────────────────── */
  _paint() {
    if (!this._ctx || !this._data) return;

    const MusicTheory = window.ChroMusic?.MusicTheory;
    if (!MusicTheory) return;
    const data = this._data;
    const positions = data.positions || [];
    const numStrings = Math.max(6, ...positions.map(p => p.string));

    // ── Determine fret window ──
    const frettedPositions = positions.filter(
      p => typeof p.fret === 'number' && p.fret > 0
    );
    let minFret = data.startFret;
    let maxFret;

    if (frettedPositions.length > 0) {
      const frets = frettedPositions.map(p => p.fret);
      if (!minFret || minFret < 1) minFret = Math.max(1, Math.min(...frets));
      maxFret = Math.max(...frets);
    } else {
      minFret = 1;
      maxFret = 4;
    }

    // Ensure at least 4 frets visible, max 7 for readability
    const span = maxFret - minFret + 1;
    const visibleFrets = Math.max(4, Math.min(7, span + 1));
    maxFret = minFret + visibleFrets - 1;

    const showNut = minFret === 1;

    // ── Layout constants ──
    const dpr = this._dpr;
    const containerWidth = this._canvas.clientWidth || 400;

    const padLeft = 40;     // Space for string labels / mute indicators
    const padRight = 20;
    const padTop = 30;      // Space for open/mute indicators
    const padBottom = 25;   // Space for fret numbers
    const stringSpacing = 18;
    const fretSpacing = Math.max(40, Math.min(65, (containerWidth - padLeft - padRight) / visibleFrets));
    const boardLeft = padLeft;
    const boardRight = padLeft + fretSpacing * visibleFrets;
    const indicatorX = boardRight + 18;

    const getStringY = (stringNumber) => padTop + (Math.max(1, Number(stringNumber)) - 1) * stringSpacing;
    const getFretLineX = (fretIndex) => boardRight - (fretIndex * fretSpacing);
    const getFretCenterX = (fret) => boardRight - (((fret - minFret) + 0.5) * fretSpacing);

    const totalW = padLeft + fretSpacing * visibleFrets + padRight;
    const totalH = padTop + stringSpacing * (numStrings - 1) + padBottom;

    this._canvas.width = totalW * dpr;
    this._canvas.height = totalH * dpr;
    this._canvas.style.width = `${totalW}px`;
    this._canvas.style.height = `${totalH}px`;

    const ctx = this._ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, totalW, totalH);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, totalW, totalH);

    // ── Fret lines ──
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    for (let f = 0; f <= visibleFrets; f++) {
      const x = getFretLineX(f);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + stringSpacing * (numStrings - 1));
      ctx.stroke();
    }

    // Nut (thick bar on fret 0/1)
    if (showNut) {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(boardRight, padTop - 1);
      ctx.lineTo(boardRight, padTop + stringSpacing * (numStrings - 1) + 1);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // ── String lines ──
    for (let s = 1; s <= numStrings; s++) {
      const y = getStringY(s);
      const thickness = 1 + ((numStrings - s) * 0.3); // Lower strings stay visually thicker near the bottom
      ctx.strokeStyle = '#888';
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.moveTo(boardLeft, y);
      ctx.lineTo(boardRight, y);
      ctx.stroke();
    }

    // ── Fret markers (dots) ──
    const dotFrets = [3, 5, 7, 9, 15, 17, 19, 21];
    const doubleDotFrets = [12, 24];

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let f = minFret; f <= maxFret; f++) {
      const fIdx = f - minFret;
      const cx = getFretCenterX(f);
      const midY = padTop + (stringSpacing * (numStrings - 1)) / 2;

      if (dotFrets.includes(f)) {
        ctx.beginPath();
        ctx.arc(cx, midY, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (doubleDotFrets.includes(f)) {
        const offset = stringSpacing * 1.2;
        ctx.beginPath();
        ctx.arc(cx, midY - offset, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, midY + offset, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Fret numbers ──
    ctx.fillStyle = '#666';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let f = 0; f < visibleFrets; f++) {
      const fretNum = minFret + f;
      const x = getFretCenterX(fretNum);
      ctx.fillText(fretNum.toString(), x, padTop + stringSpacing * (numStrings - 1) + 8);
    }

    // ── Note bubbles, mute/open indicators ──
    const bubbleR = 7;
    const posMap = new Map(); // string → position data
    positions.forEach(p => posMap.set(p.string, p));

    for (let s = 1; s <= numStrings; s++) {
      const y = getStringY(s); // String 1 (high E) at top, string 6 (low E) at bottom
      const pos = posMap.get(s);

      if (!pos) continue;

      const fret = typeof pos.fret === 'string' ? pos.fret.toUpperCase() : pos.fret;

      if (fret === 'X') {
        // Muted string — draw X above
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✕', indicatorX, y);
        continue;
      }

      if (fret === 'O' || fret === 0) {
        // Open string — draw circle above
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(indicatorX, y, 5, 0, Math.PI * 2);
        ctx.stroke();

        // Still show the interval color if provided
        if (pos.interval) {
          const color = MusicTheory.getIntervalColor(pos.interval);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(indicatorX, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        continue;
      }

      // Fretted note
      if (typeof fret === 'number' && fret >= minFret && fret <= maxFret) {
        const cx = getFretCenterX(fret);

        const color = MusicTheory.getIntervalColor(pos.interval);
        const textColor = MusicTheory.contrastText(color);

        // Bubble
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, y, bubbleR, 0, Math.PI * 2);
        ctx.fill();

        // Shadow
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(cx, y, bubbleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Finger number or interval
        const label = pos.finger && pos.finger > 0 ? pos.finger.toString() : (pos.interval || '');
        if (label) {
          ctx.fillStyle = textColor;
          ctx.font = `bold ${label.length > 2 ? 7 : 9}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, cx, y + 0.5);
        }
      }
    }

    // ── Barres ──
    if (data.barres && Array.isArray(data.barres)) {
      data.barres.forEach(barre => {
        if (!barre.fret || !barre.fromString || !barre.toString) return;
        if (barre.fret < minFret || barre.fret > maxFret) return;

        const cx = getFretCenterX(barre.fret);
        const yFrom = getStringY(barre.fromString);
        const yTo = getStringY(barre.toString);

        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = bubbleR * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, Math.min(yFrom, yTo));
        ctx.lineTo(cx, Math.max(yFrom, yTo));
        ctx.stroke();
      });
    }

    // ── Update label ──
    if (this._labelEl) {
      const root = data.root || '';
      const quality = data.quality || '';
      this._labelEl.textContent = data.label || `${root}${quality}`;
    }

    // ── Legend ──
    this._renderLegend();
  }

  _renderLegend() {
    if (!this._legendEl) return;
    const INTERVAL_CATEGORIES = window.ChroMusic?.MusicTheory?.INTERVAL_CATEGORIES;
    if (!INTERVAL_CATEGORIES) return;
    this._legendEl.innerHTML = INTERVAL_CATEGORIES.map(cat => `
      <span class="fb-legend-item">
        <span class="fb-legend-dot" style="background:${cat.color}"></span>
        ${cat.label}
      </span>
    `).join('');
  }
}

try {
  customElementRegistry.define('guitar-fretboard', GuitarFretboard);
} catch (e) {
  console.error('[ChroMusic] Failed to register <guitar-fretboard>:', e);
}
})();
