// effects/textStyleRegistry.js — 「文字デザイン」（格子柄・スキャンライン・グリッチ等）のレジストリ。
// 動きエフェクト（registry.js）とは独立した別レイヤー。
// 動きエフェクトが「いつ・どこに・どう文字を配置するか」を決め、
// 文字デザインは「その文字を実際にどう塗るか（質感）」を決める。

const textStyles = new Map();

/**
 * @param {Object} def
 * @param {string} def.id - 一意のID
 * @param {string} def.label - UI表示名
 * @param {Array}  def.params - [{key,label,type,default,...}]
 * @param {Function} def.applyToCanvas
 *        (offCtx, w, h, t, params, fontSize, baseColor) => void
 *        動きエフェクトが描き終えたオフスクリーンCanvas（文字のみ、背景なし・透明）に対して
 *        文字デザインを適用する関数。
 *        「文字ピクセルの内側だけにパターンを重ねる」には source-atop を使う。
 *        t は経過秒数（アニメーションに使う）。
 */
export function registerTextStyle(def) {
  if (!def.id || !def.applyToCanvas) throw new Error('textStyle には id と applyToCanvas が必要です');
  textStyles.set(def.id, def);
}

export function getTextStyle(id) {
  if (!id || id === 'none') return null;
  return textStyles.get(id) || null;
}

export function listTextStyles() {
  return [...textStyles.values()];
}
