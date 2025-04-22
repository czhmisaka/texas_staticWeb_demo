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

        // 确保按钮在允许操作的阶段可用
        const isActionPhase = ['preflop', 'flop', 'turn', 'river'].includes(this.game.gamePhase);
        const isAI = this.game.players[this.game.currentPlayerIndex].isAI;

        // 根据当前玩家类型和游戏阶段控制按钮显示
        if (isActionPhase && !isAI) {
            foldBtn.style.display = 'block';
            callBtn.style.display = 'block';
            raiseBtn.style.display = 'block';

            // 更新按钮文本显示当前下注金额
            const callAmount = this.game.currentBet - this.game.players[this.game.currentPlayerIndex].currentBet;
            callBtn.textContent = callAmount > 0 ? `跟注 ${callAmount}` : '看牌';
            raiseBtn.textContent = '加注';
        } else {
            foldBtn.style.display = 'none';
            callBtn.style.display = 'none';
            raiseBtn.style.display = 'none';
        }
    }

    updateAIStatusUI(playerIndex, status) {
        const statusElement = document.querySelector(`.player-seat:nth-child(${playerIndex + 1}) .ai-feedback`);
        if (statusElement) {
            statusElement.textContent = status;
            // 添加动画效果
            statusElement.classList.add('ai-feedback-animate');
            setTimeout(() => {
                statusElement.classList.remove('ai-feedback-animate');
            }, 1000);
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
            communityCardsElement.innerHTML = '';
            communityCards.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.className = 'card';
                cardElement.textContent = `${card.value}${card.suit[0].toUpperCase()}`;
                communityCardsElement.appendChild(cardElement);
            });
        }
    }

    updatePot(pot) {
        const potElement = document.getElementById('pot');
        if (potElement) {
            potElement.textContent = `底池: ${pot}`;
        }
    }
}
