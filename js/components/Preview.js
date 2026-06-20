// components/Preview.js
const { useRef, useEffect, useState } = React;
import { LyricRenderer } from '../renderer.js';
import { fmtTime } from '../uiUtils.js';

export function Preview({ project, audioBuffer, currentTime, setCurrentTime, isPlaying, setIsPlaying }) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const playStartRef = useRef(0);
  const playStartTimeRef = useRef(0);
  const rafRef = useRef(null);

  const duration = audioBuffer ? audioBuffer.duration : Math.max(...project.lyrics.map(l => l.end), 10);

  useEffect(() => {
    if (canvasRef.current) {
      if (rendererRef.current) rendererRef.current.dispose();
      canvasRef.current.width = project.settings.width;
      canvasRef.current.height = project.settings.height;
      rendererRef.current = new LyricRenderer(canvasRef.current, project);
    }
  }, [project.settings.width, project.settings.height]);

  // コンポーネントのアンマウント時にも後始末する
  useEffect(() => {
    return () => { if (rendererRef.current) rendererRef.current.dispose(); };
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setProject(project);
      if (!isPlaying) {
        // 停止中：背景動画があれば指定時刻にシークしてから描画する
        rendererRef.current.syncBgVideo(currentTime).then(() => {
          rendererRef.current.renderFrame(currentTime);
        });
      }
      // 再生中の描画は tick() ループ側が担当する（ここでは行わない）
    }
  }, [project, currentTime, isPlaying]);

  // 再生制御
  useEffect(() => {
    if (!isPlaying) {
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch (e) {}
        sourceRef.current = null;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (audioBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(ctx.destination);
      src.start(0, currentTime);
      sourceRef.current = src;
      src.onended = () => {};
    }
    playStartRef.current = currentTime;
    playStartTimeRef.current = performance.now();

    function tick() {
      const elapsed = (performance.now() - playStartTimeRef.current) / 1000;
      const t = playStartRef.current + elapsed;
      if (t >= duration) {
        setCurrentTime(duration);
        setIsPlaying(false);
        return;
      }
      if (rendererRef.current) {
        rendererRef.current.syncBgVideo(t, { live: true }); // 非同期だが結果を待たずに描画を進める（動画は自走再生）
        rendererRef.current.renderFrame(t);
      }
      setCurrentTime(t);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch (e) {}
        sourceRef.current = null;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line
  }, [isPlaying]);

  const aspect = project.settings.width / project.settings.height;

  return (
    <div className="preview-wrap">
      <div className="preview-canvas-box" style={{ aspectRatio: `${aspect}`, width: aspect >= 1 ? '90%' : 'auto', height: aspect < 1 ? '85%' : 'auto' }}>
        <canvas ref={canvasRef} />
      </div>
      <div className="transport">
        <button className="btn icon" onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="btn icon small" onClick={() => { setIsPlaying(false); setCurrentTime(0); }}>⏮</button>
        <div className="time">{fmtTime(currentTime)} / {fmtTime(duration)}</div>
        <input
          type="range" min={0} max={duration} step={0.01}
          value={currentTime}
          onChange={(e) => { setIsPlaying(false); setCurrentTime(Number(e.target.value)); }}
        />
      </div>
    </div>
  );
}
