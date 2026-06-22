// effects/textStyles/videoTexture.js — 文字デザイン：動画を文字にマスクして貼り付ける
// 背景設定で読み込んだ動画（bgVideoBlob）の現在フレームを、文字の形でくり抜いて表示する。
import { registerTextStyle } from '../textStyleRegistry.js';

registerTextStyle({
  id: 'video-texture',
  label: '動画テクスチャ（文字に動画を貼る）',
  params: [
    { key: 'scale', label: '動画の拡大率', type: 'range', min: 0.5, max: 3, step: 0.1, default: 1 },
    { key: 'offsetX', label: '動画のX位置オフセット(%)', type: 'range', min: -100, max: 100, step: 1, default: 0 },
    { key: 'offsetY', label: '動画のY位置オフセット(%)', type: 'range', min: -100, max: 100, step: 1, default: 0 },
  ],
  // videoEl は renderer.js から渡される（プロジェクトの背景動画のビデオ要素）
  applyToCanvas(offCtx, w, h, t, params, fontSize, baseColor, videoEl) {
    if (!videoEl || videoEl.readyState < 2) {
      // 動画が準備できていない場合は何もしない（文字はそのまま残る）
      return;
    }

    const scale = params.scale ?? 1;
    const offsetXPct = params.offsetX ?? 0;
    const offsetYPct = params.offsetY ?? 0;

    const vw = videoEl.videoWidth || w;
    const vh = videoEl.videoHeight || h;

    // 動画を文字領域に合わせてスケーリングし、source-atop で文字の内側にだけ貼る
    offCtx.save();
    offCtx.globalCompositeOperation = 'source-atop';

    const drawW = w * scale;
    const drawH = (drawW / vw) * vh;
    const drawX = (w - drawW) / 2 + (offsetXPct / 100) * w;
    const drawY = (h - drawH) / 2 + (offsetYPct / 100) * h;

    offCtx.drawImage(videoEl, drawX, drawY, drawW, drawH);
    offCtx.restore();
  },
});
