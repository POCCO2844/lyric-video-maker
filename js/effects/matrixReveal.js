// effects/matrixReveal.js — マトリックス系エフェクト（3パターン）
import { registerEffect } from './registry.js';
import { clamp, toChars, measureChars, strSeed, mulberry32 } from './utils.js';

const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';

function getRainChar(seed) {
  const rng = mulberry32(seed);
  return MATRIX_CHARS[Math.floor(rng() * MATRIX_CHARS.length)];
}

// ─────────────────────────────────────────────────────────
// パターン1（既存）: 表示位置で文字が降り、最終的に正しい文字に落ち着く
// ─────────────────────────────────────────────────────────
registerEffect({
  id: 'matrix-reveal',
  label: 'マトリックス①（表示位置で文字が変化して確定）',
  params: [
    { key: 'revealRatio', label: '正しい文字が現れるタイミング（終わりからの割合）', type: 'range', min: 0.1, max: 0.6, step: 0.05, default: 0.3 },
    { key: 'rainSpeed', label: '文字が変化する速さ(回/秒)', type: 'range', min: 2, max: 30, step: 1, default: 12 },
    { key: 'rainColor', label: '降ってくる文字の色', type: 'color', default: '#00FF41' },
    { key: 'trailLength', label: '残像の長さ（文字数）', type: 'range', min: 0, max: 10, step: 1, default: 3 },
    { key: 'fadeOutRatio', label: 'フェードアウト割合', type: 'range', min: 0, max: 0.3, step: 0.01, default: 0.1 },
  ],
  draw(ctx, p) {
    const { text, progress, duration, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const revealRatio = params.revealRatio ?? 0.3;
    const rainSpeed = params.rainSpeed ?? 12;
    const rainColor = params.rainColor ?? '#00FF41';
    const trailLength = params.trailLength ?? 3;
    const fadeOutRatio = params.fadeOutRatio ?? 0.1;
    const elapsed = progress * duration;
    let alpha = 1;
    if (progress > 1 - fadeOutRatio) alpha = clamp((1 - progress) / fadeOutRatio, 0, 1);
    const chars = toChars(text);
    ctx.save();
    ctx.font = `${fontSize}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const { widths, total } = measureChars(ctx, chars, font, fontSize);
    const cx = x * canvasW;
    const cy = y * canvasH;
    const revealStart = 1 - revealRatio;
    const revealPerChar = revealRatio / Math.max(chars.length, 1);
    let charX = cx - total / 2;
    chars.forEach((ch, i) => {
      const charCenterX = charX + widths[i] / 2;
      const charRevealAt = revealStart + i * revealPerChar;
      const charConfirmed = progress >= charRevealAt;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (charConfirmed) {
        const confirmedT = clamp((progress - charRevealAt) / Math.max(revealPerChar, 0.01), 0, 1);
        ctx.fillStyle = confirmedT < 0.3 ? '#FFFFFF' : color;
        ctx.fillText(ch, charCenterX, cy);
      } else {
        const step = Math.floor(elapsed * rainSpeed + i * 7);
        ctx.fillStyle = rainColor;
        ctx.fillText(getRainChar(strSeed(text, step * 31 + i * 97)), charCenterX, cy);
        for (let t = 1; t <= trailLength; t++) {
          ctx.globalAlpha = alpha * (1 - t / (trailLength + 1)) * 0.7;
          ctx.fillStyle = rainColor;
          ctx.fillText(getRainChar(strSeed(text, (step - t) * 31 + i * 97)), charCenterX, cy - t * fontSize * 1.2);
        }
      }
      ctx.restore();
      charX += widths[i];
    });
    ctx.restore();
  },
});

// ─────────────────────────────────────────────────────────
// パターン2: 表示位置のみでランダムな文字が高速に切り替わり、確定時に白くフラッシュして正しい文字が残る（静止版）
// ─────────────────────────────────────────────────────────
registerEffect({
  id: 'matrix-fall-through',
  label: 'マトリックス②（表示位置でランダム文字→フラッシュして確定・静止版）',
  params: [
    { key: 'rainSpeed', label: '文字が変化する速さ(回/秒)', type: 'range', min: 2, max: 40, step: 1, default: 18 },
    { key: 'revealRatio', label: '正しい文字が現れるタイミング（終わりからの割合）', type: 'range', min: 0.05, max: 0.6, step: 0.05, default: 0.25 },
    { key: 'rainColor', label: '雨の文字の色', type: 'color', default: '#00FF41' },
    { key: 'glowColor', label: '確定時の発光色', type: 'color', default: '#FFFFFF' },
    { key: 'fadeInRatio', label: 'フェードイン割合', type: 'range', min: 0, max: 0.3, step: 0.01, default: 0.05 },
    { key: 'fadeOutRatio', label: 'フェードアウト割合', type: 'range', min: 0, max: 0.3, step: 0.01, default: 0.1 },
  ],
  draw(ctx, p) {
    const { text, progress, duration, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const rainSpeed = params.rainSpeed ?? 18;
    const revealRatio = params.revealRatio ?? 0.25;
    const rainColor = params.rainColor ?? '#00FF41';
    const glowColor = params.glowColor ?? '#FFFFFF';
    const fadeInRatio = params.fadeInRatio ?? 0.05;
    const fadeOutRatio = params.fadeOutRatio ?? 0.1;
    const elapsed = progress * duration;

    let alpha = 1;
    if (progress < fadeInRatio) alpha = progress / fadeInRatio;
    else if (progress > 1 - fadeOutRatio) alpha = (1 - progress) / fadeOutRatio;
    alpha = clamp(alpha, 0, 1);

    const chars = toChars(text);
    ctx.save();
    ctx.font = `${fontSize}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const { widths, total } = measureChars(ctx, chars, font, fontSize);
    const cx = x * canvasW;
    const cy = y * canvasH;

    const revealStart = 1 - revealRatio;
    const revealPerChar = revealRatio / Math.max(chars.length, 1);

    let charX = cx - total / 2;
    chars.forEach((ch, i) => {
      const charCenterX = charX + widths[i] / 2;
      const charRevealAt = revealStart + i * revealPerChar;
      const charConfirmed = progress >= charRevealAt;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (charConfirmed) {
        // 確定直後は発光色でフラッシュし、その後通常色に戻る
        const confirmedT = clamp((progress - charRevealAt) / Math.max(revealPerChar, 0.01), 0, 1);
        if (confirmedT < 0.15) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 20 * (1 - confirmedT / 0.15);
          ctx.fillStyle = glowColor;
        } else {
          ctx.fillStyle = color;
        }
        ctx.fillText(ch, charCenterX, cy);
      } else {
        // 高速にランダムな文字を切り替える（表示位置のみ、落下なし）
        const step = Math.floor(elapsed * rainSpeed + i * 13);
        ctx.fillStyle = rainColor;
        ctx.fillText(getRainChar(strSeed(text, step * 37 + i * 113)), charCenterX, cy);
      }
      ctx.restore();
      charX += widths[i];
    });
    ctx.restore();
  },
});

