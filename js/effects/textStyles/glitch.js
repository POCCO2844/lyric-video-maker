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
  applyToCanvas(offCtx, w, h, t, params) {
    const intensity = params.intensity ?? 10;
    const glitchFreq = params.glitchFrequency ?? 8;
    const sliceCount = Math.max(2, Math.round(params.sliceCount ?? 6));
    const colorOffset = Math.round(params.colorOffset ?? 4);
    const showBolt = (params.showBolt ?? '1') === '1';
    const boltColor = params.boltColor ?? '#FFFFFF';

    const glitchStep = Math.floor(t * glitchFreq);
    const rng = mulberry32(glitchStep * 7919 + 31337);
    const glitchActive = rng() < 0.6;

    if (!glitchActive) return; // このステップでは乱れない

    const sliceH = Math.ceil(h / sliceCount);

    // 1. 水平スライスのランダムなX方向オフセット
    // オフスクリーンの内容を一旦別バッファに退避し、各スライスをずらして描き戻す
    const snapshot = document.createElement('canvas');
    snapshot.width = w;
    snapshot.height = h;
    const snapCtx = snapshot.getContext('2d');
    snapCtx.drawImage(offCtx.canvas, 0, 0);

    // 一旦クリアして、スライスをずらして再描画する
    offCtx.clearRect(0, 0, w, h);
    for (let i = 0; i < sliceCount; i++) {
      const sy = i * sliceH;
      const sh = Math.min(sliceH, h - sy);
      const dx = (rng() - 0.5) * 2 * intensity;
      offCtx.drawImage(snapshot, 0, sy, w, sh, dx, sy, w, sh);
    }

    // 2. 色収差（赤/シアンのチャンネルオフセット）
    // 色収差は「赤チャンネルは少し左、シアン（GB）は少し右にずらした半透明コピー」で表現する
    if (colorOffset > 0) {
      offCtx.save();
      offCtx.globalAlpha = 0.55;

      // 赤チャンネル風：赤みがかったコピーを左にずらす
      offCtx.globalCompositeOperation = 'screen';
      // Canvas全体を赤に着色してから合成するため、一時Canvasを使う
      const redCanvas = document.createElement('canvas');
      redCanvas.width = w; redCanvas.height = h;
      const rctx = redCanvas.getContext('2d');
      rctx.drawImage(offCtx.canvas, -colorOffset, 0);
      rctx.globalCompositeOperation = 'multiply';
      rctx.fillStyle = '#ff4466';
      rctx.fillRect(0, 0, w, h);

      const cyanCanvas = document.createElement('canvas');
      cyanCanvas.width = w; cyanCanvas.height = h;
      const cctx = cyanCanvas.getContext('2d');
      cctx.drawImage(offCtx.canvas, colorOffset, 0);
      cctx.globalCompositeOperation = 'multiply';
      cctx.fillStyle = '#44ffff';
      cctx.fillRect(0, 0, w, h);

      offCtx.drawImage(redCanvas, 0, 0);
      offCtx.drawImage(cyanCanvas, 0, 0);
      offCtx.restore();
    }

    // 3. 稲妻状の閃光線（文字の上にsource-atopで重ねる）
    if (showBolt && rng() < 0.35) {
      offCtx.save();
      offCtx.globalCompositeOperation = 'source-atop';
      offCtx.strokeStyle = boltColor;
      offCtx.lineWidth = Math.max(1, intensity * 0.15);
      offCtx.globalAlpha = 0.5 + rng() * 0.5;
      offCtx.beginPath();
      const startY = rng() * h;
      let curX = -10;
      let curY = startY;
      offCtx.moveTo(curX, curY);
      const segments = 4 + Math.floor(rng() * 3);
      const segW = (w + 20) / segments;
      for (let i = 0; i < segments; i++) {
        curX += segW;
        curY = startY + (rng() - 0.5) * intensity * 2;
        offCtx.lineTo(curX, curY);
      }
      offCtx.stroke();
      offCtx.restore();
    }
  },
});
