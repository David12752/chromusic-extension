(() => {
/**
 * ChroMusic — <chromusic-panel> Web Component
 * ==============================================
 * Floating panel that houses both <guitar-fretboard> and <piano-keyboard>.
 * Features:
 *  • Draggable header
 *  • Collapse / expand
 *  • Multi-item navigation (prev/next) for progressions
 *  • Close button
 *  • Tab switching between guitar and piano views
 *
 * Uses Shadow DOM for full encapsulation.
 */

const customElementRegistry = globalThis.customElements;

if (typeof window === 'undefined' || !customElementRegistry || typeof customElementRegistry.get !== 'function') {
  console.error('[ChroMusic] customElements API unavailable for <chromusic-panel>.');
  return;
}

if (customElementRegistry.get('chromusic-panel')) {
  return;
}

class ChroMusicPanel extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._items = [];
    this._currentIndex = 0;
    this._collapsed = false;
    this._dragState = null;
    this._scoreApi = null;
    this._scoreSettings = {
      renderer: 'native',
      theme: 'paper',
      zoom: 108,
      lineWeight: 1.35,
      staffSpacing: 13,
      compact: false,
    };
  }

  connectedCallback() {
    this._render();
    this._bindEvents();
  }

  disconnectedCallback() {
    this._destroyScoreApi();
    this._unbindEvents();
  }

  /**
   * Set validated ChroMusic items.
   * @param {Array} items — Array of normalised voicing objects from Schema.validateChroMusicJSON()
   */
  set items(items) {
    this._items = items || [];
    this._currentIndex = 0;
    this._updateDisplay();
  }

  get items() {
    return this._items;
  }

  /* ─────────────────────────────────────────────
   *  DOM
   * ───────────────────────────────────────────── */
  _render() {
    this._shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          z-index: 2147483647;
          font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace;
          contain: layout style;
        }

        .panel {
          width: 460px;
          max-width: 95vw;
          background: #16162a;
          border: 1px solid #333;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: box-shadow 0.2s;
        }

        .panel:hover {
          box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08);
        }

        /* ── Header ── */
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: #1e1e3a;
          cursor: grab;
          user-select: none;
          border-bottom: 1px solid #333;
        }
        .header:active { cursor: grabbing; }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo {
          font-size: 16px;
          font-weight: 800;
          background: linear-gradient(135deg, #E74C3C, #9B59B6, #3498DB);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.5px;
        }

        .item-label {
          font-size: 13px;
          color: #ddd;
          font-weight: 600;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .btn {
          background: none;
          border: 1px solid transparent;
          color: #999;
          cursor: pointer;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.15s;
          padding: 0;
        }
        .btn:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
          border-color: rgba(255,255,255,0.12);
        }
        .btn:active { transform: scale(0.92); }
        .btn.close-btn:hover { color: #E74C3C; }

        /* ── Navigation ── */
        .nav-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 6px 12px;
          background: #1a1a30;
          border-bottom: 1px solid #2a2a40;
          font-size: 11px;
          color: #888;
        }
        .nav-bar.hidden { display: none; }
        .nav-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: #aaa;
          cursor: pointer;
          padding: 2px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-family: inherit;
          transition: all 0.15s;
        }
        .nav-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .nav-btn:disabled { opacity: 0.3; cursor: default; }

        /* ── Tabs ── */
        .tab-bar {
          display: flex;
          background: #1a1a30;
          border-bottom: 1px solid #2a2a40;
        }
        .tab {
          flex: 1;
          text-align: center;
          padding: 7px 0;
          font-size: 11px;
          font-weight: 600;
          color: #666;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.15s;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          background: none;
          border-top: none;
          border-left: none;
          border-right: none;
          font-family: inherit;
        }
        .tab:hover { color: #aaa; }
        .tab.active {
          color: #e0e0e0;
          border-bottom-color: #9B59B6;
        }
        .tab.disabled {
          opacity: 0.25;
          cursor: default;
          pointer-events: none;
        }

        /* ── Body ── */
        .body {
          max-height: 360px;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 4px;
          scrollbar-width: thin;
          scrollbar-color: #444 transparent;
        }
        .body.collapsed { display: none; }

        .body::-webkit-scrollbar { width: 6px; }
        .body::-webkit-scrollbar-track { background: transparent; }
        .body::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }

        .tab-content { display: none; }
        .tab-content.active { display: block; }

        .empty-state {
          text-align: center;
          color: #555;
          font-size: 12px;
          padding: 30px 20px;
        }

        .score-wrap {
          min-height: 220px;
          padding: 8px;
          background: #f4f4f4;
          border-radius: 8px;
          overflow: auto;
          border: 1px solid rgba(255,255,255,0.06);
        }

        .score-host {
          min-height: 200px;
        }

        .score-controls {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 12px;
          padding: 10px 10px 8px;
          background: #141428;
          border-bottom: 1px solid #2a2a40;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .control-group.span-2 {
          grid-column: span 2;
        }

        .control-label {
          font-size: 10px;
          font-weight: 700;
          color: #b5b8c8;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .control-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-input,
        .control-select {
          width: 100%;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.12);
          background: #1b1b31;
          color: #f2f2f2;
          font: 12px 'JetBrains Mono', monospace;
          padding: 6px 8px;
          box-sizing: border-box;
        }

        .control-input[type="range"] {
          padding: 0;
          accent-color: #9B59B6;
          background: transparent;
        }

        .control-value {
          min-width: 42px;
          text-align: right;
          font-size: 11px;
          font-weight: 700;
          color: #e6e8ef;
        }

        .toggle-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #e6e8ef;
          font-size: 12px;
          font-weight: 600;
        }

        .toggle-pill input {
          accent-color: #9B59B6;
        }

        .score-note {
          padding: 0 12px 10px;
          color: #8e94ad;
          font-size: 11px;
          line-height: 1.4;
        }
      </style>

      <div class="panel">
        <div class="header" id="drag-handle">
          <div class="header-left">
            <span class="logo">♪ ChroMusic</span>
            <span class="item-label" id="item-label"></span>
          </div>
          <div class="header-controls">
            <button class="btn" id="btn-collapse" title="Collapse">−</button>
            <button class="btn close-btn" id="btn-close" title="Close">✕</button>
          </div>
        </div>

        <div class="nav-bar hidden" id="nav-bar">
          <button class="nav-btn" id="btn-prev" disabled>◀</button>
          <span id="nav-counter">1 / 1</span>
          <button class="nav-btn" id="btn-next" disabled>▶</button>
        </div>

        <div class="tab-bar" id="tab-bar">
          <button class="tab active" data-tab="guitar">🎸 Guitar</button>
          <button class="tab" data-tab="piano">🎹 Piano</button>
          <button class="tab" data-tab="score">🎼 Score/Tabs</button>
        </div>

        <div class="body" id="body">
          <div class="tab-content active" id="tab-guitar">
            <guitar-fretboard></guitar-fretboard>
          </div>
          <div class="tab-content" id="tab-piano">
            <piano-keyboard></piano-keyboard>
          </div>
          <div class="tab-content" id="tab-score">
            <div class="score-controls">
              <label class="control-group">
                <span class="control-label">Renderer</span>
                <select class="control-select" id="score-renderer">
                  <option value="native">Native Engraving</option>
                  <option value="alphaTab">alphaTab</option>
                </select>
              </label>
              <label class="control-group">
                <span class="control-label">Theme</span>
                <select class="control-select" id="score-theme">
                  <option value="paper">Paper / Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <label class="control-group">
                <span class="control-label">Zoom</span>
                <div class="control-row">
                  <input class="control-input" id="score-zoom" type="range" min="90" max="145" step="5" value="108" />
                  <span class="control-value" id="score-zoom-value">108%</span>
                </div>
              </label>
              <label class="control-group">
                <span class="control-label">Line weight</span>
                <div class="control-row">
                  <input class="control-input" id="score-weight" type="range" min="1" max="2.2" step="0.1" value="1.35" />
                  <span class="control-value" id="score-weight-value">1.35×</span>
                </div>
              </label>
              <label class="control-group span-2">
                <span class="control-label">Staff spacing</span>
                <div class="control-row">
                  <input class="control-input" id="score-spacing" type="range" min="11" max="18" step="1" value="13" />
                  <span class="control-value" id="score-spacing-value">13px</span>
                </div>
              </label>
              <label class="control-group span-2 toggle-pill">
                <input id="score-compact" type="checkbox" />
                <span>Compact layout</span>
              </label>
            </div>
            <div class="score-note">Inspired by notation workflows in MuseScore and Dorico: paper-first contrast, adjustable zoom, spacing, and engraving weight.</div>
            <div class="score-wrap">
              <div class="score-host" id="score-host"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ─────────────────────────────────────────────
   *  Events
   * ───────────────────────────────────────────── */
  _bindEvents() {
    const shadow = this._shadow;

    // Close
    shadow.getElementById('btn-close').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('chromusic-close', { bubbles: true, composed: true }));
      this.remove();
    });

    // Collapse
    shadow.getElementById('btn-collapse').addEventListener('click', () => {
      this._collapsed = !this._collapsed;
      shadow.getElementById('body').classList.toggle('collapsed', this._collapsed);
      shadow.getElementById('btn-collapse').textContent = this._collapsed ? '+' : '−';
    });

    // Navigation
    shadow.getElementById('btn-prev').addEventListener('click', () => {
      if (this._currentIndex > 0) {
        this._currentIndex--;
        this._updateDisplay();
      }
    });
    shadow.getElementById('btn-next').addEventListener('click', () => {
      if (this._currentIndex < this._items.length - 1) {
        this._currentIndex++;
        this._updateDisplay();
      }
    });

    // Tabs
    shadow.getElementById('tab-bar').addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab || tab.classList.contains('disabled')) return;
      shadow.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      shadow.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      shadow.getElementById(`tab-${target}`).classList.add('active');
    });

    // Drag
    this._onMouseDown = (e) => this._startDrag(e);
    this._onMouseMove = (e) => this._onDrag(e);
    this._onMouseUp = () => this._endDrag();
    shadow.getElementById('drag-handle').addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);

    const rerenderScore = () => this._renderScoreTab(this._items[this._currentIndex]);
    shadow.getElementById('score-renderer').addEventListener('change', (e) => {
      this._scoreSettings.renderer = e.target.value;
      rerenderScore();
    });
    shadow.getElementById('score-theme').addEventListener('change', (e) => {
      this._scoreSettings.theme = e.target.value;
      rerenderScore();
    });
    shadow.getElementById('score-zoom').addEventListener('input', (e) => {
      this._scoreSettings.zoom = Number(e.target.value);
      shadow.getElementById('score-zoom-value').textContent = `${this._scoreSettings.zoom}%`;
      rerenderScore();
    });
    shadow.getElementById('score-weight').addEventListener('input', (e) => {
      this._scoreSettings.lineWeight = Number(e.target.value);
      shadow.getElementById('score-weight-value').textContent = `${this._scoreSettings.lineWeight.toFixed(2)}×`;
      rerenderScore();
    });
    shadow.getElementById('score-spacing').addEventListener('input', (e) => {
      this._scoreSettings.staffSpacing = Number(e.target.value);
      shadow.getElementById('score-spacing-value').textContent = `${this._scoreSettings.staffSpacing}px`;
      rerenderScore();
    });
    shadow.getElementById('score-compact').addEventListener('change', (e) => {
      this._scoreSettings.compact = !!e.target.checked;
      rerenderScore();
    });
  }

  _unbindEvents() {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
  }

  /* ─────────────────────────────────────────────
   *  Drag
   * ───────────────────────────────────────────── */
  _startDrag(e) {
    e.preventDefault();
    const rect = this.getBoundingClientRect();
    this._dragState = {
      startX: e.clientX,
      startY: e.clientY,
      origLeft: rect.left,
      origTop: rect.top,
    };
    this.style.transition = 'none';
  }

  _onDrag(e) {
    if (!this._dragState) return;
    const dx = e.clientX - this._dragState.startX;
    const dy = e.clientY - this._dragState.startY;
    this.style.left = `${this._dragState.origLeft + dx}px`;
    this.style.top = `${this._dragState.origTop + dy}px`;
    this.style.right = 'auto';
    this.style.bottom = 'auto';
  }

  _endDrag() {
    this._dragState = null;
    this.style.transition = '';
  }

  _destroyScoreApi() {
    if (this._scoreApi && typeof this._scoreApi.destroy === 'function') {
      try {
        this._scoreApi.destroy();
      } catch (_) { /* ignore */ }
    }
    this._scoreApi = null;
  }

  _renderScoreTab(item) {
    const shadow = this._shadow;
    const host = shadow.getElementById('score-host');
    if (!host) return;

    this._destroyScoreApi();
    host.innerHTML = '';

    const notation = window.ChroMusic?.Notation;
    const alphaTabGlobal = globalThis.alphaTab;
    const scoreOptions = {
      theme: this._scoreSettings.theme,
      lineWeight: this._scoreSettings.lineWeight,
      staffSpacing: this._scoreSettings.staffSpacing,
      tabSpacing: this._scoreSettings.staffSpacing + 3,
      noteScale: this._scoreSettings.zoom / 100,
      compact: this._scoreSettings.compact,
    };
    const tex = notation?.generateAlphaTexFromItem?.(item);
    const nativeMarkup = notation?.generateNativeScoreMarkup?.(item, 'auto', scoreOptions);
    const wantsAlphaTab = this._scoreSettings.renderer === 'alphaTab';

    if (!wantsAlphaTab && nativeMarkup) {
      host.innerHTML = nativeMarkup;
      return;
    }

    if (!tex || !alphaTabGlobal?.AlphaTabApi) {
      host.innerHTML = nativeMarkup || '<div class="empty-state">Score/tablature unavailable.</div>';
      return;
    }

    try {
      host.style.background = this._scoreSettings.theme === 'dark' ? '#11111f' : '#ffffff';
      host.style.color = this._scoreSettings.theme === 'dark' ? '#f2f2f2' : '#111111';
      host.style.padding = '12px';
      host.style.borderRadius = '10px';
      this._scoreApi = new alphaTabGlobal.AlphaTabApi(host, {
        core: { logLevel: 1 },
        player: { enablePlayer: false },
      });
      this._scoreApi.tex(tex);
    } catch (e) {
      console.error('[ChroMusic] alphaTab render failed:', e);
      host.innerHTML = '<div class="empty-state">Failed to render score/tab.</div>';
    }
  }

  /* ─────────────────────────────────────────────
   *  Display Update
   * ───────────────────────────────────────────── */
  _updateDisplay() {
    const shadow = this._shadow;

    if (!this._items.length) return;

    const item = this._items[this._currentIndex];

    // Label
    shadow.getElementById('item-label').textContent = item.label || '';

    // Navigation
    const navBar = shadow.getElementById('nav-bar');
    if (this._items.length > 1) {
      navBar.classList.remove('hidden');
      shadow.getElementById('nav-counter').textContent =
        `${this._currentIndex + 1} / ${this._items.length}`;
      shadow.getElementById('btn-prev').disabled = this._currentIndex === 0;
      shadow.getElementById('btn-next').disabled = this._currentIndex === this._items.length - 1;
    } else {
      navBar.classList.add('hidden');
    }

    // Tab availability
    const guitarTab = shadow.querySelector('[data-tab="guitar"]');
    const pianoTab = shadow.querySelector('[data-tab="piano"]');
    const scoreTab = shadow.querySelector('[data-tab="score"]');
    const scoreAvailable = !!window.ChroMusic?.Notation?.generateNativeScoreMarkup?.(item) || (!!window.ChroMusic?.Notation?.generateAlphaTexFromItem?.(item) && !!globalThis.alphaTab?.AlphaTabApi);
    guitarTab.classList.toggle('disabled', !item.guitar);
    pianoTab.classList.toggle('disabled', !item.piano);
    scoreTab.classList.toggle('disabled', !scoreAvailable);

    shadow.getElementById('score-renderer').value = this._scoreSettings.renderer;
    shadow.getElementById('score-theme').value = this._scoreSettings.theme;
    shadow.getElementById('score-zoom').value = String(this._scoreSettings.zoom);
    shadow.getElementById('score-zoom-value').textContent = `${this._scoreSettings.zoom}%`;
    shadow.getElementById('score-weight').value = String(this._scoreSettings.lineWeight);
    shadow.getElementById('score-weight-value').textContent = `${this._scoreSettings.lineWeight.toFixed(2)}×`;
    shadow.getElementById('score-spacing').value = String(this._scoreSettings.staffSpacing);
    shadow.getElementById('score-spacing-value').textContent = `${this._scoreSettings.staffSpacing}px`;
    shadow.getElementById('score-compact').checked = this._scoreSettings.compact;

    // If current tab is disabled, switch to the other
    const activeTab = shadow.querySelector('.tab.active');
    if (activeTab && activeTab.classList.contains('disabled')) {
      const tabs = [guitarTab, pianoTab, scoreTab];
      const fallback = tabs.find((tab) => !tab.classList.contains('disabled'));
      if (fallback) {
        fallback.click();
      }
    }

    // Update guitar
    const guitarEl = shadow.querySelector('guitar-fretboard');
    if (item.guitar && guitarEl) {
      guitarEl.voicing = item.guitar;
    }

    // Update piano
    const pianoEl = shadow.querySelector('piano-keyboard');
    if (item.piano && pianoEl) {
      pianoEl.voicing = { ...item.piano, _parentLabel: item.label };
    }

    this._renderScoreTab(item);
  }
}

try {
  customElementRegistry.define('chromusic-panel', ChroMusicPanel);
} catch (e) {
  console.error('[ChroMusic] Failed to register <chromusic-panel>:', e);
}
})();
