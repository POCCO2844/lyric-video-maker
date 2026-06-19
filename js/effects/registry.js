// effects/registry.js — 表示方法（エフェクト）のレジストリ
// 新しいエフェクトを足すには registerEffect() を呼ぶだけでよい。

const effects = new Map();

/**
 * @param {Object} def
 * @param {string} def.id - 一意のID
 * @param {string} def.label - UI表示名
 * @param {Array}  def.params - [{key,label,type:'number'|'select'|'color'|'range',default,min,max,step,options}]
 * @param {Function} def.draw - (ctx, {text, progress, canvasW, canvasH, x, y, font, fontSize, color, params}) => void
 *        progress: 0(開始)〜1(終了) の経過割合
 */
export function registerEffect(def) {
  if (!def.id || !def.draw) throw new Error('effect には id と draw が必要です');
  effects.set(def.id, def);
}

export function getEffect(id) {
  return effects.get(id) || effects.get('line-fade');
}

export function listEffects() {
  return [...effects.values()];
}