// ─────────────────────────────────────────────────────────
// パターン3（改）: 整列した文字列が上から降り、表示位置を通り過ぎて画面下まで落ちた後、
//                 最終的に表示位置に正しい文字が残る
// ─────────────────────────────────────────────────────────
registerEffect({
  id: 'matrix-in-place',
  label: 'マトリックス③（整列文字列が通過→表示位置に残る）',
  params: [
    { key: 'fallSpeed', label: '落下速度(px/秒)', type: 'range', min: 100, max: 1200, step: 50, default: 500 },
    { key: 'rainSpeed', label: 'ランダム文字の変化速さ(回/秒)', type: 'range', min: 2, max: 30, step: 1, default: 14 },
    { key: 'revealRatio', label: '正しい文字が残るタイミング（終わりからの割合）', type: 'range', min: 0.05, max: 0.4, step: 0.05, default: 0.2 },
    { key: 'trailLength', label: '残像の長さ（文字数）', type: 'range', min: 0, max: 12, step: 1, default: 5 },
    { key: 'rainColor', label: '雨の文字の色', type: 'color', default: '#00FF41' },
    { key: 'glowColor', label: '確定時の発光色', type: 'color', default: '#FFFFFF' },
    { key: 'fadeOutRatio', label: 'フェードアウト割合', type: 'range', min: 0, max: 0.3, step: 0.01, default: 0.1 },
  ],
  draw(ctx, p) {
    const { text, progress, duration, canvasW, canvasH, x, y, font, fontSize, color, params } = p;
    const fallSpeed = params.fallSpeed ?? 500;
    const rainSpeed = params.rainSpeed ?? 14;
    const revealRatio = params.revealRatio ?? 0.2;
    const trailLength = params.trailLength ?? 5;
    const rainColor = params.rainColor ?? '#00FF41';
    const glowColor = params.glowColor ?? '#FFFFFF';
    const fadeOutRatio = params.fadeOutRatio ?? 0.1;
    const elapsed = progress * duration;

    let alpha = 1;
    if (progress > 1 - fadeOutRatio) alpha = clamp((1 - progress) / fadeOutRatio, 0, 1);

    const chars = toChars(text);
    ctx.save();
    ctx.font = `${fontSize}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const { widths, total } = measureChars(ctx, chars, font, fontSize);

    const cx = x * canvasW;
    const cy = y * canvasH;

    // 確定タイミング（termination = 行の終わりからrevealRatioの割合）
    const revealStart = 1 - revealRatio;
    const revealPerChar = revealRatio / Math.max(chars.length, 1);

    // 各文字位置（X方向）に縦に落下する文字の列を描く
    // 「雨が降っているフェーズ」では、先頭文字が上から落ちてきて表示位置を通過して画面下まで落ちる。
    // 「確定フェーズ」では、表示位置に正しい文字が固定表示され、落下列は画面下に消えていく。
    let charX = cx - total / 2;
    chars.forEach((ch, i) => {
      const charCenterX = charX + widths[i] / 2;
      const charRevealAt = revealStart + i * revealPerChar;
      const charConfirmed = progress >= charRevealAt;

      ctx.save();

      // 落下フェーズ：文字ごとに少し遅れて上から落下し、画面下まで通り過ぎる
      const colDelay = i * 0.04 * duration;
      const colElapsed = Math.max(0, elapsed - colDelay);
      const headY = -fontSize + colElapsed * fallSpeed;

      if (headY >= -fontSize) {
        // 残像を含む落下列を描画（確定後も画面下まで継続）
        for (let t = 0; t < trailLength; t++) {
          const charY = headY - t * fontSize * 1.2;
          if (charY < -fontSize * 2 || charY > canvasH + fontSize) continue;
          const step = Math.floor(colElapsed * rainSpeed + t * 3 + i * 7);
          const trailAlpha = alpha * (1 - t / (trailLength + 1)) * (t === 0 ? 1 : 0.65);
          ctx.globalAlpha = trailAlpha;
          ctx.fillStyle = t === 0 ? '#FFFFFF' : rainColor;
          ctx.fillText(getRainChar(strSeed(text, step * 41 + i * 97 + t * 13)), charCenterX, charY);
        }
      }

      // 確定済み：表示位置に正しい文字を固定で上書き表示する（落下列の上に重ねる）
      if (charConfirmed) {
        const confirmedT = clamp((progress - charRevealAt) / Math.max(revealPerChar, 0.01), 0, 1);
        ctx.globalAlpha = alpha;
        if (confirmedT < 0.2) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 18 * (1 - confirmedT / 0.2);
          ctx.fillStyle = glowColor;
        } else {
          ctx.fillStyle = color;
        }
        ctx.fillText(ch, charCenterX, cy);
      }

      ctx.restore();
      charX += widths[i];
    });
    ctx.restore();
  },
});
