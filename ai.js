import { evaluateHand, compareHands, cardValueToRank } from './cards-evaluator.js';

class TexasHoldemAI {
    constructor(game, playerIndex) {
        if (!game || !game.players) {
            throw new Error('Invalid game object: missing players array');
        }
        if (typeof playerIndex !== 'number' || playerIndex < 0 || playerIndex >= game.players.length) {
            throw new Error(`Invalid playerIndex: ${playerIndex}. Valid range is 0-${game.players.length - 1}`);
        }

        this.game = game;
        this.playerIndex = playerIndex;
        this.player = game.players[playerIndex];

        if (!this.player) {
            throw new Error(`Player at index ${playerIndex} is undefined. Players array: ${JSON.stringify(game.players)}`);
        }
        this.personality = this.player?.personality || 'random';
        this.bluffChance = 0.2; // 基础诈唬概率
        this.lastAction = null;
        this.position = this.calculatePosition(); // 添加位置信息
        this.strategyWeights = {
            primary: 0.7, // 主策略权重
            secondary: 0.3, // 次要策略权重
            lastUpdated: 0 // 最后更新回合
        };
        this.opponentStats = {}; // 对手行为统计
    }

    makeDecision() {
        console.log(`AI ${this.playerIndex} 进行决策...`);
        if (!this.player || !this.player.cards) {
            return { action: 'fold' }; // 安全处理
        }

        // 输出当前牌型信息
        if (this.game.communityCards && this.game.communityCards.length > 0) {
            const allCards = [...this.player.cards, ...this.game.communityCards];
            const evaluation = evaluateHand(allCards);
            console.log(`AI ${this.playerIndex} 牌型: ${evaluation.name}`);
            console.log(`暗牌: ${this.player.cards.map(c => c.value + c.suit).join(', ')}`);
            console.log(`公共牌: ${this.game.communityCards.map(c => c.value + c.suit).join(', ')}`);
            console.log(`牌力评估: ${this.calculateHandStrength().toFixed(2)}`);
        } else {
            console.log(`AI ${this.playerIndex} 暗牌: ${this.player.cards.map(c => c.value + c.suit).join(', ')}`);
            console.log(`翻牌前牌力评估: ${this.calculateHandStrength().toFixed(2)}`);
        }

        // 更新对手统计
        this.updateOpponentStats();

        // 计算当前牌力
        const handStrength = this.calculateHandStrength();

        // 根据牌局阶段和位置调整策略权重
        this.adjustStrategyWeights();
        this.adjustForPosition();

        // 预测对手行动
        const opponentPredictions = {};
        this.game.players.forEach((p, idx) => {
            if (idx !== this.playerIndex) {
                opponentPredictions[idx] = this.predictOpponentAction(idx);
            }
        });

        // 获取主策略决策
        let primaryDecision = this.getPrimaryStrategyDecision(handStrength);

        // 获取次要策略决策
        let secondaryDecision = this.getSecondaryStrategyDecision(handStrength);

        // 混合策略决策
        let finalDecision = this.mixStrategies(primaryDecision, secondaryDecision, handStrength);

        // 根据对手预测调整最终决策
        finalDecision = this.adjustForOpponentPredictions(finalDecision, opponentPredictions);

        this.lastAction = finalDecision.action;
        return finalDecision;
    }

    adjustForOpponentPredictions(decision, predictions) {
        // 分析对手预测
        const aggressiveOpponents = Object.values(predictions)
            .filter(a => a === 'raise').length;
        const conservativeOpponents = Object.values(predictions)
            .filter(a => a === 'fold').length;

        // 激进对手多时更保守
        if (aggressiveOpponents > conservativeOpponents) {
            if (decision.action === 'raise') {
                return {
                    action: 'call',
                    amount: decision.amount
                };
            }
        }
        // 保守对手多时更激进
        else if (conservativeOpponents > aggressiveOpponents) {
            if (decision.action === 'call') {
                return {
                    action: 'raise',
                    amount: Math.min(
                        this.player.chips,
                        Math.max(this.game.bigBlind * 2,
                            Math.floor(this.game.pot * 0.3))
                    )
                };
            }
        }

        return decision;
    }

