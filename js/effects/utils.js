// effects/utils.js — エフェクト共通ユーティリティ

// シード付き擬似乱数（行・文字ごとに毎フレーム同じ揺れ方をさせるため）
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function strSeed(str, extra = 0) {
  let h = extra;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h >>> 0;
}

// イージング
export const ease = {
  linear: t => t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  outBack: t => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inOutQuad: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  outElastic: t => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }

// 文字配列に分割（サロゲートペア対応）
export function toChars(text) {
  return [...text];
}

// テキストの各文字の幅を計測して配置用オフセットを返す
export function measureChars(ctx, chars, font, fontSize) {
  ctx.save();
  ctx.font = `${fontSize}px ${font}`;
  const widths = chars.map(c => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0);
  ctx.restore();
  return { widths, total };
}

export function setTextStyle(ctx, font, fontSize, color) {
  ctx.font = `${fontSize}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
}
