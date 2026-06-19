// effects/charJitter.js — 任意の場所に1文字ずつそれぞれがランダムに揺れて配置
import { registerEffect } from './registry.js';
import { clamp, toChars, measureChars, setTextStyle, strSeed, mulberry32, ease } from './utils.js';

registerEffect({
  id: 'char-jitter',
  label: '1文字ずつランダムに揺れる',
  params: [
    { key: 'amplitude', label: '揺れ幅(px)', type: 'range', min: 0, max: 40, step: 1, default: 8 },
    { key: 'speed', label: '揺れの速さ', type: 'range', min: 0.5, max: 8, step: 0.1, default: 2.5 },
    { key: 'fadeInRatio', label: 'フェードイン割合', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.1 },
  ],
  draw(ctx, p) {
    const { text, progress, duration, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const chars = toChars(text);
    const { widths, total } = measureChars(ctx, chars, font, fontSize);
    const amp = params.amplitude ?? 8;
    const speed = params.speed ?? 2.5;
    const fi = params.fadeInRatio ?? 0.1;
    const elapsed = progress * duration;
    const alpha = clamp(progress / fi, 0, 1) * clamp((1 - progress) / fi, 0, 1) || clamp(progress / fi, 0, 1);

    let cx = x * canvasW - total / 2;
    const cy = y * canvasH;

    ctx.save();
    setTextStyle(ctx, font, fontSize, color);
    chars.forEach((c, i) => {
      const rng = mulberry32(strSeed(text, i * 97 + 13));
      const phase = rng() * Math.PI * 2;
      const phase2 = rng() * Math.PI * 2;
      const dx = Math.sin(elapsed * speed + phase) * amp;
      const dy = Math.cos(elapsed * speed * 1.3 + phase2) * amp * 0.6;
      const px = cx + widths[i] / 2;

      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.translate(px + dx, cy + dy);
      ctx.fillText(c, 0, 0);
      ctx.restore();
      cx += widths[i];
    });
    ctx.restore();
  },
});
