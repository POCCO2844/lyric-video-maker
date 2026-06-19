// effects/fullscreenFlow.js — 全画面に設定された歌詞が詰まって表示 or 左右に流れる
import { registerEffect } from './registry.js';
import { clamp, setTextStyle } from './utils.js';

registerEffect({
  id: 'fullscreen-flow',
  label: '全画面表示（詰まる／流れる）',
  params: [
    { key: 'mode', label: 'モード', type: 'select', options: [
        { value: 'static', label: '詰まって静止' },
        { value: 'left', label: '左へ流れる' },
        { value: 'right', label: '右へ流れる' },
      ], default: 'left' },
    { key: 'repeat', label: '繰り返し回数（流れる時）', type: 'range', min: 1, max: 10, step: 1, default: 4 },
    { key: 'fadeRatio', label: 'フェードイン/アウト割合', type: 'range', min: 0, max: 0.3, step: 0.01, default: 0.08 },
  ],
  draw(ctx, p) {
    const { text, progress, canvasW, canvasH, y, font, fontSize, color, params } = p;
    const mode = params.mode ?? 'left';
    const repeat = params.repeat ?? 4;
    const fr = params.fadeRatio ?? 0.08;
    let alpha = 1;
    if (progress < fr) alpha = progress / fr;
    else if (progress > 1 - fr) alpha = (1 - progress) / fr;
    alpha = clamp(alpha, 0, 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    setTextStyle(ctx, font, fontSize, color);
    const cy = y * canvasH;

    if (mode === 'static') {
      // 横に詰めて並べて画面全体を満たす（繰り返し表示）
      const unit = text + '　';
      const unitW = ctx.measureText(unit).width || 1;
      const count = Math.ceil(canvasW / unitW) + 2;
      let str = unit.repeat(count);
      ctx.textAlign = 'left';
      ctx.fillText(str, -unitW, cy);
    } else {
      const unit = text + '　　';
      const unitW = ctx.measureText(unit).width || 1;
      const totalW = unitW * repeat;
      const dir = mode === 'left' ? -1 : 1;
      const offset = (progress * totalW * dir) % totalW;
      ctx.textAlign = 'left';
      let startX = dir === -1 ? offset : offset - totalW;
      for (let i = -1; i * unitW + startX < canvasW + unitW; i++) {
        ctx.fillText(unit, startX + i * unitW, cy);
      }
    }
    ctx.restore();
  },
});
