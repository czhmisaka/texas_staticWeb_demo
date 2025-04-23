/*
 * @Date: 2025-04-21 12:55:31
 * @LastEditors: CZH
 * @LastEditTime: 2025-04-23 07:30:48
 * @FilePath: /texas-holdem/game.js
 */
import TexasHoldemAI from './ai.js';
import { UIManager } from './ui-manager.js';
import { evaluateHand, cardValueToRank, compareHands } from './cards-evaluator.js';
import aiSpeechAnimator from './animations/ai-speech-animations.js';
import victoryAnimator from './animations/victory-animations.js';
import {
    logPlayerAction,
    logGamePhase,
    logPotChange,
    logWinner
} from './logger.js';

class TexasHoldemGame {
    constructor() {
        this.uiManager = new UIManager(this);
        this.players = [];
        this.communityCards = [];
        this.deck = [];
        this.pot = 0;
        this.currentBet = 0;
        this.currentPlayerIndex = 0;
        this.gamePhase = 'waiting'; // waiting/preflop/flop/turn/river/showdown
        this.bettingRound = 0; // 0=翻前, 1=翻牌, 2=转牌, 3=河牌
        this.lastRaisePosition = -1;
        this.playerActedThisRound = [];
        this.smallBlind = 10;
        this.bigBlind = 20;
        this.maxBet = 2000; // 单次最大下注限制
        this.dealerPosition = 0;
        this.consoleInterval = null;
        this.refreshInterval = null;
        this.raiseCount = 0; // 当前轮次加注次数
    }

    consoleTable() {
        const tableData = this.players.map(player => {
            const cards = player.cards.map(c => `${c.value}${c.suit[0].toUpperCase()}`).join(' ');
            const winRate = player.isAI && player.ai ?
                (player.ai.getHandStrength() * 100).toFixed(2) + '%' :
                'N/A';
            const communityCards = this.communityCards.map(c => `${c.value}${c.suit[0].toUpperCase()}`).join(' ') || '无';

            return {
                '玩家': player.name,
                '筹码': player.chips,
                '下注': player.currentBet,
                '底牌': cards,
                '胜率': winRate,
                '行为': player.folded ? '弃牌' :
                    this.playerActedThisRound[this.players.indexOf(player)] ?
                        (player.currentBet === this.currentBet ? '跟注' : '加注') :
                        '等待',
                '类型': player.isAI ? player.personality : '玩家',
                'All-in': player.chips === 0 ? '是' : '否',
                '游戏阶段': this.gamePhase,
                '公共牌': communityCards,
                '底池': this.pot
            };
        });

        console.clear();
        console.table(tableData);
    }


    initGame(humanPlayerName = 'Player 1') {
        if (!humanPlayerName || typeof humanPlayerName !== 'string') {
            humanPlayerName = 'Player 1';
        }

        // 清除已有定时器
        if (this.consoleInterval) {
            clearInterval(this.consoleInterval);
        }
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // 启动UI刷新定时器(10fps)
        const that = this
        this.refreshInterval = setInterval(() => {
            that.updateUI()
        }, 100);

        // 启动控制台输出定时器(1fps)
        // this.consoleInterval = setInterval(() => {
        //     this.consoleTable();
        // }, 1000);


        // 初始化玩家数组
        this.players = [];

        // 添加人类玩家
        this.players.push({
            name: humanPlayerName,
            chips: 20000,
            currentBet: 0,
            folded: false,
            isAI: false,
            cards: [],
            raiseCount: 0
        });

        // 添加6个AI玩家
        const aiPersonalities = ['aggressive', 'conservative', 'random', 'bluffer', 'random', 'bluffer'];
        // const aiPersonalities = ['aggressive', 'conservative'];
        aiPersonalities.forEach((personality, index) => {
            this.players.push({
                name: `AI-${index + 1}`,
                chips: 10000,
                currentBet: 0,
                folded: false,
                isAI: true,
                personality,
                cards: [],
                ai: new TexasHoldemAI(this, index), // 使用index以匹配玩家数组索引(0-based)
                raiseCount: 0
            });
        });

        if (this.players.length < 2) {
            throw new Error('At least 2 players are required');
        }

        // 初始化牌组
        this.resetDeck();
        this.shuffleDeck();

        // 重置游戏状态
        this.communityCards = [];
        this.uiManager.updateCommunityCards(this.communityCards); // 立即更新UI
        this.pot = 0;
        this.currentBet = 0;
        this.gamePhase = 'preflop';
        this.dealerPosition = (this.dealerPosition + 1) % this.players.length;

        // 发牌
        this.dealCards();

        // 设置盲注
        this.postBlinds();

        // 设置当前玩家(大盲注下家开始行动)
        this.currentPlayerIndex = (this.dealerPosition + 3) % this.players.length;
        while (this.players[this.currentPlayerIndex].folded) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        }

