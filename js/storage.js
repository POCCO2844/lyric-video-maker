// storage.js — IndexedDB によるプロジェクトの永続化
// プロジェクト = { id, name, createdAt, updatedAt, audioBlob, audioName, lyrics, settings }

const DB_NAME = 'lyric-video-db';
const DB_VERSION = 1;
const STORE = 'projects';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode) {
  const t = db.transaction(STORE, mode);
  return t.objectStore(STORE);
}

export const Storage = {
  async listProjects() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const store = tx(db, 'readonly');
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        items.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getProject(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = tx(db, 'readonly').get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async saveProject(project) {
    const db = await openDB();
    project.updatedAt = Date.now();
    if (!project.createdAt) project.createdAt = project.updatedAt;
    if (!project.id) project.id = 'proj_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    return new Promise((resolve, reject) => {
      const req = tx(db, 'readwrite').put(project);
      req.onsuccess = () => resolve(project);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteProject(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = tx(db, 'readwrite').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
};

export function newProjectTemplate(name = '新しいプロジェクト') {
  return {
    id: null,
    name,
    createdAt: null,
    updatedAt: null,
    audioBlob: null,      // Blob
    audioName: '',
    audioDuration: 0,
    lyrics: [],           // [{ id, text, start, end, effect, effectParams, font, fontSize, color, x, y }]
    settings: {
      width: 1920,
      height: 1080,
      fps: 30,
      bgColor: '#00FF00',  // グリーンバック（背景タイプが color の場合のみ使用）
      defaultFont: "'Noto Sans JP', sans-serif",
      defaultFontSize: 64,
      defaultColor: '#FFFFFF',
      // 背景設定
      bgType: 'color',      // 'color' | 'image' | 'video'
      bgImageBlob: null,    // Blob（bgType='image'のとき使用）
      bgImageName: '',
      bgVideoBlob: null,    // Blob（bgType='video'のとき使用）
      bgVideoName: '',
      bgVideoLoop: true,    // 曲より背景動画が短い場合にループするか
      bgFit: 'cover',        // 'cover' | 'contain' | 'stretch'
    },
  };
}

// 古い形式で保存されたプロジェクト（背景設定フィールドが無いもの等）を
// 現在のテンプレートで不足分だけ補完する。
export function migrateProject(project) {
  const template = newProjectTemplate();
  return {
    ...template,
    ...project,
    settings: {
      ...template.settings,
      ...(project.settings || {}),
    },
  };
}
