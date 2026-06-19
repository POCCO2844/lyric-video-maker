// components/ExportModal.js
const { useState } = React;
import { recordWebM, convertWebmToMp4, downloadBlob } from '../videoExport.js';

export function ExportModal({ project, audioBuffer, onClose }) {
  const [stage, setStage] = useState('idle'); // idle | recording | converting | done | error
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState('mp4');
  const [errorMsg, setErrorMsg] = useState('');

  async function startExport() {
    setStage('recording');
    setProgress(0);
    setErrorMsg('');
    try {
      const { webmBlob } = await recordWebM(project, audioBuffer, (ratio) => {
        setProgress(ratio);
      });

      if (format === 'webm') {
        downloadBlob(webmBlob, `${project.name || 'lyric-video'}.webm`);
        setStage('done');
        return;
      }

      setStage('converting');
      setProgress(0);
      const mp4Blob = await convertWebmToMp4(webmBlob, (ratio) => setProgress(ratio));
      downloadBlob(mp4Blob, `${project.name || 'lyric-video'}.mp4`);
      setStage('done');
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message || String(e));
      setStage('error');
    }
  }

  const stageLabel = {
    idle: '',
    recording: '映像を録画しています（実時間と同じ長さがかかります）…',
    converting: 'MP4に変換しています（少し時間がかかります）…',
    done: '書き出しが完了しました！',
    error: 'エラーが発生しました',
  }[stage];

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && stage !== 'recording' && stage !== 'converting') onClose(); }}>
      <div className="modal">
        <h3>動画を書き出す</h3>

        {stage === 'idle' && (
          <>
            <div className="field">
              <label>出力形式</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="mp4">MP4（推奨・変換に時間がかかります）</option>
                <option value="webm">WebM（高速・そのままダウンロード）</option>
              </select>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 10 }}>
              背景はグリーンバック（{project.settings.bgColor}）として書き出されます。
              解像度: {project.settings.width}×{project.settings.height} / {project.settings.fps}fps
            </div>
          </>
        )}

        {(stage === 'recording' || stage === 'converting') && (
          <>
            <div className="stage">{stageLabel}</div>
            <div className="progress-bar"><div className="fill" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
            <div className="stage">{Math.round(progress * 100)}%</div>
          </>
        )}

        {stage === 'done' && <div className="stage">完了しました。ダウンロードフォルダをご確認ください。</div>}
        {stage === 'error' && <div className="stage" style={{ color: 'var(--danger)' }}>{stageLabel}: {errorMsg}</div>}

        <div className="actions">
          {stage === 'idle' && <>
            <button className="btn ghost" onClick={onClose}>キャンセル</button>
            <button className="btn primary" onClick={startExport}>書き出し開始</button>
          </>}
          {(stage === 'done' || stage === 'error') && <button className="btn primary" onClick={onClose}>閉じる</button>}
        </div>
      </div>
    </div>
  );
}
