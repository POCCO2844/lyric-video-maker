// effects/index.js — 全エフェクトをここでまとめてインポート（登録）する
// 新しいエフェクトを追加する場合は、effects/ に新規ファイルを作り、ここに1行 import を足すだけでよい。

import './lineFade.js';
import './charRotate.js';
import './charJitter.js';
import './charScalePulse.js';
import './fullscreenFlow.js';
import './charScatterRotate.js';
import './centerToCorners.js';
import './flyInFromAllDirections.js';
import './circleRotate.js';

export { registerEffect, getEffect, listEffects } from './registry.js';
