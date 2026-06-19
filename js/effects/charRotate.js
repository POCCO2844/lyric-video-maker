// effects/charRotate.js — 任意の場所に回転して1文字ずつ配置
import { registerEffect } from './registry.js';
import { ease, clamp, toChars, measureChars, setTextStyle, strSeed, mulberry32 } from './utils.js';

registerEffect({
  id: 'char-rotate',
  label: '回転して1文字ずつ配置',
  params: [
    { key: 'maxRotateDeg', label: '最大回転角度', type: 'range', min: 0, max: 180, step: 1, default: 25 },
    { key: 'staggerSec', label: '文字ごとの遅延(秒)', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.06 },
  ],
  draw(ctx, p) {
    const { text, progress, duration, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const chars = toChars(text);
    const { widths, total } = measureChars(ctx, chars, font, fontSize);
    const maxDeg = (params.maxRotateDeg ?? 25) * Math.PI / 180;
    const stagger = params.staggerSec ?? 0.06;
    const elapsed = progress * duration;

    let cx = x * canvasW - total / 2;
    const cy = y * canvasH;

    ctx.save();
    setTextStyle(ctx, font, fontSize, color);
    chars.forEach((c, i) => {
      const charStart = i * stagger;
      const localT = clamp((elapsed - charStart) / 0.4, 0, 1);
      const e = ease.outBack(localT);
      const rng = mulberry32(strSeed(text, i));
      const dir = rng() > 0.5 ? 1 : -1;
      const rot = (1 - e) * maxDeg * dir;
      const alpha = clamp(localT * 1.5, 0, 1);

      const px = cx + widths[i] / 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(px, cy);
      ctx.rotate(rot);
      ctx.fillText(c, 0, 0);
      ctx.restore();
      cx += widths[i];
    });
    ctx.restore();
  },
});
