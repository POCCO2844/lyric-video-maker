// effects/textStyles/gridPattern.js — 文字デザイン：格子柄（グリッドパターン）
// オフスクリーンCanvas上の文字ピクセルだけに格子模様を重ねる。背景にははみ出さない。
import { registerTextStyle } from '../textStyleRegistry.js';

registerTextStyle({
  id: 'grid',
  label: '格子柄',
  params: [
    { key: 'gridSize', label: '格子の大きさ(px)', type: 'range', min: 4, max: 60, step: 1, default: 14 },
    { key: 'lineWidth', label: '線の太さ(px)', type: 'range', min: 0.5, max: 8, step: 0.5, default: 1.5 },
    { key: 'gridColor', label: '格子の色', type: 'color', default: '#000000' },
    { key: 'scrollSpeed', label: '格子が流れる速さ(px/秒)', type: 'range', min: 0, max: 200, step: 5, default: 0 },
  ],
  applyToCanvas(offCtx, w, h, t, params) {
    const gridSize = params.gridSize ?? 14;
    const lineWidth = params.lineWidth ?? 1.5;
    const gridColor = params.gridColor ?? '#000000';
    const scrollSpeed = params.scrollSpeed ?? 0;
    const scrollOffset = (t * scrollSpeed) % gridSize;

    // source-atop: オフスクリーンCanvasの「既に描かれたピクセル（文字）の上だけ」に格子を重ねる。
    // 透明なピクセル（背景）には一切描かれないため、背景へのはみ出しが原理的に起きない。
    offCtx.save();
    offCtx.globalCompositeOperation = 'source-atop';
    offCtx.strokeStyle = gridColor;
    offCtx.lineWidth = lineWidth;
    offCtx.beginPath();
    for (let gx = -scrollOffset; gx <= w + gridSize; gx += gridSize) {
      offCtx.moveTo(gx, 0);
      offCtx.lineTo(gx, h);
    }
    for (let gy = -scrollOffset; gy <= h + gridSize; gy += gridSize) {
      offCtx.moveTo(0, gy);
      offCtx.lineTo(w, gy);
    }
    offCtx.stroke();
    offCtx.restore();
  },
});