    updateOpponentStats() {
        // 防御性检查
        if (!this.game || !this.game.players) {
            console.warn('Game or players array is undefined, skipping opponent stats update');
            return;
        }

        // 初始化对手统计
        this.game.players.forEach((p, idx) => {
            if (idx !== this.playerIndex) {
                if (!this.opponentStats[idx]) {
                    this.opponentStats[idx] = {
                        foldRate: 0,
                        callRate: 0,
                        raiseRate: 0,
                        actionCount: 0,
                        lastActions: [], // 最近5次行动记录
                        streetStats: { // 按牌局阶段统计
                            preflop: { fold: 0, call: 0, raise: 0, count: 0 },
                            flop: { fold: 0, call: 0, raise: 0, count: 0 },
                            turn: { fold: 0, call: 0, raise: 0, count: 0 },
                            river: { fold: 0, call: 0, raise: 0, count: 0 }
                        },
                        positionTendency: { // 位置倾向
                            early: { fold: 0, call: 0, raise: 0, count: 0 },
                            middle: { fold: 0, call: 0, raise: 0, count: 0 },
                            late: { fold: 0, call: 0, raise: 0, count: 0 }
                        }
                    };
                }

                // 更新阶段统计
                const street = this.getCurrentStreet();
                const stats = this.opponentStats[idx];

                // 记录最近行动(最多保留5个)
                if (this.game.lastAction && this.game.lastAction.playerIndex === idx) {
                    stats.lastActions.unshift(this.game.lastAction.action);
                    if (stats.lastActions.length > 5) stats.lastActions.pop();
                }

                // 更新阶段统计
                if (this.game.actionHistory)
                    this.game.actionHistory.forEach(action => {
                        if (action.playerIndex === idx) {
                            const street = this.getActionStreet(action);
                            if (street && stats.streetStats[street]) {
                                stats.streetStats[street].count++;
                                if (action.action === 'fold') stats.streetStats[street].fold++;
                                else if (action.action === 'call') stats.streetStats[street].call++;
                                else if (action.action === 'raise') stats.streetStats[street].raise++;
                            }
                        }
                    });

                // 更新位置倾向
                if (this.game.actionHistory)
                    this.game.actionHistory.forEach(action => {
                        if (action.playerIndex === idx) {
                            const pos = this.calculatePlayerPosition(action.playerIndex);
                            if (pos && stats.positionTendency[pos]) {
                                stats.positionTendency[pos].count++;
                                if (action.action === 'fold') stats.positionTendency[pos].fold++;
                                else if (action.action === 'call') stats.positionTendency[pos].call++;
                                else if (action.action === 'raise') stats.positionTendency[pos].raise++;
                            }
                        }
                    });
            }
        });
    }

    getCurrentStreet() {
        if (!this.game.communityCards) return 'preflop';
        switch (this.game.communityCards.length) {
            case 0: return 'preflop';
            case 3: return 'flop';
            case 4: return 'turn';
            case 5: return 'river';
            default: return 'preflop';
        }
    }

    getActionStreet(action) {
        // 根据action.round确定阶段
        // 简化实现，实际应根据游戏状态确定
        return this.getCurrentStreet();
    }

    calculatePlayerPosition(playerIndex) {
        const totalPlayers = this.game.players.length;
        const dealerIndex = this.game.dealerIndex;
        const relativePos = (playerIndex - dealerIndex - 1 + totalPlayers) % totalPlayers;

        if (relativePos < totalPlayers * 0.33) return 'early';
        if (relativePos < totalPlayers * 0.66) return 'middle';
        return 'late';
    }

    predictOpponentAction(playerIndex) {
        if (!this.opponentStats[playerIndex]) return null;

        const stats = this.opponentStats[playerIndex];
        const street = this.getCurrentStreet();
        const position = this.calculatePlayerPosition(playerIndex);

        // 获取阶段统计数据
        const streetData = stats.streetStats[street] || { fold: 0, call: 0, raise: 0, count: 1 };
        const positionData = stats.positionTendency[position] || { fold: 0, call: 0, raise: 0, count: 1 };

        // 计算综合概率
        const totalActions = stats.actionCount || 1;
        const foldProb = (
            (stats.foldRate / totalActions) * 0.4 +
            (streetData.fold / streetData.count) * 0.3 +
            (positionData.fold / positionData.count) * 0.3
        );
        const callProb = (
            (stats.callRate / totalActions) * 0.4 +
            (streetData.call / streetData.count) * 0.3 +
            (positionData.call / positionData.count) * 0.3
        );
        const raiseProb = (
            (stats.raiseRate / totalActions) * 0.4 +
            (streetData.raise / streetData.count) * 0.3 +
            (positionData.raise / positionData.count) * 0.3
        );

        // 返回最可能的行动
        const maxProb = Math.max(foldProb, callProb, raiseProb);
        if (maxProb === foldProb) return 'fold';
        if (maxProb === callProb) return 'call';
        return 'raise';
    }

