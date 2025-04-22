class VictoryAnimator {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'victory-animation';
        document.body.appendChild(this.container);
    }

    showVictory(playerName, type = 'normal') {
        // 清除旧的胜利动画
        this.container.innerHTML = '';

        // 创建背景闪光效果
        this.createFlashEffect();

        // 创建胜利文本元素
        const textElement = document.createElement('div');
        textElement.className = 'victory-text';

        // 根据类型设置不同文本和样式
        switch (type) {
            case 'allin':
                textElement.textContent = `${playerName} All in胜利!`;
                textElement.style.color = '#f56565';
                textElement.style.fontSize = '2.5rem';
                textElement.style.textShadow = '0 0 10px #f56565';
                break;
            case 'showdown':
                textElement.textContent = `${playerName} 赢得底池!`;
                textElement.style.color = '#f6e05e';
                textElement.style.fontSize = '2.2rem';
                textElement.style.textShadow = '0 0 8px #f6e05e';
                break;
            case 'royalflush':
                textElement.textContent = `${playerName} 皇家同花顺!`;
                textElement.style.color = '#9f7aea';
                textElement.style.fontSize = '3rem';
                textElement.style.textShadow = '0 0 15px #9f7aea';
                break;
            case 'straightflush':
                textElement.textContent = `${playerName} 同花顺!`;
                textElement.style.color = '#4299e1';
                textElement.style.fontSize = '2.8rem';
                textElement.style.textShadow = '0 0 12px #4299e1';
                break;
            case 'fourkind':
                textElement.textContent = `${playerName} 四条!`;
                textElement.style.color = '#ed8936';
                textElement.style.fontSize = '2.6rem';
                textElement.style.textShadow = '0 0 10px #ed8936';
                break;
            case 'fullhouse':
                textElement.textContent = `${playerName} 葫芦!`;
                textElement.style.color = '#38b2ac';
                textElement.style.fontSize = '2.4rem';
                textElement.style.textShadow = '0 0 8px #38b2ac';
                break;
            case 'flush':
                textElement.textContent = `${playerName} 同花!`;
                textElement.style.color = '#805ad5';
                textElement.style.fontSize = '2.3rem';
                textElement.style.textShadow = '0 0 8px #805ad5';
                break;
            case 'straight':
                textElement.textContent = `${playerName} 顺子!`;
                textElement.style.color = '#3182ce';
                textElement.style.fontSize = '2.2rem';
                textElement.style.textShadow = '0 0 7px #3182ce';
                break;
            case 'threekind':
                textElement.textContent = `${playerName} 三条!`;
                textElement.style.color = '#dd6b20';
                textElement.style.fontSize = '2.1rem';
                textElement.style.textShadow = '0 0 6px #dd6b20';
                break;
            case 'twopair':
                textElement.textContent = `${playerName} 两对!`;
                textElement.style.color = '#d69e2e';
                textElement.style.fontSize = '2rem';
                textElement.style.textShadow = '0 0 5px #d69e2e';
                break;
            case 'pair':
                textElement.textContent = `${playerName} 一对!`;
                textElement.style.color = '#38a169';
                textElement.style.fontSize = '1.9rem';
                textElement.style.textShadow = '0 0 4px #38a169';
                break;
            default:
                textElement.textContent = `${playerName} 胜利!`;
                textElement.style.color = '#48bb78';
                textElement.style.fontSize = '2rem';
                textElement.style.textShadow = '0 0 5px #48bb78';
        }

        // 添加粒子效果
        this.createParticles(type);

        // 播放音效
        this.playSound(type);

        // 添加到容器
        this.container.appendChild(textElement);

        // 5秒后自动隐藏
        setTimeout(() => {
            this.container.innerHTML = '';
        }, 5000);
    }

    playSound(type) {
        const soundMap = {
            allin: 'sounds/allin.mp3',
            showdown: 'sounds/win.mp3',
            royalflush: 'sounds/royalflush.mp3',
            straightflush: 'sounds/straightflush.mp3',
            fourkind: 'sounds/fourkind.mp3',
            fullhouse: 'sounds/fullhouse.mp3',
            flush: 'sounds/flush.mp3',
            straight: 'sounds/straight.mp3',
            threekind: 'sounds/threekind.mp3',
            twopair: 'sounds/twopair.mp3',
            pair: 'sounds/pair.mp3',
            default: 'sounds/victory.mp3'
        };

        const soundFile = soundMap[type] || soundMap.default;
        const audio = new Audio(soundFile);
        audio.volume = 0.5;
        audio.play().catch(e => console.log('音效播放失败:', e));
    }

    createFlashEffect() {
        const flash = document.createElement('div');
        flash.className = 'victory-flash';
        this.container.appendChild(flash);
    }

    createParticles(type) {
        const particleCount = 150;
        const colors = this.getParticleColors(type);

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            const particleType = Math.random() > 0.3 ?
                (Math.random() > 0.5 ? 'small' : 'medium') : 'large';
            const isRising = Math.random() > 0.7;

            particle.className = `victory-particle ${particleType} ${isRising ? 'rising' : ''}`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.animationDelay = `${Math.random() * 0.5}s`;

            this.container.appendChild(particle);
        }
    }

    getParticleColors(type) {
        const colorMap = {
            allin: ['#f56565', '#fc8181', '#fed7d7'],
            showdown: ['#f6e05e', '#faf089', '#fefcbf'],
            royalflush: ['#9f7aea', '#b794f4', '#e9d8fd'],
            straightflush: ['#4299e1', '#63b3ed', '#bee3f8'],
            fourkind: ['#ed8936', '#f6ad55', '#feebc8'],
            fullhouse: ['#38b2ac', '#4fd1c5', '#b2f5ea'],
            flush: ['#805ad5', '#9f7aea', '#e9d8fd'],
            straight: ['#3182ce', '#63b3ed', '#bee3f8'],
            threekind: ['#dd6b20', '#ed8936', '#feebc8'],
            twopair: ['#d69e2e', '#f6e05e', '#fefcbf'],
            pair: ['#38a169', '#68d391', '#c6f6d5'],
            default: ['#48bb78', '#68d391', '#c6f6d5']
        };
        return colorMap[type] || colorMap.default;
    }
}

const victoryAnimator = new VictoryAnimator();
export default victoryAnimator;
