// components/Home.js
const { useState, useEffect } = React;
import { Storage, newProjectTemplate } from '../storage.js';

export function Home({ onOpenProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const list = await Storage.listProjects();
    setProjects(list);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function createNew() {
    const proj = newProjectTemplate('新しい歌詞動画');
    await Storage.saveProject(proj);
    onOpenProject(proj.id);
  }

  async function remove(e, id) {
    e.stopPropagation();
    if (!confirm('このプロジェクトを削除しますか？元に戻せません。')) return;
    await Storage.deleteProject(id);
    refresh();
  }

  function fmtDate(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  return (
    <div className="home">
      <h1>歌詞動画メーカー</h1>
      <div className="sub">音楽と歌詞からグリーンバックの歌詞動画（MP4）を作成します。</div>
      {loading ? (
        <div className="empty-hint">読み込み中…</div>
      ) : (
        <div className="proj-grid">
          <div className="proj-card new" onClick={createNew}>+ 新規プロジェクト</div>
          {projects.map(p => (
            <div className="proj-card" key={p.id} onClick={() => onOpenProject(p.id)}>
              <div className="name">{p.name}</div>
              <div className="meta">
                {p.lyrics?.length || 0} 行 ・ {p.audioName || '音楽未設定'}
                <br />更新: {fmtDate(p.updatedAt)}
              </div>
              <button className="btn small danger del" onClick={(e) => remove(e, p.id)}>削除</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
