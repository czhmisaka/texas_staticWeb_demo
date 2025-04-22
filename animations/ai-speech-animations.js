class AISpeechAnimator {
    constructor() {
        this.speechContainer = document.createElement('div');
        this.speechContainer.id = 'ai-speech-container';
        this.speechContainer.style.position = 'absolute';
        this.speechContainer.style.top = '0';
        this.speechContainer.style.left = '0';
        this.speechContainer.style.width = '100%';
        this.speechContainer.style.height = '100%';
        this.speechContainer.style.pointerEvents = 'none';
        this.speechContainer.style.zIndex = '1000';
        document.body.appendChild(this.speechContainer);

        // 预加载表情图标
        this.emojis = {
            normal: '😐',
            warning: '😠',
            happy: '😊',
            sad: '😢',
            surprise: '😲'
        };
    }

    showMessage(aiName, message, type = 'normal') {
        // 移除旧的发言气泡
        const oldBubble = document.querySelector('.ai-speech-bubble');
        if (oldBubble) {
            oldBubble.remove();
        }

        // 创建气泡元素
        const bubble = this.createBubbleElement(message, type);

        // 添加到容器
        this.speechContainer.appendChild(bubble);

        // 设置位置
        this.positionBubble(bubble, aiName);

        // 播放动画
        this.playBubbleAnimation(bubble);
    }

    createBubbleElement(message, type) {
        const bubble = document.createElement('div');
        bubble.className = `ai-speech-bubble ${type}`;

        // 添加表情图标
        const emoji = document.createElement('span');
        emoji.className = 'ai-speech-emoji';
        emoji.textContent = this.getEmojiForType(type);
        bubble.appendChild(emoji);

        // 添加消息文本
        const text = document.createElement('span');
        text.className = 'ai-speech-text';
        text.textContent = message;
        bubble.appendChild(text);

        // 创建三角形指针
        const pointer = document.createElement('div');
        pointer.className = 'ai-speech-pointer';
        bubble.appendChild(pointer);

        return bubble;
    }

    getEmojiForType(type) {
        const emojiMap = {
            normal: '😐',
            warning: '😠',
            happy: '😊',
            sad: '😢',
            surprise: '😲',
            bluff: '😏',
            allin: '😎',
            fold: '😑',
            raise: '😤',
            thinking: '🤔',
            winning: '🤑',
            losing: '😫',
            royalflush: '🤴',
            straightflush: '👑',
            fourkind: '🃏',
            fullhouse: '🏠',
            flush: '💎',
            straight: '📏',
            threekind: '🎰',
            twopair: '✌️',
            pair: '👆'
        };
        return emojiMap[type] || emojiMap.normal;
    }

    positionBubble(bubble, aiName) {
        const playerElement = document.querySelector(`.player[data-name="${aiName}"]`);
        if (playerElement) {
            const rect = playerElement.getBoundingClientRect();
            bubble.style.left = `${rect.left + rect.width / 2 - bubble.offsetWidth / 2}px`;
            bubble.style.top = `${rect.top - bubble.offsetHeight - 10}px`;
        } else {
            // 默认位置
            bubble.style.left = '50%';
            bubble.style.top = '20%';
            bubble.style.transform = 'translateX(-50%)';
        }
    }

    playBubbleAnimation(bubble) {
        // 根据类型选择动画
        const type = bubble.className.split(' ')[1];
        const animationMap = {
            normal: ['fadeIn'],
            warning: ['shake', 'pulse'],
            happy: ['bounceIn', 'tada'],
            sad: ['fadeInDown'],
            surprise: ['zoomIn', 'flash'],
            bluff: ['slideInRight', 'swing'],
            allin: ['rubberBand', 'heartBeat'],
            raise: ['bounceInLeft'],
            royalflush: ['jackInTheBox', 'flip'],
            straightflush: ['flipInX'],
            fourkind: ['flipInY'],
            default: ['fadeIn']
        };

        const anims = animationMap[type] || animationMap.default;
        const randomAnim = anims[Math.floor(Math.random() * anims.length)];

        // 播放音效
        this.playSound(type);

        bubble.style.animation = `${randomAnim} 0.5s ease-out forwards`;

        // 自动隐藏
        setTimeout(() => {
            bubble.style.animation = 'fadeOut 0.3s ease-in forwards';
            setTimeout(() => {
                bubble.remove();
            }, 300);
        }, type === 'royalflush' ? 6000 : 4000);
    }

    playSound(type) {
        const soundMap = {
            normal: 'sounds/chat.mp3',
            warning: 'sounds/warning.mp3',
            happy: 'sounds/happy.mp3',
            royalflush: 'sounds/fanfare.mp3',
            straightflush: 'sounds/trumpet.mp3',
            allin: 'sounds/chips.mp3',
            bluff: 'sounds/bluff.mp3',
            fold: 'sounds/fold.mp3',
            raise: 'sounds/raise.mp3',
            thinking: 'sounds/thinking.mp3',
            winning: 'sounds/winning.mp3',
            losing: 'sounds/losing.mp3',
            default: 'sounds/notification.mp3'
        };

        const soundFile = soundMap[type] || soundMap.default;
        const audio = new Audio(soundFile);
        audio.volume = 0.3;
        audio.play().catch(e => console.log('音效播放失败:', e));
    }
}

const aiSpeechAnimator = new AISpeechAnimator();
export default aiSpeechAnimator;
