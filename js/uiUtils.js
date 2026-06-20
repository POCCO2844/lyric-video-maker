// uiUtils.js
export function fmtTime(t) {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(2);
  return `${String(m).padStart(2, '0')}:${s.padStart(5, '0')}`;
}

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// プロジェクト全体の動画の長さ（秒）を計算する。
// - 通常は「音楽の長さ」と「歌詞の最終終了時刻」の長い方を採用する。
// - 背景動画が設定されていて、かつループ再生がOFFの場合は、
//   音楽がまだ鳴っていても背景動画が終わった時点で映像を終わらせたいため、
//   背景動画の長さで上限をかける（背景動画の長さを超えないようにする）。
// bgVideoDuration は呼び出し側で <video>.duration 等から取得して渡す（未取得ならundefined可）。
export function computeTotalDuration({ audioDuration, lyrics, settings, bgVideoDuration }) {
  const base = Math.max(
    audioDuration || 0,
    ...((lyrics || []).map(l => l.end)),
    0.1
  );
  const hasNonLoopingBgVideo = settings?.bgType === 'video' && settings?.bgVideoBlob && settings?.bgVideoLoop === false;
  if (hasNonLoopingBgVideo && bgVideoDuration && bgVideoDuration > 0) {
    return Math.min(base, bgVideoDuration);
  }
  return base;
}

// Blob（音声ファイル、または音声トラックが既に抽出済みのもの）をAudioBufferにデコードする。
export async function decodeAudioBlob(blob) {
  const arrayBuf = await blob.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
    return audioBuffer;
  } finally {
    ctx.close();
  }
}

// 動画ファイル（mp4 / mov / webm 等）から音声トラックだけを抽出し、
// 独立した音声Blob（wav）として返す。
// <video>要素 + MediaElementAudioSourceNode + OfflineAudioContext でレンダリングする方式。
export async function extractAudioFromVideoFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.src = url;
    video.muted = false; // ミュートにするとAudioContextに音が流れないブラウザがあるため
    video.preload = 'auto';

    await new Promise((resolve, reject) => {
      video.addEventListener('loadedmetadata', resolve, { once: true });
      video.addEventListener('error', () => reject(new Error('動画ファイルの読み込みに失敗しました')), { once: true });
    });

    const duration = video.duration;
    if (!duration || !isFinite(duration)) {
      throw new Error('動画の長さを取得できませんでした');
    }

    const liveCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = liveCtx.createMediaElementSource(video);

    // MediaStreamDestination を介して video の再生音をストリーム化し、それを録音する。
    const dest = liveCtx.createMediaStreamDestination();
    source.connect(dest);
    source.connect(liveCtx.destination); // モニタリング用（読み込み中だけ音が鳴る）

    const recorder = new MediaRecorder(dest.stream);
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    const recordingDone = new Promise((resolve) => { recorder.onstop = resolve; });

    recorder.start();
    video.currentTime = 0;
    await video.play();

    await new Promise((resolve) => {
      video.addEventListener('ended', resolve, { once: true });
    });
    recorder.stop();
    video.pause();
    await recordingDone;
    liveCtx.close();

    const audioBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
    return audioBlob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ファイルが映像ファイルかどうかを判定する
export function isVideoFile(file) {
  return file && file.type && file.type.startsWith('video/');
}

