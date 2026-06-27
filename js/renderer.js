// renderer.js — Canvas に現在時刻の歌詞を描画する共通エンジン（プレビューと録画の両方で使う）
import { getEffect } from './effects/index.js';
import { getTextStyle } from './effects/textStyles/index.js';

// cover/contain/stretch に応じた描画矩形を計算する
function computeFitRect(srcW, srcH, dstW, dstH, fit) {
  if (fit === 'stretch' || !srcW || !srcH) {
    return { dx: 0, dy: 0, dw: dstW, dh: dstH };
  }
  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;
  let dw, dh;
  if (fit === 'contain') {
    if (srcRatio > dstRatio) { dw = dstW; dh = dstW / srcRatio; }
    else { dh = dstH; dw = dstH * srcRatio; }
  } else {
    // cover（デフォルト）
    if (srcRatio > dstRatio) { dh = dstH; dw = dstH * srcRatio; }
    else { dw = dstW; dh = dstW / srcRatio; }
  }
  return { dx: (dstW - dw) / 2, dy: (dstH - dh) / 2, dw, dh };
}

export class LyricRenderer {
  constructor(canvas, project) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.project = project;

    // 背景メディア要素（画像/動画）。Blobが変わった時だけ作り直す。
    this._bgImageEl = null;
    this._bgImageBlobRef = null;
    this._bgVideoEl = null;
    this._bgVideoBlobRef = null;
    this._bgVideoReadyPromise = null;

