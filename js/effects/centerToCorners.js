// effects/centerToCorners.js — 真ん中に表示された後分解されて四隅に飛ぶ
import { registerEffect } from './registry.js';
import { ease, clamp, toChars, measureChars, setTextStyle, strSeed, mulberry32, lerp } from './utils.js';

registerEffect({
  id: 'center-to-corners',
  label: '指定位置で表示→四隅に分解',
  params: [
    { key: 'holdRatio', label: '指定位置で静止する割合', type: 'range', min: 0.1, max: 0.8, step: 0.05, default: 0.4 },
    { key: 'scatterRatio', label: '飛散にかける割合', type: 'range', min: 0.1, max: 0.6, step: 0.05, default: 0.35 },
  ],
  draw(ctx, p) {
    // x, y は行ごとの「表示位置」設定（右パネルのX位置/Y位置スライダー）を、
    // 分解が始まる開始位置（中央表示の位置）として使う。
    const { text, progress, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const chars = toChars(text);
    const { widths, total } = measureChars(ctx, chars, font, fontSize);
    const holdRatio = params.holdRatio ?? 0.4;
    const scatterRatio = params.scatterRatio ?? 0.35;
    const fadeInRatio = clamp(1 - holdRatio - scatterRatio, 0.05, 0.3);

    const corners = [
      { x: 0.08 * canvasW, y: 0.1 * canvasH },
      { x: 0.92 * canvasW, y: 0.1 * canvasH },
      { x: 0.08 * canvasW, y: 0.9 * canvasH },
      { x: 0.92 * canvasW, y: 0.9 * canvasH },
    ];

    const originX = x * canvasW;
    const originY = y * canvasH;
    let cx = originX - total / 2;
    const cy = originY;

    ctx.save();
    setTextStyle(ctx, font, fontSize, color);

    let phase, localT;
    if (progress < fadeInRatio) { phase = 'in'; localT = progress / fadeInRatio; }
    else if (progress < fadeInRatio + holdRatio) { phase = 'hold'; localT = 1; }
    else { phase = 'scatter'; localT = clamp((progress - fadeInRatio - holdRatio) / scatterRatio, 0, 1); }

    chars.forEach((c, i) => {
      const centerX = cx + widths[i] / 2;
      const rng = mulberry32(strSeed(text, i * 17 + 3));
      const corner = corners[Math.floor(rng() * corners.length)];
      const jitterX = (rng() - 0.5) * 60;
      const jitterY = (rng() - 0.5) * 60;

      let px = centerX, py = cy, alpha = 1, rot = 0;
      if (phase === 'in') {
        alpha = ease.outCubic(localT);
        py = cy + (1 - alpha) * 30;
      } else if (phase === 'hold') {
        alpha = 1;
      } else {
        const e = ease.outCubic(localT);
        px = lerp(centerX, corner.x + jitterX, e);
        py = lerp(cy, corner.y + jitterY, e);
        rot = e * (rng() - 0.5) * Math.PI;
        alpha = clamp(1 - localT * 1.1, 0, 1);
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.fillText(c, 0, 0);
      ctx.restore();
      cx += widths[i];
    });
    ctx.restore();
  },
});
