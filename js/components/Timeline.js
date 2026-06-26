// components/Timeline.js
const { useRef, useState, useMemo, useEffect } = React;
import { fmtTime, clamp } from '../uiUtils.js';
import { uid } from '../lyricsParser.js';

const ROW_H = 30;

export function Timeline({ project, updateProject, currentTime, setCurrentTime, setIsPlaying, selectedLineId, setSelectedLineId, duration }) {
  const [pxPerSec, setPxPerSec] = useState(60);
  const scrollRef = useRef(null);
  const dragState = useRef(null);

  // 複数選択のためのID集合（Setをstateで管理する代わりにRefで持ち、強制再描画は別stateで行う）
  const selectedIdsRef = useRef(new Set(selectedLineId ? [selectedLineId] : []));
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate(n => n + 1);

  // 外部（右パネルの削除ボタン等）からselectedLineIdが変わった場合に同期する
  useEffect(() => {
    if (!selectedLineId) {
      selectedIdsRef.current = new Set();
    } else if (!selectedIdsRef.current.has(selectedLineId)) {
      selectedIdsRef.current = new Set([selectedLineId]);
    }
    rerender();
  }, [selectedLineId]);

  // ラバーバンド選択用のstate
  const [rubberBand, setRubberBand] = useState(null); // { startX, startY, curX, curY }
  const rubberBandRef = useRef(null);

  const totalWidth = Math.max(duration * pxPerSec + 200, 800);

  const rows = useMemo(() => {
    const sorted = [...project.lyrics].sort((a, b) => a.start - b.start);
    const lanes = [];
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

  // 複数行をまとめてパッチする
  function patchLinesByIds(ids, patchFn) {
    updateProject(p => ({
      ...p,
      lyrics: p.lyrics.map(l => ids.has(l.id) ? { ...l, ...patchFn(l) } : l),
    }));
  }

  function onBlockMouseDown(e, line, mode) {
    e.stopPropagation();

    const isShift = e.shiftKey || e.metaKey || e.ctrlKey;
    let nextIds;

    if (mode !== 'move') {
      // リサイズハンドルは常に単一選択で操作する
      nextIds = new Set([line.id]);
    } else if (isShift) {
      // Shift/Cmd/Ctrl+クリック：追加選択 or 選択解除
      nextIds = new Set(selectedIdsRef.current);
      if (nextIds.has(line.id)) {
        nextIds.delete(line.id);
      } else {
        nextIds.add(line.id);
      }
    } else if (selectedIdsRef.current.has(line.id) && selectedIdsRef.current.size > 1) {
      // 既に複数選択中の行をクリック：選択は維持してドラッグ開始
      nextIds = selectedIdsRef.current;
    } else {
      // 通常クリック：単体選択に切り替え
      nextIds = new Set([line.id]);
    }

    selectedIdsRef.current = nextIds;
    // 右パネル表示用に「最後にクリックした行」を通知する
    setSelectedLineId(nextIds.has(line.id) ? line.id : (nextIds.size > 0 ? [...nextIds][0] : null));
    rerender();

    // ドラッグ開始のスナップショット（選択中の全行の元のstart/end）
    const origPositions = {};
    for (const id of nextIds) {
      const l = project.lyrics.find(l => l.id === id);
      if (l) origPositions[id] = { start: l.start, end: l.end };
    }

    const startX = e.clientX;
    dragState.current = { mode, id: line.id, startX, origPositions, ids: new Set(nextIds), moved: false };
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
      // 複数行をまとめて移動：各行の元の位置にdtを加算する
      updateProject(p => ({
        ...p,
        lyrics: p.lyrics.map(l => {
          if (!ds.ids.has(l.id)) return l;
          const orig = ds.origPositions[l.id];
          if (!orig) return l;
          const len = orig.end - orig.start;
          const newStart = clamp(orig.start + dt, 0, duration - len);
          return { ...l, start: newStart, end: newStart + len };
        }),
      }));
    } else if (ds.mode === 'l') {
      const orig = ds.origPositions[ds.id];
      if (orig) updateProject(p => ({ ...p, lyrics: p.lyrics.map(l => l.id === ds.id ? { ...l, start: clamp(orig.start + dt, 0, orig.end - 0.1) } : l) }));
    } else if (ds.mode === 'r') {
      const orig = ds.origPositions[ds.id];
      if (orig) updateProject(p => ({ ...p, lyrics: p.lyrics.map(l => l.id === ds.id ? { ...l, end: clamp(orig.end + dt, orig.start + 0.1, duration) } : l) }));
    }
  }

  function onDragUp() {
    dragState.current = null;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragUp);
  }

  function onRulerClick(e) {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const containerRect = scrollEl.getBoundingClientRect();
    const x = (e.clientX - containerRect.left) + scrollEl.scrollLeft;
    setIsPlaying(false);
    setCurrentTime(xToTime(x));
  }

  // ラバーバンド選択（背景をドラッグ）
  function onLinesMouseDown(e) {
    // 歌詞ブロック・ハンドル以外（背景・レーン行）からのドラッグを受け付ける
    const tgt = e.target;
    const isBlock = tgt.classList.contains('lyric-block') || tgt.classList.contains('handle');
    if (isBlock) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const containerRect = scrollEl.getBoundingClientRect();
    const RULER_H = 22;

    // スクロールコンテナ内の絶対座標で計算する
    const startX = (e.clientX - containerRect.left) + scrollEl.scrollLeft;
    const startY = (e.clientY - containerRect.top) + scrollEl.scrollTop - RULER_H;

    rubberBandRef.current = { startX, startY, curX: startX, curY: startY };
    setRubberBand({ ...rubberBandRef.current });

    function onMove(e2) {
      const curX = (e2.clientX - containerRect.left) + scrollEl.scrollLeft;
      const curY = (e2.clientY - containerRect.top) + scrollEl.scrollTop - RULER_H;
      rubberBandRef.current = { ...rubberBandRef.current, curX, curY };
      setRubberBand({ ...rubberBandRef.current });
    }
    function onUp() {
      const rb = rubberBandRef.current;
      if (rb) {
        const rbLeft = Math.min(rb.startX, rb.curX);
        const rbRight = Math.max(rb.startX, rb.curX);
        const rbTop = Math.min(rb.startY, rb.curY);
        const rbBottom = Math.max(rb.startY, rb.curY);
        const hitIds = new Set();
        // 最小限の移動（ほぼクリック）の場合はラバーバンド選択しない
        if (Math.abs(rb.curX - rb.startX) > 5 || Math.abs(rb.curY - rb.startY) > 5) {
          for (const line of rows.placed) {
            const blockLeft = timeToX(line.start);
            const blockRight = timeToX(line.end);
            const blockTop = line.lane * ROW_H;
            const blockBottom = blockTop + ROW_H;
            if (blockLeft < rbRight && blockRight > rbLeft && blockTop < rbBottom && blockBottom > rbTop) {
              hitIds.add(line.id);
            }
          }
        }
        if (hitIds.size > 0) {
          selectedIdsRef.current = hitIds;
          setSelectedLineId([...hitIds][0]);
          rerender();
        } else {
          // 単なる背景クリックは選択解除
          selectedIdsRef.current = new Set();
          setSelectedLineId(null);
          rerender();
        }
      }
      setRubberBand(null);
      rubberBandRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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
      textStyle: 'none', textStyleParams: {},
    };
    updateProject(p => ({ ...p, lyrics: [...p.lyrics, newLine] }));
    setSelectedLineId(newLine.id);
    selectedIdsRef.current = new Set([newLine.id]);
    rerender();
  }

  function deleteSelected() {
    const ids = selectedIdsRef.current;
    if (!ids.size) return;
    updateProject(p => ({ ...p, lyrics: p.lyrics.filter(l => !ids.has(l.id)) }));
    selectedIdsRef.current = new Set();
    setSelectedLineId(null);
    rerender();
  }

  const ticks = [];
  const tickStep = pxPerSec >= 80 ? 1 : pxPerSec >= 30 ? 5 : 10;
  for (let t = 0; t <= duration; t += tickStep) {
    ticks.push(t);
  }

  const selectedIds = selectedIdsRef.current;
  const selectedCount = selectedIds.size;

  return (
    <div className="timeline-wrap">
      <div className="timeline-toolbar">
        <button className="btn small" onClick={addLineAtPlayhead}>+ 現在位置に行を追加</button>
        <button className="btn small danger" onClick={deleteSelected} disabled={!selectedCount}>
          {selectedCount > 1 ? `選択行を削除 (${selectedCount}件)` : '選択行を削除'}
        </button>
        {selectedCount > 1 && (
          <span style={{ fontSize: 12, color: 'var(--accent)', marginLeft: 4 }}>
            {selectedCount}件選択中 — Shiftクリックで追加選択、ドラッグでまとめて移動
          </span>
        )}
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
            style={{ height: rows.laneCount * ROW_H, width: totalWidth, position: 'relative' }}
            onMouseDown={onLinesMouseDown}
          >
            {Array.from({ length: rows.laneCount }).map((_, i) => (
              <div key={i} className="timeline-row" />
            ))}
            {rows.placed.map(line => (
              <div
                key={line.id}
                className={`lyric-block ${selectedIds.has(line.id) ? 'selected' : ''}`}
                style={{
                  left: timeToX(line.start),
                  width: Math.max(timeToX(line.end - line.start), 10),
                  top: line.lane * ROW_H + 4,
                }}
                onMouseDown={(e) => onBlockMouseDown(e, line, 'move')}
                onClick={(e) => e.stopPropagation()}
                title={line.text}
              >
                <div className="handle l" onMouseDown={(e) => { e.stopPropagation(); onBlockMouseDown(e, line, 'l'); }} />
                {line.text}
                <div className="handle r" onMouseDown={(e) => { e.stopPropagation(); onBlockMouseDown(e, line, 'r'); }} />
              </div>
            ))}
            {rubberBand && (() => {
              const rb = rubberBand;
              const left = Math.min(rb.startX, rb.curX);
              const top = Math.min(rb.startY, rb.curY);
              const width = Math.abs(rb.curX - rb.startX);
              const height = Math.abs(rb.curY - rb.startY);
              return (
                <div style={{
                  position: 'absolute', pointerEvents: 'none', zIndex: 20,
                  left, top, width, height,
                  border: '1.5px solid var(--accent)',
                  background: 'rgba(110,231,183,0.12)',
                  borderRadius: 3,
                }} />
              );
            })()}
            <div className="playhead" style={{ left: timeToX(currentTime), height: rows.laneCount * ROW_H }} />
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-2)', padding: '4px 12px' }}>
        Shift/Cmd+クリックで追加選択 ／ 背景エリアをドラッグで範囲選択
      </div>
    </div>
  );
}
