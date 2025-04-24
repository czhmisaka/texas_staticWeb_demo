/*
 * @Date: 2025-04-23 10:10:34
 * @LastEditors: CZH
 * @LastEditTime: 2025-04-23 11:01:46
 * @FilePath: /texas-holdem/mobile.js
 */
// 移动端特有逻辑
export function initMobileUI() {
    // 初始化移动端控制按钮
    const foldBtn = document.getElementById('fold-btn');
    const checkBtn = document.getElementById('check-btn');
    const callBtn = document.getElementById('call-btn');
    const raiseBtn = document.getElementById('raise-btn');

    // 绑定点击事件
    foldBtn.addEventListener('click', () => window.GameManager.playerAction('fold'));
    checkBtn.addEventListener('click', () => window.GameManager.playerAction('check'));
    callBtn.addEventListener('click', () => window.GameManager.playerAction('call'));
    raiseBtn.addEventListener('click', () => window.GameManager.playerAction('raise'));

    // 绑定长按事件
    const bindLongPress = (element, action) => {
        let timer;
        element.addEventListener('touchstart', (e) => {
            timer = setTimeout(() => {
                window.GameManager.playerAction(action);
                e.preventDefault();
            }, 800);
        });
        element.addEventListener('touchend', () => clearTimeout(timer));
        element.addEventListener('touchmove', () => clearTimeout(timer));
    };

    bindLongPress(foldBtn, 'fold');
    bindLongPress(checkBtn, 'check');
    bindLongPress(callBtn, 'call');
    bindLongPress(raiseBtn, 'raise');

    // 添加滑动操作
    const gameArea = document.getElementById('game-area');
    let startX;
    gameArea.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });
    gameArea.addEventListener('touchmove', (e) => {
        if (!startX) return;
        const xDiff = startX - e.touches[0].clientX;
        if (Math.abs(xDiff) > 50) {
            window.GameManager.playerAction(xDiff > 0 ? 'raise' : 'fold');
            startX = null;
        }
    });

    // 移动端适配
    function adjustForMobile() {
        // 调整UI元素大小
        document.querySelectorAll('.card').forEach(card => {
            card.style.width = '10vw';
            card.style.height = '14vw';
            // 优化卡片动画性能
            card.style.willChange = 'transform';
        });

        // 调整字体大小
        document.querySelectorAll('.player-name, .chip-count').forEach(el => {
            el.style.fontSize = '4vw';
        });

        // 横屏优化
        if (window.innerWidth > window.innerHeight) {
            document.querySelector('.mobile-controls').style.gridTemplateColumns = 'repeat(4, 1fr)';
            document.querySelector('#game-area').style.paddingBottom = '70px';
        }
    }

    // 初始化游戏后调用适配
    window.GameManager.onGameReady(adjustForMobile);
}
