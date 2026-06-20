// components/LeftPanel.js
const { useRef, useState, useEffect } = React;
import { parseLyricsAuto, exportLrc } from '../lyricsParser.js';
import { extractAudioFromVideoFile, isVideoFile } from '../uiUtils.js';
import { NumberField } from './NumberField.js';

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
  const bgImageInputRef = useRef(null);
  const bgVideoInputRef = useRef(null);
  const [dragAudio, setDragAudio] = useState(false);
  const [dragBgImage, setDragBgImage] = useState(false);
  const [dragBgVideo, setDragBgVideo] = useState(false);
  const [lyricsText, setLyricsText] = useState(() => exportLrc(project.lyrics || []));
  const [audioExtracting, setAudioExtracting] = useState(false);
  const [audioLoadError, setAudioLoadError] = useState('');
  const lyricsTextareaRef = useRef(null);
  const isEditingLyricsRef = useRef(false); // テキストエリアにフォーカス中かどうか
  const lastSyncedLyricsRef = useRef(project.lyrics); // 最後にテキストエリアへ反映した時点のlyrics（自己更新ループ防止用）

  // project.lyrics がタイムライン操作（行の追加・削除・ドラッグでのタイミング変更等）で変わった時、
  // テキストエリアの表示内容も自動的に追従させる。
  // ただし、ユーザーが今まさにテキストエリアを編集中の場合は、入力中の内容を消さないよう同期しない。
  useEffect(() => {
    if (project.lyrics === lastSyncedLyricsRef.current) return; // このコンポーネント自身の更新による再呼び出しは無視
    if (isEditingLyricsRef.current) return; // 編集中は触らない
    setLyricsText(exportLrc(project.lyrics || []));
    lastSyncedLyricsRef.current = project.lyrics;
  }, [project.lyrics]);
  const isComposingRef = useRef(false); // IME変換中フラグ（日本語入力中の誤反映を防ぐ）

  async function handleAudioFile(file) {
    if (!file) return;
    setAudioLoadError('');
    try {
      if (isVideoFile(file)) {
        // 映像ファイルの場合は音声トラックだけを抽出する（動画の長さと同じ時間がかかる）
        setAudioExtracting(true);
        const audioBlob = await extractAudioFromVideoFile(file);
        const audioFile = new File([audioBlob], file.name.replace(/\.[^.]+$/, '') + ' (音声抽出).webm', { type: audioBlob.type });
        updateProject(p => ({ ...p, audioBlob: audioFile, audioName: `${file.name}（音声のみ抽出）` }));
        onAudioLoaded(audioFile);
      } else {
        updateProject(p => ({ ...p, audioBlob: file, audioName: file.name }));
        onAudioLoaded(file);
      }
    } catch (e) {
      console.error('音声の読み込みに失敗しました', e);
      setAudioLoadError('この映像/音声ファイルから音声を取り出せませんでした。別の形式（mp3, wav, mp4等）でお試しください。');
    } finally {
      setAudioExtracting(false);
    }
  }

  function onAudioDrop(e) {
    e.preventDefault();
    setDragAudio(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleAudioFile(file);
  }

  function handleBgImageFile(file) {
    if (!file) return;
    updateProject(p => ({ ...p, settings: { ...p.settings, bgImageBlob: file, bgImageName: file.name } }));
  }

  function handleBgVideoFile(file) {
    if (!file) return;
    updateProject(p => ({ ...p, settings: { ...p.settings, bgVideoBlob: file, bgVideoName: file.name } }));
  }


  function applyLyricsText(text) {
    setLyricsText(text);
    const parsed = parseLyricsAuto(text);
    // タイミング（start/end）はテキストエリア内のLRCタイムスタンプをそのまま信頼して使う
    // （ユーザーがテキストを直接編集してタイミングを変えた場合、それを正としたいため）。
    // 表示エフェクトやフォント等のスタイル設定だけは、同じ歌詞テキストの行から引き継ぐ。
    // 同一テキストが複数行ある場合は、出現順（n番目の同じ文言）で対応付けることで誤った混線を防ぐ。
    updateProject(p => {
      const oldLines = [...p.lyrics].sort((a, b) => a.start - b.start);
      const usedOldIds = new Set();
      const merged = parsed.map((line) => {
        const old = oldLines.find(o => !usedOldIds.has(o.id) && o.text === line.text);
        if (!old) return line;
        usedOldIds.add(old.id);
        return {
          ...line,
          id: old.id, // idも引き継ぐことで、選択中の行が編集後も選択され続けるようにする
          effect: old.effect,
          effectParams: old.effectParams,
          font: old.font,
          fontSize: old.fontSize,
          color: old.color,
          x: old.x,
          y: old.y,
        };
      });
      lastSyncedLyricsRef.current = merged; // この更新はテキストエリア起点なので、次のuseEffectでの再同期をスキップする
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
          onClick={() => !audioExtracting && audioInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragAudio(true); }}
          onDragLeave={() => setDragAudio(false)}
          onDrop={onAudioDrop}
          style={audioExtracting ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
        >
          クリックまたはドラッグ＆ドロップで音楽・映像ファイルを読み込み
          <br />（mp3 / wav / m4a / mp4 / mov 等。映像ファイルの場合は音声だけを取り出します）
          {audioExtracting && <div className="fname">⏳ 音声を抽出しています…（映像の長さと同じくらい時間がかかります）</div>}
          {!audioExtracting && project.audioName && <div className="fname">♪ {project.audioName}</div>}
        </div>
        {audioLoadError && (
          <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{audioLoadError}</div>
        )}
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*,video/*"
          style={{ display: 'none' }}
          onChange={(e) => handleAudioFile(e.target.files?.[0])}
        />
      </div>

      <div className="panel-section">
        <h2>歌詞</h2>
        <div className="field">
          <label>LRC形式 または プレーンテキスト（1行＝1フレーズ）を貼り付け／読み込み</label>
          <textarea
            ref={lyricsTextareaRef}
            className="lyrics-input"
            value={lyricsText}
            onFocus={() => { isEditingLyricsRef.current = true; }}
            onCompositionStart={() => { isComposingRef.current = true; }}
            onCompositionEnd={(e) => {
              isComposingRef.current = false;
              applyLyricsText(e.target.value);
            }}
            onBlur={() => {
              isEditingLyricsRef.current = false;
              // フォーカスが外れたら、念のため最新のプロジェクトの歌詞でテキスト表示を同期し直す
              // （編集中にタイムライン側で行が追加・削除されていた場合の取りこぼし防止）。
              setLyricsText(exportLrc(project.lyrics || []));
              lastSyncedLyricsRef.current = project.lyrics;
            }}
            onChange={(e) => {
              if (isComposingRef.current) {
                // IME変換中はプロジェクトへの反映を止め、表示だけ更新する（変換途中の文字でパースが走らないようにするため）
                setLyricsText(e.target.value);
                return;
              }
              applyLyricsText(e.target.value);
            }}
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
          <label>背景の種類</label>
          <select
            value={project.settings.bgType || 'color'}
            onChange={(e) => updateProject(p => ({ ...p, settings: { ...p.settings, bgType: e.target.value } }))}
          >
            <option value="color">単色（グリーンバック等）</option>
            <option value="image">画像</option>
            <option value="video">動画</option>
          </select>
        </div>

        {(!project.settings.bgType || project.settings.bgType === 'color') && (
          <div className="field">
            <label>背景色（グリーンバック）</label>
            <input
              type="color"
              value={project.settings.bgColor}
              onChange={(e) => updateProject(p => ({ ...p, settings: { ...p.settings, bgColor: e.target.value } }))}
            />
          </div>
        )}

        {project.settings.bgType === 'image' && (
          <div className="field">
            <label>背景画像</label>
            <div
              className={`dropzone ${dragBgImage ? 'drag' : ''}`}
              onClick={() => bgImageInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragBgImage(true); }}
              onDragLeave={() => setDragBgImage(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragBgImage(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleBgImageFile(file);
              }}
            >
              クリックまたはドラッグ＆ドロップで背景画像を読み込み（jpg / png 等）
              {project.settings.bgImageName && <div className="fname">🖼 {project.settings.bgImageName}</div>}
            </div>
            <input
              ref={bgImageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleBgImageFile(e.target.files?.[0])}
            />
          </div>
        )}

        {project.settings.bgType === 'video' && (
          <div className="field">
            <label>背景動画</label>
            <div
              className={`dropzone ${dragBgVideo ? 'drag' : ''}`}
              onClick={() => bgVideoInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragBgVideo(true); }}
              onDragLeave={() => setDragBgVideo(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragBgVideo(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleBgVideoFile(file);
              }}
            >
              クリックまたはドラッグ＆ドロップで背景動画を読み込み（mp4 / webm 等）
              {project.settings.bgVideoName && <div className="fname">🎬 {project.settings.bgVideoName}</div>}
            </div>
            <input
              ref={bgVideoInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => handleBgVideoFile(e.target.files?.[0])}
            />
            <div className="field" style={{ marginTop: 8 }}>
              <label>
                <input
                  type="checkbox"
                  checked={project.settings.bgVideoLoop !== false}
                  onChange={(e) => updateProject(p => ({ ...p, settings: { ...p.settings, bgVideoLoop: e.target.checked } }))}
                  style={{ marginRight: 6 }}
                />
                曲より背景動画が短い場合はループ再生する
              </label>
            </div>
          </div>
        )}

        {(project.settings.bgType === 'image' || project.settings.bgType === 'video') && (
          <div className="field">
            <label>背景の合わせ方</label>
            <select
              value={project.settings.bgFit || 'cover'}
              onChange={(e) => updateProject(p => ({ ...p, settings: { ...p.settings, bgFit: e.target.value } }))}
            >
              <option value="cover">画面いっぱいに拡大（はみ出た部分はカット）</option>
              <option value="contain">全体が収まるように表示（余白は黒）</option>
              <option value="stretch">画面サイズに引き伸ばす</option>
            </select>
          </div>
        )}
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
            <NumberField
              value={project.settings.defaultFontSize}
              onCommit={(n) => updateProject(p => ({ ...p, settings: { ...p.settings, defaultFontSize: n } }))}
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
