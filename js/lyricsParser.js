// lyricsParser.js — 歌詞テキスト / LRC ファイルの読み込み

function uid() {
  return 'L' + Math.random().toString(36).slice(2, 9);
}

// LRC: [mm:ss.xx]歌詞 行
const LRC_LINE_RE = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

export function isLrcFormat(text) {
  return LRC_LINE_RE.test(text);
}

export function parseLrc(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  for (const raw of lines) {
    LRC_LINE_RE.lastIndex = 0;
    const matches = [...raw.matchAll(LRC_LINE_RE)];
    if (matches.length === 0) continue;
    const content = raw.replace(LRC_LINE_RE, '').trim();
    if (!content) continue;
    for (const m of matches) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const ms = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) : 0;
      const time = min * 60 + sec + ms / 1000;
      entries.push({ time, text: content });
    }
  }
  entries.sort((a, b) => a.time - b.time);
  return entries.map((e, i) => ({
    id: uid(),
    text: e.text,
    start: e.time,
    end: entries[i + 1] ? entries[i + 1].time : e.time + 3,
    effect: 'line-fade',
    effectParams: {},
    font: null,        // null = プロジェクトのデフォルトを使う
    fontSize: null,
    color: null,
    x: 0.5,             // 0-1 正規化座標（中央=0.5）
    y: 0.5,
    textStyle: 'none',   // 文字デザイン（none/grid/scanlines/glitch等）
    textStyleParams: {},
  }));
}

export function parsePlainText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  return lines.map((l, i) => ({
    id: uid(),
    text: l,
    start: i * 3,
    end: i * 3 + 2.8,
    effect: 'line-fade',
    effectParams: {},
    font: null,
    fontSize: null,
    color: null,
    x: 0.5,
    y: 0.5,
    textStyle: 'none',
    textStyleParams: {},
  }));
}

export function parseLyricsAuto(text) {
  if (isLrcFormat(text)) return parseLrc(text);
  return parsePlainText(text);
}

// プロジェクトの歌詞配列 → LRC 文字列としてエクスポート
export function exportLrc(lyrics) {
  function fmt(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const ms = Math.floor((t - Math.floor(t)) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }
  return lyrics
    .slice()
    .sort((a, b) => a.start - b.start)
    .map(l => `[${fmt(l.start)}]${l.text}`)
    .join('\n');
}

export { uid };
