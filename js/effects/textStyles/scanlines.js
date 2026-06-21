// effects/textStyles/scanlines.js — 文字デザイン：スキャンライン（水平線）
import { registerTextStyle } from '../textStyleRegistry.js';

registerTextStyle({
  id: 'scanlines',
  label: 'スキャンライン（横線）',
  params: [
    { key: 'lineSpacing', label: '線の間隔(px)', type: 'range', min: 2, max: 30, step: 1, default: 5 },
    { key: 'lineThickness', label: '線の太さ(px)', type: 'range', min: 0.5, max: 10, step: 0.5, default: 2 },
    { key: 'lineOpacity', label: '線の不透明度', type: 'range', min: 0, max: 1, step: 0.05, default: 0.55 },
    { key: 'lineColor', label: '線の色', type: 'color', default: '#000000' },
    { key: 'scrollSpeed', label: '走査線が流れる速さ(px/秒)', type: 'range', min: -200, max: 200, step: 5, default: 40 },
  ],
  fillText(ctx, text, px, py, baseColor, t, params, fontSize) {
    const lineSpacing = params.lineSpacing ?? 5;
    const lineThickness = params.lineThickness ?? 2;
    const lineOpacity = params.lineOpacity ?? 0.55;
    const lineColor = params.lineColor ?? '#000000';
    const scrollSpeed = params.scrollSpeed ?? 40;
    const scrollOffset = t * scrollSpeed;

    const metrics = ctx.measureText(text);
    const textW = metrics.width;
    const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
    const descent = metrics.actualBoundingBoxDescent || fontSize * 0.3;
    const boxLeft = px - textW / 2 - 4;
    const boxTop = py - ascent - 4;
    const boxW = textW + 8;
    const boxH = ascent + descent + 8;

    // 1. 文字本体
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = baseColor;
    ctx.fillText(text, px, py);

    // 2. 文字の内側だけに水平スキャンラインを合成する
    ctx.globalCompositeOperation = 'source-atop';
    const prevAlpha = ctx.globalAlpha;
    ctx.fillStyle = lineColor;
    ctx.globalAlpha = prevAlpha * lineOpacity;
    const normalizedOffset = ((scrollOffset % lineSpacing) + lineSpacing) % lineSpacing;
    for (let gy = boxTop - normalizedOffset; gy <= boxTop + boxH; gy += lineSpacing) {
      ctx.fillRect(boxLeft, gy, boxW, lineThickness);
    }
    ctx.globalAlpha = prevAlpha;
    ctx.globalCompositeOperation = 'source-over';
  },
});
