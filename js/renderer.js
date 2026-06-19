// renderer.js — Canvas に現在時刻の歌詞を描画する共通エンジン（プレビューと録画の両方で使う）
import { getEffect } from './effects/index.js';

export class LyricRenderer {
  constructor(canvas, project) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.project = project;
  }

  setProject(project) {
    this.project = project;
  }

  // 現在時刻 t（秒）における映像を1フレーム描画する
  renderFrame(t) {
    const { ctx, canvas, project } = this;
    const { settings, lyrics } = project;

    // 背景（グリーンバック）
    ctx.fillStyle = settings.bgColor || '#00FF00';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const line of lyrics) {
      if (t < line.start || t > line.end) continue;
      const duration = Math.max(line.end - line.start, 0.0001);
      const progress = Math.min(Math.max((t - line.start) / duration, 0), 1);
      const effect = getEffect(line.effect);
      const font = line.font || settings.defaultFont;
      const fontSize = line.fontSize || settings.defaultFontSize;
      const color = line.color || settings.defaultColor;

      try {
        effect.draw(ctx, {
          text: line.text,
          progress,
          duration,
          canvasW: canvas.width,
          canvasH: canvas.height,
          x: line.x ?? 0.5,
          y: line.y ?? 0.5,
          font,
          fontSize,
          color,
          params: line.effectParams || {},
        });
      } catch (e) {
        console.error('エフェクト描画エラー:', line.effect, e);
      }
    }
  }
}
