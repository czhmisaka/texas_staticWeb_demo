import { evaluateHand, cardValueToRank } from '../cards-evaluator.js';

export class TexasHoldemAI {
    constructor(game, playerIndex) {
        this.game = game;
        this.playerIndex = playerIndex;
        this.player = game.players[playerIndex];
    }

    getHandStrength() {
        if (!this.player || !this.player.cards) return 0;

        if (this.game.communityCards.length === 0) {
            return this.monteCarloHoleCardEvaluation();
        } else if (this.game.communityCards.length < 5) {
            const mcStrength = this.monteCarloEvaluation(100);
            const heuristicStrength = this.evaluateCombinedHand(
                [...this.player.cards, ...this.game.communityCards]
            );
            return (mcStrength * 0.7 + heuristicStrength * 0.3);
        } else {
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

        return (winCount * 0.7 + tieCount * 0.3) / sampleCount;
    }

    monteCarloEvaluation(sampleCount = 100) {
        const knownCards = [...this.player.cards, ...this.game.communityCards];
        const remainingCards = 5 - this.game.communityCards.length;
        const opponentCount = this.game.players.length - 1;
        let winCount = 0;

        for (let i = 0; i < sampleCount; i++) {
            const simulatedBoard = this.game.simulateBoard(remainingCards, knownCards);
            const myHand = [...this.player.cards, ...this.game.communityCards, ...simulatedBoard];
            const myRank = evaluateHand(myHand).rank;

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

    getHoleCardsStrength() {
        if (!this.player?.cards || this.player.cards.length < 2) {
            return 0.3;
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

        if (paired) {
            return 0.7 + (maxRank * 0.02);
        }

        if (suited) {
            if (connected) {
                return 0.6 + (maxRank * 0.015);
            }
            return 0.55 + (maxRank * 0.01);
        }

        if (connected) {
            return 0.5 + (maxRank * 0.01);
        }

        return 0.3 + (maxRank * 0.01);
    }

    evaluateCombinedHand(cards) {
        if (!this.game || !cards || cards.length < 2) return 0;

        const handEvaluation = evaluateHand(cards);
        let strength = handEvaluation.rank / 10;

        const kickerSum = handEvaluation.kickers.reduce((sum, k) => sum + k, 0);
        const kickerBonus = kickerSum * 0.0005;

        return Math.min(1, strength + kickerBonus);
    }

    cardValueToRank(value) {
        const rankMap = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
            '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12,
            'K': 13, 'A': 14
        };
        return rankMap[value] || 0;
    }
}
