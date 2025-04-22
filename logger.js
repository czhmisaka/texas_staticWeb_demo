/*
 * @Date: 2025-04-22 14:55:00
 * @LastEditors: CZH
 * @LastEditTime: 2025-04-22 14:53:45
 * @FilePath: /texas-holdem/logger.js
 * @Description: 德州扑克游戏日志模块
 */

// 游戏阶段名称映射
const phaseNames = {
    'preflop': '翻牌前',
    'flop': '翻牌',
    'turn': '转牌',
    'river': '河牌',
    'showdown': '摊牌',
    'waiting': '等待开始'
};

// 记录玩家行动
export function logPlayerAction(playerName, action, betAmount = 0, chipsRemaining = 0) {
    console.log(`[玩家] ${playerName} 行动: ${action} (下注: ${betAmount}, 剩余筹码: ${chipsRemaining})`);
}

// 记录游戏阶段
export function logGamePhase(phase, pot = 0) {
    console.log(`[阶段] ${phaseNames[phase]}阶段 (底池: ${pot})`);
}

// 记录底池变化
export function logPotChange(amount, newPot) {
    console.log(`[筹码] 底池变化: +${amount} (新底池: ${newPot})`);
}

// 记录获胜信息
export function logWinner(winners, winAmount, handValue) {
    if (winners.length === 1) {
        console.log(`[结果] ${winners[0].name} 获胜! 赢得 ${winAmount} 筹码 (${handValue})`);
    } else {
        const winnerNames = winners.map(w => w.name).join(', ');
        console.log(`[结果] ${winnerNames} 平分底池! 每人赢得 ${winAmount} 筹码 (${handValue})`);
    }
}
