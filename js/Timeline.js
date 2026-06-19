// components/Timeline.js
const { useRef, useState, useMemo } = React;
import { fmtTime, clamp } from '../uiUtils.js';
import { uid } from '../lyricsParser.js';

const ROW_H = 30;

export function Timeline({ project, updateProject, currentTime, setCurrentTime, setIsPlaying, selectedLineId, setSelectedLineId, duration }) {
  const [pxPerSec, setPxPerSec] = useState(60);
  const scrollRef = useRef(null);
  const dragState = useRef(null);
  const justDraggedRef = useRef(false);

  const totalWidth = Math.max(duration * pxPerSec + 200, 800);

  // 行を縦に並べる（重なっている行は別の行に振り分ける）
  const rows = useMemo(() => {
    const sorted = [...project.lyrics].sort((a, b) => a.start - b.start);
    const lanes = []; // 各レーンの最後のend
    const placed = [];
    for (const line of sorted) {
      let laneIdx = lanes.findIndex(end => end <= line.start + 0.001);
      if (laneIdx === -1) { laneIdx = lanes.length; lanes.push(0); }
      lanes[laneIdx] = line.end;
      placed.push({ ...line, lane: laneIdx });
    }
    const laneCount = Math.max(lanes.length, 1);
    return { placed, laneCount };
  }, [project.lyrics]);

  function timeToX(t) { return t * pxPerSec; }
  function xToTime(x) { return clamp(x / pxPerSec, 0, duration); }

  function patchLineById(id, patch) {
    updateProject(p => ({
      ...p,
      lyrics: p.lyrics.map(l => l.id === id ? { ...l, ...patch } : l),
    }));
  }

  function onBlockMouseDown(e, line, mode) {
    e.stopPropagation();
    console.log('[DEBUG] onBlockMouseDown', line.id, mode);
    setSelectedLineId(line.id);
    const startX = e.clientX;
    const origStart = line.start;
    const origEnd = line.end;
    dragState.current = { mode, id: line.id, startX, origStart, origEnd, moved: false };
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragUp);
  }

  function onDragMove(e) {
    const ds = dragState.current;
    if (!ds) return;
    const dx = e.clientX - ds.startX;
    if (Math.abs(dx) > 2) ds.moved = true;
    const dt = dx / pxPerSec;
    if (ds.mode === 'move') {
      const len = ds.origEnd - ds.origStart;
      let newStart = clamp(ds.origStart + dt, 0, duration - len);
      patchLineById(ds.id, { start: newStart, end: newStart + len });
    } else if (ds.mode === 'l') {
      let newStart = clamp(ds.origStart + dt, 0, ds.origEnd - 0.1);
      patchLineById(ds.id, { start: newStart });
    } else if (ds.mode === 'r') {
      let newEnd = clamp(ds.origEnd + dt, ds.origStart + 0.1, duration);
      patchLineById(ds.id, { end: newEnd });
    }
  }

  function onDragUp() {
    // ドラッグ直後に発火する親要素の click イベントで選択解除されないよう、
    // 1フレーム分だけ「ドラッグ直後フラグ」を立てておく
    if (dragState.current) {
      justDraggedRef.current = true;
      setTimeout(() => { justDraggedRef.current = false; }, 0);
    }
    dragState.current = null;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragUp);
  }

  function onRulerClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollLeft = scrollRef.current?.scrollLeft || 0;
    const x = e.clientX - rect.left + scrollLeft;
    setIsPlaying(false);
    setCurrentTime(xToTime(x));
  }

  function addLineAtPlayhead() {
    const newLine = {
      id: uid(),
      text: '新しい歌詞',
      start: currentTime,
      end: Math.min(currentTime + 2.5, duration),
      effect: 'line-fade',
      effectParams: {},
      font: null, fontSize: null, color: null,
      x: 0.5, y: 0.5,
    };
    updateProject(p => ({ ...p, lyrics: [...p.lyrics, newLine] }));
    setSelectedLineId(newLine.id);
  }

  function deleteSelected() {
    if (!selectedLineId) return;
    updateProject(p => ({ ...p, lyrics: p.lyrics.filter(l => l.id !== selectedLineId) }));
    setSelectedLineId(null);
  }

  // 目盛り生成
  const ticks = [];
  const tickStep = pxPerSec >= 80 ? 1 : pxPerSec >= 30 ? 5 : 10;
  for (let t = 0; t <= duration; t += tickStep) {
    ticks.push(t);
  }

  return (
    <div className="timeline-wrap">
      <div className="timeline-toolbar">
        <button className="btn small" onClick={addLineAtPlayhead}>+ 現在位置に行を追加</button>
        <button className="btn small danger" onClick={deleteSelected} disabled={!selectedLineId}>選択行を削除</button>
        <div className="zoom">
          ズーム
          <input type="range" min={20} max={200} value={pxPerSec} onChange={(e) => setPxPerSec(Number(e.target.value))} style={{ width: 100 }} />
        </div>
      </div>
      <div className="timeline-scroll" ref={scrollRef}>
        <div className="timeline-track" style={{ width: totalWidth }}>
          <div className="timeline-ruler" onClick={onRulerClick} style={{ width: totalWidth }}>
            {ticks.map(t => (
              <div key={t} className="tick" style={{ left: timeToX(t) }}>{fmtTime(t).slice(0, 5)}</div>
            ))}
          </div>
          <div
            className="timeline-lines"
            style={{ height: rows.laneCount * ROW_H, width: totalWidth }}
            onClick={(e) => {
              // 背景（行・レーン自体）がクリックされた場合のみ選択解除する。
              // 歌詞ブロックやそのハンドルがクリックされた場合は currentTarget 自身ではないので除外。
              console.log('[DEBUG] timeline-lines onClick. target===currentTarget?', e.target === e.currentTarget, e.target.className);
              if (e.target === e.currentTarget) {
                setSelectedLineId(null);
              }
            }}
          >
            {Array.from({ length: rows.laneCount }).map((_, i) => (
              <div key={i} className="timeline-row" />
            ))}
            {rows.placed.map(line => (
              <div
                key={line.id}
                className={`lyric-block ${selectedLineId === line.id ? 'selected' : ''}`}
                style={{
                  left: timeToX(line.start),
                  width: Math.max(timeToX(line.end - line.start), 10),
                  top: line.lane * ROW_H + 4,
                }}
                onMouseDown={(e) => onBlockMouseDown(e, line, 'move')}
                onClick={(e) => e.stopPropagation()}
                title={line.text}
              >
                <div className="handle l" onMouseDown={(e) => onBlockMouseDown(e, line, 'l')} />
                {line.text}
                <div className="handle r" onMouseDown={(e) => onBlockMouseDown(e, line, 'r')} />
              </div>
            ))}
            <div className="playhead" style={{ left: timeToX(currentTime), height: rows.laneCount * ROW_H }} />
          </div>
        </div>
      </div>
    </div>
  );
}
