// effects/textOrientation.js — 縦書き・斜め表示エフェクト
import { registerEffect } from './registry.js';
import { ease, clamp, toChars, measureChars, setTextStyle } from './utils.js';

registerEffect({
  id: 'vertical-text',
  label: '縦書き表示',
  params: [
    { key: 'charSpacing', label: '文字間隔(px)', type: 'range', min: -20, max: 60, step: 1, default: 8 },
    { key: 'align', label: '中心位置の基準', type: 'select', options: [
        { value: 'center', label: '縦方向の中央を基準' },
        { value: 'top', label: '上を基準（下に伸びる）' },
      ], default: 'center' },
    { key: 'fadeInRatio', label: 'フェードイン割合', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.12 },
    { key: 'fadeOutRatio', label: 'フェードアウト割合', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.12 },
  ],
  draw(ctx, p) {
    const { text, progress, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const charSpacing = params.charSpacing ?? 8;
    const align = params.align ?? 'center';
    const fi = params.fadeInRatio ?? 0.12;
    const fo = params.fadeOutRatio ?? 0.12;
    let alpha = 1;
    if (progress < fi) alpha = ease.outCubic(progress / fi);
    else if (progress > 1 - fo) alpha = ease.outCubic((1 - progress) / fo);
    alpha = clamp(alpha, 0, 1);
    const chars = toChars(text);
    const cx = x * canvasW;
    const cy = y * canvasH;
    const lineHeight = fontSize + charSpacing;
    const totalHeight = (chars.length - 1) * lineHeight;
    const startY = align === 'center' ? cy - totalHeight / 2 : cy;
    ctx.save();
    ctx.globalAlpha = alpha;
    setTextStyle(ctx, font, fontSize, color);
    chars.forEach((ch, i) => { ctx.fillText(ch, cx, startY + i * lineHeight); });
    ctx.restore();
  },
});

registerEffect({
  id: 'vertical-text-stagger',
  label: '縦書き（1文字ずつ現れる）',
  params: [
    { key: 'charSpacing', label: '文字間隔(px)', type: 'range', min: -20, max: 60, step: 1, default: 8 },
    { key: 'staggerRatio', label: '1文字ずつの表示間隔（全体割合）', type: 'range', min: 0.01, max: 0.15, step: 0.01, default: 0.06 },
    { key: 'fadeOutRatio', label: 'フェードアウト割合', type: 'range', min: 0, max: 0.3, step: 0.01, default: 0.1 },
  ],
  draw(ctx, p) {
    const { text, progress, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const charSpacing = params.charSpacing ?? 8;
    const staggerRatio = params.staggerRatio ?? 0.06;
    const fo = params.fadeOutRatio ?? 0.1;
    let globalAlpha = 1;
    if (progress > 1 - fo) globalAlpha = clamp((1 - progress) / fo, 0, 1);
    const chars = toChars(text);
    const cx = x * canvasW;
    const cy = y * canvasH;
    const lineHeight = fontSize + charSpacing;
    const totalHeight = (chars.length - 1) * lineHeight;
    const startY = cy - totalHeight / 2;
    ctx.save();
    setTextStyle(ctx, font, fontSize, color);
    chars.forEach((ch, i) => {
      const charT = clamp((progress - i * staggerRatio) / 0.12, 0, 1);
      ctx.globalAlpha = ease.outCubic(charT) * globalAlpha;
      ctx.fillText(ch, cx, startY + i * lineHeight);
    });
    ctx.restore();
  },
});

registerEffect({
  id: 'diagonal-text',
  label: '斜め表示（文字列ごと傾ける）',
  params: [
    { key: 'angleDeg', label: '傾き角度（度）', type: 'range', min: -90, max: 90, step: 1, default: -20 },
    { key: 'fadeInRatio', label: 'フェードイン割合', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.12 },
    { key: 'fadeOutRatio', label: 'フェードアウト割合', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.12 },
  ],
  draw(ctx, p) {
    const { text, progress, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const angleDeg = params.angleDeg ?? -20;
    const fi = params.fadeInRatio ?? 0.12;
    const fo = params.fadeOutRatio ?? 0.12;
    let alpha = 1;
    if (progress < fi) alpha = ease.outCubic(progress / fi);
    else if (progress > 1 - fo) alpha = ease.outCubic((1 - progress) / fo);
    alpha = clamp(alpha, 0, 1);
    const angleRad = angleDeg * Math.PI / 180;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x * canvasW, y * canvasH);
    ctx.rotate(angleRad);
    setTextStyle(ctx, font, fontSize, color);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  },
});

registerEffect({
  id: 'diagonal-step-text',
  label: '斜め段差配置（文字は正立・位置がずれる）',
  params: [
    { key: 'stepX', label: 'X方向のずれ(px/文字)', type: 'range', min: -100, max: 100, step: 2, default: 20 },
    { key: 'stepY', label: 'Y方向のずれ(px/文字)', type: 'range', min: -80, max: 80, step: 2, default: 20 },
    { key: 'stagger', label: '1文字ずつ順番に現れる', type: 'select', options: [
        { value: '1', label: 'はい' },
        { value: '0', label: 'いいえ（一度に表示）' },
      ], default: '0' },
    { key: 'fadeInRatio', label: 'フェードイン割合', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.12 },
    { key: 'fadeOutRatio', label: 'フェードアウト割合', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.12 },
  ],
  draw(ctx, p) {
    const { text, progress, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const stepX = params.stepX ?? 20;
    const stepY = params.stepY ?? 20;
    const stagger = (params.stagger ?? '0') === '1';
    const fi = params.fadeInRatio ?? 0.12;
    const fo = params.fadeOutRatio ?? 0.12;
    let globalAlpha = 1;
    if (progress < fi) globalAlpha = ease.outCubic(progress / fi);
    else if (progress > 1 - fo) globalAlpha = ease.outCubic((1 - progress) / fo);
    globalAlpha = clamp(globalAlpha, 0, 1);
    const chars = toChars(text);
    const n = chars.length;
    const totalOffsetX = (n - 1) * stepX;
    const totalOffsetY = (n - 1) * stepY;
    const startX = x * canvasW - totalOffsetX / 2;
    const startY = y * canvasH - totalOffsetY / 2;
    ctx.save();
    setTextStyle(ctx, font, fontSize, color);
    chars.forEach((ch, i) => {
      let alpha = globalAlpha;
      if (stagger) alpha = ease.outCubic(clamp((progress - i * 0.05) / 0.12, 0, 1)) * globalAlpha;
      ctx.globalAlpha = alpha;
      ctx.fillText(ch, startX + i * stepX, startY + i * stepY);
    });
    ctx.restore();
  },
});
