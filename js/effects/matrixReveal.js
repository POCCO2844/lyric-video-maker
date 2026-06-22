// effects/matrixReveal.js — ランダムな文字が雨のように降り、最後に正しい文字が現れる
import { registerEffect } from './registry.js';
import { clamp, toChars, measureChars, strSeed, mulberry32 } from './utils.js';

const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';

registerEffect({
  id: 'matrix-reveal',
  label: 'マトリックス（文字の雨）',
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
        const rng = mulberry32(strSeed(text, step * 31 + i * 97));
        const matIdx = Math.floor(rng() * MATRIX_CHARS.length);
        const rainChar = MATRIX_CHARS[matIdx] || ch;

        ctx.fillStyle = rainColor;
        ctx.globalAlpha = alpha;
        ctx.fillText(rainChar, charCenterX, cy);

        for (let t = 1; t <= trailLength; t++) {
          const trailStep = step - t;
          const trailRng = mulberry32(strSeed(text, trailStep * 31 + i * 97));
          const trailIdx = Math.floor(trailRng() * MATRIX_CHARS.length);
          const trailChar = MATRIX_CHARS[trailIdx] || ch;
          ctx.globalAlpha = alpha * (1 - t / (trailLength + 1)) * 0.7;
          ctx.fillStyle = rainColor;
          ctx.fillText(trailChar, charCenterX, cy - t * fontSize * 1.2);
        }
      }

      ctx.restore();
      charX += widths[i];
    });
    ctx.restore();
  },
});