    // 行ごとのtextStyle用動画要素キャッシュ。key=lineId, value={videoEl, blobRef}
    this._lineVideoCache = new Map();
    // 行ごとのtextStyle用画像要素キャッシュ。key=lineId, value={imgEl, blobRef}
    this._lineImageCache = new Map();
  }

  setProject(project) {
    this.project = project;
  }

  // 背景動画の長さ（秒）を取得する。背景動画が設定されていない場合は null を返す。
  // メタデータ読み込み待ちが必要なため非同期。
  async getBgVideoDuration() {
    this._ensureBgMediaElements();
    if (this.project.settings.bgType !== 'video' || !this._bgVideoEl) return null;
    if (this._bgVideoReadyPromise) await this._bgVideoReadyPromise;
    const dur = this._bgVideoEl.duration;
    return (dur && isFinite(dur)) ? dur : null;
  }

  // プロジェクトの背景Blobが変わっていたら、画像/動画要素を作り直す
  _ensureBgMediaElements() {
    const { settings } = this.project;

    if (settings.bgType === 'image' && settings.bgImageBlob) {
      if (this._bgImageBlobRef !== settings.bgImageBlob) {
        const url = URL.createObjectURL(settings.bgImageBlob);
        const img = new Image();
        img.src = url;
        this._bgImageEl = img;
        this._bgImageBlobRef = settings.bgImageBlob;
      }
    } else {
      this._bgImageEl = null;
      this._bgImageBlobRef = null;
    }

    if (settings.bgType === 'video' && settings.bgVideoBlob) {
      if (this._bgVideoBlobRef !== settings.bgVideoBlob) {
        const url = URL.createObjectURL(settings.bgVideoBlob);
        const video = document.createElement('video');
        video.src = url;
        video.muted = true;
        video.playsInline = true;
        video.loop = false; // ループはこのクラス側で時刻計算して制御する
        video.addEventListener('ended', () => {
          if (this.project.settings.bgVideoLoop) {
            video.currentTime = 0;
            video.play().catch(() => {});
          }
        });
        this._bgVideoEl = video;
        this._bgVideoBlobRef = settings.bgVideoBlob;
        this._bgVideoReadyPromise = new Promise((resolve) => {
          video.addEventListener('loadedmetadata', () => resolve(), { once: true });
        });
      }
    } else {
      this._bgVideoEl = null;
      this._bgVideoBlobRef = null;
      this._bgVideoReadyPromise = null;
    }
  }

  // 背景動画を時刻 t に同期させる（ループ対応）。
  // 動画のシークは非同期なので、書き出し時は await syncBgVideo(t) を必ず呼ぶこと。
  // live=true（プレビュー再生中）の場合は、動画自体を再生させて自然に時間を進め、
  // ループ境界をまたぐ時だけシークする（毎フレームのシークによるチラつきを避けるため）。
  // live=false（書き出し時・停止中のシーク時）は、毎回正確に指定時刻へシークする。
  async syncBgVideo(t, { live = false } = {}) {
    this._ensureBgMediaElements();
    const { settings } = this.project;
    if (settings.bgType !== 'video' || !this._bgVideoEl) return;
    if (this._bgVideoReadyPromise) await this._bgVideoReadyPromise;

    const video = this._bgVideoEl;
    const dur = video.duration || 0;
    if (dur <= 0) return;
    let target = t;
    if (settings.bgVideoLoop) {
      target = t % dur;
    } else {
      target = Math.min(t, dur);
    }

    if (live) {
      // 自走再生モード：大きくズレた時（シークバー操作直後やループ境界）だけ合わせ直す
      if (Math.abs(video.currentTime - target) > 0.3) {
        try { video.currentTime = target; } catch (e) { /* noop */ }
      }
      if (video.paused) {
        try { await video.play(); } catch (e) { /* 自動再生制限等は無視 */ }
      }
      return;
    }

    // 高精度モード（書き出し用）：毎回正確にシークしてから完了を待つ
    if (!video.paused) video.pause();
    if (Math.abs(video.currentTime - target) > 0.01) {
      await new Promise((resolve) => {
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
        video.addEventListener('seeked', onSeeked);
        try { video.currentTime = target; } catch (e) { resolve(); }
        // 万一seekedが発火しない環境向けのフォールバック
        setTimeout(resolve, 150);
      });
    }
  }

  _drawBackground() {
    const { ctx, canvas, project } = this;
    const { settings } = project;
    this._ensureBgMediaElements();

    if (settings.bgType === 'image' && this._bgImageEl && this._bgImageEl.complete && this._bgImageEl.naturalWidth) {
      const img = this._bgImageEl;
      const { dx, dy, dw, dh } = computeFitRect(img.naturalWidth, img.naturalHeight, canvas.width, canvas.height, settings.bgFit);
      // contain指定で余白ができる場合は黒で塗っておく
      if (settings.bgFit === 'contain') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, dx, dy, dw, dh);
      return;
    }

    if (settings.bgType === 'video' && this._bgVideoEl && this._bgVideoEl.readyState >= 2) {
      const video = this._bgVideoEl;
      const { dx, dy, dw, dh } = computeFitRect(video.videoWidth, video.videoHeight, canvas.width, canvas.height, settings.bgFit);
      if (settings.bgFit === 'contain') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(video, dx, dy, dw, dh);
      return;
    }

    // 背景が画像/動画に設定されているのに、まだ準備中（読み込み中・シーク中）の場合は
    // 単色背景（グリーンバック色）にフォールバックすると一瞬チラついて見えるため、黒で代用する。
    if (settings.bgType === 'video' || settings.bgType === 'image') {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // デフォルト：単色背景（グリーンバック等）
    ctx.fillStyle = settings.bgColor || '#00FF00';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 現在時刻 t（秒）における映像を1フレーム描画する（背景が動画の場合は事前に syncBgVideo(t) を呼んでおくこと）
  renderFrame(t) {
    const { ctx, canvas, project } = this;
    const { settings, lyrics } = project;

    this._drawBackground();

    for (const line of lyrics) {
      if (t < line.start || t > line.end) continue;
      const duration = Math.max(line.end - line.start, 0.0001);
      const progress = Math.min(Math.max((t - line.start) / duration, 0), 1);
      const effect = getEffect(line.effect);
      const font = line.font || settings.defaultFont;
      const fontSize = line.fontSize || settings.defaultFontSize;
      const color = line.color || settings.defaultColor;
      const textStyle = getTextStyle(line.textStyle);
      const writingMode = line.writingMode || 'horizontal';
      const writingModeParams = line.writingModeParams || {};
      const needsOffscreen = textStyle || writingMode !== 'horizontal';

      if (!needsOffscreen) {
        // 文字デザインなし・横書き：通常通り本体Canvasに直接描画する
        try {
          effect.draw(ctx, {
            text: line.text, progress, duration,
            canvasW: canvas.width, canvasH: canvas.height,
            x: line.x ?? 0.5, y: line.y ?? 0.5,
            font, fontSize, color,
            params: line.effectParams || {},
          });
        } catch (e) {
          console.error('エフェクト描画エラー:', line.effect, e);
        }
      } else {
        // オフスクリーンCanvasに動きエフェクトを描画する
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const offCtx = offscreen.getContext('2d');

        try {
          effect.draw(offCtx, {
            text: line.text, progress, duration,
            canvasW: canvas.width, canvasH: canvas.height,
            x: line.x ?? 0.5, y: line.y ?? 0.5,
            font, fontSize, color,
            params: line.effectParams || {},
          });
        } catch (e) {
          console.error('エフェクト描画エラー（オフスクリーン）:', line.effect, e);
          ctx.save();
          try { effect.draw(ctx, { text: line.text, progress, duration, canvasW: canvas.width, canvasH: canvas.height, x: line.x ?? 0.5, y: line.y ?? 0.5, font, fontSize, color, params: line.effectParams || {} }); } catch (_) {}
          ctx.restore();
          continue;
        }

        // 文字デザインをオフスクリーンに適用する
        if (textStyle) {
          let textStyleVideoEl = null;
          if (line.textStyleVideoBlob) {
            const cached = this._lineVideoCache.get(line.id);
            if (!cached || cached.blobRef !== line.textStyleVideoBlob) {
              if (cached) { cached.videoEl.pause(); URL.revokeObjectURL(cached.videoEl.src); }
              const url = URL.createObjectURL(line.textStyleVideoBlob);
              const v = document.createElement('video');
              v.src = url; v.muted = true; v.playsInline = true; v.loop = true;
              v.load(); v.play().catch(() => {});
              this._lineVideoCache.set(line.id, { videoEl: v, blobRef: line.textStyleVideoBlob });
            }
            textStyleVideoEl = this._lineVideoCache.get(line.id)?.videoEl || null;
          }
          const videoForStyle = textStyleVideoEl || this._bgVideoEl || null;
          let textStyleImageEl = null;
          if (line.textStyleImageBlob) {
            const cachedImg = this._lineImageCache.get(line.id);
            if (!cachedImg || cachedImg.blobRef !== line.textStyleImageBlob) {
              if (cachedImg) URL.revokeObjectURL(cachedImg.imgEl.src);
              const url = URL.createObjectURL(line.textStyleImageBlob);
              const img = new Image();
              img.src = url;
              this._lineImageCache.set(line.id, { imgEl: img, blobRef: line.textStyleImageBlob });
            }
            textStyleImageEl = this._lineImageCache.get(line.id)?.imgEl || null;
          }
          try {
            const mediaForStyle = textStyleImageEl || videoForStyle || null;
            textStyle.applyToCanvas(offCtx, canvas.width, canvas.height, t, line.textStyleParams || {}, fontSize, color, mediaForStyle);
          } catch (e) {
            console.error('文字デザイン適用エラー:', line.textStyle, e);
          }
        }

        // 書き方（writingMode）に応じて、オフスクリーンの描画結果を変換して本体に合成する。
        // 行の指定座標（x,y）を中心に回転・変換を行う。
        if (writingMode === 'horizontal') {
          // 横書き（変換なし）
          ctx.drawImage(offscreen, 0, 0);
        } else {
          const cx = (line.x ?? 0.5) * canvas.width;
          const cy = (line.y ?? 0.5) * canvas.height;
          let angleRad = 0;
          if (writingMode === 'vertical') {
            angleRad = Math.PI / 2; // 90度回転（縦書き）
          } else if (writingMode === 'diagonal') {
            const deg = writingModeParams.angleDeg ?? -30;
            angleRad = deg * Math.PI / 180;
          }
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angleRad);
          ctx.translate(-cx, -cy);
          ctx.drawImage(offscreen, 0, 0);
          ctx.restore();
        }
      }
    }
  }

  // 後始末（ObjectURLの解放）
  dispose() {
    if (this._bgImageEl) URL.revokeObjectURL(this._bgImageEl.src);
    if (this._bgVideoEl) URL.revokeObjectURL(this._bgVideoEl.src);
    for (const { videoEl } of this._lineVideoCache.values()) URL.revokeObjectURL(videoEl.src);
    for (const { imgEl } of this._lineImageCache.values()) URL.revokeObjectURL(imgEl.src);
    this._lineVideoCache.clear();
    this._lineImageCache.clear();
  }
}
