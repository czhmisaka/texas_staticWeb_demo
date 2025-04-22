/*
 * @Date: 2025-04-22 15:48:07
 * @LastEditors: CZH
 * @LastEditTime: 2025-04-22 16:41:23
 * @FilePath: /texas-holdem/ai/ai-core.js
 */
import { TexasHoldemAI as EvaluationAI } from './ai-evaluation.js';
import { TexasHoldemAI as StrategyAI } from './ai-strategy.js';

export class TexasHoldemAI extends StrategyAI {
    constructor(game, playerIndex) {
        super(game, playerIndex);
        // 保留EvaluationAI的功能
        this.evaluationAI = new EvaluationAI(game, playerIndex);
    }

    // 保留EvaluationAI的方法
    getHandStrength() {
        return this.evaluationAI.getHandStrength();
    }

    makeDecision() {
        const handStrength = this.getHandStrength();
        const currentBet = this.game.currentBet;
        const potSize = this.game.pot;
        const playerChips = this.player.chips;
        const round = this.game.round;

        let decision;
        switch (this.personality) {
            case 'aggressive':
                decision = this.aggressiveStrategy(handStrength);
                break;
            case 'conservative':
                decision = this.conservativeStrategy(handStrength);
                break;
            case 'bluffer':
                decision = this.blufferStrategy(handStrength);
                break;
            default:
                decision = this.randomStrategy(handStrength);
        }

        // 调整决策以适应游戏状态
        if (decision.action === 'raise' && decision.amount > playerChips) {
            decision = { action: 'all-in', amount: playerChips };
        } else if (decision.action === 'call' && currentBet > playerChips) {
            decision = { action: 'all-in', amount: playerChips };
        }

        return decision;
    }

    updateBluffChance(bluffSuccess) {
        if (bluffSuccess) {
            this.bluffChance = Math.min(0.5, this.bluffChance * 1.2);
        } else {
            this.bluffChance = Math.max(0.05, this.bluffChance * 0.8);
        }
    }

    adjustPersonalityBasedOnGameState() {
        const stackRatio = this.player.chips / this.game.averageStack;
        if (stackRatio < 0.5) {
            this.personality = 'aggressive';
        } else if (stackRatio > 2) {
            this.personality = 'conservative';
        }
    }
}
