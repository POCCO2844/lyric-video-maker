// videoExport.js — Canvas + 音声を録画し、ffmpeg.wasm で MP4 に変換する

import { LyricRenderer } from './renderer.js';

/**
 * オフスクリーンCanvasで全フレームを描画しながら録画する。
 * 音声はAudioContextからMediaStreamDestinationへ流し込み、映像と合成する。
 * onProgress(ratio: 0-1, stage: string) を呼んで進捗を通知する。
 * 戻り値: { webmBlob }
 */
export async function recordWebM(project, audioBuffer, onProgress) {
  const { settings, lyrics } = project;
  const width = settings.width || 1920;
  const height = settings.height || 1080;
  const fps = settings.fps || 30;

  const totalDuration = Math.max(
    audioBuffer ? audioBuffer.duration : 0,
    ...lyrics.map(l => l.end),
    0.1
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const renderer = new LyricRenderer(canvas, project);

  // --- 音声トラックの準備 ---
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();
  let sourceNode = null;
  if (audioBuffer) {
    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(dest);
    sourceNode.connect(audioCtx.destination); // モニタリング用（ミュートしてもよい）
  }

  // --- 映像トラックの準備 ---
  // captureStream(fps) で一定間隔の自動キャプチャを行う。
  // 録画はリアルタイム同期（実際にtotalDuration秒だけ待つ）で行うことで、
  // ブラウザ間の互換性問題（requestFrameの非対応等）を避ける。
  const videoStream = canvas.captureStream(fps);
  const videoTrack = videoStream.getVideoTracks()[0];

  const combinedStream = new MediaStream();
  combinedStream.addTrack(videoTrack);
  if (audioBuffer) {
    dest.stream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
  }

  const mimeCandidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  const mimeType = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 12_000_000,
  });

  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const recordingDone = new Promise((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(100); // 100msごとにチャンクを切る

  const startTime = performance.now();
  const hasBgVideo = settings.bgType === 'video' && !!settings.bgVideoBlob;

  // 描画ループ：実時間に合わせて毎フレーム再描画する
  // 背景動画がある場合は、フレームごとに動画のシーク完了を待ってから描画する（コマ落ち防止のため）。
  let rafId;
  await new Promise((resolve) => {
    async function tick() {
      const elapsedSec = (performance.now() - startTime) / 1000;
      const t = Math.min(elapsedSec, totalDuration);
      if (hasBgVideo) {
        await renderer.syncBgVideo(t);
      }
      renderer.renderFrame(t);
      if (onProgress) onProgress(t / totalDuration, 'recording');
      if (elapsedSec >= totalDuration) {
        resolve();
        return;
      }
      rafId = requestAnimationFrame(tick);
    }
    if (sourceNode) sourceNode.start(0);
    rafId = requestAnimationFrame(tick);
  });
  cancelAnimationFrame(rafId);

  // 音声の尾を録り切るための余白
  await new Promise(r => setTimeout(r, 400));

  recorder.stop();
  if (sourceNode) {
    try { sourceNode.stop(); } catch (e) { /* noop */ }
  }
  await recordingDone;
  audioCtx.close();
  renderer.dispose();

  const webmBlob = new Blob(chunks, { type: 'video/webm' });
  return { webmBlob, totalDuration, width, height, fps };
}

/**
 * ffmpeg.wasm を使って WebM を MP4 に変換する。
 * onProgress(ratio) を呼ぶ。
 */
let ffmpegInstance = null;

export async function convertWebmToMp4(webmBlob, onProgress, onStatusText) {
  if (!window.FFmpeg) {
    throw new Error('ffmpeg.wasm が読み込まれていません。');
  }
  if (!window.crossOriginIsolated) {
    throw new Error(
      'このページはMP4変換に必要な「クロスオリジン分離」が有効になっていません。' +
      'ホスティング先のHTTPヘッダー設定（Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy）をご確認ください。' +
      '（WebM形式であればこの制約なくダウンロードできます）'
    );
  }
  const { createFFmpeg, fetchFile } = window.FFmpeg;

  if (!ffmpegInstance) {
    ffmpegInstance = createFFmpeg({
      log: true, // コンソールにffmpegの内部ログを出す（フリーズ時の原因切り分け用）
      corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    });
  }

  // ffmpegの内部ログを受け取るたびに「生きている」ことを伝える（進捗%が出ない環境向けのフォールバック表示）
  let lastLogAt = Date.now();
  ffmpegInstance.setLogger(({ message }) => {
    lastLogAt = Date.now();
    if (onStatusText) onStatusText(message);
  });

  if (!ffmpegInstance.isLoaded()) {
    if (onStatusText) onStatusText('ffmpeg.wasm 本体を読み込んでいます…');
    await ffmpegInstance.load();
  }

  ffmpegInstance.setProgress(({ ratio }) => {
    lastLogAt = Date.now();
    if (onProgress && ratio >= 0) onProgress(Math.min(ratio, 1));
  });

  ffmpegInstance.FS('writeFile', 'input.webm', await fetchFile(webmBlob));

  // 一定時間（60秒）まったくログ・進捗の更新が無い場合はフリーズとみなしてエラーにする。
  // ffmpeg.run() 自体は完了までawaitし続けるしかないため、Promise.raceで監視する。
  const STALL_TIMEOUT_MS = 60_000;
  let stallTimer = null;
  const stallWatcher = new Promise((_, reject) => {
    stallTimer = setInterval(() => {
      if (Date.now() - lastLogAt > STALL_TIMEOUT_MS) {
        clearInterval(stallTimer);
        reject(new Error(
          `MP4変換が${Math.round(STALL_TIMEOUT_MS / 1000)}秒以上応答していません。` +
          'ブラウザのメモリ不足、またはffmpeg.wasmの読み込み失敗の可能性があります。' +
          '解像度を下げる、曲を短くする、またはWebM形式での書き出しをお試しください。'
        ));
      }
    }, 2000);
  });

  try {
    await Promise.race([
      ffmpegInstance.run(
        '-i', 'input.webm',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        'output.mp4'
      ),
      stallWatcher,
    ]);
  } finally {
    clearInterval(stallTimer);
  }
  const data = ffmpegInstance.FS('readFile', 'output.mp4');
  ffmpegInstance.FS('unlink', 'input.webm');
  ffmpegInstance.FS('unlink', 'output.mp4');

  return new Blob([data.buffer], { type: 'video/mp4' });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
