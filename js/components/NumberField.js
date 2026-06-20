// components/NumberField.js
// 制御された number input でキーボード入力が弾かれる問題を避けるための共通コンポーネント。
//
// 通常の <input type="number" value={x} onChange={...Number(e.target.value)}> は、
// 入力途中の文字列（空文字、桁の打ち直し途中など）を即座に Number() 変換して親に反映してしまうと、
// 親から返ってくる value で入力中の状態が上書きされ、矢印ボタン以外でのキーボード入力が
// 打ち消されたように見える不具合を起こすことがある。
//
// このコンポーネントは、入力中はローカルの文字列stateを表示用に保持し、
// 値が数値として妥当な時だけ親の onCommit を呼ぶ。フォーカスが外れた時（blur）には
// 親から渡された実際の値に表示を同期し直す。
const { useState, useEffect } = React;

export function NumberField({ value, onCommit, min, max, step, placeholder, style, allowEmpty = false }) {
  const [text, setText] = useState(value === null || value === undefined ? '' : String(value));

  // 親側の値（他の操作で変わった場合等）が変わったら表示を同期する。
  // ただしユーザーが今まさに編集中の場合に上書きしないよう、フォーカスが外れている前提の用途を想定。
  useEffect(() => {
    setText(value === null || value === undefined ? '' : String(value));
  }, [value]);

  function handleChange(e) {
    const raw = e.target.value;
    setText(raw);
    if (raw === '') {
      // allowEmpty な用途（例：「未指定=全体設定を使う」）では、空欄を null として即座に確定する。
      if (allowEmpty) onCommit(null);
      return;
    }
    if (raw === '-') return; // マイナス記号だけ打った直後は確定しない
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      onCommit(n);
    }
  }

  function handleBlur() {
    // 空のまま・不正な値のままフォーカスが外れたら、親の現在値に表示を戻す
    // （allowEmpty な場合、空欄はそれ自体が正当な確定値なのでそのままにする）
    if (text === '' && allowEmpty) return;
    if (text === '' || Number.isNaN(Number(text))) {
      setText(value === null || value === undefined ? '' : String(value));
    }
  }

  return (
    <input
      type="number"
      value={text}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      style={style}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
