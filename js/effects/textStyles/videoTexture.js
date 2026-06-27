// effects/textStyles/videoTexture.js — 文字デザイン：動画または画像を文字にマスクして貼り付ける
import { registerTextStyle } from '../textStyleRegistry.js';

registerTextStyle({
  id: 'video-texture',
  label: '動画/画像テクスチャ（文字に動画・画像を貼る）',
  params: [
    { key: 'scale', label: '動画/画像の拡大率', type: 'range', min: 0.1, max: 4, step: 0.1, default: 1 },
    { key: 'offsetX', label: 'X位置オフセット(%)', type: 'range', min: -100, max: 100, step: 1, default: 0 },
    { key: 'offsetY', label: 'Y位置オフセット(%)', type: 'range', min: -100, max: 100, step: 1, default: 0 },
  ],
  // mediaEl: video要素（動画）または img要素（画像）のどちらか。renderer.jsから渡される。
  applyToCanvas(offCtx, w, h, t, params, fontSize, baseColor, mediaEl) {
    if (!mediaEl) return;

    const scale = params.scale ?? 1;
    const offsetXPct = params.offsetX ?? 0;
    const offsetYPct = params.offsetY ?? 0;

    // video と img の両方で naturalWidth / videoWidth を吸収する
    const srcW = mediaEl.videoWidth || mediaEl.naturalWidth || w;
    const srcH = mediaEl.videoHeight || mediaEl.naturalHeight || h;

    // 動画の場合は readyState、画像の場合は complete をチェック
    const isReady = mediaEl.tagName === 'VIDEO'
      ? mediaEl.readyState >= 2
      : mediaEl.complete && mediaEl.naturalWidth > 0;

    if (!isReady) return;

    const drawW = w * scale;
    const drawH = (drawW / srcW) * srcH;
    const drawX = (w - drawW) / 2 + (offsetXPct / 100) * w;
    const drawY = (h - drawH) / 2 + (offsetYPct / 100) * h;

    offCtx.save();
    offCtx.globalCompositeOperation = 'source-atop';
    offCtx.drawImage(mediaEl, drawX, drawY, drawW, drawH);
    offCtx.restore();
  },
});
