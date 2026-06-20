// components/RightPanel.js
const { useState } = React;
import { listEffects, getEffect } from '../effects/index.js';
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

  const effectDef = getEffect(line.effect);

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
          {effectDef.params.map(param => (
            <div className="field" key={param.key}>
              <label>
                {param.label}
                {param.type === 'range' && (
                  <span className="range-val">{line.effectParams[param.key] ?? param.default}</span>
                )}
              </label>
              {param.type === 'range' && (
                <input
                  type="range"
                  min={param.min} max={param.max} step={param.step}
                  value={line.effectParams[param.key] ?? param.default}
                  onChange={(e) => patchParams(param.key, Number(e.target.value))}
                />
              )}
              {param.type === 'select' && (
                <select
                  value={line.effectParams[param.key] ?? param.default}
                  onChange={(e) => patchParams(param.key, e.target.value)}
                >
                  {param.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
