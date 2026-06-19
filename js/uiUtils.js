// uiUtils.js
export function fmtTime(t) {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(2);
  return `${String(m).padStart(2, '0')}:${s.padStart(5, '0')}`;
}

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export async function decodeAudioBlob(blob) {
  const arrayBuf = await blob.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
  ctx.close();
  return audioBuffer;
}
