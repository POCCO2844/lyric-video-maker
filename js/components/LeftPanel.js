// components/LeftPanel.js
const { useRef, useState } = React;
import { parseLyricsAuto, exportLrc } from '../lyricsParser.js';

const FONT_OPTIONS = [
  { value: "'Noto Sans JP', sans-serif", label: 'Noto Sans JP（ゴシック）' },
  { value: "'Noto Serif JP', serif", label: 'Noto Serif JP（明朝）' },
  { value: "'M PLUS Rounded 1c', sans-serif", label: 'M PLUS Rounded 1c（丸ゴシック）' },
  { value: "'Kosugi Maru', sans-serif", label: 'Kosugi Maru' },
  { value: "'Shippori Mincho', serif", label: 'しっぽり明朝' },
  { value: "'Yusei Magic', sans-serif", label: 'Yusei Magic（手書き風）' },
  { value: "'Reggae One', sans-serif", label: 'Reggae One（インパクト）' },
  { value: "Impact, sans-serif", label: 'Impact（欧文）' },
  { value: "'Courier New', monospace", label: 'Courier New（等幅）' },
];

export function LeftPanel({ project, updateProject, onAudioLoaded }) {
  const audioInputRef = useRef(null);
  const lyricsFileInputRef = useRef(null);
  const [dragAudio, setDragAudio] = useState(false);
  const [lyricsText, setLyricsText] = useState(() => exportLrc(project.lyrics || []));

  async function handleAudioFile(file) {
    if (!file) return;
    const arrayBuf = await file.arrayBuffer();
    updateProject(p => ({ ...p, audioBlob: file, audioName: file.name }));
    onAudioLoaded(file);
  }

  function onAudioDrop(e) {
    e.preventDefault();
    setDragAudio(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleAudioFile(file);
  }

  function applyLyricsText(text) {
    setLyricsText(text);
    const parsed = parseLyricsAuto(text);
    // 既存の手動タイミングをできるだけ保持（テキストが一致する行はそのまま）
    updateProject(p => {
      const oldByText = new Map(p.lyrics.map(l => [l.text, l]));
      const merged = parsed.map(line => {
        const old = oldByText.get(line.text);
        return old ? { ...line, start: old.start, end: old.end, effect: old.effect, effectParams: old.effectParams, font: old.font, fontSize: old.fontSize, color: old.color, x: old.x, y: old.y } : line;
      });
      return { ...p, lyrics: merged };
    });
  }

  async function handleLyricsFile(file) {
    if (!file) return;
    const text = await file.text();
    applyLyricsText(text);
  }

  return (
    <div className="panel left">
      <div className="panel-section">
        <h2>音楽ファイル</h2>
        <div
          className={`dropzone ${dragAudio ? 'drag' : ''}`}
          onClick={() => audioInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragAudio(true); }}
          onDragLeave={() => setDragAudio(false)}
          onDrop={onAudioDrop}
        >
          クリックまたはドラッグ＆ドロップで音楽ファイルを読み込み（mp3 / wav / m4a 等）
          {project.audioName && <div className="fname">♪ {project.audioName}</div>}
        </div>
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={(e) => handleAudioFile(e.target.files?.[0])}
        />
      </div>

      <div className="panel-section">
        <h2>歌詞</h2>
        <div className="field">
          <label>LRC形式 または プレーンテキスト（1行＝1フレーズ）を貼り付け／読み込み</label>
          <textarea
            className="lyrics-input"
            value={lyricsText}
            onChange={(e) => applyLyricsText(e.target.value)}
            placeholder={"[00:12.50]最初の歌詞\n[00:15.80]次の歌詞\n\n…または タイミングなしのプレーンテキストでもOK"}
          />
        </div>
        <div className="field-row">
          <button className="btn small" onClick={() => lyricsFileInputRef.current?.click()}>ファイルから読み込み</button>
          <button className="btn small" onClick={() => {
            const blob = new Blob([exportLrc(project.lyrics)], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${project.name || 'lyrics'}.lrc`; a.click();
            setTimeout(() => URL.revokeObjectURL(url), 3000);
          }}>LRCとして出力</button>
        </div>
        <input
          ref={lyricsFileInputRef}
          type="file"
          accept=".lrc,.txt"
          style={{ display: 'none' }}
          onChange={(e) => handleLyricsFile(e.target.files?.[0])}
        />
      </div>

      <div className="panel-section">
        <h2>プロジェクト全体設定</h2>
        <div className="field">
          <label>解像度</label>
          <div className="field-row">
            <select
              value={`${project.settings.width}x${project.settings.height}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split('x').map(Number);
                updateProject(p => ({ ...p, settings: { ...p.settings, width: w, height: h } }));
              }}
            >
              <option value="1920x1080">1920×1080（16:9 フルHD）</option>
              <option value="1280x720">1280×720（16:9 HD）</option>
              <option value="1080x1080">1080×1080（1:1 正方形）</option>
              <option value="1080x1920">1080×1920（9:16 縦型）</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>フレームレート (fps)</label>
          <select
            value={project.settings.fps}
            onChange={(e) => updateProject(p => ({ ...p, settings: { ...p.settings, fps: Number(e.target.value) } }))}
          >
            <option value={24}>24</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </div>
        <div className="field">
          <label>背景色（グリーンバック）</label>
          <input
            type="color"
            value={project.settings.bgColor}
            onChange={(e) => updateProject(p => ({ ...p, settings: { ...p.settings, bgColor: e.target.value } }))}
          />
        </div>
        <div className="field">
          <label>デフォルトフォント</label>
          <select
            value={project.settings.defaultFont}
            onChange={(e) => updateProject(p => ({ ...p, settings: { ...p.settings, defaultFont: e.target.value } }))}
          >
            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label>デフォルト文字サイズ (px)</label>
            <input
              type="number"
              value={project.settings.defaultFontSize}
              onChange={(e) => updateProject(p => ({ ...p, settings: { ...p.settings, defaultFontSize: Number(e.target.value) } }))}
            />
          </div>
          <div className="field">
            <label>デフォルト文字色</label>
            <input
              type="color"
              value={project.settings.defaultColor}
              onChange={(e) => updateProject(p => ({ ...p, settings: { ...p.settings, defaultColor: e.target.value } }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export { FONT_OPTIONS };
