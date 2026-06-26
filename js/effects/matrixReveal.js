// effects/matrixReveal.js — マトリックス系エフェクト（3パターン）
import { registerEffect } from './registry.js';
import { clamp, toChars, measureChars, strSeed, mulberry32 } from './utils.js';

const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';

function getRainChar(seed) {
  const rng = mulberry32(seed);
  return MATRIX_CHARS[Math.floor(rng() * MATRIX_CHARS.length)];
}

// ─────────────────────────────────────────────────────────
// パターン1（既存）: 表示位置で文字が降り、最終的に正しい文字に落ち着く
// ─────────────────────────────────────────────────────────
registerEffect({
  id: 'matrix-reveal',
  label: 'マトリックス①（表示位置で文字が変化して確定）',
  params: [
    { key: 'revealRatio', label: '正しい文字が現れるタイミング（終わりからの割合）', type: 'range', min: 0.1, max: 0.6, step: 0.05, default: 0.3 },
    { key: 'rainSpeed', label: '文字が変化する速さ(回/秒)', type: 'range', min: 2, max: 30, step: 1, default: 12 },
    { key: 'rainColor', label: '降ってくる文字の色', type: 'color', default: '#00FF41' },
    { key: 'trailLength', label: '残像の長さ（文字数）', type: 'range', min: 0, max: 10, step: 1, default: 3 },
    { key: 'fadeOutRatio', label: 'フェードアウト割合', type: 'range', min: 0, max: 0.3, step: 0.01, default: 0.1 },
  ],
  draw(ctx, p) {
    const { text, progress, duration, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const revealRatio = params.revealRatio ?? 0.3;
    const rainSpeed = params.rainSpeed ?? 12;
    const rainColor = params.rainColor ?? '#00FF41';
    const trailLength = params.trailLength ?? 3;
    const fadeOutRatio = params.fadeOutRatio ?? 0.1;
    const elapsed = progress * duration;
    let alpha = 1;
    if (progress > 1 - fadeOutRatio) alpha = clamp((1 - progress) / fadeOutRatio, 0, 1);
    const chars = toChars(text);
    ctx.save();
    ctx.font = `${fontSize}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const { widths, total } = measureChars(ctx, chars, font, fontSize);
    const cx = x * canvasW;
    const cy = y * canvasH;
    const revealStart = 1 - revealRatio;
    const revealPerChar = revealRatio / Math.max(chars.length, 1);
    let charX = cx - total / 2;
    chars.forEach((ch, i) => {
      const charCenterX = charX + widths[i] / 2;
      const charRevealAt = revealStart + i * revealPerChar;
      const charConfirmed = progress >= charRevealAt;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (charConfirmed) {
        const confirmedT = clamp((progress - charRevealAt) / Math.max(revealPerChar, 0.01), 0, 1);
        ctx.fillStyle = confirmedT < 0.3 ? '#FFFFFF' : color;
        ctx.fillText(ch, charCenterX, cy);
      } else {
        const step = Math.floor(elapsed * rainSpeed + i * 7);
        ctx.fillStyle = rainColor;
        ctx.fillText(getRainChar(strSeed(text, step * 31 + i * 97)), charCenterX, cy);
        for (let t = 1; t <= trailLength; t++) {
          ctx.globalAlpha = alpha * (1 - t / (trailLength + 1)) * 0.7;
          ctx.fillStyle = rainColor;
          ctx.fillText(getRainChar(strSeed(text, (step - t) * 31 + i * 97)), charCenterX, cy - t * fontSize * 1.2);
        }
      }
      ctx.restore();
      charX += widths[i];
    });
    ctx.restore();
  },
});

// ─────────────────────────────────────────────────────────
// パターン2（新）: 文字が画面上部から流れ落ちて、表示位置を通り過ぎてから最終的に戻る
// ─────────────────────────────────────────────────────────
registerEffect({
  id: 'matrix-fall-through',
  label: 'マトリックス②（雨が通り過ぎてから文字が残る）',
  params: [
    { key: 'rainColumns', label: '列数（同時に流す文字の列）', type: 'range', min: 1, max: 20, step: 1, default: 6 },
    { key: 'rainSpeed', label: '落下速度(px/秒)', type: 'range', min: 100, max: 1000, step: 50, default: 400 },
    { key: 'revealRatio', label: '正しい文字が残るタイミング（終わりからの割合）', type: 'range', min: 0.1, max: 0.5, step: 0.05, default: 0.25 },
    { key: 'rainColor', label: '降ってくる文字の色', type: 'color', default: '#00FF41' },
    { key: 'trailLength', label: '残像の長さ（文字数）', type: 'range', min: 1, max: 12, step: 1, default: 6 },
    { key: 'fadeOutRatio', label: 'フェードアウト割合', type: 'range', min: 0, max: 0.3, step: 0.01, default: 0.1 },
  ],
  draw(ctx, p) {
    const { text, progress, duration, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const rainColumns = Math.max(1, Math.round(params.rainColumns ?? 6));
    const rainSpeed = params.rainSpeed ?? 400;
    const revealRatio = params.revealRatio ?? 0.25;
    const rainColor = params.rainColor ?? '#00FF41';
    const trailLength = params.trailLength ?? 6;
    const fadeOutRatio = params.fadeOutRatio ?? 0.1;
    const elapsed = progress * duration;
    let alpha = 1;
    if (progress > 1 - fadeOutRatio) alpha = clamp((1 - progress) / fadeOutRatio, 0, 1);

    const chars = toChars(text);
    ctx.save();
    ctx.font = `${fontSize}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const { widths, total } = measureChars(ctx, chars, font, fontSize);
    const cx = x * canvasW;
    const cy = y * canvasH;
    const revealStart = 1 - revealRatio;
    const revealPerChar = revealRatio / Math.max(chars.length, 1);

    // 各列の文字が落下するアニメーション
    for (let col = 0; col < rainColumns; col++) {
      const rng = mulberry32(strSeed(text, col * 333 + 17));
      // 列ごとに少しずつ開始タイミングをズラす
      const colDelay = rng() * 0.3 * duration;
      const colX = cx + (rng() - 0.5) * (canvasW * 0.7);
      const colElapsed = Math.max(0, elapsed - colDelay);
      const headY = -fontSize + colElapsed * rainSpeed;

      if (headY < -fontSize * 2) continue;

      for (let t = 0; t < trailLength; t++) {
        const charY = headY - t * fontSize * 1.2;
        if (charY < -fontSize * 2 || charY > canvasH + fontSize) continue;
        const step = Math.floor(colElapsed * (rainSpeed / fontSize) + t);
        const fadeAlpha = alpha * (1 - t / trailLength) * (t === 0 ? 1 : 0.7);
        ctx.globalAlpha = fadeAlpha;
        ctx.fillStyle = t === 0 ? '#FFFFFF' : rainColor;
        ctx.fillText(getRainChar(strSeed(text, step * 53 + col * 97 + t * 17)), colX, charY);
      }
    }

    // 指定位置に正しい文字を表示（revealStartを過ぎたら1文字ずつ確定）
    let charX = cx - total / 2;
    chars.forEach((ch, i) => {
      const charCenterX = charX + widths[i] / 2;
      const charRevealAt = revealStart + i * revealPerChar;
      if (progress >= charRevealAt) {
        const confirmedT = clamp((progress - charRevealAt) / Math.max(revealPerChar, 0.01), 0, 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = confirmedT < 0.2 ? '#FFFFFF' : color;
        ctx.fillText(ch, charCenterX, cy);
      }
      charX += widths[i];
    });
    ctx.restore();
  },
});

// ─────────────────────────────────────────────────────────
// パターン3（新）: 表示したい位置のみにランダムな文字の雨が降り、最後に正しい文字が残る（静止版）
// ─────────────────────────────────────────────────────────
registerEffect({
  id: 'matrix-in-place',
  label: 'マトリックス③（その場でランダム文字が変化して確定）',
  params: [
    { key: 'rainSpeed', label: '文字が変化する速さ(回/秒)', type: 'range', min: 2, max: 40, step: 1, default: 18 },
    { key: 'revealRatio', label: '正しい文字が現れるタイミング（終わりからの割合）', type: 'range', min: 0.1, max: 0.6, step: 0.05, default: 0.25 },
    { key: 'rainColor', label: '雨の文字の色', type: 'color', default: '#00FF41' },
    { key: 'glowColor', label: '確定時の発光色', type: 'color', default: '#FFFFFF' },
    { key: 'fadeInRatio', label: 'フェードイン割合', type: 'range', min: 0, max: 0.3, step: 0.01, default: 0.05 },
    { key: 'fadeOutRatio', label: 'フェードアウト割合', type: 'range', min: 0, max: 0.3, step: 0.01, default: 0.1 },
  ],
  draw(ctx, p) {
    const { text, progress, duration, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const rainSpeed = params.rainSpeed ?? 18;
    const revealRatio = params.revealRatio ?? 0.25;
    const rainColor = params.rainColor ?? '#00FF41';
    const glowColor = params.glowColor ?? '#FFFFFF';
    const fadeInRatio = params.fadeInRatio ?? 0.05;
    const fadeOutRatio = params.fadeOutRatio ?? 0.1;
    const elapsed = progress * duration;

    let alpha = 1;
    if (progress < fadeInRatio) alpha = progress / fadeInRatio;
    else if (progress > 1 - fadeOutRatio) alpha = (1 - progress) / fadeOutRatio;
    alpha = clamp(alpha, 0, 1);

    const chars = toChars(text);
    ctx.save();
    ctx.font = `${fontSize}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const { widths, total } = measureChars(ctx, chars, font, fontSize);
    const cx = x * canvasW;
    const cy = y * canvasH;

    // 文字ごとに確定タイミングをずらす（後ろから順番に確定していくと自然）
    const revealStart = 1 - revealRatio;
    const revealPerChar = revealRatio / Math.max(chars.length, 1);

    let charX = cx - total / 2;
    chars.forEach((ch, i) => {
      const charCenterX = charX + widths[i] / 2;
      const charRevealAt = revealStart + i * revealPerChar;
      const charConfirmed = progress >= charRevealAt;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (charConfirmed) {
        const confirmedT = clamp((progress - charRevealAt) / Math.max(revealPerChar, 0.01), 0, 1);
        // 確定直後は発光色でフラッシュし、その後通常色に戻る
        if (confirmedT < 0.15) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 20 * (1 - confirmedT / 0.15);
          ctx.fillStyle = glowColor;
        } else {
          ctx.fillStyle = color;
        }
        ctx.fillText(ch, charCenterX, cy);
      } else {
        // 高速にランダムな文字を切り替える
        const step = Math.floor(elapsed * rainSpeed + i * 13);
        ctx.fillStyle = rainColor;
        ctx.fillText(getRainChar(strSeed(text, step * 37 + i * 113)), charCenterX, cy);
      }
      ctx.restore();
      charX += widths[i];
    });
    ctx.restore();
  },
});
