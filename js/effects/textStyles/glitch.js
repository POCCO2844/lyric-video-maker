// effects/textStyles/glitch.js — 文字デザイン：グリッチ（色収差・水平スライスずれ・稲妻状の閃光線）
import { registerTextStyle } from '../textStyleRegistry.js';

// シード付き擬似乱数（フレームごとに変化させつつ、再現性のある「乱れ方」にするため）
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

registerTextStyle({
  id: 'glitch',
  label: 'グリッチ',
  params: [
    { key: 'intensity', label: '乱れの強さ(px)', type: 'range', min: 1, max: 40, step: 1, default: 10 },
    { key: 'glitchFrequency', label: '乱れの発生頻度(回/秒)', type: 'range', min: 1, max: 30, step: 1, default: 8 },
    { key: 'sliceCount', label: 'スライスの分割数', type: 'range', min: 2, max: 16, step: 1, default: 6 },
    { key: 'colorOffset', label: '色収差のズレ幅(px)', type: 'range', min: 0, max: 20, step: 1, default: 4 },
    { key: 'showBolt', label: '稲妻状の閃光線', type: 'select', options: [
        { value: '1', label: '表示する' },
        { value: '0', label: '表示しない' },
      ], default: '1' },
    { key: 'boltColor', label: '閃光線の色', type: 'color', default: '#FFFFFF' },
  ],
  fillText(ctx, text, px, py, baseColor, t, params, fontSize) {
    const intensity = params.intensity ?? 10;
    const glitchFreq = params.glitchFrequency ?? 8;
    const sliceCount = Math.max(2, Math.round(params.sliceCount ?? 6));
    const colorOffset = params.colorOffset ?? 4;
    const showBolt = (params.showBolt ?? '1') === '1';
    const boltColor = params.boltColor ?? '#FFFFFF';

    // 一定間隔（glitchFreq回/秒）ごとに「今この瞬間の乱れ方」を切り替える。
    // 同じ間隔内では同じ乱数シードを使うことで、ガクガクと切り替わるグリッチらしい動きになる。
    const glitchStep = Math.floor(t * glitchFreq);
    const rng = mulberry32(glitchStep * 7919 + Math.round(px) * 31 + Math.round(py) * 17);

    const metrics = ctx.measureText(text);
    const textW = metrics.width;
    const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
    const descent = metrics.actualBoundingBoxDescent || fontSize * 0.3;
    const boxLeft = px - textW / 2;
    const boxTop = py - ascent;
    const boxH = ascent + descent;
    const sliceH = boxH / sliceCount;

    // このステップで「実際に乱れを起こすか」を確率的に決める（毎回乱れ続けると煩いため、たまに発生）
    const glitchActive = rng() < 0.6;

    function drawSlicedText(offsetXBase, fillStyle, globalAlphaMul) {
      ctx.save();
      ctx.globalAlpha = ctx.globalAlpha * globalAlphaMul;
      ctx.fillStyle = fillStyle;
      for (let i = 0; i < sliceCount; i++) {
        const sliceTop = boxTop + i * sliceH;
        const dx = glitchActive ? offsetXBase + (rng() - 0.5) * 2 * intensity : offsetXBase;
        ctx.save();
        ctx.beginPath();
        ctx.rect(boxLeft - intensity - colorOffset, sliceTop, textW + (intensity + colorOffset) * 2, sliceH + 0.5);
        ctx.clip();
        ctx.fillText(text, px + dx, py);
        ctx.restore();
      }
      ctx.restore();
    }

    ctx.save();
    // 色収差：赤チャンネル風・シアン風にズラした2枚を半透明で重ねてから、本来の色を重ねる
    if (colorOffset > 0 && glitchActive) {
      drawSlicedText(-colorOffset, '#ff2b4d', 0.7);
      drawSlicedText(colorOffset, '#19e6e6', 0.7);
    }
    drawSlicedText(0, baseColor, 1);
    ctx.restore();

    // 稲妻状の閃光線（たまに文字を横切るギザギザの光の線）
    if (showBolt && glitchActive && rng() < 0.35) {
      ctx.save();
      ctx.strokeStyle = boltColor;
      ctx.lineWidth = Math.max(1, intensity * 0.15);
      ctx.globalAlpha = ctx.globalAlpha * (0.5 + rng() * 0.5);
      ctx.beginPath();
      const startY = boxTop + rng() * boxH;
      let curX = boxLeft - 10;
      let curY = startY;
      ctx.moveTo(curX, curY);
      const segments = 4 + Math.floor(rng() * 3);
      const segW = (textW + 20) / segments;
      for (let i = 0; i < segments; i++) {
        curX += segW;
        curY = startY + (rng() - 0.5) * intensity * 2;
        ctx.lineTo(curX, curY);
      }
      ctx.stroke();
      ctx.restore();
    }
  },
});