    calculatePosition() {
        // 计算玩家位置(早位/中位/晚位)
        const totalPlayers = this.game.players.length;
        const dealerIndex = this.game.dealerIndex;
        const relativePos = (this.playerIndex - dealerIndex - 1 + totalPlayers) % totalPlayers;

        if (relativePos < totalPlayers * 0.33) return 'early';
        if (relativePos < totalPlayers * 0.66) return 'middle';
        return 'late';
    }

    adjustStrategyWeights() {
        // 每5回合调整一次策略权重
        if (this.game.round - this.strategyWeights.lastUpdated < 5) return;

        // 根据对手行为动态调整策略
        const avgFoldRate = Object.values(this.opponentStats)
            .reduce((sum, stats) => sum + (stats.foldRate / stats.actionCount || 0), 0) /
            Object.keys(this.opponentStats).length;

        // 对手弃牌率高时增加激进策略权重
        if (avgFoldRate > 0.3) {
            this.strategyWeights.secondary = Math.min(0.4, this.strategyWeights.secondary + 0.05);
        } else {
            this.strategyWeights.secondary = Math.max(0.2, this.strategyWeights.secondary - 0.05);
        }
        this.strategyWeights.primary = 1 - this.strategyWeights.secondary;
        this.strategyWeights.lastUpdated = this.game.round;
    }

    adjustForPosition() {
        // 根据位置调整策略
        switch (this.position) {
            case 'early':
                // 早位策略: 更保守
                this.strategyWeights.primary = Math.min(0.8, this.strategyWeights.primary + 0.1);
                this.bluffChance = Math.max(0.1, this.bluffChance - 0.05);
                break;
            case 'late':
                // 晚位策略: 更激进
                this.strategyWeights.primary = Math.max(0.6, this.strategyWeights.primary - 0.1);
                this.bluffChance = Math.min(0.3, this.bluffChance + 0.1);
                break;
            // 中位保持默认策略
        }
    }

    getPrimaryStrategyDecision(handStrength) {
        // 主策略决策
        switch (this.personality) {
            case 'aggressive': return this.aggressiveStrategy(handStrength);
            case 'conservative': return this.conservativeStrategy(handStrength);
            case 'bluffer': return this.blufferStrategy(handStrength);
            default: return this.randomStrategy(handStrength);
        }
    }

    getSecondaryStrategyDecision(handStrength) {
        // 次要策略选择(排除主策略)
        const strategies = ['aggressive', 'conservative', 'bluffer', 'random']
            .filter(s => s !== this.personality);
        const secondaryPersonality = strategies[Math.floor(Math.random() * strategies.length)];

        switch (secondaryPersonality) {
            case 'aggressive': return this.aggressiveStrategy(handStrength);
            case 'conservative': return this.conservativeStrategy(handStrength);
            case 'bluffer': return this.blufferStrategy(handStrength);
            default: return this.randomStrategy(handStrength);
        }
    }

    mixStrategies(primary, secondary, handStrength) {
        const mixFactor = this.strategyWeights.primary;
        const randomValue = Math.random();

        if (randomValue < mixFactor) {
            // 使用主策略
            return primary;
        } else {
            // 使用次要策略，但根据牌力调整
            if (handStrength > 0.7 && secondary.action === 'fold') {
                // 强牌时不接受次要策略的弃牌
                return { action: 'call' };
            } else if (handStrength < 0.3 && secondary.action === 'raise') {
                // 弱牌时降低次要策略的加注金额
                return {
                    action: 'raise',
                    amount: Math.floor(secondary.amount * 0.5)
                };
            }
            return secondary;
        }
    }

    calculateHandStrength() {
        if (!this.player || !this.player.cards) return 0;

        // 根据游戏阶段选择评估方法
        if (this.game.communityCards.length === 0) {
            // 翻牌前使用蒙特卡洛模拟评估手牌潜力
            return this.monteCarloHoleCardEvaluation();
        } else if (this.game.communityCards.length < 5) {
            // 翻牌/转牌阶段使用混合评估
            const mcStrength = this.monteCarloEvaluation(100);
            const heuristicStrength = this.evaluateCombinedHand(
                [...this.player.cards, ...this.game.communityCards]
            );
            return (mcStrength * 0.7 + heuristicStrength * 0.3);
        } else {
            // 河牌阶段使用精确评估
            return this.evaluateCombinedHand(
                [...this.player.cards, ...this.game.communityCards]
            );
        }
    }

