// effects/charScatterRotate.js — 回転して1文字ずつに任意の場所に配置（文字がバラバラの位置から回転しながら集まる）
import { registerEffect } from './registry.js';
import { ease, clamp, toChars, measureChars, setTextStyle, strSeed, mulberry32, lerp } from './utils.js';

registerEffect({
  id: 'char-scatter-rotate',
  label: '回転しながら1文字ずつ集合配置',
  params: [
    { key: 'scatterRadius', label: '散らばり半径(px)', type: 'range', min: 50, max: 800, step: 10, default: 300 },
    { key: 'rotations', label: '回転数', type: 'range', min: 0, max: 3, step: 0.1, default: 1 },
    { key: 'duration', label: '集合にかかる時間(秒)', type: 'range', min: 0.2, max: 2, step: 0.1, default: 0.8 },
  ],
  draw(ctx, p) {
    const { text, progress, duration: lineDur, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const chars = toChars(text);
    const { widths, total } = measureChars(ctx, chars, font, fontSize);
    const radius = params.scatterRadius ?? 300;
    const rotations = params.rotations ?? 1;
    const animDur = params.duration ?? 0.8;
    const elapsed = progress * lineDur;
    const animT = clamp(elapsed / animDur, 0, 1);
    const e = ease.outCubic(animT);

    let cx = x * canvasW - total / 2;
    const cy = y * canvasH;

    ctx.save();
    setTextStyle(ctx, font, fontSize, color);
    chars.forEach((c, i) => {
      const rng = mulberry32(strSeed(text, i * 211 + 31));
      const angle = rng() * Math.PI * 2;
      const dist = radius * (0.5 + rng() * 0.5);
      const startX = Math.cos(angle) * dist;
      const startY = Math.sin(angle) * dist;
      const targetX = cx + widths[i] / 2;
      const targetY = cy;

      const worldStartX = targetX + startX;
      const worldStartY = targetY + startY;
      const curXFinal = lerp(worldStartX, targetX, e);
      const curYFinal = lerp(worldStartY, targetY, e);
      const rot = (1 - e) * Math.PI * 2 * rotations;
      const alpha = clamp(animT * 1.3, 0, 1);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(curXFinal, curYFinal);
      ctx.rotate(rot);
      ctx.fillText(c, 0, 0);
      ctx.restore();
      cx += widths[i];
    });
    ctx.restore();
  },
});
