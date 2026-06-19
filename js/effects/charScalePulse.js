// effects/charScalePulse.js — 任意の場所に1文字ずつそれぞれがランダムに大小変わって配置
import { registerEffect } from './registry.js';
import { clamp, toChars, measureChars, setTextStyle, strSeed, mulberry32 } from './utils.js';

registerEffect({
  id: 'char-scale-pulse',
  label: '1文字ずつランダムに大小変化',
  params: [
    { key: 'minScale', label: '最小スケール', type: 'range', min: 0.3, max: 1, step: 0.05, default: 0.7 },
    { key: 'maxScale', label: '最大スケール', type: 'range', min: 1, max: 2, step: 0.05, default: 1.3 },
    { key: 'speed', label: '変化の速さ', type: 'range', min: 0.5, max: 6, step: 0.1, default: 2 },
    { key: 'fadeRatio', label: 'フェードイン/アウト割合', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.12 },
  ],
  draw(ctx, p) {
    const { text, progress, duration, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const chars = toChars(text);
    const { widths, total } = measureChars(ctx, chars, font, fontSize);
    const minS = params.minScale ?? 0.7;
    const maxS = params.maxScale ?? 1.3;
    const speed = params.speed ?? 2;
    const fr = params.fadeRatio ?? 0.12;
    const elapsed = progress * duration;
    let alpha = 1;
    if (progress < fr) alpha = progress / fr;
    else if (progress > 1 - fr) alpha = (1 - progress) / fr;
    alpha = clamp(alpha, 0, 1);

    let cx = x * canvasW - total / 2;
    const cy = y * canvasH;

    ctx.save();
    setTextStyle(ctx, font, fontSize, color);
    chars.forEach((c, i) => {
      const rng = mulberry32(strSeed(text, i * 53 + 7));
      const phase = rng() * Math.PI * 2;
      const s = minS + (Math.sin(elapsed * speed + phase) * 0.5 + 0.5) * (maxS - minS);
      const px = cx + widths[i] / 2;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(px, cy);
      ctx.scale(s, s);
      ctx.fillText(c, 0, 0);
      ctx.restore();
      cx += widths[i];
    });
    ctx.restore();
  },
});
