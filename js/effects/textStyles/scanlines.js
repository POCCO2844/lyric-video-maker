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
  applyToCanvas(offCtx, w, h, t, params) {
    const lineSpacing = params.lineSpacing ?? 5;
    const lineThickness = params.lineThickness ?? 2;
    const lineOpacity = params.lineOpacity ?? 0.55;
    const lineColor = params.lineColor ?? '#000000';
    const scrollSpeed = params.scrollSpeed ?? 40;
    const scrollOffset = t * scrollSpeed;
    const normalizedOffset = ((scrollOffset % lineSpacing) + lineSpacing) % lineSpacing;

    offCtx.save();
    offCtx.globalCompositeOperation = 'source-atop';
    offCtx.fillStyle = lineColor;
    offCtx.globalAlpha = lineOpacity;
    for (let gy = -normalizedOffset; gy <= h; gy += lineSpacing) {
      offCtx.fillRect(0, gy, w, lineThickness);
    }
    offCtx.restore();
  },
});
