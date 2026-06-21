// effects/textStyles/index.js — 全ての「文字デザイン」をここでまとめてインポート（登録）する
// 新しい文字デザインを追加する場合は、textStyles/ に新規ファイルを作り、ここに1行 import を足すだけでよい。

import './gridPattern.js';
import './scanlines.js';
import './glitch.js';

export { registerTextStyle, getTextStyle, listTextStyles } from '../textStyleRegistry.js';