    monteCarloHoleCardEvaluation(sampleCount = 200) {
        if (!this.player?.cards || this.player.cards.length < 2) return 0;

        let winCount = 0;
        let tieCount = 0;
        const opponentCount = this.game.players.length - 1;

        for (let i = 0; i < sampleCount; i++) {
            const simulatedBoard = this.game.simulateBoard(5);
            const myHand = [...this.player.cards, ...simulatedBoard];
            const myRank = evaluateHand(myHand).rank;

            let opponentsBeat = 0;
            let opponentsTied = 0;

            for (let j = 0; j < opponentCount; j++) {
                const opponentCards = this.game.simulateHoleCards(2);
                const opponentHand = [...opponentCards, ...simulatedBoard];
                const opponentRank = evaluateHand(opponentHand).rank;

                if (myRank > opponentRank) opponentsBeat++;
                else if (myRank === opponentRank) opponentsTied++;
            }

            if (opponentsBeat === opponentCount) winCount++;
            else if (opponentsBeat + opponentsTied === opponentCount) tieCount++;
        }

        // 调整后的评估公式：胜利权重0.7，平局权重0.3
        return (winCount * 0.7 + tieCount * 0.3) / sampleCount;
    }

    monteCarloEvaluation(sampleCount = 100) {
        const knownCards = [...this.player.cards, ...this.game.communityCards];
        const remainingCards = 5 - this.game.communityCards.length;
        const opponentCount = this.game.players.length - 1;
        let winCount = 0;

        for (let i = 0; i < sampleCount; i++) {
            // 模拟未发出的公共牌
            const simulatedBoard = this.game.simulateBoard(remainingCards, knownCards);
            const myHand = [...this.player.cards, ...this.game.communityCards, ...simulatedBoard];
            const myRank = evaluateHand(myHand).rank;

            // 模拟对手手牌
            let opponentsBeat = 0;
            for (let j = 0; j < opponentCount; j++) {
                const opponentCards = this.game.simulateHoleCards(2, knownCards);
                const opponentHand = [...opponentCards, ...this.game.communityCards, ...simulatedBoard];
                const opponentRank = evaluateHand(opponentHand).rank;

                if (myRank > opponentRank) opponentsBeat++;
            }

            if (opponentsBeat === opponentCount) winCount++;
        }

        return winCount / sampleCount;
    }

    evaluateHoleCards() {
        if (!this.player?.cards || this.player.cards.length < 2) {
            return 0.3; // 默认基础牌力提高
        }

        const card1 = this.player.cards[0];
        const card2 = this.player.cards[1];
        const rank1 = this.cardValueToRank(card1.value);
        const rank2 = this.cardValueToRank(card2.value);
        const maxRank = Math.max(rank1, rank2);
        const minRank = Math.min(rank1, rank2);
        const suited = card1.suit === card2.suit;
        const paired = card1.value === card2.value;
        const connected = Math.abs(rank1 - rank2) <= 2;

        // 对子
        if (paired) {
            return 0.7 + (maxRank * 0.02);
        }

        // 同花
        if (suited) {
            // 同花连牌额外加分
            if (connected) {
                return 0.6 + (maxRank * 0.015);
            }
            return 0.55 + (maxRank * 0.01);
        }

        // 连牌
        if (connected) {
            return 0.5 + (maxRank * 0.01);
        }

        // 高牌
        return 0.3 + (maxRank * 0.01);
    }

    evaluateCombinedHand(cards) {
        if (!this.game || !cards || cards.length < 2) return 0;

        // 使用game的评估方法
        const handEvaluation = evaluateHand(cards);

        // 将牌型等级转换为0-1范围的牌力值
        // 基础牌力 = 牌型等级/10 (0.1-1.0)
        let strength = handEvaluation.rank / 10;

        // 根据踢脚牌微调牌力
        const kickerSum = handEvaluation.kickers.reduce((sum, k) => sum + k, 0);
        const kickerBonus = kickerSum * 0.0005; // 小幅度提升

        // 最终牌力 (0.1-1.0)
        return Math.min(1, strength + kickerBonus);
    }


