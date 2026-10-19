(() => {
  'use strict';

  const NOTE_TO_PC = {
    C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5,
    F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11,
  };
  const LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  const GUITAR_TAB_STRINGS = Object.freeze([
    { string: 1, label: 'e' },
    { string: 2, label: 'B' },
    { string: 3, label: 'G' },
    { string: 4, label: 'D' },
    { string: 5, label: 'A' },
    { string: 6, label: 'E' },
  ]);
  const DEFAULT_DISPLAY_OPTIONS = Object.freeze({
    theme: 'paper',
    lineWeight: 1.35,
    textWeight: 700,
    noteScale: 1.08,
    staffSpacing: 13,
    tabSpacing: 16,
    compact: false,
  });

  function resolveDisplayOptions(options = {}) {
    const resolved = { ...DEFAULT_DISPLAY_OPTIONS, ...(options || {}) };
    const dark = resolved.theme === 'dark';
    return {
      ...resolved,
      paper: dark ? '#11111f' : '#ffffff',
      panel: dark ? '#17172a' : '#ffffff',
      border: dark ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.16)',
      primary: dark ? '#f2f2f2' : '#111111',
      secondary: dark ? '#a9a9b9' : '#3c3c3c',
      muted: dark ? '#8f93aa' : '#6d6d6d',
      staffStroke: dark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.86)',
      tabStroke: dark ? 'rgba(255,255,255,0.52)' : 'rgba(0,0,0,0.68)',
      guideStroke: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',
      noteFill: dark ? '#f2f2f2' : '#111111',
      tabCellFill: dark ? '#11111f' : '#ffffff',
      tabCellStroke: dark ? 'rgba(143,211,255,0.55)' : 'rgba(0,0,0,0.48)',
      accent: dark ? '#f4d35e' : '#111111',
      summaryBg: dark ? '#17172a' : '#f7f7f7',
    };
  }

  function escapeTexString(value) {
    return String(value ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");
  }

  function normalizeFret(fret) {
    if (typeof fret === 'number') return fret;
    const value = String(fret ?? '').trim().toUpperCase();
    if (value === 'O') return 0;
    if (value === 'X' || value === '') return 'x';
    const num = Number(value);
    return Number.isFinite(num) ? num : 'x';
  }

  function sortByStringAsc(positions) {
    return [...(positions || [])].sort((a, b) => a.string - b.string);
  }

  function noteToMidi(note) {
    const match = String(note || '').trim().match(/^([A-G](?:#|b)?)(-?\d+)$/);
    if (!match) return null;
    const [, pitch, octaveStr] = match;
    const pc = NOTE_TO_PC[pitch];
    if (pc === undefined) return null;
    const octave = Number(octaveStr);
    if (!Number.isFinite(octave)) return null;
    return (octave + 1) * 12 + pc;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseScientificNote(note) {
    const match = String(note || '').trim().match(/^([A-G])(#|b)?(-?\d+)$/);
    if (!match) return null;
    const [, letter, accidental = '', octaveStr] = match;
    const octave = Number(octaveStr);
    const midi = noteToMidi(`${letter}${accidental}${octave}`);
    if (!Number.isFinite(octave) || midi === null) return null;
    return { letter, accidental, octave, midi, note: `${letter}${accidental}${octave}` };
  }

  function transposeNoteForDisplay(parsed, octaveShift = 0) {
    if (!parsed) return null;
    return {
      ...parsed,
      octave: parsed.octave + octaveShift,
      midi: parsed.midi + (octaveShift * 12),
      note: `${parsed.letter}${parsed.accidental}${parsed.octave + octaveShift}`,
    };
  }

  function diatonicNumber(parsed) {
    return (parsed.octave * 7) + LETTER_INDEX[parsed.letter];
  }

  function staffReference(clef) {
    return clef === 'bass'
      ? { letter: 'G', octave: 2 }
      : { letter: 'E', octave: 4 };
  }

  function noteStepFromClef(parsed, clef) {
    const reference = staffReference(clef);
    return diatonicNumber(parsed) - ((reference.octave * 7) + LETTER_INDEX[reference.letter]);
  }

  function yForStaffStep(bottomLineY, lineSpacing, step) {
    return bottomLineY - (step * (lineSpacing / 2));
  }

  function renderStaffLines(x1, x2, bottomLineY, lineSpacing, options = {}) {
    const display = resolveDisplayOptions(options);
    let output = '';
    for (let i = 0; i < 5; i++) {
      const y = bottomLineY - (i * lineSpacing);
      output += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${display.staffStroke}" stroke-width="${1.15 * display.lineWeight}" />`;
    }
    return output;
  }

  function renderLedgerLines(noteheads, chordX, options = {}) {
    const display = resolveDisplayOptions(options);
    const seen = new Set();
    let output = '';
    noteheads.forEach((notehead) => {
      if (notehead.step < 0) {
        for (let step = notehead.step; step <= -2; step += 2) {
          const y = yForStaffStep(notehead.bottomLineY, notehead.lineSpacing, step);
          const key = `${chordX}:${y}`;
          if (seen.has(key)) continue;
          seen.add(key);
          output += `<line x1="${chordX - 16}" y1="${y}" x2="${chordX + 20}" y2="${y}" stroke="${display.staffStroke}" stroke-width="${1.15 * display.lineWeight}" />`;
        }
      }
      if (notehead.step > 8) {
        for (let step = 10; step <= notehead.step; step += 2) {
          const y = yForStaffStep(notehead.bottomLineY, notehead.lineSpacing, step);
          const key = `${chordX}:${y}`;
          if (seen.has(key)) continue;
          seen.add(key);
          output += `<line x1="${chordX - 16}" y1="${y}" x2="${chordX + 20}" y2="${y}" stroke="${display.staffStroke}" stroke-width="${1.15 * display.lineWeight}" />`;
        }
      }
    });
    return output;
  }

  function renderBracePath(x, topY, bottomY) {
    const midY = (topY + bottomY) / 2;
    return `M ${x + 14} ${topY} C ${x - 10} ${topY + 10}, ${x - 10} ${midY - 14}, ${x + 6} ${midY} C ${x - 10} ${midY + 14}, ${x - 10} ${bottomY - 10}, ${x + 14} ${bottomY}`;
  }

  function buildChordNoteheads(notes, options = {}) {
    const chordX = options.chordX ?? 184;
    const bottomLineY = options.bottomLineY ?? 118;
    const lineSpacing = options.lineSpacing ?? resolveDisplayOptions(options).staffSpacing;
    const clef = options.clef ?? 'treble';
    const displayOctaveShift = options.displayOctaveShift ?? 0;
    const sorted = [...(notes || [])]
      .map((entry) => {
        const parsed = transposeNoteForDisplay(parseScientificNote(entry.note), displayOctaveShift);
        if (!parsed) return null;
        const step = noteStepFromClef(parsed, clef);
        return {
          ...entry,
          parsed,
          step,
          y: yForStaffStep(bottomLineY, lineSpacing, step),
          bottomLineY,
          lineSpacing,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.step - b.step);

    sorted.forEach((note, index) => {
      const previous = sorted[index - 1];
      note.dx = previous && Math.abs(note.step - previous.step) <= 1 ? 8 : 0;
    });

    return sorted.map((note) => ({ ...note, x: chordX + (note.dx || 0) }));
  }

  function renderChordSvg(notes, options = {}) {
    const display = resolveDisplayOptions(options);
    const chordX = options.chordX ?? 184;
    const noteheads = buildChordNoteheads(notes, options);
    if (!noteheads.length) return '';

    const stemUp = (noteheads.reduce((sum, note) => sum + note.step, 0) / noteheads.length) < 4;
    const stemAnchor = stemUp ? noteheads[noteheads.length - 1] : noteheads[0];
    const stemX = stemUp ? stemAnchor.x + (7 * display.noteScale) : stemAnchor.x - (7 * display.noteScale);
    const stemY2 = stemUp ? stemAnchor.y - (39 * display.noteScale) : stemAnchor.y + (39 * display.noteScale);
    const noteRx = 8.8 * display.noteScale;
    const noteRy = 6.6 * display.noteScale;

    return `
      <g>
        ${renderLedgerLines(noteheads, chordX, display)}
        ${noteheads.map((note) => `
          <g>
            ${note.parsed.accidental ? `<text x="${note.x - 17}" y="${note.y + 6}" fill="${display.accent}" font-size="${18 * display.noteScale}" font-weight="${display.textWeight}" text-anchor="middle" font-family="Bravura, Petaluma, serif">${escapeHtml(note.parsed.accidental)}</text>` : ''}
            <ellipse cx="${note.x}" cy="${note.y}" rx="${noteRx}" ry="${noteRy}" transform="rotate(-20 ${note.x} ${note.y})" fill="${display.noteFill}" />
          </g>
        `).join('')}
        <line x1="${stemX}" y1="${stemAnchor.y}" x2="${stemX}" y2="${stemY2}" stroke="${display.noteFill}" stroke-width="${1.8 * display.lineWeight}" />
      </g>
    `;
  }

  function renderClef(clef, x, y, options = {}) {
    const display = resolveDisplayOptions(options);
    const symbol = clef === 'bass' ? '𝄢' : '𝄞';
    const size = clef === 'bass' ? 38 : 52;
    return `<text x="${x}" y="${y}" fill="${display.primary}" font-size="${size * display.noteScale}" font-weight="${display.textWeight}" font-family="Bravura, Petaluma, Georgia, serif">${symbol}</text>`;
  }

  function renderTimeSignature(x, topY, lineSpacing, options = {}) {
    const display = resolveDisplayOptions(options);
    return `
      <text x="${x}" y="${topY + lineSpacing * 1.7}" fill="${display.primary}" font-size="${20 * display.noteScale}" font-weight="${display.textWeight}" text-anchor="middle" font-family="JetBrains Mono, monospace">4</text>
      <text x="${x}" y="${topY + lineSpacing * 3.5}" fill="${display.primary}" font-size="${20 * display.noteScale}" font-weight="${display.textWeight}" text-anchor="middle" font-family="JetBrains Mono, monospace">4</text>
    `;
  }

  function renderGuitarTabPositions(positions, options = {}) {
    const display = resolveDisplayOptions(options);
    const chordX = options.chordX ?? 184;
    const topY = options.topY ?? 214;
    const stringSpacing = options.stringSpacing ?? display.tabSpacing;
    return sortByStringAsc(positions).map((pos) => {
      const y = topY + ((pos.string - 1) * stringSpacing);
      const fret = normalizeFret(pos.fret);
      if (fret === 'x') {
        return `<text x="${chordX}" y="${y + 5}" fill="${display.primary}" font-size="15" font-weight="${display.textWeight}" text-anchor="middle" font-family="JetBrains Mono, monospace">x</text>`;
      }
      const label = fret === 0 ? '0' : String(fret);
      const boxWidth = Math.max(18, 8 + (label.length * 9));
      return `
        <g>
          <rect x="${chordX - (boxWidth / 2)}" y="${y - 10}" width="${boxWidth}" height="18" rx="4" fill="${display.tabCellFill}" stroke="${display.tabCellStroke}" stroke-width="${1.1 * display.lineWeight}" />
          <text x="${chordX}" y="${y + 4}" fill="${display.primary}" font-size="14" font-weight="${display.textWeight}" text-anchor="middle" font-family="JetBrains Mono, monospace">${escapeHtml(label)}</text>
        </g>
      `;
    }).join('');
  }

  function renderGuitarNativeScore(item, options = {}) {
    const display = resolveDisplayOptions(options);
    const guitar = item?.guitar;
    if (!guitar?.positions?.length) return '';

    const positions = sortByStringAsc(guitar.positions).filter((pos) => pos.note || String(pos.fret).trim().toUpperCase() === 'X');
    const playedNotes = positions.filter((pos) => typeof normalizeFret(pos.fret) === 'number');
    if (!playedNotes.length) return '';

    const width = 760;
    const height = options.compact ? 322 : 360;
    const staffLeft = 86;
    const staffRight = 720;
    const trebleBottom = 124;
    const lineSpacing = display.staffSpacing;
    const tabTop = 230;
    const tabSpacing = display.tabSpacing;
    const chordX = 198;
    const summary = positions
      .filter((pos) => typeof normalizeFret(pos.fret) === 'number')
      .sort((a, b) => a.string - b.string)
      .map((pos) => `${pos.note} · s${pos.string}/${normalizeFret(pos.fret)}${pos.interval ? ` · ${pos.interval}` : ''}`)
      .join('  •  ');

    return `
      <div style="background:${display.panel};border:1px solid ${display.border};border-radius:12px;padding:12px;overflow:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:12px;">
          <div style="font-weight:800;color:${display.primary};">${escapeHtml(item.label || 'Chord')}</div>
          <div style="font-size:12px;color:${display.secondary};font-weight:${display.textWeight};">Native guitar score + tabs</div>
        </div>
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="${width}" height="${height}" rx="10" fill="${display.paper}" />
          <text x="26" y="34" fill="${display.secondary}" font-size="13" font-weight="${display.textWeight}" font-family="JetBrains Mono, monospace">Standard notation</text>
          ${renderStaffLines(staffLeft, staffRight, trebleBottom, lineSpacing, display)}
          ${renderClef('treble', 28, 110, display)}
          ${renderTimeSignature(74, trebleBottom - (lineSpacing * 4), lineSpacing, display)}
          <line x1="${staffLeft}" y1="52" x2="${staffLeft}" y2="${trebleBottom}" stroke="${display.staffStroke}" stroke-width="${1.45 * display.lineWeight}" />
          <line x1="${staffRight}" y1="52" x2="${staffRight}" y2="${trebleBottom}" stroke="${display.staffStroke}" stroke-width="${1.45 * display.lineWeight}" />
          ${renderChordSvg(playedNotes, { ...display, chordX, bottomLineY: trebleBottom, lineSpacing, clef: 'treble', displayOctaveShift: 1 })}

          <text x="26" y="200" fill="${display.secondary}" font-size="13" font-weight="${display.textWeight}" font-family="JetBrains Mono, monospace">TAB</text>
          ${GUITAR_TAB_STRINGS.map((entry, index) => {
            const y = tabTop + (index * tabSpacing);
            return `<g><line x1="${staffLeft}" y1="${y}" x2="${staffRight}" y2="${y}" stroke="${display.tabStroke}" stroke-width="${1.1 * display.lineWeight}" /><text x="72" y="${y + 4}" fill="${display.muted}" font-size="11" font-weight="${display.textWeight}" text-anchor="middle" font-family="JetBrains Mono, monospace">${entry.label}</text></g>`;
          }).join('')}
          <line x1="${staffLeft}" y1="${tabTop}" x2="${staffLeft}" y2="${tabTop + (tabSpacing * 5)}" stroke="${display.tabStroke}" stroke-width="${1.45 * display.lineWeight}" />
          <line x1="${staffRight}" y1="${tabTop}" x2="${staffRight}" y2="${tabTop + (tabSpacing * 5)}" stroke="${display.tabStroke}" stroke-width="${1.45 * display.lineWeight}" />
          ${renderGuitarTabPositions(positions, { ...display, chordX, topY: tabTop, stringSpacing: tabSpacing })}
        </svg>
        <div style="margin-top:8px;padding:8px 10px;background:${display.summaryBg};border:1px solid ${display.border};border-radius:8px;color:${display.primary};font-size:11px;font-weight:${display.textWeight};line-height:1.5;">
          ${escapeHtml(summary)}
        </div>
      </div>
    `;
  }

  function renderPianoNativeScore(item, options = {}) {
    const display = resolveDisplayOptions(options);
    const piano = item?.piano;
    const rightHand = piano?.rightHand || [];
    const leftHand = piano?.leftHand || [];
    if (!rightHand.length && !leftHand.length) return '';

    const width = 760;
    const height = 330;
    const staffLeft = 86;
    const staffRight = 720;
    const trebleBottom = 108;
    const bassBottom = 238;
    const lineSpacing = display.staffSpacing;
    const chordX = 198;
    const summary = [
      ...leftHand.map((note) => `${note.note}${note.interval ? ` · ${note.interval}` : ''}${note.finger ? ` · LH${note.finger}` : ''}`),
      ...rightHand.map((note) => `${note.note}${note.interval ? ` · ${note.interval}` : ''}${note.finger ? ` · RH${note.finger}` : ''}`),
    ].join('  •  ');

    return `
      <div style="background:${display.panel};border:1px solid ${display.border};border-radius:12px;padding:12px;overflow:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:12px;">
          <div style="font-weight:800;color:${display.primary};">${escapeHtml(item.label || 'Chord')}</div>
          <div style="font-size:12px;color:${display.secondary};font-weight:${display.textWeight};">Native piano score</div>
        </div>
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="${width}" height="${height}" rx="10" fill="${display.paper}" />
          <path d="${renderBracePath(32, 36, 238)}" stroke="${display.staffStroke}" stroke-width="${2.2 * display.lineWeight}" fill="none" />
          ${renderStaffLines(staffLeft, staffRight, trebleBottom, lineSpacing, display)}
          ${renderStaffLines(staffLeft, staffRight, bassBottom, lineSpacing, display)}
          ${renderClef('treble', 30, 96, display)}
          ${renderClef('bass', 36, 220, display)}
          ${renderTimeSignature(74, trebleBottom - (lineSpacing * 4), lineSpacing, display)}
          ${renderTimeSignature(74, bassBottom - (lineSpacing * 4), lineSpacing, display)}
          <line x1="${staffLeft}" y1="36" x2="${staffLeft}" y2="${bassBottom}" stroke="${display.staffStroke}" stroke-width="${1.45 * display.lineWeight}" />
          <line x1="${staffRight}" y1="36" x2="${staffRight}" y2="${bassBottom}" stroke="${display.staffStroke}" stroke-width="${1.45 * display.lineWeight}" />
          <line x1="${staffLeft}" y1="172" x2="${staffRight}" y2="172" stroke="${display.guideStroke}" stroke-width="${1.1 * display.lineWeight}" stroke-dasharray="4 4" />
          ${renderChordSvg(rightHand, { ...display, chordX, bottomLineY: trebleBottom, lineSpacing, clef: 'treble', displayOctaveShift: 0 })}
          ${renderChordSvg(leftHand, { ...display, chordX, bottomLineY: bassBottom, lineSpacing, clef: 'bass', displayOctaveShift: 0 })}
        </svg>
        <div style="margin-top:8px;padding:8px 10px;background:${display.summaryBg};border:1px solid ${display.border};border-radius:8px;color:${display.primary};font-size:11px;font-weight:${display.textWeight};line-height:1.5;">
          ${escapeHtml(summary)}
        </div>
      </div>
    `;
  }

  function generateNativeScoreMarkup(item, instrument = 'auto', options = {}) {
    if (instrument === 'guitar') return renderGuitarNativeScore(item, options);
    if (instrument === 'piano') return renderPianoNativeScore(item, options);
    return item?.guitar?.positions?.length ? renderGuitarNativeScore(item, options) : renderPianoNativeScore(item, options);
  }

  function generateGuitarAlphaTex(item) {
    const guitar = item?.guitar;
    if (!guitar?.positions?.length) return null;

    const label = escapeTexString(item.label || `${item.root || ''}${item.quality || ''}`.trim() || 'Chord');
    const positions = sortByStringAsc(guitar.positions);
    const tuning = (guitar.tuning || ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']).slice().reverse();
    const beatNotes = [];

    positions.forEach((pos) => {
      const fret = normalizeFret(pos.fret);
      if (fret !== 'x') {
        beatNotes.push(`${fret}.${pos.string}`);
      }
    });

    const beat = beatNotes.length ? `(${beatNotes.join(' ')}) .1 { ch '${label}' } |` : 'r.1 |';

    return [
      `\\title '${label}'`,
      `\\track 'Guitar'`,
      `\\staff {score tabs}`,
      `\\tuning (${tuning.join(' ')})`,
      `\\displayTranspose -12`,
      beat,
    ].join('\n');
  }

  function generatePianoAlphaTex(item) {
    const piano = item?.piano;
    const rightHand = piano?.rightHand || [];
    const leftHand = piano?.leftHand || [];
    if (!rightHand.length && !leftHand.length) return null;

    const label = escapeTexString(item.label || `${item.root || ''}${item.quality || ''}`.trim() || 'Chord');
    const rightBeat = rightHand.length ? `(${rightHand.map((n) => n.note).join(' ')}) .1 |` : 'r.1 |';
    const leftBeat = leftHand.length ? `(${leftHand.map((n) => n.note).join(' ')}) .1 |` : 'r.1 |';

    return [
      `\\title '${label}'`,
      `\\track 'Piano'`,
      `\\staff {score}`,
      `\\tuning piano`,
      rightBeat,
      `\\staff {score}`,
      `\\tuning piano`,
      `\\clef F4`,
      leftBeat,
    ].join('\n');
  }

  function generateAlphaTexFromItem(item, instrument = 'auto') {
    if (!item || typeof item !== 'object') return null;
    if (instrument === 'guitar') {
      return item.guitar?.positions?.length ? generateGuitarAlphaTex(item) : null;
    }
    if (instrument === 'piano') {
      return item.piano ? generatePianoAlphaTex(item) : null;
    }
    if (item.guitar?.positions?.length) return generateGuitarAlphaTex(item);
    if (item.piano) return generatePianoAlphaTex(item);
    return null;
  }

  window.ChroMusic = window.ChroMusic || {};
  window.ChroMusic.Notation = {
    DEFAULT_DISPLAY_OPTIONS,
    resolveDisplayOptions,
    generateAlphaTexFromItem,
    generateGuitarAlphaTex,
    generatePianoAlphaTex,
    generateNativeScoreMarkup,
  };
})();
