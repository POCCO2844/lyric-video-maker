// effects/lineFade.js — 任意の場所に設定された歌詞が1行表示
import { registerEffect } from './registry.js';
import { ease, clamp, setTextStyle } from './utils.js';

registerEffect({
  id: 'line-fade',
  label: '1行表示（フェード）',
  params: [
    { key: 'fadeInRatio', label: 'フェードイン割合', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.15 },
    { key: 'fadeOutRatio', label: 'フェードアウト割合', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.15 },
  ],
  draw(ctx, p) {
    const { text, progress, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const fi = params.fadeInRatio ?? 0.15;
    const fo = params.fadeOutRatio ?? 0.15;
    let alpha = 1;
    if (progress < fi) alpha = ease.outCubic(progress / fi);
    else if (progress > 1 - fo) alpha = ease.outCubic((1 - progress) / fo);
    alpha = clamp(alpha, 0, 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    setTextStyle(ctx, font, fontSize, color);
    ctx.fillText(text, x * canvasW, y * canvasH);
    ctx.restore();
  },
});
