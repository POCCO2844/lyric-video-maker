// effects/textStyles/dotPattern.js — 文字デザイン：ドット／ハートドット／☆ドット
// オフスクリーンCanvasの文字ピクセルを読み取り、その位置に対応する図形を描く。
import { registerTextStyle } from '../textStyleRegistry.js';

// ハートを1つ描く関数（単位サイズ1、中心(0,0)）
function drawHeart(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(r, r);
  ctx.beginPath();
  ctx.moveTo(0, 0.4);
  ctx.bezierCurveTo(-0.5, -0.1, -1, -0.6, 0, -1);
  ctx.bezierCurveTo(1, -0.6, 0.5, -0.1, 0, 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// 星を1つ描く関数（5角星、中心(cx,cy)、外径r）
function drawStar(ctx, cx, cy, r) {
  const points = 5;
  const inner = r * 0.4;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? r : inner;
    const px = cx + Math.cos(rad) * radius;
    const py = cy + Math.sin(rad) * radius;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function makeDotsStyle(id, label, drawFn) {
  registerTextStyle({
    id,
    label,
    params: [
      { key: 'dotSize', label: 'ドットの大きさ(px)', type: 'range', min: 3, max: 40, step: 1, default: 10 },
      { key: 'dotSpacing', label: 'ドットの間隔(px)', type: 'range', min: 0, max: 20, step: 1, default: 2 },
      { key: 'dotColor', label: 'ドットの色', type: 'color', default: '#FFFFFF' },
      { key: 'threshold', label: '判定の閾値（文字の濃さ）', type: 'range', min: 10, max: 200, step: 5, default: 60 },
    ],
    applyToCanvas(offCtx, w, h, t, params) {
      const dotSize = params.dotSize ?? 10;
      const dotSpacing = params.dotSpacing ?? 2;
      const dotColor = params.dotColor ?? '#FFFFFF';
      const threshold = params.threshold ?? 60;
      const step = dotSize + dotSpacing;

      // 文字のピクセル情報を取得する（getImageDataはCORS等の制約に注意だが、同一オリジンのCanvasなので問題なし）
      let imageData;
      try {
        imageData = offCtx.getImageData(0, 0, w, h);
      } catch (e) {
        return; // セキュリティエラー等の場合はスキップ
      }
      const data = imageData.data;

      // 文字が描かれていた領域を全て透明にし、ドット図形を新たに描く
      offCtx.clearRect(0, 0, w, h);
      offCtx.fillStyle = dotColor;

      for (let gy = step / 2; gy < h; gy += step) {
        for (let gx = step / 2; gx < w; gx += step) {
          // このグリッド格子点の周辺ピクセルのアルファ値の平均を取る
          const sampleX = Math.round(gx);
          const sampleY = Math.round(gy);
          let totalAlpha = 0;
          let sampleCount = 0;
          const sampleRadius = Math.ceil(step / 2);
          for (let dy = -sampleRadius; dy <= sampleRadius; dy += 2) {
            for (let dx = -sampleRadius; dx <= sampleRadius; dx += 2) {
              const px = sampleX + dx;
              const py = sampleY + dy;
              if (px >= 0 && px < w && py >= 0 && py < h) {
                totalAlpha += data[(py * w + px) * 4 + 3];
                sampleCount++;
              }
            }
          }
          const avgAlpha = sampleCount > 0 ? totalAlpha / sampleCount : 0;
          if (avgAlpha >= threshold) {
            drawFn(offCtx, gx, gy, dotSize / 2);
          }
        }
      }
    },
  });
}

// 丸ドット
makeDotsStyle('dots-circle', 'ドット（丸）', (ctx, cx, cy, r) => {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
});

// ハートドット
makeDotsStyle('dots-heart', 'ドット（ハート♥）', drawHeart);

// 星ドット
makeDotsStyle('dots-star', 'ドット（星☆）', drawStar);
