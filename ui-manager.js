/*
 * @Date: 2025-04-22 02:21:00
 * @Description: 德州扑克UI管理模块
 */

export class UIManager {
    constructor(game) {
        this.game = game;
    }

    updatePlayerTurnUI() {
        // 更新所有玩家状态
        const playerSeats = document.querySelectorAll('.player-seat');
        playerSeats.forEach((seat, index) => {
            const player = this.game.players[index];

            // 更新当前玩家高亮状态
            if (index === this.game.currentPlayerIndex) {
                seat.classList.add('active-player');
            } else {
                seat.classList.remove('active-player');
            }

            // 更新弃牌状态
            if (player.folded) {
                seat.classList.add('folded-player');
            } else {
                seat.classList.remove('folded-player');
            }
        });

        // 更新行动顺序指示器
        const turnIndicator = document.getElementById('turn-indicator');
        const currentPlayer = this.game.players[this.game.currentPlayerIndex];
        turnIndicator.textContent = `${currentPlayer.name} 行动中`;

        // 更新行动顺序显示
        const turnOrderEl = document.getElementById('player-turn-order');
        turnOrderEl.innerHTML = '';

        // 从当前玩家开始显示行动顺序
        let playerIndex = this.game.currentPlayerIndex;
        for (let i = 0; i < this.game.players.length; i++) {
            const player = this.game.players[playerIndex];
            if (!player.folded) {
                const span = document.createElement('span');
                span.textContent = player.name;
                if (i === 0) {
                    span.classList.add('active');
                }
                turnOrderEl.appendChild(span);
            }
            playerIndex = (playerIndex + 1) % this.game.players.length;
        }

        // 更新所有AI状态显示
        this.game.players.forEach((player, index) => {
            if (player.isAI) {
                const aiStatus = player.ai?.getEmotionalFeedback() || "🤔 思考中...";
                this.updateAIStatusUI(index, aiStatus);
            }
        });

        // 更新操作按钮状态
        const foldBtn = document.getElementById('fold-btn');
        const callBtn = document.getElementById('call-btn');
        const raiseBtn = document.getElementById('raise-btn');
        const fixedBets = document.querySelector('.fixed-bets');

        // 确保按钮在允许操作的阶段可用
        const isActionPhase = ['preflop', 'flop', 'turn', 'river'].includes(this.game.gamePhase);
        const isAI = this.game.players[this.game.currentPlayerIndex].isAI;
        const canRaise = this.game.players[this.game.currentPlayerIndex].chips >
            (this.game.currentBet - this.game.players[this.game.currentPlayerIndex].currentBet);

        // 根据当前玩家类型和游戏阶段控制按钮显示
        if (isActionPhase && !isAI) {
            foldBtn.style.display = 'block';
            callBtn.style.display = 'block';
            raiseBtn.style.display = 'block';
            fixedBets.style.display = canRaise ? 'block' : 'none';

            // 更新按钮文本显示当前下注金额
            const callAmount = this.game.currentBet - this.game.players[this.game.currentPlayerIndex].currentBet;
            callBtn.textContent = callAmount > 0 ? `跟注 ${callAmount}` : '看牌';
            raiseBtn.textContent = '加注';
        } else {
            foldBtn.style.display = 'none';
            callBtn.style.display = 'none';
            raiseBtn.style.display = 'none';
            fixedBets.style.display = 'none';
        }
    }

    updateAIStatusUI(playerIndex, status) {
        const player = this.game.players[playerIndex];
        const seatElement = document.getElementById(`ai${playerIndex}-seat`);

        if (!seatElement) return;

        // 更新AI反馈文本
        const statusElement = document.getElementById(`ai${playerIndex}-feedback`);
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.classList.add('ai-feedback-animate');
            setTimeout(() => {
                statusElement.classList.remove('ai-feedback-animate');
            }, 1000);
        }

