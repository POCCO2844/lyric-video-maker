// effects/textOrientation.js
// ・vertical-text / diagonal-text / diagonal-step-text は削除
//   （縦書き・斜め書きは「文字の書き方」機能に統合）
// ・vertical-text-stagger は「1文字ずつ現れる」横書きエフェクトに改名・整理
//   （縦書き機能はrenderer.jsの writingMode で実現するため不要）

import { registerEffect } from './registry.js';
import { ease, clamp, toChars, setTextStyle } from './utils.js';

// 1文字ずつ順番にフェードインして現れる（横書き）
// 縦書きにしたい場合は「文字の書き方」で「縦書き」を選べばよい。
registerEffect({
  id: 'vertical-text-stagger',
  label: '1文字ずつ現れる',
  params: [
    { key: 'staggerSec', label: '1文字ごとの遅延(秒)', type: 'range', min: 0.01, max: 0.5, step: 0.01, default: 0.08 },
    { key: 'charFadeIn', label: '1文字のフェードイン時間(秒)', type: 'range', min: 0.05, max: 0.5, step: 0.01, default: 0.15 },
    { key: 'fadeOutRatio', label: 'フェードアウト割合', type: 'range', min: 0, max: 0.3, step: 0.01, default: 0.1 },
  ],
  draw(ctx, p) {
    const { text, progress, duration, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const staggerSec = params.staggerSec ?? 0.08;
    const charFadeIn = params.charFadeIn ?? 0.15;
    const fo = params.fadeOutRatio ?? 0.1;
    const elapsed = progress * duration;

    let globalAlpha = 1;
    if (progress > 1 - fo) globalAlpha = clamp((1 - progress) / fo, 0, 1);

    const chars = toChars(text);
    ctx.save();
    ctx.font = `${fontSize}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;

    // 各文字の幅を計測して横並びの中央揃え位置を計算する
    const widths = chars.map(ch => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0);
    const cx = x * canvasW;
    const cy = y * canvasH;
    let charX = cx - total / 2;

    chars.forEach((ch, i) => {
      const charStart = i * staggerSec;
      const charT = clamp((elapsed - charStart) / charFadeIn, 0, 1);
      ctx.globalAlpha = ease.outCubic(charT) * globalAlpha;
      ctx.fillText(ch, charX + widths[i] / 2, cy);
      charX += widths[i];
    });
    ctx.restore();
  },
});
