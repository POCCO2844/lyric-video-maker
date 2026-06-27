// boot.js — ブラウザ上で JSX + ES Modules を動かすための簡易ローダー。
// 各 .js ファイルを fetch → Babel で CommonJS に変換 → 簡易 require/module.exports 環境で実行する。
// ビルドツールが使えない実行環境向けの仕組み。

const FILES = [
  'js/effects/registry.js',
  'js/effects/utils.js',
  'js/effects/lineFade.js',
  'js/effects/charRotate.js',
  'js/effects/charJitter.js',
  'js/effects/charScalePulse.js',
  'js/effects/fullscreenFlow.js',
  'js/effects/charScatterRotate.js',
  'js/effects/centerToCorners.js',
  'js/effects/flyInFromAllDirections.js',
  'js/effects/circleRotate.js',
  'js/effects/rectanglePatrol.js',
  'js/effects/charSliceAssemble.js',
  'js/effects/matrixReveal.js',
  'js/effects/textOrientation.js',
  'js/effects/index.js',
  'js/effects/textStyleRegistry.js',
  'js/effects/textStyles/gridPattern.js',
  'js/effects/textStyles/scanlines.js',
  'js/effects/textStyles/glitch.js',
  'js/effects/textStyles/dotPattern.js',
  'js/effects/textStyles/videoTexture.js',
  'js/effects/textStyles/index.js',
  'js/storage.js',
  'js/lyricsParser.js',
  'js/uiUtils.js',
  'js/renderer.js',
  'js/videoExport.js',
  'js/components/NumberField.js',
  'js/components/LeftPanel.js',
  'js/components/RightPanel.js',
  'js/components/Preview.js',
  'js/components/Timeline.js',
  'js/components/ExportModal.js',
  'js/components/Home.js',
  'js/components/Editor.js',
  'js/App.js',
  'js/main.js',
];

const moduleCache = new Map(); // path -> exports object

function resolvePath(fromPath, relPath) {
  // fromPath 例: 'js/components/Editor.js', relPath 例: '../storage.js'
  const fromDir = fromPath.split('/').slice(0, -1);
  const parts = relPath.split('/');
  const stack = [...fromDir];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}

async function loadModule(path) {
  if (moduleCache.has(path)) return moduleCache.get(path).exports;

  const res = await fetch('./' + path);
  if (!res.ok) throw new Error(`ファイルの読み込みに失敗しました: ${path}`);
  const source = await res.text();

  const transformed = Babel.transform(source, {
    presets: [['react', { runtime: 'classic' }]],
    plugins: ['transform-modules-commonjs'],
    filename: path,
    sourceType: 'module',
  }).code;

  const mod = { exports: {} };
  moduleCache.set(path, mod);

  const localRequire = (relPath) => {
    if (!relPath.startsWith('.')) {
      throw new Error(`外部パッケージの require は未対応です: ${relPath} (in ${path})`);
    }
    const resolved = resolvePath(path, relPath);
    const cached = moduleCache.get(resolved);
    if (!cached) {
      throw new Error(`モジュールが事前ロードされていません: ${resolved} (from ${path})。FILES 配列の順序を確認してください。`);
    }
    return cached.exports;
  };

  // eslint-disable-next-line no-new-func
  const fn = new Function('module', 'exports', 'require', 'React', 'ReactDOM', transformed);
  fn(mod, mod.exports, localRequire, window.React, window.ReactDOM);

  return mod.exports;
}

(async () => {
  try {
    for (const file of FILES) {
      await loadModule(file);
    }
  } catch (e) {
    console.error(e);
    document.getElementById('root').innerHTML =
      '<div style="padding:40px;color:#f17171;font-family:sans-serif;white-space:pre-wrap">起動エラー:\n' + (e.message || e) + '</div>';
  }
})();