        // 开始第一轮下注
        this.startNewBettingRound();


    }

    resetDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

        this.deck = [];
        for (const suit of suits) {
            for (const value of values) {
                this.deck.push({ suit, value });
            }
        }
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    simulateBoard(count, excludeCards = []) {
        // 模拟发公共牌
        const tempDeck = this.deck.filter(card =>
            !excludeCards.some(c =>
                c.value === card.value && c.suit === card.suit
            )
        );
        const shuffled = [...tempDeck].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    simulateHoleCards(count, excludeCards = []) {
        // 模拟发底牌
        return this.simulateBoard(count, excludeCards);
    }

    dealCards() {
        // 给每个玩家发两张牌
        for (let i = 0; i < 2; i++) {
            for (const player of this.players) {
                player.cards.push(this.deck.pop());
            }
        }

        // 更新AI玩家状态
        this.players.forEach((player, index) => {
            if (player.isAI) {
                const aiStatus = player.ai.getEmotionalFeedback();
                this.updateAIStatusUI(index, aiStatus);
            }
        });
    }

    postBlinds() {
        const smallBlindPos = (this.dealerPosition + 1) % this.players.length;
        const bigBlindPos = (this.dealerPosition + 2) % this.players.length;

        this.players[smallBlindPos].chips -= this.smallBlind;
        this.players[smallBlindPos].currentBet = this.smallBlind;

        this.players[bigBlindPos].chips -= this.bigBlind;
        this.players[bigBlindPos].currentBet = this.bigBlind;

        this.currentBet = this.bigBlind;
        this.pot = this.smallBlind + this.bigBlind;
    }


    allPlayersActed() {
        // 检查是否所有未弃牌的玩家都已完成当前轮次
        const activePlayers = this.players.filter(p => !p.folded);

        // 特殊情况：所有玩家都弃牌
        if (activePlayers.length === 0) {
            logGamePhase('showdown', this.pot);
            return true;
        }

        // 检查是否所有活跃玩家都已完成行动
        const allActed = activePlayers.every((p, i) =>
            this.playerActedThisRound[i] || p.folded
        );

        // 检查是否所有活跃玩家下注相同
        const allEqualBets = activePlayers.every(p =>
            p.currentBet === this.currentBet
        );

        // 如果所有玩家都已行动且下注相同，或者只剩一个活跃玩家
        return (allActed && allEqualBets) || activePlayers.length === 1;
    }

    nextPlayer() {
        let attempts = 0;
        const maxAttempts = this.players.length;

        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            attempts++;
            if (attempts >= maxAttempts) {
                console.error('无法找到未弃牌的玩家');
                break;
            }
        } while (this.players[this.currentPlayerIndex].folded);

        // 更新UI显示当前玩家
        this.updatePlayerTurnUI();
    }

    updatePlayerTurnUI() {
        this.uiManager.updatePlayerTurnUI(this.currentPlayerIndex, this.players, this.gamePhase, this.currentBet);
    }

    updateAIStatusUI(playerIndex, status) {
        this.uiManager.updateAIStatusUI(playerIndex, status);
    }

    nextPhase() {
        // 显示阶段转换动画
        const phaseNames = {
            'preflop': '翻前',
            'flop': '翻牌',
            'turn': '转牌',
            'river': '河牌',
            'showdown': '摊牌'
        };
        const phaseText = phaseNames[this.gamePhase] || this.gamePhase;
        this.uiManager.showPhaseTransition(phaseText);

        // 重置所有玩家行动状态显示
        this.players.forEach((player, index) => {
            if (!player.folded) {
                this.uiManager.updatePlayerActionStatus(index, '');
            }
            // 更新AI玩家状态
            if (player.isAI) {
                const aiStatus = player.ai.getEmotionalFeedback();
                this.updateAIStatusUI(index, aiStatus);
            }
        });

        switch (this.bettingRound) {
            case 0: // 翻前 → 翻牌
                this.bettingRound = 1;
                this.dealCommunityCards(3);
                this.gamePhase = 'flop';
                break;
            case 1: // 翻牌 → 转牌
                this.bettingRound = 2;
                this.dealCommunityCards(1);
                this.gamePhase = 'turn';
                break;
            case 2: // 转牌 → 河牌
                this.bettingRound = 3;
                this.dealCommunityCards(1);
                this.gamePhase = 'river';
                break;
            case 3: // 河牌 → 摊
                this.gamePhase = 'showdown';
                this.determineWinner();
                return;
        }

        // 更新UI显示新阶段
        this.uiManager.updateCommunityCards(this.communityCards);
        this.uiManager.updatePot(this.pot);
        this.startNewBettingRound();
    }

    startNewBettingRound() {
        this.lastRaisePosition = -1;
        // 重置所有玩家的加注计数器
        this.players.forEach(player => {
            player.raiseCount = 0;
        });

        // 重置玩家行动状态
        this.playerActedThisRound = new Array(this.players.length).fill(false);
        // 跳过已弃牌的玩家
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].folded) {
                this.playerActedThisRound[i] = true;
            }
        }

        // 设置当前玩家(翻前从大盲注下家开始，其他从小盲注开始)
        const startPos = this.bettingRound === 0 ?
            (this.dealerPosition + 3) % this.players.length :
            (this.dealerPosition + 1) % this.players.length;

        this.currentPlayerIndex = startPos;
        while (this.players[this.currentPlayerIndex].folded) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        }
        this.updatePlayerTurnUI();

        // 确保操作按钮可用
        const foldBtn = document.getElementById('fold-btn');
        const callBtn = document.getElementById('call-btn');
        const raiseBtn = document.getElementById('raise-btn');

        foldBtn.disabled = false;
        callBtn.disabled = false;
        raiseBtn.disabled = false;

        // 如果是AI玩家回合，触发自动行动
        if (this.players[this.currentPlayerIndex].isAI) {
            setTimeout(() => this.handleAITurn(), 1000);
        }

        logGamePhase(this.gamePhase, this.pot);
    }

    dealCommunityCards(count) {
        for (let i = 0; i < count; i++) {
            this.communityCards.push(this.deck.pop());
        }
    }

    determineWinner() {
        // 获取所有未弃牌玩家的牌型
        const activePlayers = this.players.filter(p => !p.folded);
        if (activePlayers.length === 0) return;

        // 特殊情况处理：只剩一个玩家时直接获胜
        if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            winner.chips += this.pot;
            logWinner([{ name: winner.name }], this.pot, '直接获胜');

            // 更新UI
            this.showGameMessage(`${winner.name} 获胜! 赢得 ${this.pot} 筹码 (所有对手弃牌)`);
            this.resetGameState();
            return;
        }

        // 计算每个玩家的最佳牌型
        const playerHands = activePlayers.map(player => {
            const allCards = [...player.cards, ...this.communityCards];
            return {
                player,
                hand: evaluateHand(allCards)
            };
        });

        // 排序找出赢家
        playerHands.sort((a, b) => compareHands(b.hand, a.hand));

        // 可能有多个赢家(平分底池)
        let winners = [playerHands[0]];
        for (let i = 1; i < playerHands.length; i++) {
            if (compareHands(playerHands[i].hand, playerHands[0].hand) === 0) {
                winners.push(playerHands[i]);
            } else {
                break;
            }
        }

        // 分配筹码
        const winAmount = Math.floor(this.pot / winners.length);
        const remainder = this.pot % winners.length; // 处理不能整除的余数
        console.log('user', winners, '余数:', remainder);
        for (let i = 0; i < winners.length; i++) {
            // 前remainder个赢家多分1个筹码
            const amount = winAmount + (i < remainder ? 1 : 0);
            winners[i].player.chips += amount;
            logWinner(winners, winAmount, winners[0].hand.value);
        }
        this.pot = 0;

        // 确保hand.value已正确设置
        const handValue = winners[0].hand.value || '未知牌型';

        // 显示获胜消息和动画
        let winMessage = '';
        if (winners.length === 1) {
            winMessage = `${winners[0].player.name} 获胜! 赢得 ${winAmount + remainder} 筹码 (${handValue})`;
            // 显示胜利动画
            victoryAnimator.showVictory(winners[0].player.name, 'showdown');
            // 如果是AI获胜，显示发言
            if (winners[0].player.isAI) {
                const victoryPhrases = [
                    "哈哈，我赢了！",
                    "这就是我的实力！",
                    "运气也是实力的一部分！",
                    "你们还需要多练习！"
                ];
                const randomPhrase = victoryPhrases[Math.floor(Math.random() * victoryPhrases.length)];
                aiSpeechAnimator.showMessage(winners[0].player.name, randomPhrase, 'warning');
            }
        } else {
            const winnerNames = winners.map(w => w.player.name).join(', ');
            winMessage = `${winnerNames} 平分底池! 每人赢得 ${winAmount}${remainder > 0 ? '+' + remainder : ''} 筹码 (${handValue})`;
            // 显示多个胜利动画
            winners.forEach(winner => {
                victoryAnimator.showVictory(winner.player.name, 'showdown');
                if (winner.player.isAI) {
                    aiSpeechAnimator.showMessage(winner.player.name, "平分也不错！", 'normal');
                }
            });
        }

        // 强制同步更新UI
        this.showGameMessage(winMessage);

        // 延迟重置游戏状态，确保动画完成
        setTimeout(() => {
            this.resetGameState();
        }, 3500);
    }
    resetGameState() {
        console.log('[DEBUG] 开始重置游戏状态 - 当前阶段:', this.gamePhase, '公共牌:', this.communityCards);

        // 检查是否有玩家筹码为0
        const bankruptPlayers = this.players.filter(p => p.chips <= 0);
        if (bankruptPlayers.length > 0) {
            this.endGame();
            return;
        }

        // 保存玩家筹码状态
        const chips = this.players.map(p => p.chips);

        // 清除定时器
        if (this.consoleInterval) {
            clearInterval(this.consoleInterval);
            this.consoleInterval = null;
        }
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        // 重置游戏状态
        this.communityCards = [];
        this.resetDeck();
        this.shuffleDeck();
        this.gamePhase = 'preflop';
        this.bettingRound = 0;
        this.playerActedThisRound = new Array(this.players.length).fill(false);

        // 完全重置玩家状态
        this.players.forEach((player, index) => {
            player.cards = [];
            player.currentBet = 0;
            player.folded = false; // 强制重置弃牌状态
            player.chips = chips[index];

            // 检查筹码不足情况
            if (player.chips <= 0) {
                player.chips = 1000; // 重置为初始筹码
                console.log(`${player.name} 筹码不足，已重置为1000`);
            }

            // 重置AI玩家状态
            if (player.isAI && player.ai) {
                player.ai.lastAction = null;
                player.ai.strategyWeights = {
                    primary: 0.7,
                    secondary: 0.3,
                    lastUpdated: 0
                };
                player.ai.opponentStats = {};
                player.ai.bluffChance = 0.2;
            }
        });

        // 发牌
        this.dealCards();

        // 设置盲注
        this.postBlinds();

        // 设置当前玩家
        this.currentPlayerIndex = (this.dealerPosition + 3) % this.players.length;
        // 强制重置所有玩家状态显示
        this.uiManager.clearActionStatus();
        // 确保UI完全更新后再设置当前玩家
        setTimeout(() => {
            this.updatePlayerTurnUI();
        }, 100);

        // 显示新一局开始消息
        this.showGameMessage(`新一局开始! 庄家: ${this.players[this.dealerPosition].name}`);
        console.log('[DEBUG] 游戏状态重置完成 - 新阶段:', this.gamePhase,
            '玩家数:', this.players.length,
            '庄家位置:', this.dealerPosition,
            '玩家行动状态:', this.playerActedThisRound);

        // 强制更新所有UI状态
        this.updateUI();

        // 如果是AI玩家回合，触发自动行动
        if (this.players[this.currentPlayerIndex].isAI) {
            setTimeout(() => this.handleAITurn(), 1000);
        }
    }


    // 定义一个名为 showGameMessage 的方法，用于显示游戏消息
    showGameMessage(msg) {
        // 调用 this 对象中的 uiManager 的 showGameMessage 方法，并传入消息参数 msg
        this.uiManager.showGameMessage(msg);
    }

    endGame() {
        // 停止所有游戏循环
        if (this.consoleInterval) {
            clearInterval(this.consoleInterval);
            this.consoleInterval = null;
        }
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        // 按筹码排序玩家
        const rankedPlayers = [...this.players].sort((a, b) => b.chips - a.chips);

        // 创建排名列表HTML
        let rankingHTML = '';
        rankedPlayers.forEach((player, index) => {
            const isWinner = index === 0;
            rankingHTML += `
                <li class="ranking-item ${isWinner ? 'winner' : ''}">
                    <span>${index + 1}. ${player.name}</span>
                    <span>${player.chips}筹码</span>
                </li>
            `;
        });

        // 显示游戏结束卡片
        const gameOverCard = document.createElement('div');
        gameOverCard.className = 'game-over-card';
        gameOverCard.innerHTML = `
            <h2>游戏结束</h2>
            <ul class="ranking-list">
                ${rankingHTML}
            </ul>
            <button id="restart-game-btn">重新开始</button>
        `;
        document.body.appendChild(gameOverCard);

        // 添加重新开始按钮事件
        document.getElementById('restart-game-btn').addEventListener('click', () => {
            location.reload();
        });

        // 禁用所有操作按钮
        const foldBtn = document.getElementById('fold-btn');
        const callBtn = document.getElementById('call-btn');
        const raiseBtn = document.getElementById('raise-btn');
        const fixedBets = document.querySelector('.fixed-bets');

        if (foldBtn) foldBtn.style.display = 'none';
        if (callBtn) callBtn.style.display = 'none';
        if (raiseBtn) raiseBtn.style.display = 'none';
        if (fixedBets) fixedBets.style.display = 'none';
    }

    updateUI() {
        this.uiManager.refreshAllUI();
        this.uiManager.updatePlayerTurnUI();
        console.warn('UI更新完成');
    }

    stopRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
    handleAITurn() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (!currentPlayer.isAI || currentPlayer.folded) {
            return;
        }

        // 显示AI思考动画
        this.uiManager.showAIThinking(currentPlayer.name);

        logPlayerAction(currentPlayer.name, 'AI决策开始', 0, currentPlayer.chips);

        // 获取AI决策并确保不超过最大下注限制
        let decision = currentPlayer.ai.makeDecision(
            this.communityCards,
            this.currentBet,
            this.pot
        );

        // 如果AI决定加注，确保不超过最大限制
        if (decision.action === 'raise' && decision.amount > this.maxBet) {
            decision.amount = this.maxBet;
        }

        // 根据AI决策类型生成消息
        let message = '';
        let type = 'normal';

        switch (decision.action) {
            case 'fold':
                message = `${currentPlayer.name}: 我弃牌!`;
                type = 'warning';
                break;
            case 'call':
                if (this.currentBet - currentPlayer.currentBet > 0) {
                    message = `${currentPlayer.name}: 我跟注 ${this.currentBet - currentPlayer.currentBet}筹码`;
                } else {
                    message = `${currentPlayer.name}: 我过牌`;
                }
                break;
            case 'raise':
                message = `${currentPlayer.name}: 我加注 ${decision.amount}筹码!`;
                type = currentPlayer.personality === 'aggressive' ? 'warning' : 'normal';
                break;
        }

        // 显示AI发言动画
        aiSpeechAnimator.showMessage(currentPlayer.name, message, type);

        // 执行AI决策
        switch (decision.action) {
            case 'fold':
                this.playerAction('fold');
                this.uiManager.updatePlayerActionStatus(this.currentPlayerIndex, 'fold');
                break;
            case 'call':
                this.playerAction('call');
                this.uiManager.updatePlayerActionStatus(this.currentPlayerIndex,
                    (this.currentBet - currentPlayer.currentBet) > 0 ? 'call' : 'check');
                break;
            case 'raise':
                this.playerAction('raise', decision.amount);
                this.uiManager.updatePlayerActionStatus(this.currentPlayerIndex,
                    currentPlayer.chips === 0 ? 'allin' : 'raise');
                break;
            default:
                console.error(`未知的AI决策: ${decision.action}`);
                this.playerAction('fold');
                this.uiManager.updatePlayerActionStatus(this.currentPlayerIndex, 'fold');
        }

        // 检查是否需要自动触发下一个AI行动
        if (this.gamePhase !== 'showdown' &&
            this.players[this.currentPlayerIndex].isAI &&
            !this.players[this.currentPlayerIndex].folded) {
            setTimeout(() => this.handleAITurn(), 1000);
        }
    }

    playerAction(action, amount = 0) {
        const player = this.players[this.currentPlayerIndex];

        if (player.folded) {
            this.nextPlayer();
            return;
        }

        // 检查游戏阶段是否允许操作
        if (!['preflop', 'flop', 'turn', 'river'].includes(this.gamePhase)) {
            console.log(`当前阶段 ${this.gamePhase} 不允许操作`);
            return;
        }

        // 检查加注次数限制
        if (action === 'raise' && player.raiseCount >= 2) {
            this.showGameMessage(`${player.name} 本轮加注次数已达上限(2次)`);
            return;
        }

        // 标记玩家已行动
        this.playerActedThisRound[this.currentPlayerIndex] = true;

        // 更新AI状态显示
        if (player.isAI) {
            const aiStatus = player.ai.getEmotionalFeedback();
            logPlayerAction(player.name, `AI状态: ${aiStatus}`, 0, player.chips);
            this.updateAIStatusUI(this.currentPlayerIndex, aiStatus);
            logPlayerAction(player.name, `AI行动: ${action}`, 0, player.chips);
        }

        // 更新UI显示当前玩家状态
        this.uiManager.updatePlayerTurnUI();

        switch (action) {
            case 'fold':
                player.folded = true;
                logPlayerAction(player.name, '弃牌', 0, player.chips);
                this.uiManager.updatePlayerActionStatus(this.currentPlayerIndex, 'fold');
                // 检查是否只剩一家活跃玩家
                const activePlayers = this.players.filter(p => !p.folded);
                if (activePlayers.length === 1) {
                    logPlayerAction(activePlayers[0].name, '直接获胜', 0, activePlayers[0].chips);
                    this.gamePhase = 'showdown';
                    this.determineWinner();
                    return;
                }
                break;

            case 'call':
                const callAmount = this.currentBet - player.currentBet;
                let adjustedCallAmount = callAmount;
                if (callAmount > player.chips) {
                    adjustedCallAmount = player.chips;
                    this.showGameMessage(`${player.name} 下注超过筹码数量，已自动调整为全押`);
                }
                player.chips -= adjustedCallAmount;
                player.currentBet = this.currentBet - (callAmount - adjustedCallAmount);
                this.pot += adjustedCallAmount;
                logPlayerAction(player.name, '跟注', adjustedCallAmount, player.chips);
                this.uiManager.updatePlayerActionStatus(this.currentPlayerIndex,
                    adjustedCallAmount > 0 ? 'call' : 'check');
                break;

            case 'raise':
                if (amount > this.maxBet) {
                    this.showGameMessage(`单次下注不能超过${this.maxBet}筹码`);
                    return;
                }
                if (this.raiseCount >= 2) {
                    this.showGameMessage(`本轮加注次数已达上限(2次)`);
                    return;
                }
                const totalRaise = amount + (this.currentBet - player.currentBet);
                let adjustedTotalRaise = totalRaise;
                if (totalRaise > player.chips) {
                    adjustedTotalRaise = player.chips;
                    this.showGameMessage(`${player.name} 下注超过筹码数量，已自动调整为全押`);
                }
                player.chips -= adjustedTotalRaise;
                player.currentBet = this.currentBet + (adjustedTotalRaise - (this.currentBet - player.currentBet));
                this.currentBet = player.currentBet;
                this.pot += adjustedTotalRaise;
                this.lastRaisePosition = this.currentPlayerIndex;
                player.raiseCount++; // 增加玩家加注计数器
                logPlayerAction(player.name, '加注', adjustedTotalRaise, player.chips);
                this.uiManager.updatePlayerActionStatus(this.currentPlayerIndex,
                    player.chips === 0 ? 'allin' : 'raise');
                // 更新UI显示剩余加注次数
                if (this.uiManager.updateRaiseCount) {
                    this.uiManager.updateRaiseCount(2 - this.raiseCount);
                }
                break;
        }

        // 检查是否进入下一阶段
        if (this.allPlayersActed()) {
            logGamePhase(this.gamePhase, this.pot);
            this.nextPhase();
        } else {
            this.nextPlayer();
            // 如果是AI玩家回合，触发自动行动
            if (this.players[this.currentPlayerIndex].isAI) {
                setTimeout(() => this.handleAITurn(), 1000);
            }
        }

        // 确保翻牌后AI能继续行动
        if (this.gamePhase === 'flop' &&
            this.players[this.currentPlayerIndex].isAI &&
            !this.players[this.currentPlayerIndex].folded) {
            setTimeout(() => this.handleAITurn(), 1000);
        }
    }
}

export default TexasHoldemGame;
