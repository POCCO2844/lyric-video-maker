// effects/rectanglePatrol.js — 画面（画像）の端から指定%内側の矩形の輪郭に沿って、文字が行進するように周回する
import { registerEffect } from './registry.js';
import { clamp, toChars, measureChars, setTextStyle } from './utils.js';

// 角丸長方形の輪郭上を、パラメータ t（0〜1、輪郭の周長に対する割合）で一周する位置と接線角度を返す。
// 輪郭は (x0, y0) を左上として w x h の矩形、角の半径 radius。
function pointOnRoundedRect(t, x0, y0, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  const straightTop = w - 2 * r;
  const straightRight = h - 2 * r;
  const straightBottom = w - 2 * r;
  const straightLeft = h - 2 * r;
  const arcLen = (Math.PI / 2) * r; // 90度分の弧長
  const segments = [
    { len: straightTop, type: 'top' },
    { len: arcLen, type: 'corner', cx: x0 + w - r, cy: y0 + r, startAngle: -Math.PI / 2, endAngle: 0 },
    { len: straightRight, type: 'right' },
    { len: arcLen, type: 'corner', cx: x0 + w - r, cy: y0 + h - r, startAngle: 0, endAngle: Math.PI / 2 },
    { len: straightBottom, type: 'bottom' },
    { len: arcLen, type: 'corner', cx: x0 + r, cy: y0 + h - r, startAngle: Math.PI / 2, endAngle: Math.PI },
    { len: straightLeft, type: 'left' },
    { len: arcLen, type: 'corner', cx: x0 + r, cy: y0 + r, startAngle: Math.PI, endAngle: Math.PI * 1.5 },
  ];
  const totalLen = segments.reduce((a, s) => a + s.len, 0) || 1;
  let dist = clamp(t, 0, 1) * totalLen;

  for (const seg of segments) {
    if (dist <= seg.len || seg === segments[segments.length - 1]) {
      const localT = seg.len > 0 ? dist / seg.len : 0;
      if (seg.type === 'top') return { x: x0 + r + localT * straightTop, y: y0, angle: 0 };
      if (seg.type === 'bottom') return { x: x0 + w - r - localT * straightBottom, y: y0 + h, angle: Math.PI };
      if (seg.type === 'right') return { x: x0 + w, y: y0 + r + localT * straightRight, angle: Math.PI / 2 };
      if (seg.type === 'left') return { x: x0, y: y0 + h - r - localT * straightLeft, angle: -Math.PI / 2 };
      // corner（角の弧）
      const angle = seg.startAngle + (seg.endAngle - seg.startAngle) * localT;
      return { x: seg.cx + Math.cos(angle) * r, y: seg.cy + Math.sin(angle) * r, angle: angle + Math.PI / 2 };
    }
    dist -= seg.len;
  }
  return { x: x0, y: y0, angle: 0 }; // フォールバック（理論上到達しない）
}

registerEffect({
  id: 'rectangle-patrol',
  label: '枠の内側を行進（周回）',
  params: [
    { key: 'insetPercent', label: '端からの内側オフセット(%)', type: 'range', min: 0, max: 40, step: 1, default: 8 },
    { key: 'cornerRadius', label: '角の丸み(px)', type: 'range', min: 0, max: 300, step: 5, default: 80 },
    { key: 'loopSeconds', label: '一周にかかる時間(秒)', type: 'range', min: 1, max: 30, step: 0.5, default: 8 },
    { key: 'direction', label: '回る向き', type: 'select', options: [
        { value: '1', label: '時計回り' },
        { value: '-1', label: '反時計回り' },
      ], default: '1' },
    { key: 'charSpacing', label: '文字同士の間隔(px)', type: 'range', min: 0, max: 100, step: 2, default: 28 },
    { key: 'fadeRatio', label: 'フェードイン/アウト割合', type: 'range', min: 0, max: 0.3, step: 0.01, default: 0.08 },
    { key: 'rotateWithPath', label: '文字を進行方向に傾ける', type: 'select', options: [
        { value: '1', label: 'はい' },
        { value: '0', label: 'いいえ（常に正立）' },
      ], default: '1' },
  ],
  draw(ctx, p) {
    const { text, progress, duration, canvasW, canvasH, font, fontSize, color, params } = p;
    const chars = toChars(text);
    const { widths } = measureChars(ctx, chars, font, fontSize);
    const insetPercent = (params.insetPercent ?? 8) / 100;
    const cornerRadius = params.cornerRadius ?? 80;
    const loopSeconds = params.loopSeconds ?? 8;
    const dir = Number(params.direction ?? 1);
    const charSpacing = params.charSpacing ?? 28;
    const fr = params.fadeRatio ?? 0.08;
    const rotateWithPath = (params.rotateWithPath ?? '1') === '1';

    let alpha = 1;
    if (progress < fr) alpha = progress / fr;
    else if (progress > 1 - fr) alpha = (1 - progress) / fr;
    alpha = clamp(alpha, 0, 1);

    const insetX = canvasW * insetPercent;
    const insetY = canvasH * insetPercent;
    const x0 = insetX;
    const y0 = insetY;
    const w = canvasW - insetX * 2;
    const h = canvasH - insetY * 2;

    const elapsed = progress * duration;
    const baseT = ((elapsed / loopSeconds) * dir) % 1;
    const baseTNorm = baseT < 0 ? baseT + 1 : baseT;

    // 文字間の間隔をピクセル基準で周長に対する割合に変換するため、概算の周長を計算
    const r = Math.min(cornerRadius, w / 2, h / 2);
    const perimeter = 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r || 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    setTextStyle(ctx, font, fontSize, color);

    let cumulativeOffset = 0;
    chars.forEach((c, i) => {
      const charT = baseTNorm + (cumulativeOffset / perimeter) * dir;
      const tNorm = ((charT % 1) + 1) % 1;
      const pos = pointOnRoundedRect(tNorm, x0, y0, w, h, cornerRadius);

      ctx.save();
      ctx.translate(pos.x, pos.y);
      if (rotateWithPath) {
        ctx.rotate(pos.angle);
        if (dir < 0) ctx.rotate(Math.PI); // 反時計回りは文字が逆さにならないよう180度補正
      }
      ctx.fillText(c, 0, 0);
      ctx.restore();

      cumulativeOffset += widths[i] + charSpacing;
    });
    ctx.restore();
  },
});