        // 更新AI信息面板
        if (player.isAI && player.ai) {
            // 牌力评估
            const strengthBar = seatElement.querySelector('.ai-hand-strength-bar');
            const strengthText = seatElement.querySelector('.ai-hand-strength-text');
            if (strengthBar && strengthText) {
                const strength = player.ai.getHandStrength();
                strengthBar.style.width = `${strength * 100}%`;
                strengthText.textContent = `牌力: ${Math.round(strength * 100)}%`;
            }

            // 策略类型
            const personalityIcon = seatElement.querySelector('.ai-personality-icon');
            const personalityText = seatElement.querySelector('.ai-personality-text');
            if (personalityIcon && personalityText) {
                const personality = player.ai.getPersonality();
                personalityIcon.textContent = personality.icon;
                personalityText.textContent = personality.type;
            }

            // 对手预测
            const predictionChart = seatElement.querySelector('.ai-prediction-chart');
            if (predictionChart) {
                const prediction = player.ai.getOpponentPrediction();
                predictionChart.style.width = `${prediction * 100}%`;
            }

            // 决策理由
            const reasoningElement = seatElement.querySelector('.ai-reasoning');
            if (reasoningElement) {
                reasoningElement.textContent = player.ai.getDecisionReasoning();
            }

            // 下注状态
            const betStatusElement = seatElement.querySelector('.ai-bet-status');
            if (betStatusElement) {
                betStatusElement.textContent = `当前下注: ${player.currentBet}`;
                betStatusElement.className = `ai-bet-status ${player.currentBet > 0 ? 'has-bet' : 'no-bet'}`;
            }

            // 弃牌状态
            const foldStatusElement = seatElement.querySelector('.ai-fold-status');
            if (foldStatusElement) {
                foldStatusElement.textContent = player.folded ? "已弃牌" : "游戏中";
                foldStatusElement.className = `ai-fold-status ${player.folded ? 'folded' : 'active'}`;

                // 更新AI反馈文本
                const feedbackElement = seatElement.querySelector('.ai-feedback');
                if (feedbackElement) {
                    feedbackElement.textContent = player.folded ? "🙅‍♂️ 已弃牌" : "";
                }
            }
        }
    }

    showGameMessage(msg) {
        // 调用index.html中的showMessage函数显示游戏消息
        if (typeof showMessage === 'function') {
            showMessage(msg);
        } else {
            console.log('游戏消息:', msg);
        }
    }

    updatePlayerActionStatus(playerIndex, action) {
        const actionStatusElement = document.querySelector(`.player-seat:nth-child(${playerIndex + 1}) .action-status`);
        if (actionStatusElement) {
            // 清除所有行动状态类
            actionStatusElement.className = 'action-status';

            const actionText = {
                'fold': '弃牌',
                'check': '看牌',
                'call': '跟注',
                'bet': '下注',
                'raise': '加注',
                'allin': '全押'
            }[action] || action;

            actionStatusElement.textContent = actionText;

            // 添加对应的行动状态类
            if (action) {
                actionStatusElement.classList.add(action.toLowerCase());
            }

            // 如果是弃牌，更新玩家座位样式
            if (action === 'fold') {
                const seat = document.querySelector(`.player-seat:nth-child(${playerIndex + 1})`);
                if (seat) {
                    seat.classList.add('folded-player');
                }
            }
        }
    }

    updatePlayerChips(players) {
        players.forEach((player, index) => {
            const chipsElement = document.querySelector(`.player-seat:nth-child(${index + 1}) .player-chips`);
            if (chipsElement) {
                chipsElement.textContent = `${player.name}: ${player.chips}`;
            }
        });
    }

    updateCommunityCards(communityCards) {
        const communityCardsElement = document.getElementById('community-cards');
        if (communityCardsElement) {
            const cardPlaceholders = communityCardsElement.querySelectorAll('.card-placeholder');
            cardPlaceholders.forEach((cardEl, index) => {
                if (index < communityCards.length) {
                    const card = communityCards[index];
                    cardEl.textContent = `${card.value}${card.suit[0].toUpperCase()}`;
                    cardEl.className = `card-placeholder ${card.suit}`;
                } else {
                    cardEl.textContent = '';
                    cardEl.className = 'card-placeholder';
                }
            });
        }
    }

    updatePot(pot) {
        const potElement = document.getElementById('pot');
        if (potElement) {
            potElement.textContent = `底池: ${pot}`;
        }
    }

    clearActionStatus() {
        // 清除所有玩家的行动状态显示
        const actionStatusElements = document.querySelectorAll('.action-status');
        actionStatusElements.forEach(el => {
            el.className = 'action-status';
            el.textContent = '';
        });

        // 清除弃牌状态样式
        const foldedSeats = document.querySelectorAll('.folded-player');
        foldedSeats.forEach(seat => seat.classList.remove('folded-player'));

        // 清除AI玩家下注状态
        const betStatusElements = document.querySelectorAll('.ai-bet-status');
        betStatusElements.forEach(el => {
            el.textContent = '下注: 0';
            el.className = 'ai-bet-status no-bet';
        });

        // 清除AI玩家弃牌状态
        const foldStatusElements = document.querySelectorAll('.ai-fold-status');
        foldStatusElements.forEach(el => {
            el.textContent = '游戏中';
            el.className = 'ai-fold-status active';
        });
    }

    showAIThinking(aiName) {
        // 显示AI思考状态
        const currentPlayerIndex = this.game.players.findIndex(p => p.name === aiName);
        if (currentPlayerIndex >= 0) {
            const statusElement = document.getElementById(`ai${currentPlayerIndex}-feedback`);
            if (statusElement) {
                statusElement.textContent = "🤔 思考中...";
                statusElement.classList.add('ai-feedback-animate');
            }
        }
    }

    showPhaseTransition(phaseName) {
        // 显示游戏阶段转换
        const phaseNames = {
            'preflop': '翻牌前',
            'flop': '翻牌圈',
            'turn': '转牌',
            'river': '河牌',
            'showdown': '摊牌'
        };

        const displayName = phaseNames[phaseName] || phaseName;
        const phaseElement = document.getElementById('game-phase-indicator');
        if (phaseElement) {
            phaseElement.textContent = `当前阶段: ${displayName}`;
            phaseElement.classList.add('phase-transition-animate');
            setTimeout(() => {
                phaseElement.classList.remove('phase-transition-animate');
            }, 1000);
        }

        // 显示阶段转换消息
        this.showGameMessage(`进入${displayName}阶段`);
    }

    refreshAllUI() {
        this.clearActionStatus();
        this.updatePlayerTurnUI();
        this.updatePlayerChips(this.game.players);
        this.updateCommunityCards(this.game.communityCards);
        this.updatePot(this.game.pot);

        // 更新所有AI状态
        this.game.players.forEach((player, index) => {
            if (player.isAI) {
                const status = player.ai?.getEmotionalFeedback() || "🤔 思考中...";
                this.updateAIStatusUI(index, status);
            }
        });
    }
}
