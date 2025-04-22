export class TexasHoldemAI {
    constructor(game, playerIndex) {
        this.game = game;
        this.playerIndex = playerIndex;
        this.player = game.players[playerIndex];
        this.personality = this.player?.personality || 'random';
        this.bluffChance = 0.2;
    }

    aggressiveStrategy(handStrength) {
        const randomFactor = Math.random();
        const adjustedBluffChance = this.bluffChance * 1.5;

        if (handStrength > 0.7) {
            const raiseAmount = Math.min(
                this.player.chips,
                Math.max(this.game.bigBlind * 5, Math.floor(this.game.pot * 0.75))
            );
            return { action: 'raise', amount: raiseAmount };
        } else if (handStrength > 0.5) {
            if (randomFactor < 0.8) {
                const raiseAmount = Math.min(
                    this.player.chips,
                    Math.max(this.game.bigBlind * 2, Math.floor(this.game.pot * 0.4))
                );
                return { action: 'raise', amount: raiseAmount };
            } else {
                return { action: 'call' };
            }
        } else if (handStrength > 0.2 && this.game.currentBet < this.player.chips * 0.4) {
            if (randomFactor < adjustedBluffChance) {
                const bluffAmount = Math.min(
                    this.player.chips,
                    Math.max(this.game.bigBlind * 2, Math.floor(this.game.pot * 0.3))
                );
                return { action: 'raise', amount: bluffAmount };
            } else {
                return { action: 'call' };
            }
        } else if (handStrength > 0.1 && this.game.currentBet <= this.game.bigBlind) {
            return { action: 'call' };
        } else {
            return { action: 'fold' };
        }
    }

    conservativeStrategy(handStrength) {
        if (handStrength > 0.5) {
            const raiseAmount = Math.min(
                this.player.chips,
                Math.max(this.game.bigBlind * 2, Math.floor(this.game.pot * 0.3))
            );
            return { action: 'raise', amount: raiseAmount };
        } else if (handStrength > 0.25) {
            if (this.game.currentBet <= this.game.bigBlind * 6) {
                return { action: 'call' };
            } else if (handStrength > 0.35) {
                return { action: 'call' };
            }
        } else if (handStrength > 0.1 && this.game.currentBet <= this.game.bigBlind * 2) {
            return { action: 'call' };
        } else if (this.game.currentBet === 0) {
            return { action: 'check' };
        }
        return { action: 'fold' };
    }

    blufferStrategy(handStrength) {
        const randomFactor = Math.random();
        const bluffChance = this.bluffChance * 3;

        if (handStrength > 0.6) {
            const raiseAmount = Math.min(
                this.player.chips,
                Math.max(this.game.bigBlind * 6, Math.floor(this.game.pot * 0.8))
            );
            return { action: 'raise', amount: raiseAmount };
        } else if (randomFactor < bluffChance) {
            const bluffAmount = Math.min(
                this.player.chips,
                Math.max(this.game.bigBlind * 4, Math.floor(this.game.pot * 0.6))
            );
            return { action: 'raise', amount: bluffAmount };
        } else if (handStrength > 0.3 && this.game.currentBet < this.player.chips * 0.3) {
            return { action: 'call' };
        } else if (handStrength > 0.15 && this.game.currentBet <= this.game.bigBlind * 2) {
            return { action: 'call' };
        } else {
            return { action: 'fold' };
        }
    }

    randomStrategy(handStrength) {
        const randomValue = Math.random();

        if (randomValue < 0.1) {
            return { action: 'fold' };
        } else if (randomValue < 0.6) {
            return { action: 'call' };
        } else {
            const raiseAmount = Math.min(
                this.player.chips,
                Math.max(this.game.bigBlind, Math.floor(this.game.pot * randomValue))
            );
            return { action: 'raise', amount: raiseAmount };
        }
    }

    getOpponentPrediction() {
        if (!this.game || this.game.players.length < 2) return 0.5;

        // 基于当前牌局状态和AI个性预测对手行为
        let prediction = 0.5;

        // 考虑对手筹码量
        const avgOpponentChips = this.game.players
            .filter(p => !p.isAI || p.index !== this.playerIndex)
            .reduce((sum, p) => sum + p.chips, 0) / (this.game.players.length - 1);

        const chipRatio = this.player.chips / avgOpponentChips;
        prediction += chipRatio > 1 ? 0.1 : -0.1;

        // 考虑当前下注轮次
        const roundFactors = {
            'preflop': 0.1,
            'flop': 0.3,
            'turn': 0.5,
            'river': 0.7
        };
        prediction += roundFactors[this.game.gamePhase] || 0;

        // 根据AI个性调整预测
        if (this.personality === 'aggressive') {
            prediction += 0.15;
        } else if (this.personality === 'conservative') {
            prediction -= 0.15;
        } else if (this.personality === 'bluffer') {
            prediction += 0.25;
        }

        // 确保预测值在0-1之间
        return Math.min(1, Math.max(0, prediction));
    }

    getPersonality() {
        return {
            type: this.personality,
            icon: {
                'aggressive': '💢',
                'conservative': '🛡️',
                'bluffer': '🎭',
                'random': '🎲'
            }[this.personality] || '❓',
            description: {
                'aggressive': '激进型: 高频加注',
                'conservative': '保守型: 谨慎跟注',
                'bluffer': '诈唬型: 虚张声势',
                'random': '随机型: 不可预测'
            }[this.personality] || '未知类型'
        };
    }

    getDecisionReasoning() {
        const strength = this.getHandStrength?.() || 0;
        const position = this.position;
        const strategy = this.strategyWeights || { primary: 0, secondary: 0 };

        let reasoning = `牌力: ${Math.round(strength * 100)}% | 位置: ${position}`;
        reasoning += `\n策略: ${strategy.primary.toFixed(1)}主/${strategy.secondary.toFixed(1)}次`;

        if (this.lastAction === 'raise') {
            if (strength > 0.7) reasoning += "\n理由: 强牌加注收割";
            else if (strength > 0.4) reasoning += "\n理由: 中等牌力试探";
            else reasoning += "\n理由: 诈唬施压";
        } else if (this.lastAction === 'call') {
            if (strength > 0.6) reasoning += "\n理由: 强牌慢玩";
            else reasoning += "\n理由: 控制底池";
        } else if (this.lastAction === 'fold') {
            reasoning += "\n理由: 牌力不足";
        }

        return reasoning;
    }
}
