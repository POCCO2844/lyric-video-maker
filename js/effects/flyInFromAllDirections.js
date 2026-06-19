// effects/flyInFromAllDirections.js — 任意の場所に設定された歌詞が全方向から飛んでくる
import { registerEffect } from './registry.js';
import { ease, clamp, toChars, measureChars, setTextStyle, strSeed, mulberry32, lerp } from './utils.js';

registerEffect({
  id: 'fly-in-all-directions',
  label: '全方向から飛んでくる',
  params: [
    { key: 'flyDistance', label: '飛んでくる距離(px)', type: 'range', min: 200, max: 2000, step: 50, default: 900 },
    { key: 'flyDuration', label: '飛行時間(秒)', type: 'range', min: 0.2, max: 1.5, step: 0.05, default: 0.5 },
    { key: 'staggerSec', label: '文字ごとの遅延(秒)', type: 'range', min: 0, max: 0.3, step: 0.01, default: 0.03 },
  ],
  draw(ctx, p) {
    const { text, progress, duration: lineDur, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const chars = toChars(text);
    const { widths, total } = measureChars(ctx, chars, font, fontSize);
    const flyDist = params.flyDistance ?? 900;
    const flyDur = params.flyDuration ?? 0.5;
    const stagger = params.staggerSec ?? 0.03;
    const elapsed = progress * lineDur;

    let cx = x * canvasW - total / 2;
    const cy = y * canvasH;

    ctx.save();
    setTextStyle(ctx, font, fontSize, color);
    chars.forEach((c, i) => {
      const rng = mulberry32(strSeed(text, i * 71 + 19));
      const angle = rng() * Math.PI * 2;
      const targetX = cx + widths[i] / 2;
      const targetY = cy;
      const fromX = targetX + Math.cos(angle) * flyDist;
      const fromY = targetY + Math.sin(angle) * flyDist;

      const charStart = i * stagger;
      const t = clamp((elapsed - charStart) / flyDur, 0, 1);
      const e = ease.outCubic(t);
      const px = lerp(fromX, targetX, e);
      const py = lerp(fromY, targetY, e);
      const alpha = clamp(t * 1.5, 0, 1);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(px, py);
      ctx.fillText(c, 0, 0);
      ctx.restore();
      cx += widths[i];
    });
    ctx.restore();
  },
});
