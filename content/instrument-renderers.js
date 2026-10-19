(() => {
  'use strict';

  function roundRect(ctx, x, y, w, h, radii) {
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

  function setupHost(container, labelText, legendHtml) {
    container.innerHTML = `
      <div style="display:block;width:100%;background:#1a1a2e;border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;">
        <div style="text-align:center;font-family:'JetBrains Mono','Fira Code','Consolas',monospace;font-size:14px;font-weight:700;color:#e0e0e0;padding:10px 10px 4px;letter-spacing:.4px;">${labelText || ''}</div>
        <div style="padding:0 10px 10px;">
          <canvas style="display:block;width:100%;height:auto;"></canvas>
        </div>
        <div data-legend style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;padding:2px 8px 10px;color:#aaa;font:10px 'JetBrains Mono',monospace;">${legendHtml || ''}</div>
      </div>
    `;
    return {
      canvas: container.querySelector('canvas'),
      wrapper: container.firstElementChild,
      legend: container.querySelector('[data-legend]'),
    };
  }

  function attachResponsiveDraw(wrapper, draw) {
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!wrapper.isConnected) {
          if (observer) observer.disconnect();
          return;
        }
        draw();
      });
    };

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(run)
      : null;

    if (observer) {
      observer.observe(wrapper);
    } else {
      window.addEventListener('resize', run, { passive: true });
    }

    run();
  }

  function renderEmpty(container, message) {
    container.innerHTML = `<div style="padding:20px;text-align:center;color:#8f8f9d;background:#1a1a2e;border:1px solid rgba(255,255,255,.08);border-radius:12px;">${message}</div>`;
  }

  function renderGuitar(container, item) {
    const MusicTheory = window.ChroMusic?.MusicTheory;
    const data = item?.guitar ? { ...item.guitar, label: item.label, root: item.root, quality: item.quality } : null;
    if (!MusicTheory || !data?.positions?.length) {
      renderEmpty(container, 'No guitar voicing available.');
      return;
    }

    const legendHtml = (MusicTheory.INTERVAL_CATEGORIES || []).map((cat) => `
      <span style="display:flex;align-items:center;gap:4px;">
        <span style="width:10px;height:10px;border-radius:50%;background:${cat.color};display:inline-block;"></span>
        ${cat.label}
      </span>
    `).join('');

    const { canvas, wrapper } = setupHost(container, data.label || `${data.root || ''}${data.quality || ''}`, legendHtml);
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    attachResponsiveDraw(wrapper, () => {
      const positions = data.positions || [];
      const numStrings = Math.max(6, ...positions.map((p) => p.string || 0));
      const frettedPositions = positions.filter((p) => typeof p.fret === 'number' && p.fret > 0);
      let minFret = data.startFret;
      let maxFret;

      if (frettedPositions.length > 0) {
        const frets = frettedPositions.map((p) => p.fret);
        if (!minFret || minFret < 1) minFret = Math.max(1, Math.min(...frets));
        maxFret = Math.max(...frets);
      } else {
        minFret = 1;
        maxFret = 4;
      }

      const span = maxFret - minFret + 1;
      const visibleFrets = Math.max(4, Math.min(7, span + 1));
      maxFret = minFret + visibleFrets - 1;
      const showNut = minFret === 1;

      const containerWidth = Math.max(320, wrapper.clientWidth - 20);
      const padLeft = 40;
      const padRight = 20;
      const padTop = 30;
      const padBottom = 30;
      const stringSpacing = 26;
      const fretSpacing = Math.max(40, Math.min(65, (containerWidth - padLeft - padRight) / visibleFrets));
      const boardLeft = padLeft;
      const boardRight = padLeft + fretSpacing * visibleFrets;
      const indicatorX = boardRight + 18;

      const getStringY = (stringNumber) => padTop + (Math.max(1, Number(stringNumber)) - 1) * stringSpacing;
      const getFretLineX = (fretIndex) => boardRight - (fretIndex * fretSpacing);
      const getFretCenterX = (fret) => boardRight - (((fret - minFret) + 0.5) * fretSpacing);

      const totalW = padLeft + fretSpacing * visibleFrets + padRight;
      const totalH = padTop + stringSpacing * (numStrings - 1) + padBottom;

      canvas.width = totalW * dpr;
      canvas.height = totalH * dpr;
      canvas.style.width = `${totalW}px`;
      canvas.style.height = `${totalH}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, totalW, totalH);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, totalW, totalH);

      const wood = ctx.createLinearGradient(0, 0, totalW, totalH);
      wood.addColorStop(0, '#3a2619');
      wood.addColorStop(0.5, '#5b3a24');
      wood.addColorStop(1, '#3b2618');
      ctx.fillStyle = wood;
      roundRect(ctx, padLeft - 6, padTop - 10, fretSpacing * visibleFrets + 12, stringSpacing * (numStrings - 1) + 20, 10);
      ctx.fill();

      ctx.strokeStyle = '#c9c9c9';
      ctx.lineWidth = 1;
      for (let f = 0; f <= visibleFrets; f++) {
        const x = getFretLineX(f);
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + stringSpacing * (numStrings - 1));
        ctx.stroke();
      }

      if (showNut) {
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(boardRight, padTop - 1);
        ctx.lineTo(boardRight, padTop + stringSpacing * (numStrings - 1) + 1);
        ctx.stroke();
      }

      for (let s = 1; s <= numStrings; s++) {
        const y = getStringY(s);
        const thickness = 1 + ((numStrings - s) * 0.42);
        ctx.strokeStyle = '#d5d0c7';
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.moveTo(boardLeft, y);
        ctx.lineTo(boardRight, y);
        ctx.stroke();
      }

      const dotFrets = [3, 5, 7, 9, 15, 17, 19, 21];
      const doubleDotFrets = [12, 24];
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (let f = minFret; f <= maxFret; f++) {
        const cx = getFretCenterX(f);
        const midY = padTop + (stringSpacing * (numStrings - 1)) / 2;
        if (dotFrets.includes(f)) {
          ctx.beginPath();
          ctx.arc(cx, midY, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (doubleDotFrets.includes(f)) {
          ctx.beginPath();
          ctx.arc(cx, midY - 22, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx, midY + 22, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.fillStyle = '#9896a8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let f = 0; f < visibleFrets; f++) {
        const fretNum = minFret + f;
        const x = getFretCenterX(fretNum);
        ctx.fillText(String(fretNum), x, padTop + stringSpacing * (numStrings - 1) + 9);
      }

      const posMap = new Map();
      positions.forEach((p) => posMap.set(p.string, p));
      const bubbleR = 12;

      for (let s = 1; s <= numStrings; s++) {
        const y = getStringY(s);
        const pos = posMap.get(s);
        if (!pos) continue;

        const fret = typeof pos.fret === 'string' ? pos.fret.toUpperCase() : pos.fret;
        if (fret === 'X') {
          ctx.fillStyle = '#ff6b6b';
          ctx.font = 'bold 13px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✕', indicatorX, y);
          continue;
        }

        if (fret === 'O' || fret === 0) {
          ctx.strokeStyle = '#4ecdc4';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(indicatorX, y, 7, 0, Math.PI * 2);
          ctx.stroke();
          if (pos.interval) {
            ctx.fillStyle = MusicTheory.getIntervalColor(pos.interval);
            ctx.beginPath();
            ctx.arc(indicatorX, y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          continue;
        }

        if (typeof fret === 'number' && fret >= minFret && fret <= maxFret) {
          const cx = getFretCenterX(fret);
          const color = MusicTheory.getIntervalColor(pos.interval);
          const textColor = MusicTheory.contrastText(color);

          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(cx, y, bubbleR, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.strokeStyle = 'rgba(255,255,255,0.22)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(cx, y, bubbleR, 0, Math.PI * 2);
          ctx.stroke();

          const label = pos.interval || '';
          ctx.fillStyle = textColor;
          ctx.font = `bold ${String(label).length > 2 ? 8 : 10}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(label), cx, y + 0.5);

          if (pos.finger && Number(pos.finger) > 0) {
            ctx.fillStyle = '#f5f5f5';
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.fillText(String(pos.finger), cx, y - 16);
          }
        }
      }

      if (Array.isArray(data.barres)) {
        data.barres.forEach((barre) => {
          if (!barre?.fret || !barre?.fromString || !barre?.toString) return;
          if (barre.fret < minFret || barre.fret > maxFret) return;
          const cx = getFretCenterX(barre.fret);
          const yFrom = getStringY(barre.fromString);
          const yTo = getStringY(barre.toString);
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          ctx.lineWidth = bubbleR * 1.9;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cx, Math.min(yFrom, yTo));
          ctx.lineTo(cx, Math.max(yFrom, yTo));
          ctx.stroke();
        });
      }
    });
  }

  function renderGuitarScale(container, item) {
    const MusicTheory = window.ChroMusic?.MusicTheory;
    const position = item?.scale?.position || null;
    if (!MusicTheory || !position?.notes?.length) {
      renderEmpty(container, 'No guitar scale available.');
      return;
    }

    const legendHtml = `
      <span style="display:flex;align-items:center;gap:4px;">
        <span style="width:10px;height:10px;border-radius:50%;background:${MusicTheory.getIntervalColor('R')};display:inline-block;"></span>
        Root
      </span>
      <span style="display:flex;align-items:center;gap:4px;">
        <span style="width:10px;height:10px;border-radius:50%;background:#2ecc71;display:inline-block;"></span>
        Scale tone
      </span>
    `;

    const label = `${item?.root || ''} ${position.mode || item?.scale?.scaleType || 'scale'} • Position ${position.positionIndex}`;
    const { canvas, wrapper } = setupHost(container, label, legendHtml);
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    attachResponsiveDraw(wrapper, () => {
      const notes = position.notes || [];
      const numStrings = 6;
      const minFret = position.startFret <= 1 ? 1 : position.startFret;
      const maxFret = Math.max(minFret + 4, position.endFret || (minFret + 4));
      const visibleFrets = Math.max(5, maxFret - minFret + 1);
      const containerWidth = Math.max(320, wrapper.clientWidth - 20);
      const padLeft = 40;
      const padRight = 20;
      const padTop = 30;
      const padBottom = 30;
      const stringSpacing = 26;
      const fretSpacing = Math.max(38, Math.min(62, (containerWidth - padLeft - padRight) / visibleFrets));
      const totalW = padLeft + fretSpacing * visibleFrets + padRight;
      const totalH = padTop + stringSpacing * (numStrings - 1) + padBottom;

      canvas.width = totalW * dpr;
      canvas.height = totalH * dpr;
      canvas.style.width = `${totalW}px`;
      canvas.style.height = `${totalH}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, totalW, totalH);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, totalW, totalH);

      const wood = ctx.createLinearGradient(0, 0, totalW, totalH);
      wood.addColorStop(0, '#3a2619');
      wood.addColorStop(0.5, '#5b3a24');
      wood.addColorStop(1, '#3b2618');
      ctx.fillStyle = wood;
      roundRect(ctx, padLeft - 6, padTop - 10, fretSpacing * visibleFrets + 12, stringSpacing * (numStrings - 1) + 20, 10);
      ctx.fill();

      ctx.strokeStyle = '#c9c9c9';
      ctx.lineWidth = 1;
      for (let f = 0; f <= visibleFrets; f++) {
        const x = padLeft + f * fretSpacing;
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + stringSpacing * (numStrings - 1));
        ctx.stroke();
      }

      if (minFret === 1) {
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(padLeft, padTop - 1);
        ctx.lineTo(padLeft, padTop + stringSpacing * (numStrings - 1) + 1);
        ctx.stroke();
      }

      for (let s = 0; s < numStrings; s++) {
        const y = padTop + s * stringSpacing;
        ctx.strokeStyle = '#d5d0c7';
        ctx.lineWidth = 1 + (s * 0.42);
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + fretSpacing * visibleFrets, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#9896a8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let f = 0; f < visibleFrets; f++) {
        const fretNum = minFret + f;
        const x = padLeft + (f + 0.5) * fretSpacing;
        ctx.fillText(String(fretNum), x, padTop + stringSpacing * (numStrings - 1) + 9);
      }

      notes.forEach((note) => {
        const fret = note.fret;
        if (typeof fret !== 'number') return;

        if (fret === 0) {
          const y = padTop + (numStrings - note.string) * stringSpacing;
          const color = note.isRoot ? MusicTheory.getIntervalColor('R') : '#2ecc71';
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(padLeft - 18, y, 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(padLeft - 18, y, 4, 0, Math.PI * 2);
          ctx.fill();
          return;
        }

        if (fret < minFret || fret > maxFret) return;
        const x = padLeft + ((fret - minFret) + 0.5) * fretSpacing;
        const y = padTop + (numStrings - note.string) * stringSpacing;
        const color = note.isRoot ? MusicTheory.getIntervalColor('R') : '#2ecc71';
        const textColor = note.isRoot ? MusicTheory.contrastText(color) : '#102418';

        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.font = `bold ${String(note.degreeLabel || '').length > 2 ? 8 : 10}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(note.interval || note.degreeLabel || ''), x, y + 0.5);

        if (note.finger && note.fret > 0) {
          ctx.fillStyle = '#f5f5f5';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillText(String(note.finger), x, y - 15);
        }
      });
    });
  }

  function renderPiano(container, item) {
    const MusicTheory = window.ChroMusic?.MusicTheory;
    const data = item?.piano ? { ...item.piano, _parentLabel: item.label } : null;
    if (!MusicTheory || !data) {
      renderEmpty(container, 'No piano voicing available.');
      return;
    }

    const legendHtml = `
      <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.2);border:1px solid #888;"></span>L.H.</span>
      <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.6);border:1px solid #ccc;"></span>R.H.</span>
    `;

    const { canvas, wrapper } = setupHost(container, data._parentLabel || '', legendHtml);
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    function drawActiveKeyLabel(x, y, width, noteY, active, textColor) {
      const noteLabel = active.originalName || active.note || '';
      const intervalLabel = active.interval || '';
      const fingerLabel = active.finger ? String(active.finger) : '';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${noteLabel.length > 2 ? 8 : 10}px "JetBrains Mono", monospace`;
      ctx.fillText(noteLabel, x + width / 2, noteY);
      if (intervalLabel) {
        ctx.font = `bold ${intervalLabel.length > 2 ? 7 : 9}px "JetBrains Mono", monospace`;
        ctx.fillText(intervalLabel, x + width / 2, noteY + 12);
      }
      if (fingerLabel) {
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.fillText(fingerLabel, x + width / 2, noteY + 24);
      }
    }

    attachResponsiveDraw(wrapper, () => {
      const allNotes = [
        ...(data.leftHand || []).map((n) => ({ ...n, hand: 'L' })),
        ...(data.rightHand || []).map((n) => ({ ...n, hand: 'R' })),
      ];

      if (!allNotes.length) {
        renderEmpty(container, 'No piano voicing available.');
        return;
      }

      const range = MusicTheory.getPianoRange(allNotes);
      const allKeys = MusicTheory.getPianoKeys();
      const visibleKeys = allKeys.filter((k) => k.midi >= range.low && k.midi <= range.high);
      const whiteKeys = visibleKeys.filter((k) => !k.isBlack);
      const blackKeys = visibleKeys.filter((k) => k.isBlack);
      const activeMap = new Map();

      allNotes.forEach((n) => {
        const parsed = MusicTheory.parseNote(n.note);
        if (!parsed) return;
        const existing = activeMap.get(parsed.midi);
        const color = MusicTheory.getIntervalColor(n.interval);
        if (existing) {
          existing.hand = 'B';
        } else {
          activeMap.set(parsed.midi, {
            interval: n.interval || '',
            hand: n.hand,
            note: n.note,
            finger: n.finger || null,
            color,
            originalName: parsed.name,
          });
        }
      });

      const containerWidth = Math.max(340, wrapper.clientWidth - 20);
      const numWhite = whiteKeys.length;
      const wKeyW = Math.max(20, Math.min(36, (containerWidth - 20) / Math.max(1, numWhite)));
      const wKeyH = wKeyW * 4.7;
      const bKeyW = wKeyW * 0.62;
      const bKeyH = wKeyH * 0.62;
      const padLeft = 10;
      const padTop = 10;
      const totalW = padLeft * 2 + numWhite * wKeyW;
      const totalH = padTop + wKeyH + 32;

      canvas.width = totalW * dpr;
      canvas.height = totalH * dpr;
      canvas.style.width = `${totalW}px`;
      canvas.style.height = `${totalH}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, totalW, totalH);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, totalW, totalH);

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

      whiteKeys.forEach((key, i) => {
        const x = padLeft + i * wKeyW;
        const y = padTop;
        const active = activeMap.get(key.midi);

        if (active) {
          ctx.fillStyle = active.color;
          ctx.globalAlpha = active.hand === 'L' ? 0.58 : 0.9;
        } else {
          const grad = ctx.createLinearGradient(0, y, 0, y + wKeyH);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(1, '#e7e7dd');
          ctx.fillStyle = grad;
          ctx.globalAlpha = 1;
        }

        roundRect(ctx, x + 0.5, y, wKeyW - 1, wKeyH, [0, 0, 4, 4]);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = '#989898';
        ctx.lineWidth = 0.8;
        roundRect(ctx, x + 0.5, y, wKeyW - 1, wKeyH, [0, 0, 4, 4]);
        ctx.stroke();

        if (active) {
          ctx.fillStyle = active.hand === 'L' ? '#ddd' : '#fff';
          drawActiveKeyLabel(x, y, wKeyW, y + wKeyH - 24, active, active.hand === 'L' ? '#ddd' : '#fff');

          ctx.fillStyle = active.hand === 'L' ? 'rgba(255,255,255,0.35)' : active.hand === 'R' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,200,0.85)';
          ctx.beginPath();
          ctx.arc(x + wKeyW / 2, y + wKeyH - 7, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        if (key.name === 'C') {
          ctx.fillStyle = '#777';
          ctx.font = '8px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(`C${key.octave}`, x + wKeyW / 2, padTop + wKeyH + 5);
        }
      });

      blackKeys.forEach((key) => {
        const prevWhite = findAdjacentWhiteKey(key.midi, whiteKeyPositions, -1);
        const nextWhite = findAdjacentWhiteKey(key.midi, whiteKeyPositions, 1);
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
        if (active) {
          ctx.fillStyle = active.color;
          ctx.globalAlpha = active.hand === 'L' ? 0.74 : 1;
        } else {
          const grad = ctx.createLinearGradient(0, by, 0, by + bKeyH);
          grad.addColorStop(0, '#3d3d3d');
          grad.addColorStop(1, '#111');
          ctx.fillStyle = grad;
          ctx.globalAlpha = 1;
        }

        roundRect(ctx, bx, by, bKeyW, bKeyH, [0, 0, 3, 3]);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = active ? 'rgba(255,255,255,0.25)' : '#444';
        ctx.lineWidth = 0.7;
        roundRect(ctx, bx, by, bKeyW, bKeyH, [0, 0, 3, 3]);
        ctx.stroke();

        if (active) {
          drawActiveKeyLabel(bx, by, bKeyW, by + bKeyH - 20, active, MusicTheory.contrastText(active.color));
        }
      });
    });
  }

  function findAdjacentWhiteKey(blackMidi, posMap, direction) {
    for (let offset = 1; offset <= 2; offset++) {
      const pos = posMap.get(blackMidi + direction * offset);
      if (pos) return pos;
    }
    return null;
  }

  window.ChroMusic = window.ChroMusic || {};
  window.ChroMusic.InstrumentRenderers = {
    renderGuitar,
    renderGuitarScale,
    renderPiano,
  };
})();
