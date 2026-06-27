// components/RightPanel.js
const { useState } = React;
import { listEffects, getEffect } from '../effects/index.js';
import { listTextStyles, getTextStyle } from '../effects/textStyles/index.js';
import { FONT_OPTIONS } from './LeftPanel.js';
import { fmtTime, clamp } from '../uiUtils.js';
import { NumberField } from './NumberField.js';

export function RightPanel({ project, selectedLineId, updateProject, currentTime, setCurrentTime }) {
  const line = project.lyrics.find(l => l.id === selectedLineId);
  const effects = listEffects();

  if (!line) {
    return (
      <div className="panel right">
        <h2>行の設定</h2>
        <div className="empty-hint">下のタイムラインから歌詞の行を選択すると、ここで表示方法やタイミングを設定できます。</div>
      </div>
    );
  }

  function patchLine(patch) {
    updateProject(p => ({
      ...p,
      lyrics: p.lyrics.map(l => l.id === line.id ? { ...l, ...patch } : l),
    }));
  }

  function patchParams(key, value) {
    patchLine({ effectParams: { ...line.effectParams, [key]: value } });
  }

  function patchTextStyleParams(key, value) {
    patchLine({ textStyleParams: { ...(line.textStyleParams || {}), [key]: value } });
  }

  // 動きエフェクト・文字デザイン共通のパラメータ入力UIをレンダリングする
  function renderParamField(param, currentParams, onChangeParam) {
    return (
      <div className="field" key={param.key}>
        <label>
          {param.label}
          {param.type === 'range' && (
            <span className="range-val">{currentParams[param.key] ?? param.default}</span>
          )}
        </label>
        {param.type === 'range' && (
          <input
            type="range"
            min={param.min} max={param.max} step={param.step}
            value={currentParams[param.key] ?? param.default}
            onChange={(e) => onChangeParam(param.key, Number(e.target.value))}
          />
        )}
        {param.type === 'select' && (
          <select
            value={currentParams[param.key] ?? param.default}
            onChange={(e) => onChangeParam(param.key, e.target.value)}
          >
            {param.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {param.type === 'color' && (
          <input
            type="color"
            value={currentParams[param.key] ?? param.default}
            onChange={(e) => onChangeParam(param.key, e.target.value)}
          />
        )}
      </div>
    );
  }

  const effectDef = getEffect(line.effect);
  const textStyles = listTextStyles();
  const textStyleDef = getTextStyle(line.textStyle);

  return (
    <div className="panel right">
      <div className="panel-section">
        <h2>歌詞テキスト</h2>
        <div className="field">
          <textarea
            style={{ minHeight: 50 }}
            value={line.text}
            onChange={(e) => patchLine({ text: e.target.value })}
          />
        </div>
      </div>

      <div className="panel-section">
        <h2>表示タイミング</h2>
        <div className="field-row">
          <div className="field">
            <label>開始 ({fmtTime(line.start)})</label>
            <NumberField
              value={Number(line.start.toFixed(2))}
              step="0.01"
              onCommit={(n) => patchLine({ start: Math.min(n, line.end - 0.05) })}
            />
          </div>
          <div className="field">
            <label>終了 ({fmtTime(line.end)})</label>
            <NumberField
              value={Number(line.end.toFixed(2))}
              step="0.01"
              onCommit={(n) => patchLine({ end: Math.max(n, line.start + 0.05) })}
            />
          </div>
        </div>
        <div className="field-row">
          <button className="btn small" onClick={() => patchLine({ start: currentTime })}>現在位置を開始に設定</button>
          <button className="btn small" onClick={() => patchLine({ end: currentTime })}>現在位置を終了に設定</button>
        </div>
      </div>

      <div className="panel-section">
        <h2>表示位置</h2>
        <div className="field-row">
          <div className="field">
            <label>X位置 ({Math.round(line.x * 100)}%)</label>
            <input type="range" min="0" max="1" step="0.01" value={line.x} onChange={(e) => patchLine({ x: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label>Y位置 ({Math.round(line.y * 100)}%)</label>
            <input type="range" min="0" max="1" step="0.01" value={line.y} onChange={(e) => patchLine({ y: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <div className="panel-section">
        <h2>フォント・色（未指定時は全体設定を使用）</h2>
        <div className="field">
          <label>フォント</label>
          <select value={line.font || ''} onChange={(e) => patchLine({ font: e.target.value || null })}>
            <option value="">（全体設定を使用）</option>
            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label>文字サイズ</label>
            <NumberField
              value={line.fontSize || ''}
              placeholder="全体設定を使用"
              allowEmpty
              onCommit={(n) => patchLine({ fontSize: n })}
            />
          </div>
          <div className="field">
            <label>文字色</label>
            <input
              type="color"
              value={line.color || project.settings.defaultColor}
              onChange={(e) => patchLine({ color: e.target.value })}
            />
          </div>
        </div>
        {line.color && (
          <button className="btn small ghost" onClick={() => patchLine({ color: null })}>色を全体設定に戻す</button>
        )}
      </div>

      <div className="panel-section">
        <h2>表示方法</h2>
        <div className="effect-grid">
          {effects.map(ef => (
            <button
              key={ef.id}
              className={`effect-opt ${line.effect === ef.id ? 'active' : ''}`}
              onClick={() => patchLine({ effect: ef.id, effectParams: {} })}
            >
              {ef.label}
            </button>
          ))}
        </div>
      </div>

      {effectDef.params && effectDef.params.length > 0 && (
        <div className="panel-section">
          <h2>エフェクト詳細パラメータ</h2>
          {effectDef.params.map(param => renderParamField(param, line.effectParams, patchParams))}
        </div>
      )}

      <div className="panel-section">
        <h2>文字デザイン（任意）</h2>
        <div className="effect-grid">
          <button
            className={`effect-opt ${!line.textStyle || line.textStyle === 'none' ? 'active' : ''}`}
            onClick={() => patchLine({ textStyle: 'none', textStyleParams: {} })}
          >
            なし（通常の文字）
          </button>
          {textStyles.map(ts => (
            <button
              key={ts.id}
              className={`effect-opt ${line.textStyle === ts.id ? 'active' : ''}`}
              onClick={() => patchLine({ textStyle: ts.id, textStyleParams: {} })}
            >
              {ts.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 8 }}>
          表示方法（動き）とは独立して、文字そのものの質感を変えられます。組み合わせて使えます。
        </div>
      </div>

      {textStyleDef && textStyleDef.params && textStyleDef.params.length > 0 && (
        <div className="panel-section">
          <h2>文字デザイン詳細パラメータ</h2>
          {textStyleDef.params.map(param => renderParamField(param, line.textStyleParams || {}, patchTextStyleParams))}
        </div>
      )}

      {line.textStyle === 'video-texture' && (
        <div className="panel-section">
          <h2>テキスト用メディアファイル</h2>

          {/* 動画アップロード */}
          <div className="field">
            <label>動画ファイル（優先使用）</label>
            <div
              className="dropzone"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file'; input.accept = 'video/*';
                input.onchange = (e) => {
                  const file = e.target.files?.[0];
                  if (file) patchLine({ textStyleVideoBlob: file, textStyleVideoName: file.name });
                };
                input.click();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith('video/')) patchLine({ textStyleVideoBlob: file, textStyleVideoName: file.name });
              }}
            >
              {line.textStyleVideoName
                ? <div className="fname">🎬 {line.textStyleVideoName}</div>
                : <>クリックまたはD&Dで動画を読み込み<br/><span style={{fontSize:11,color:'var(--ink-2)'}}>未設定の場合はプロジェクトの背景動画を使用</span></>
              }
            </div>
            {line.textStyleVideoName && (
              <button className="btn small ghost" style={{marginTop:4}} onClick={() => patchLine({ textStyleVideoBlob: null, textStyleVideoName: '' })}>動画を削除</button>
            )}
          </div>

          {/* 動画プレビュー */}
          {line.textStyleVideoBlob && (
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--ink-1)', display: 'block', marginBottom: 4 }}>動画プレビュー（文字に貼られる内容）</label>
              <video
                key={line.textStyleVideoName}
                src={URL.createObjectURL(line.textStyleVideoBlob)}
                muted autoPlay loop playsInline
                style={{ width: '100%', maxHeight: 100, objectFit: 'contain', background: '#000', borderRadius: 4 }}
              />
            </div>
          )}

          {/* 画像アップロード（動画がない場合に使用） */}
          <div className="field">
            <label>画像ファイル（動画がない場合に使用）</label>
            <div
              className="dropzone"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file'; input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = e.target.files?.[0];
                  if (file) patchLine({ textStyleImageBlob: file, textStyleImageName: file.name });
                };
                input.click();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith('image/')) patchLine({ textStyleImageBlob: file, textStyleImageName: file.name });
              }}
            >
              {line.textStyleImageName
                ? <div className="fname">🖼 {line.textStyleImageName}</div>
                : 'クリックまたはD&Dで画像を読み込み（jpg / png 等）'
              }
            </div>
            {line.textStyleImageName && (
              <button className="btn small ghost" style={{marginTop:4}} onClick={() => patchLine({ textStyleImageBlob: null, textStyleImageName: '' })}>画像を削除</button>
            )}
          </div>

          {/* 画像プレビュー */}
          {line.textStyleImageBlob && (
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--ink-1)', display: 'block', marginBottom: 4 }}>画像プレビュー（文字に貼られる内容）</label>
              <img
                key={line.textStyleImageName}
                src={URL.createObjectURL(line.textStyleImageBlob)}
                alt="テクスチャプレビュー"
                style={{ width: '100%', maxHeight: 100, objectFit: 'contain', background: '#000', borderRadius: 4 }}
              />
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 4 }}>
            ヒント：スケール・オフセットを調整して文字に見せたい部分を合わせてください。動画は上の動画プレビュー、画像は画像プレビューで確認できます。
          </div>
        </div>
      )}
    </div>
  );
}
