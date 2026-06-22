// effects/charSliceAssemble.js — 文字がランダムなスライスに分断されて飛び散り、指定位置に集まる
import { registerEffect } from './registry.js';
import { ease, clamp, setTextStyle, strSeed, mulberry32, lerp } from './utils.js';

registerEffect({
  id: 'char-slice-assemble',
  label: '文字が分断されて集まる',
  params: [
    { key: 'sliceCountV', label: '分断数（縦）', type: 'range', min: 2, max: 10, step: 1, default: 4 },
    { key: 'sliceCountH', label: '分断数（横）', type: 'range', min: 1, max: 6, step: 1, default: 2 },
    { key: 'scatterRadius', label: '飛び散り半径(px)', type: 'range', min: 50, max: 600, step: 10, default: 200 },
    { key: 'assembleDuration', label: '集まるのにかかる時間(秒)', type: 'range', min: 0.2, max: 2, step: 0.1, default: 0.7 },
    { key: 'fadeOutRatio', label: 'フェードアウト割合', type: 'range', min: 0, max: 0.3, step: 0.01, default: 0.1 },
  ],
  draw(ctx, p) {
    const { text, progress, duration, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const sliceCountV = Math.max(2, Math.round(params.sliceCountV ?? 4));
    const sliceCountH = Math.max(1, Math.round(params.sliceCountH ?? 2));
    const scatterRadius = params.scatterRadius ?? 200;
    const assembleDur = params.assembleDuration ?? 0.7;
    const fadeOutRatio = params.fadeOutRatio ?? 0.1;
    const elapsed = progress * duration;

    // 文字全体をオフスクリーンに描画してスライス分割の元データとする
    setTextStyle(ctx, font, fontSize, color);
    const metrics = ctx.measureText(text);
    const textW = Math.max(metrics.width, 1);
    const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
    const descent = metrics.actualBoundingBoxDescent || fontSize * 0.3;
    const textH = Math.max(ascent + descent, 1);
    const pad = 4;

    const offW = Math.ceil(textW) + pad * 2;
    const offH = Math.ceil(textH) + pad * 2;
    const offscreen = document.createElement('canvas');
    offscreen.width = offW;
    offscreen.height = offH;
    const oCtx = offscreen.getContext('2d');
    oCtx.font = `${fontSize}px ${font}`;
    oCtx.fillStyle = color;
    oCtx.textAlign = 'center';
    oCtx.textBaseline = 'middle';
    oCtx.fillText(text, offW / 2, offH / 2);

    const sliceW = offW / sliceCountH;
    const sliceH = offH / sliceCountV;

    const cx = x * canvasW;
    const cy = y * canvasH;

    // 集まるアニメーションの進行度
    const assembleT = clamp(elapsed / assembleDur, 0, 1);
    const e = ease.outCubic(assembleT);

    // フェードアウト
    let alpha = 1;
    if (progress > 1 - fadeOutRatio) alpha = clamp((1 - progress) / fadeOutRatio, 0, 1);

    ctx.save();

    for (let row = 0; row < sliceCountV; row++) {
      for (let col = 0; col < sliceCountH; col++) {
        const sliceIdx = row * sliceCountH + col;
        const rng = mulberry32(strSeed(text, sliceIdx * 97 + 13));

        // 各スライスの最終位置（文字として正しく並んだ位置）
        const destX = cx - offW / 2 + col * sliceW;
        const destY = cy - offH / 2 + row * sliceH;

        // 飛び散った開始位置
        const angle = rng() * Math.PI * 2;
        const dist = scatterRadius * (0.5 + rng() * 0.5);
        const startX = destX + Math.cos(angle) * dist;
        const startY = destY + Math.sin(angle) * dist;

        const curX = lerp(startX, destX, e);
        const curY = lerp(startY, destY, e);
        const sliceAlpha = clamp(assembleT * 1.5, 0, 1);

        ctx.globalAlpha = alpha * sliceAlpha;
        ctx.drawImage(offscreen,
          col * sliceW, row * sliceH, sliceW, sliceH,
          curX, curY, sliceW, sliceH
        );
      }
    }
    ctx.restore();
  },
});
