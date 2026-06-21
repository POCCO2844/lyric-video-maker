// effects/textStyles/gridPattern.js — 文字デザイン：格子柄（グリッドパターン）
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
  // ctx には呼び出し側で save() 済み・フォント設定済み・textAlign=center, textBaseline=middle が設定されている前提。
  fillText(ctx, text, px, py, baseColor, t, params, fontSize) {
    const gridSize = params.gridSize ?? 14;
    const lineWidth = params.lineWidth ?? 1.5;
    const gridColor = params.gridColor ?? '#000000';
    const scrollSpeed = params.scrollSpeed ?? 0;
    const scrollOffset = (t * scrollSpeed) % gridSize;

    const metrics = ctx.measureText(text);
    const textW = metrics.width;
    const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
    const descent = metrics.actualBoundingBoxDescent || fontSize * 0.3;
    const boxLeft = px - textW / 2 - lineWidth;
    const boxTop = py - ascent - lineWidth;
    const boxW = textW + lineWidth * 2;
    const boxH = ascent + descent + lineWidth * 2;

    // 1. 文字本体（下地・マスクの土台）
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = baseColor;
    ctx.fillText(text, px, py);

    // 2. 文字が描かれた領域だけに格子を合成する
    ctx.globalCompositeOperation = 'source-atop';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    for (let gx = boxLeft - scrollOffset; gx <= boxLeft + boxW + gridSize; gx += gridSize) {
      ctx.moveTo(gx, boxTop);
      ctx.lineTo(gx, boxTop + boxH);
    }
    for (let gy = boxTop - scrollOffset; gy <= boxTop + boxH + gridSize; gy += gridSize) {
      ctx.moveTo(boxLeft, gy);
      ctx.lineTo(boxLeft + boxW, gy);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  },
});
