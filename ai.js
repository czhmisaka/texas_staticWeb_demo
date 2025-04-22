/*
 * @Date: 2025-04-21 12:54:45
 * @LastEditors: CZH
 * @LastEditTime: 2025-04-22 16:37:59
 * @FilePath: /texas-holdem/ai.js
 */
import { TexasHoldemAI as CoreAI } from './ai/ai-core.js';

// 导出默认的TexasHoldemAI类
export default class TexasHoldemAI extends CoreAI {
    constructor(game, playerIndex) {
        super(game, playerIndex);
    }

    // 保留特殊方法或覆盖
    getEmotionalFeedback() {
        if (!this.lastAction) return "🤔 思考中...";

        const strength = this.calculateHandStrength();
        const randomEmoji = Math.random();

        if (this.lastAction === 'fold') {
            return randomEmoji < 0.3 ? "😤 不跟了！" :
                randomEmoji < 0.6 ? "😒 没意思" : "🙄 过";
        } else if (this.lastAction === 'call') {
            if (strength > 0.7) {
                return randomEmoji < 0.5 ? "😏 跟注钓鱼" : "😉 放长线";
            } else {
                return randomEmoji < 0.5 ? "😐 跟一手" : "🤨 看看";
            }
        } else if (this.lastAction === 'raise') {
            if (strength > 0.7) {
                return randomEmoji < 0.5 ? "😎 加注收割" : "🤑 这局稳了";
            } else if (strength > 0.4) {
                return randomEmoji < 0.5 ? "😈 虚张声势" : "😼 吓吓你";
            } else {
                return randomEmoji < 0.5 ? "🤡 纯诈唬" : "🎭 演技时刻";
            }
        }

        return "🤫 保持沉默";
    }
}
