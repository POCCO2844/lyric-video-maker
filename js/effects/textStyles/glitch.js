// effects/textStyles/glitch.js — 文字デザイン：グリッチ（色収差・水平スライスずれ・稲妻状の閃光線）
import { registerTextStyle } from '../textStyleRegistry.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t2 = Math.imul(a ^ (a >>> 15), 1 | a);
    t2 = (t2 + Math.imul(t2 ^ (t2 >>> 7), 61 | t2)) ^ t2;
    return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296;
  };
}

registerTextStyle({
  id: 'glitch',
  label: 'グリッチ',
  params: [
    { key: 'intensity', label: 'スライスのずれ幅(px)', type: 'range', min: 1, max: 60, step: 1, default: 15 },
    { key: 'glitchFrequency', label: '乱れの発生頻度(回/秒)', type: 'range', min: 1, max: 30, step: 1, default: 8 },
    { key: 'sliceCount', label: 'スライスの分割数', type: 'range', min: 2, max: 16, step: 1, default: 5 },
    { key: 'colorOffset', label: '色収差のズレ幅(px)', type: 'range', min: 0, max: 30, step: 1, default: 6 },
    { key: 'showBolt', label: '稲妻状の閃光線', type: 'select', options: [
        { value: '1', label: '表示する' },
        { value: '0', label: '表示しない' },
      ], default: '1' },
    { key: 'boltColor', label: '閃光線の色', type: 'color', default: '#FFFFFF' },
  ],
  applyToCanvas(offCtx, w, h, t, params) {
    const intensity = params.intensity ?? 15;
    const glitchFreq = params.glitchFrequency ?? 8;
    const sliceCount = Math.max(2, Math.round(params.sliceCount ?? 5));
    const colorOffset = Math.round(params.colorOffset ?? 6);
    const showBolt = (params.showBolt ?? '1') === '1';
    const boltColor = params.boltColor ?? '#FFFFFF';

    const glitchStep = Math.floor(t * glitchFreq);
    const rng = mulberry32(glitchStep * 7919 + 31337);
    const glitchActive = rng() < 0.65;
    if (!glitchActive) return;

    const sliceH = Math.ceil(h / sliceCount);

    // --- 1. 元の文字をスナップショットとして保存 ---
    const snapshot = document.createElement('canvas');
    snapshot.width = w;
    snapshot.height = h;
    snapshot.getContext('2d').drawImage(offCtx.canvas, 0, 0);

    // --- 2. 色収差：赤っぽいコピーを左、シアンっぽいコピーを右にずらして半透明で重ねる ---
    // source-atop を使うことで「文字の外（透明領域）には描かない」を保証する
    if (colorOffset > 0) {
      offCtx.save();
      offCtx.globalCompositeOperation = 'source-atop';

      // 赤チャンネル：左ずらしコピーを半透明で重ねる
      offCtx.globalAlpha = 0.6;
      // tintCanvasで元画像に色を掛け合わせた版を作る
      const makeColored = (src, color, dx) => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const cx = c.getContext('2d');
        cx.drawImage(src, dx, 0);
        cx.globalCompositeOperation = 'source-atop';
        cx.fillStyle = color;
        cx.globalAlpha = 0.7;
        cx.fillRect(0, 0, w, h);
        return c;
      };
      offCtx.drawImage(makeColored(snapshot, '#ff3355', -colorOffset), 0, 0);
      offCtx.drawImage(makeColored(snapshot, '#00ffff', colorOffset), 0, 0);
      offCtx.restore();
    }

    // --- 3. 水平スライスのX方向ランダムオフセット ---
    // 一部のスライスだけをずらし、残りはそのままにする
    const sliceSnapshot = document.createElement('canvas');
    sliceSnapshot.width = w;
    sliceSnapshot.height = h;
    sliceSnapshot.getContext('2d').drawImage(offCtx.canvas, 0, 0);

    offCtx.clearRect(0, 0, w, h);
    for (let i = 0; i < sliceCount; i++) {
      const sy = i * sliceH;
      const sh = Math.min(sliceH, h - sy);
      // 一部のスライスだけランダムにずらす（全部ずらすと文字が読めなくなるため）
      const shouldGlitch = rng() < 0.45;
      const dx = shouldGlitch ? (rng() - 0.5) * 2 * intensity : 0;
      offCtx.drawImage(sliceSnapshot, 0, sy, w, sh, dx, sy, w, sh);
    }

    // --- 4. 稲妻状の閃光線 ---
    // 文字ピクセルの上だけに描く（source-atop）ので背景には出ない
    if (showBolt && rng() < 0.4) {
      offCtx.save();
      offCtx.globalCompositeOperation = 'source-atop';
      offCtx.strokeStyle = boltColor;
      offCtx.lineWidth = 2 + rng() * 3;
      offCtx.shadowColor = boltColor;
      offCtx.shadowBlur = 8;
      offCtx.globalAlpha = 0.7 + rng() * 0.3;
      offCtx.beginPath();
      const boltY = h * 0.1 + rng() * h * 0.8;
      let cx2 = -10;
      let cy2 = boltY;
      offCtx.moveTo(cx2, cy2);
      const segs = 5 + Math.floor(rng() * 4);
      const segW = (w + 20) / segs;
      for (let i = 0; i < segs; i++) {
        cx2 += segW;
        cy2 = boltY + (rng() - 0.5) * h * 0.3;
        offCtx.lineTo(cx2, cy2);
      }
      offCtx.stroke();
      offCtx.restore();
    }
  },
});