    aggressiveStrategy(handStrength) {
        // 激进型AI: 增加诈唬概率
        const randomFactor = Math.random();
        const adjustedBluffChance = this.bluffChance * 1.5; // 提高诈唬概率

        if (handStrength > 0.7) {
            // 强牌: 大额加注
            const raiseAmount = Math.min(
                this.player.chips,
                Math.max(this.game.bigBlind * 5, Math.floor(this.game.pot * 0.75))
            );
            return { action: 'raise', amount: raiseAmount };
        } else if (handStrength > 0.5) {
            // 中等牌: 小额加注或跟注
            if (randomFactor < 0.8) { // 提高加注概率
                const raiseAmount = Math.min(
                    this.player.chips,
                    Math.max(this.game.bigBlind * 2, Math.floor(this.game.pot * 0.4)) // 提高加注比例
                );
                return { action: 'raise', amount: raiseAmount };
            } else {
                return { action: 'call' };
            }
        } else if (handStrength > 0.2 && this.game.currentBet < this.player.chips * 0.4) {
            // 弱牌但下注不大: 跟注或诈唬
            if (randomFactor < adjustedBluffChance) {
                const bluffAmount = Math.min(
                    this.player.chips,
                    Math.max(this.game.bigBlind * 2, Math.floor(this.game.pot * 0.3)) // 提高诈唬金额
                );
                return { action: 'raise', amount: bluffAmount };
            } else {
                return { action: 'call' };
            }
        } else if (handStrength > 0.1 && this.game.currentBet <= this.game.bigBlind) {
            // 非常弱的牌但下注很小: 跟注
            return { action: 'call' };
        } else {
            // 非常弱的牌或下注太大: 弃牌
            return { action: 'fold' };
        }
    }

    conservativeStrategy(handStrength) {
        // 调整后的保守型AI: 进一步降低弃牌率
        if (handStrength > 0.5) {
            // 中等以上牌力: 小额加注
            const raiseAmount = Math.min(
                this.player.chips,
                Math.max(this.game.bigBlind * 2, Math.floor(this.game.pot * 0.3))
            );
            return { action: 'raise', amount: raiseAmount };
        } else if (handStrength > 0.25) {
            // 中等牌: 跟注
            if (this.game.currentBet <= this.game.bigBlind * 6) {
                return { action: 'call' };
            } else if (handStrength > 0.35) {
                // 中等偏上牌力可以接受更大下注
                return { action: 'call' };
            }
        } else if (handStrength > 0.1 && this.game.currentBet <= this.game.bigBlind * 2) {
            // 弱牌但下注不大: 跟注
            return { action: 'call' };
        } else if (this.game.currentBet === 0) {
            // 无人下注时检查牌
            return { action: 'check' };
        }
        // 非常弱的牌或下注太大: 弃牌
        return { action: 'fold' };
    }

    blufferStrategy(handStrength) {
        // 诈唬型AI: 提高诈唬频率和金额
        const randomFactor = Math.random();
        const bluffChance = this.bluffChance * 3; // 更高的诈唬概率

        if (handStrength > 0.6) {
            // 强牌: 大额加注
            const raiseAmount = Math.min(
                this.player.chips,
                Math.max(this.game.bigBlind * 6, Math.floor(this.game.pot * 0.8))
            );
            return { action: 'raise', amount: raiseAmount };
        } else if (randomFactor < bluffChance) {
            // 随机诈唬
            const bluffAmount = Math.min(
                this.player.chips,
                Math.max(this.game.bigBlind * 4, Math.floor(this.game.pot * 0.6))
            );
            return { action: 'raise', amount: bluffAmount };
        } else if (handStrength > 0.3 && this.game.currentBet < this.player.chips * 0.3) {
            // 中等牌且下注不大: 跟注
            return { action: 'call' };
        } else if (handStrength > 0.15 && this.game.currentBet <= this.game.bigBlind * 2) {
            // 弱牌但下注很小: 跟注
            return { action: 'call' };
        } else {
            // 非常弱的牌或下注太大: 弃牌
            return { action: 'fold' };
        }
    }

    randomStrategy(handStrength) {
        // 随机型AI: 完全随机决策
        const randomValue = Math.random();

        if (randomValue < 0.1) {
            // 10%概率弃牌
            return { action: 'fold' };
        } else if (randomValue < 0.6) {
            // 50%概率跟注
            return { action: 'call' };
        } else {
            // 40%概率加注
            const raiseAmount = Math.min(
                this.player.chips,
                Math.max(this.game.bigBlind, Math.floor(this.game.pot * randomValue))
            );
            return { action: 'raise', amount: raiseAmount };
        }
    }

    getEmotionalFeedback() {
        // 根据最后行动和牌力生成情绪反馈
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

export default TexasHoldemAI;
