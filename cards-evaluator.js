/*
 * 牌型评估工具
 * 包含德州扑克牌型评估、比较和牌值转换方法
 */

export function evaluateHand(cards) {
    if (!cards || cards.length < 5) return { rank: 1, value: '高牌', kickers: [] };

    // 统计牌值和花色
    const valueCounts = {};
    const suitCounts = {};
    const values = [];

    cards.forEach(card => {
        valueCounts[card.value] = (valueCounts[card.value] || 0) + 1;
        suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
        values.push(cardValueToRank(card.value));
    });
    values.sort((a, b) => b - a);

    // 检查同花
    const isFlush = Object.values(suitCounts).some(count => count >= 5);

    // 检查顺子
    const uniqueValues = [...new Set(values)];
    let isStraight = false;
    if (uniqueValues.length >= 5) {
        for (let i = 0; i <= uniqueValues.length - 5; i++) {
            if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
                isStraight = true;
                break;
            }
            // 特殊处理A-5-4-3-2顺子
            if (uniqueValues.includes(14) && uniqueValues[0] === 5 &&
                uniqueValues[uniqueValues.length - 1] === 2 &&
                uniqueValues.length === 5) {
                isStraight = true;
                values[0] = 1; // 将A作为1处理
                break;
            }
        }
    }

    // 检查牌型
    const pairs = Object.entries(valueCounts).filter(([_, count]) => count === 2);
    const threeOfAKind = Object.entries(valueCounts).filter(([_, count]) => count === 3);
    const fourOfAKind = Object.entries(valueCounts).filter(([_, count]) => count === 4);

    // 皇家同花顺
    if (isFlush && isStraight && values[0] === 14 && values[4] === 10) {
        return { rank: 10, value: '皇家同花顺', kickers: [] };
    }
    // 同花顺
    if (isFlush && isStraight) {
        return { rank: 9, value: '同花顺', kickers: values.slice(0, 5) };
    }
    // 四条
    if (fourOfAKind.length > 0) {
        const quadValue = cardValueToRank(fourOfAKind[0][0]);
        const kicker = values.find(v => v !== quadValue) || 0;
        return { rank: 8, value: '四条', kickers: [quadValue, kicker] };
    }
    // 葫芦
    if (threeOfAKind.length > 0 && pairs.length > 0) {
        const trioValue = cardValueToRank(threeOfAKind[0][0]);
        const pairValue = cardValueToRank(pairs[0][0]);
        return { rank: 7, value: '葫芦', kickers: [trioValue, pairValue] };
    }
    // 同花
    if (isFlush) {
        return { rank: 6, value: '同花', kickers: values.slice(0, 5) };
    }
    // 顺子
    if (isStraight) {
        return { rank: 5, value: '顺子', kickers: values.slice(0, 5) };
    }
    // 三条
    if (threeOfAKind.length > 0) {
        const trioValue = cardValueToRank(threeOfAKind[0][0]);
        const kickers = values.filter(v => v !== trioValue).slice(0, 2);
        return { rank: 4, value: '三条', kickers: [trioValue, ...kickers] };
    }
    // 两对
    if (pairs.length >= 2) {
        const pairValues = pairs.map(p => cardValueToRank(p[0])).sort((a, b) => b - a);
        const kicker = values.find(v => v !== pairValues[0] && v !== pairValues[1]) || 0;
        return { rank: 3, value: '两对', kickers: [...pairValues.slice(0, 2), kicker] };
    }
    // 一对
    if (pairs.length === 1) {
        const pairValue = cardValueToRank(pairs[0][0]);
        const kickers = values.filter(v => v !== pairValue).slice(0, 3);
        return { rank: 2, value: '一对', kickers: [pairValue, ...kickers] };
    }
    // 高牌
    return { rank: 1, value: '高牌', kickers: values.slice(0, 5) };
}

export function compareHands(hand1, hand2) {
    // 比较两个牌型
    if (hand1.rank > hand2.rank) return 1;
    if (hand1.rank < hand2.rank) return -1;

    // 相同牌型比较踢脚牌
    for (let i = 0; i < hand1.kickers.length; i++) {
        if (hand1.kickers[i] > hand2.kickers[i]) return 1;
        if (hand1.kickers[i] < hand2.kickers[i]) return -1;
    }
    return 0;
}

export function cardValueToRank(value) {
    const rankMap = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
        '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    return rankMap[value] || 0;
}
