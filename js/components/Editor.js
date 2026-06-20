// components/Editor.js
const { useState, useEffect, useRef, useCallback } = React;
import { Storage, migrateProject } from '../storage.js';
import { LeftPanel } from './LeftPanel.js';
import { RightPanel } from './RightPanel.js';
import { Preview } from './Preview.js';
import { Timeline } from './Timeline.js';
import { ExportModal } from './ExportModal.js';
import { decodeAudioBlob } from '../uiUtils.js';

export function Editor({ projectId, onBackHome }) {
  const [project, setProject] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [saveState, setSaveState] = useState('saved');
  const saveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await Storage.getProject(projectId);
      if (cancelled || !p) return;
      const migrated = migrateProject(p);
      setProject(migrated);
      if (migrated.audioBlob) {
        try {
          const buf = await decodeAudioBlob(migrated.audioBlob);
          if (!cancelled) setAudioBuffer(buf);
        } catch (e) { console.error('音声デコード失敗', e); }
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const updateProject = useCallback((fn) => {
    setProject(prev => {
      const next = fn(prev);
      setSaveState('unsaved');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaveState('saving');
        await Storage.saveProject(next);
        setSaveState('saved');
      }, 600);
      return next;
    });
  }, []);

  async function onAudioLoaded(file) {
    try {
      const buf = await decodeAudioBlob(file);
      setAudioBuffer(buf);
    } catch (e) {
      console.error('音声デコード失敗', e);
      alert('この音声ファイルを読み込めませんでした。');
    }
  }

  if (!project) {
    return <div className="empty-hint">読み込み中…</div>;
  }

  const duration = Math.max(
    audioBuffer ? audioBuffer.duration : 0,
    ...project.lyrics.map(l => l.end),
    10
  );

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand"><span className="dot" /> 歌詞動画メーカー</div>
        <button className="btn ghost small" onClick={onBackHome}>← 一覧へ</button>
        <input
          className="proj-name"
          value={project.name}
          onChange={(e) => updateProject(p => ({ ...p, name: e.target.value }))}
        />
        <div className="spacer" />
        <div className="save-state">
          {saveState === 'saved' && '保存済み'}
          {saveState === 'unsaved' && '未保存の変更あり'}
          {saveState === 'saving' && '保存中…'}
        </div>
        <button className="btn primary" onClick={() => setShowExport(true)}>動画を書き出す</button>
      </div>

      <div className="editor">
        <LeftPanel project={project} updateProject={updateProject} onAudioLoaded={onAudioLoaded} />

        <Preview
          project={project}
          audioBuffer={audioBuffer}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
        />

        <RightPanel
          project={project}
          selectedLineId={selectedLineId}
          updateProject={updateProject}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
        />

        <Timeline
          project={project}
          updateProject={updateProject}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          setIsPlaying={setIsPlaying}
          selectedLineId={selectedLineId}
          setSelectedLineId={setSelectedLineId}
          duration={duration}
        />
      </div>

      {showExport && (
        <ExportModal
          project={project}
          audioBuffer={audioBuffer}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
