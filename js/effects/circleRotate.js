// effects/circleRotate.js — 設定された歌詞が円を描いて回転する
import { registerEffect } from './registry.js';
import { clamp, toChars, measureChars, setTextStyle } from './utils.js';

registerEffect({
  id: 'circle-rotate',
  label: '円を描いて回転',
  params: [
    { key: 'radius', label: '半径(px)', type: 'range', min: 50, max: 600, step: 10, default: 220 },
    { key: 'rotSpeed', label: '回転速度(秒で1周/値)', type: 'range', min: 0.2, max: 5, step: 0.1, default: 1 },
    { key: 'direction', label: '回転方向', type: 'select', options: [
        { value: '1', label: '時計回り' },
        { value: '-1', label: '反時計回り' },
      ], default: '1' },
    { key: 'fadeRatio', label: 'フェードイン/アウト割合', type: 'range', min: 0, max: 0.3, step: 0.01, default: 0.1 },
  ],
  draw(ctx, p) {
    const { text, progress, duration, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const chars = toChars(text);
    const { widths } = measureChars(ctx, chars, font, fontSize);
    const radius = params.radius ?? 220;
    const rotSpeed = params.rotSpeed ?? 1;
    const dir = Number(params.direction ?? 1);
    const fr = params.fadeRatio ?? 0.1;
    const elapsed = progress * duration;
    let alpha = 1;
    if (progress < fr) alpha = progress / fr;
    else if (progress > 1 - fr) alpha = (1 - progress) / fr;
    alpha = clamp(alpha, 0, 1);

    const cx = x * canvasW;
    const cy = y * canvasH;
    const baseAngle = elapsed * rotSpeed * dir;
    const anglePerChar = (Math.PI * 2) / Math.max(chars.length, 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    setTextStyle(ctx, font, fontSize, color);
    chars.forEach((c, i) => {
      const angle = baseAngle + i * anglePerChar - Math.PI / 2;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle + Math.PI / 2); // 文字を円の接線方向に向ける
      ctx.fillText(c, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  },
});
