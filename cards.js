// 扑克牌定义
const suits = ['♥', '♦', '♣', '♠'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// 牌型权重
const HAND_RANKS = {
    HIGH_CARD: 1,
    PAIR: 2,
    TWO_PAIR: 3,
    THREE_OF_A_KIND: 4,
    STRAIGHT: 5,
    FLUSH: 6,
    FULL_HOUSE: 7,
    FOUR_OF_A_KIND: 8,
    STRAIGHT_FLUSH: 9,
    ROYAL_FLUSH: 10
};

// 生成一副新牌
function createDeck() {
    const deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ suit, rank });
        }
    }
    return deck;
}

// 洗牌函数
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// 获取牌型显示文本
function getCardText(card) {
    let colorClass = '';
    if (card.suit === '♥' || card.suit === '♦') {
        colorClass = 'card-heart';
    } else {
        colorClass = 'card-club';
    }
    return `<span class="${colorClass}">${card.rank}${card.suit}</span>`;
}

// 评估牌型
function evaluateHand(cards) {
    // 按牌值排序
    const sorted = [...cards].sort((a, b) =>
        ranks.indexOf(b.rank) - ranks.indexOf(a.rank)
    );

    // 统计牌值和花色
    const rankCounts = {};
    const suitCounts = {};
    ranks.forEach(r => rankCounts[r] = 0);
    suits.forEach(s => suitCounts[s] = 0);

    sorted.forEach(card => {
        rankCounts[card.rank]++;
        suitCounts[card.suit]++;
    });

    // 检查同花
    const flush = Object.values(suitCounts).some(count => count >= 5);

    // 检查顺子
    let straight = false;
    const rankOrder = 'A2345678910JQKA'; // 注意A可以用于低顺(A-2-3-4-5)
    const rankString = sorted.map(c => c.rank).join('');
    for (let i = 0; i <= rankOrder.length - 5; i++) {
        const sequence = rankOrder.substr(i, 5);
        if (rankString.includes(sequence)) {
            straight = true;
            break;
        }
    }

    // 检查各种牌型
    const pairs = Object.values(rankCounts).filter(count => count === 2).length;
    const threeKind = Object.values(rankCounts).some(count => count === 3);
    const fourKind = Object.values(rankCounts).some(count => count === 4);

    if (flush && straight) {
        // 检查皇家同花顺
        const royal = ['10', 'J', 'Q', 'K', 'A'].every(r =>
            sorted.some(c => c.rank === r)
        );
        return royal ? HAND_RANKS.ROYAL_FLUSH : HAND_RANKS.STRAIGHT_FLUSH;
    }
    if (fourKind) return HAND_RANKS.FOUR_OF_A_KIND;
    if (threeKind && pairs >= 1) return HAND_RANKS.FULL_HOUSE;
    if (flush) return HAND_RANKS.FLUSH;
    if (straight) return HAND_RANKS.STRAIGHT;
    if (threeKind) return HAND_RANKS.THREE_OF_A_KIND;
    if (pairs >= 2) return HAND_RANKS.TWO_PAIR;
    if (pairs === 1) return HAND_RANKS.PAIR;
    return HAND_RANKS.HIGH_CARD;
}

// 比较两手牌的强度
function compareHands(hand1, hand2) {
    const rank1 = evaluateHand(hand1);
    const rank2 = evaluateHand(hand2);

    if (rank1 !== rank2) {
        return rank1 - rank2;
    }

    // 如果牌型相同，比较具体牌值
    // (简化实现，实际德州扑克需要更复杂的比较)
    const highCard1 = Math.max(...hand1.map(c => ranks.indexOf(c.rank)));
    const highCard2 = Math.max(...hand2.map(c => ranks.indexOf(c.rank)));
    return highCard1 - highCard2;
}

export {
    createDeck,
    shuffleDeck,
    getCardText,
    evaluateHand,
    compareHands,
    HAND_RANKS
};
