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
 * @param {Function} def.fillText - (ctx, text, px, py, baseColor, t, params) => void
 *        通常の ctx.fillText(text, px, py) の代わりに呼ばれる、文字を実際に描く関数。
 *        t は 0〜1 ではなく「経過秒数」（アニメーションに使う）。
 */
export function registerTextStyle(def) {
  if (!def.id || !def.fillText) throw new Error('textStyle には id と fillText が必要です');
  textStyles.set(def.id, def);
}

export function getTextStyle(id) {
  if (!id || id === 'none') return null;
  return textStyles.get(id) || null;
}

export function listTextStyles() {
  return [...textStyles.values()];
}
