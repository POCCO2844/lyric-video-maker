// components/Preview.js
const { useRef, useEffect, useState } = React;
import { LyricRenderer } from '../renderer.js';
import { fmtTime, computeTotalDuration } from '../uiUtils.js';

export function Preview({ project, audioBuffer, currentTime, setCurrentTime, isPlaying, setIsPlaying }) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const playStartRef = useRef(0);
  const playStartTimeRef = useRef(0);
  const rafRef = useRef(null);
  const wrapRef = useRef(null);
  const [wrapSize, setWrapSize] = useState({ w: 800, h: 460 });

  // 背景動画があり、かつループOFFの場合はその長さを上限にする。
  // 背景動画の長さ取得は非同期（メタデータ読み込み待ち）なので state で保持する。
  const [duration, setDuration] = useState(() => computeTotalDuration({
    audioDuration: audioBuffer ? audioBuffer.duration : 0,
    lyrics: project.lyrics,
    settings: project.settings,
    bgVideoDuration: null,
  }));

  // プレビュー領域のサイズ変化を監視し、キャンバスのサイズ計算に使う
  useEffect(() => {
    if (!wrapRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setWrapSize({ w: width, h: height });
      }
    });
    obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bgVideoDuration = rendererRef.current ? await rendererRef.current.getBgVideoDuration() : null;
      if (cancelled) return;
      setDuration(computeTotalDuration({
        audioDuration: audioBuffer ? audioBuffer.duration : 0,
        lyrics: project.lyrics,
        settings: project.settings,
        bgVideoDuration,
      }));
    })();
    return () => { cancelled = true; };
  }, [audioBuffer, project.lyrics, project.settings.bgType, project.settings.bgVideoBlob, project.settings.bgVideoLoop]);

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

  // プレビュー領域の実際のサイズ（wrapSizeで追跡）から、アスペクト比を保ったサイズを計算する。
  // transport（再生コントロール）分として80pxを引いた高さを最大値とする。
  const maxH = Math.max(wrapSize.h - 80, 100);
  const maxW = Math.max(wrapSize.w - 32, 100); // padding分を引く
  const byHeight = maxH * aspect;
  const previewW = Math.round(Math.min(byHeight, maxW));
  const previewH = Math.round(previewW / aspect);

  return (
    <div className="preview-wrap" ref={wrapRef}>
      <div
        className="preview-canvas-box"
        style={{ width: previewW, height: previewH }}
      >
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
