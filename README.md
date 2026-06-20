# 歌詞動画メーカー（Lyric Video Maker）

音楽と歌詞から、グリーンバック背景の歌詞動画（MP4）を作成するブラウザアプリです。
サーバー不要・ブラウザだけで完結します（IndexedDBでプロジェクトを保存）。

## 使い方

1. `index.html` をダブルクリックせず、**簡易Webサーバー経由で開いてください**（`fetch`でJSファイルを読み込むため、`file://` では動きません）。

   例：このフォルダで以下のいずれかを実行してから `http://localhost:8000` を開く。
   ```bash
   # Python がある場合
   python3 -m http.server 8000

   # Node.js がある場合
   npx serve .
   ```

2. 「+ 新規プロジェクト」からプロジェクトを作成。
3. 左パネルで音楽ファイル（または音楽付きの映像ファイル）を読み込み、歌詞（LRC形式 または 1行1フレーズのプレーンテキスト）を貼り付け。
   - mp4 / mov などの映像ファイルを読み込んだ場合は、自動的に音声トラックだけを抽出して使用します（抽出には映像の長さと同じくらいの時間がかかります）。
4. 左パネルの「背景の種類」で、単色（グリーンバック）／画像／動画から選択できます。
   - 画像・動画を選んだ場合は、その場でファイルを読み込んで背景として合成した状態で書き出せます（外部の動画編集ソフトでの透過合成が不要になります）。
   - 「背景の合わせ方」で、画面に対する拡大・余白の扱いを選べます。
   - 背景動画が曲より短い場合は「ループ再生する」のチェックで繰り返し表示するかを選べます。
4. 下部タイムラインで各行のブロックをドラッグ／端をリサイズして表示タイミングを調整。
   - 「+ 現在位置に行を追加」で新しい行を追加できます。
   - ブロックをクリックすると右パネルでその行の詳細設定ができます。
5. 右パネルで、行ごとに「表示方法（エフェクト）」「表示位置」「フォント・色」を設定。
6. 上部「動画を書き出す」から MP4（または WebM）として書き出し。
   - MP4書き出しは「リアルタイム録画 → ffmpeg.wasmでMP4変換」の2段階のため、楽曲の長さ＋変換時間がかかります。

## アーキテクチャ

- **UI**: React 18（CDN版）+ Babel Standalone（ブラウザ上でJSXをその場でトランスパイル）
  - ビルドツールなしで動かすため、`js/boot.js` が独自の簡易モジュールローダーとして
    各 `.js` ファイルを fetch → Babel変換（CommonJS化）→ 簡易 `require`/`module.exports` 環境で実行します。
- **保存**: IndexedDB（`js/storage.js`）。音楽ファイルは Blob のままプロジェクトと一緒に保存されます。
- **描画**: Canvas 2D（`js/renderer.js`）。プレビューと書き出しの両方で同じ描画ロジックを共有します。
- **書き出し**: `js/videoExport.js`
  - Canvas の `captureStream(fps)` + 音声の `MediaStreamDestination` を `MediaRecorder` で録画（WebM）。
  - `ffmpeg.wasm`（CDN経由）で WebM → MP4 に変換。

## 表示方法（エフェクト）を追加する方法

`js/effects/` に新しいファイルを作り、以下の形式で `registerEffect()` を呼ぶだけで、
自動的に右パネルの「表示方法」一覧に追加されます。

```js
// js/effects/myNewEffect.js
import { registerEffect } from './registry.js';

registerEffect({
  id: 'my-new-effect',          // 一意なID
  label: '私の新しいエフェクト',   // UIに表示される名前
  params: [                      // 行ごとに調整できるパラメータ（任意）
    { key: 'speed', label: '速度', type: 'range', min: 0.1, max: 5, step: 0.1, default: 1 },
  ],
  draw(ctx, p) {
    // p.text, p.progress(0-1), p.duration, p.canvasW, p.canvasH,
    // p.x, p.y（0-1正規化座標）, p.font, p.fontSize, p.color, p.params
    // ctx は通常の CanvasRenderingContext2D
  },
});
```

最後に `js/effects/index.js` に1行 `import './myNewEffect.js';` を追加し、
`js/boot.js` の `FILES` 配列にもパスを追加してください（依存関係解決のため、
`effects/index.js` より前の行に追加します）。

## 既知の制約

- MP4変換（ffmpeg.wasm）は処理が重く、長い楽曲では時間がかかります。急ぎの場合はWebM出力を選んでください。
- 録画は実時間と同じ時間がかかります（3分の曲なら録画に約3分）。
- `file://` で直接開くとブラウザのセキュリティ制限で `fetch` が失敗するため、必ずローカルサーバー経由で開いてください。
