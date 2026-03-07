// --- 游戏配置 ---
const boardWidth = 15;
const boardHeight = 15;
let level = 1;
let gameActive = true;
let currentPlayer = 'black'; // 子祺
let boardState = []; // 2D 数组
let history = [];
let moveCounter = 0; // 每两手触发一次

// --- DOM 元素 ---
const boardElement = document.getElementById('board');
const narratorLog = document.getElementById('narrator-log');
const playerZiqi = document.getElementById('player-ziqi');
const playerJinengwu = document.getElementById('player-jinengwu');
const modal = document.getElementById('modal');
const bgm = document.getElementById('bgm');
const bgmBtn = document.getElementById('bgm-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');

let isMusicPlaying = true; // 默认开启
let taikulaCells = []; // 记录被泰裤辣冻结的坐标

// --- 助手函数 ---
function randomizeTheme() {
    // 随机色相
    const h = Math.floor(Math.random() * 360);
    // 生成配色：深背景(S=20,L=5), 棋盘色(S=40,L=15), 强调色(S=70,L=50)
    const bgColor = `hsl(${h}, 20%, 5%)`;
    const boardColor = `hsl(${h}, 30%, 12%)`;
    const accentColor = `hsl(${h}, 70%, 50%)`;
    const glassBg = `hsla(${h}, 70%, 50%, 0.1)`;
    const gridColor = `hsla(${h}, 70%, 50%, 0.3)`;

    document.documentElement.style.setProperty('--bg-color', bgColor);
    document.documentElement.style.setProperty('--board-wood', boardColor);
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--glass-bg', glassBg);
    document.documentElement.style.setProperty('--grid-color', gridColor);

    console.log(`🎨 本局主题色相：${h}`);
}

function toggleMusic() {
    if (isMusicPlaying) {
        bgm.pause();
        bgmBtn.textContent = '🎵 开启音乐';
    } else {
        randomizeBgmRate();
        bgm.play().catch(e => console.log("等待用户交互以播放音乐", e));
        bgmBtn.textContent = '🔇 静音';
    }
    isMusicPlaying = !isMusicPlaying;
}

function randomizeBgmRate() {
    if (bgm) {
        const newRate = 0.5 + Math.random() * 1.3;
        bgm.playbackRate = newRate;
        console.log(`🎬 戏剧提示：当前 BGM 进入 ${newRate < 1 ? '慢速压抑' : '鬼畜加速'} 模式 (${newRate.toFixed(2)}x)`);
    }
}

if (bgm) {
    bgm.addEventListener('timeupdate', () => {
        if (bgm.currentTime > bgm.duration - 0.2) {
            // cycle rate if needed
        }
    });
}

function autoPlayCheck() {
    if (bgm && isMusicPlaying) {
        randomizeBgmRate();
        bgm.play().then(() => {
            bgmBtn.textContent = '🔇 静音';
        }).catch(() => {
            bgmBtn.textContent = '🎵 开启音乐';
            isMusicPlaying = false;
        });
    }
}

function updateNarrator(text, type = 'system') {
    if (!narratorLog) return;
    const entry = document.createElement('div');
    entry.classList.add('log-entry', type);

    let prefix = '🎙️ ';
    if (type === 'skill') {
        prefix = '🎭 ';
        entry.style.color = 'var(--accent-color)';
        entry.style.fontWeight = 'bold';
    }

    entry.textContent = prefix + text;
    narratorLog.appendChild(entry);

    requestAnimationFrame(() => {
        narratorLog.scrollTop = narratorLog.scrollHeight;
    });
}

// --- 技能列表 ---
const ALL_SKILLS = [
    { name: "象棋乱入", func: skillXiangqi, quote: "这局五子棋太无聊了，我们来点象棋。帅，出击！（由于外挂介入，砸下帅字棋并震碎周围 十字形 棋子）" },
    { name: "反复横跳", func: skillRift, quote: "由于空间出现裂缝，两个幸运棋子互换了时空。（逻辑崩坏：随机两颗棋子交换了位置）" },
    { name: "戏剧黑洞", func: skillBlackHole, quote: "系统提示：检测到剧场空间严重撕裂，产生了螺旋黑洞！（戏剧冲突：场上随机撕开多个螺旋黑洞，永久封锁禁区）" },
    { name: "力拔山兮", func: skillRollback, quote: "力拔山兮气盖世！这一带的因果，由我强行扭转！（时空倒流：霸气震慑下，棋盘强制回到 4 手前的状态）" },
    { name: "飞沙走石", func: skillShaqing, quote: "大师发功，飞沙走石！这一带的逻辑都被吹飞了。（风暴降临：随机吹走场上一颗现有棋子）" },
    { name: "北漂生活", func: skillPiaoyi, quote: "生活已经这么累了，棋子也想换个轨道漂移一下。（随机迁徙：场上随机一颗棋子向四周任意可移动方向漂移一格）" },
    { name: "真香警告", func: skillZhenxiang, quote: "子祺，你这黑子看起来挺顺眼，现在它是我的了。真香！（化敌为友：随机选中场上的一颗黑子并将其永久变为白子）" },
    { name: "泰裤辣", func: skillTaikula, quote: "感觉这十字路口，被我帅到了极冻。泰裤辣！（绝对零度：封锁随机十字格子，直到下次落子）" },
    { name: "要爆了", func: skillBoom, quote: "注意！这一带由于算力过载要爆了！躲远点！（核心过载：随机区域局部震动并炸碎 3x3 棋子）" },
    { name: "移花接木", func: skillSwap, quote: "量子纠缠触发：我们换个位置说话怎么样？（量子缠绕：场上随机一黑一白棋子互换位置）" }
];

// --- 初始化 ---
function initGame() {
    console.log("初始化 15x15 剧场");
    randomizeTheme();
    boardState = Array(boardHeight).fill(null).map(() => Array(boardWidth).fill(null));
    taikulaCells = [];
    history = [];
    moveCounter = 0;
    renderBoard();
    updateNarrator("《技能五子棋》15x15 经典版开拍！", 'system');
    autoPlayCheck();
}

function resetGame() {
    gameActive = true;
    currentPlayer = 'black';
    initGame();
}

function renderBoard() {
    const cellSize = getComputedStyle(document.documentElement).getPropertyValue('--cell-size').trim() || '40px';
    boardElement.style.gridTemplateColumns = `repeat(${boardWidth}, ${cellSize})`;
    boardElement.style.gridTemplateRows = `repeat(${boardHeight}, ${cellSize})`;
    boardElement.innerHTML = '';

    for (let r = 0; r < boardHeight; r++) {
        for (let c = 0; c < boardWidth; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;

            const cellState = boardState[r][c];
            if (cellState && cellState !== 'disabled') {
                if (cellState.isBlackHole) {
                    const bh = document.createElement('div');
                    bh.classList.add('black-hole');
                    cell.appendChild(bh);
                } else {
                    const stone = document.createElement('div');
                    const color = typeof cellState === 'string' ? cellState : cellState.color;
                    stone.classList.add('stone', color);

                    if (cellState.isXiangqi) {
                        stone.classList.add('xiangqi-piece');
                        stone.textContent = cellState.text;
                    }

                    if (cellState.isGhost) stone.style.opacity = "0.5";
                    cell.appendChild(stone);
                }
            } else if (cellState === 'disabled') {
                cell.style.backgroundColor = "rgba(0,0,0,0.5)";
                cell.innerHTML = "❄️";
                cell.style.display = "flex";
                cell.style.justifyContent = "center";
                cell.style.alignItems = "center";
            }

            cell.addEventListener('click', () => playerMove(r, c));
            boardElement.appendChild(cell);
        }
    }
}

// --- 核心驱动 ---
function playerMove(r, c) {
    if (!gameActive || currentPlayer !== 'black' || boardState[r][c]) return;

    if (!isMusicPlaying && bgm) {
        randomizeBgmRate();
        toggleMusic();
    }

    placeStone(r, c, 'black');
    if (!gameActive) return;

    moveCounter++;
    handleTurnLogic();
}

function handleTurnLogic() {
    if (moveCounter > 0 && moveCounter % 2 === 0) {
        setTimeout(triggerWildSkill, 600);
    } else {
        switchTurn();
        if (currentPlayer === 'white') {
            setTimeout(aiMove, 800);
        }
    }
}

function placeStone(r, c, color) {
    if (taikulaCells.length > 0) {
        taikulaCells.forEach(cell => {
            if (boardState[cell.r][cell.c] === 'disabled') boardState[cell.r][cell.c] = null;
        });
        taikulaCells = [];
    }

    boardState[r][c] = color;
    history.push({ r, c, color });
    renderBoard();

    if (checkWin(r, c, color)) {
        gameWin(color);
        return true;
    }
    return false;
}

function switchTurn() {
    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    if (playerZiqi) playerZiqi.classList.toggle('active', currentPlayer === 'black');
    if (playerJinengwu) playerJinengwu.classList.toggle('active', currentPlayer === 'white');
}

function triggerWildSkill() {
    const skill = ALL_SKILLS[Math.floor(Math.random() * ALL_SKILLS.length)];
    updateNarrator(`张呈用了技能【${skill.name}】`, 'skill');

    setTimeout(() => {
        try { skill.func(); } catch (e) { console.error(e); }
        updateNarrator(skill.quote, 'system');
        switchTurn();
        if (currentPlayer === 'white') setTimeout(aiMove, 800);
    }, 1000);
}

// --- 视觉反馈助手 ---
function highlightCell(r, c, duration = 2000) {
    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (cell) {
        cell.classList.add('highlight-effect');
        setTimeout(() => cell.classList.remove('highlight-effect'), duration);
    }
}

// --- 技能实现 ---
function skillXiangqi() {
    const r = Math.floor(Math.random() * boardHeight);
    const c = Math.floor(Math.random() * boardWidth);
    const crossDirs = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
    crossDirs.forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        if (isIn(nr, nc)) {
            const cell = document.querySelector(`.cell[data-row="${nr}"][data-col="${nc}"]`);
            if (cell) cell.classList.add('shake-effect');
            highlightCell(nr, nc, 1000);
        }
    });
    setTimeout(() => {
        crossDirs.forEach(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            if (isIn(nr, nc)) boardState[nr][nc] = null;
        });
        boardState[r][c] = { color: null, isXiangqi: true, text: '帥' };
        renderBoard();
        highlightCell(r, c, 1500);
    }, 500);
}

function skillRift() {
    const stones = [];
    for (let r = 0; r < boardHeight; r++) for (let c = 0; c < boardWidth; c++) if (boardState[r][c] && boardState[r][c] !== 'disabled') stones.push({ r, c, data: boardState[r][c] });
    if (stones.length >= 2) {
        const idx1 = Math.floor(Math.random() * stones.length);
        let idx2; do { idx2 = Math.floor(Math.random() * stones.length); } while (idx1 === idx2);
        const s1 = stones[idx1], s2 = stones[idx2];
        highlightCell(s1.r, s1.c, 2000); highlightCell(s2.r, s2.c, 2000);
        boardState[s1.r][s1.c] = s2.data; boardState[s2.r][s2.c] = s1.data;
        renderBoard();
    }
}

function skillBlackHole() {
    const count = 2 + Math.floor(Math.random() * 3);
    let created = 0;
    for (let i = 0; i < 20 && created < count; i++) {
        let r = Math.floor(Math.random() * boardHeight), c = Math.floor(Math.random() * boardWidth);
        if (!boardState[r][c]) { boardState[r][c] = { isBlackHole: true }; highlightCell(r, c, 2500); created++; }
    }
    renderBoard();
}

function skillRollback() {
    const rollbackCount = Math.min(history.length, 4);
    if (rollbackCount > 0) {
        for (let i = 0; i < rollbackCount; i++) {
            const last = history.pop();
            if (last) { highlightCell(last.r, last.c, 1500); boardState[last.r][last.c] = null; moveCounter--; }
        }
        renderBoard();
    } else {
        updateNarrator("系统提示：历史数据不足，时空倒流失败！", 'system');
    }
}

function skillShaqing() {
    const all = []; for (let r = 0; r < boardHeight; r++) for (let c = 0; c < boardWidth; c++) if (boardState[r][c] && boardState[r][c] !== 'disabled') all.push({ r, c });
    if (all.length > 0) {
        const t = all[Math.floor(Math.random() * all.length)];
        highlightCell(t.r, t.c, 1500); boardState[t.r][t.c] = null;
        renderBoard();
    }
}

function skillPiaoyi() {
    const stones = [];
    for (let r = 0; r < boardHeight; r++) for (let c = 0; c < boardWidth; c++) if (boardState[r][c] && boardState[r][c] !== 'disabled') stones.push({ r, c, data: boardState[r][c] });
    if (stones.length > 0) {
        const stone = stones[Math.floor(Math.random() * stones.length)];
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]].sort(() => Math.random() - 0.5);
        for (let [dr, dc] of dirs) {
            const nr = stone.r + dr, nc = stone.c + dc;
            if (isIn(nr, nc) && !boardState[nr][nc]) {
                highlightCell(stone.r, stone.c, 1000); highlightCell(nr, nc, 1000);
                boardState[nr][nc] = stone.data; boardState[stone.r][stone.c] = null;
                renderBoard(); return;
            }
        }
    }
}

function skillZhenxiang() {
    const blacks = [];
    for (let r = 0; r < boardHeight; r++) for (let c = 0; c < boardWidth; c++) if (getStoneColor(r, c) === 'black') blacks.push({ r, c });
    if (blacks.length > 0) {
        const target = blacks[Math.floor(Math.random() * blacks.length)];
        highlightCell(target.r, target.c, 2000); boardState[target.r][target.c] = 'white'; renderBoard();
    }
}

function skillTaikula() {
    const r = Math.floor(Math.random() * boardHeight), c = Math.floor(Math.random() * boardWidth);
    taikulaCells = [];
    for (let j = 0; j < boardWidth; j++) if (!boardState[r][j]) { boardState[r][j] = 'disabled'; taikulaCells.push({ r, c: j }); highlightCell(r, j, 3000); }
    for (let i = 0; i < boardHeight; i++) if (!boardState[i][c]) { boardState[i][c] = 'disabled'; taikulaCells.push({ r: i, c }); highlightCell(i, c, 3000); }
    renderBoard();
}

function skillBoom() {
    let r = Math.floor(Math.random() * boardHeight), c = Math.floor(Math.random() * boardWidth);
    highlightCell(r, c, 1000);
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (isIn(r + i, c + j)) {
        const cell = document.querySelector(`.cell[data-row="${r + i}"][data-col="${c + j}"]`);
        if (cell) cell.classList.add('shake-effect');
        if (boardState[r + i][c + j]) highlightCell(r + i, c + j, 1000);
    }
    setTimeout(() => {
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (isIn(r + i, c + j)) boardState[r + i][c + j] = null;
        renderBoard();
        boardElement.classList.add('shake-effect');
        setTimeout(() => boardElement.classList.remove('shake-effect'), 500);
    }, 500);
}

function skillSwap() {
    let blacks = [], whites = [];
    for (let r = 0; r < boardHeight; r++) for (let c = 0; c < boardWidth; c++) { let co = getStoneColor(r, c); if (co === 'black') blacks.push({ r, c }); else if (co === 'white') whites.push({ r, c }); }
    if (blacks.length > 0 && whites.length > 0) {
        let b = blacks[Math.floor(Math.random() * blacks.length)], w = whites[Math.floor(Math.random() * whites.length)];
        highlightCell(b.r, b.c, 2000); highlightCell(w.r, w.c, 2000);
        let t = boardState[b.r][b.c]; boardState[b.r][b.c] = boardState[w.r][w.c]; boardState[w.r][w.c] = t; renderBoard();
    }
}

// --- AI (权重引擎) ---
function aiMove() {
    if (!gameActive) return;
    updateNarrator("算力调度中...", 'system');
    setTimeout(() => {
        try {
            const bestMove = findBestWeightedMove();
            if (bestMove) { placeStone(bestMove.r, bestMove.c, 'white'); if (gameActive) { moveCounter++; handleTurnLogic(); } }
        } catch (e) { let rnd = randomMove(); if (rnd) placeStone(rnd.r, rnd.c, 'white'); switchTurn(); }
    }, 600);
}

function findBestWeightedMove() {
    let bestScore = -1, bestMoves = [];
    for (let r = 0; r < boardHeight; r++) for (let c = 0; c < boardWidth; c++) if (!boardState[r][c]) {
        const score = calculateWeight(r, c);
        if (score > bestScore) { bestScore = score; bestMoves = [{ r, c }]; }
        else if (score === bestScore) { bestMoves.push({ r, c }); }
    }
    return bestMoves.length > 0 ? bestMoves[Math.floor(Math.random() * bestMoves.length)] : null;
}

function calculateWeight(r, c) {
    let score = 0;
    const dH = Math.abs(r - 7), dW = Math.abs(c - 7);
    score += (15 - (dH + dW)) * 0.1;
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let [dr, dc] of dirs) {
        score += analyzeDirection(r, c, dr, dc, 'white') * 1.5;
        score += analyzeDirection(r, c, dr, dc, 'black') * 1.1;
    }
    return score;
}

function analyzeDirection(row, col, dr, dc, color) {
    let count = 1, block = 0;
    let r = row + dr, c = col + dc;
    while (isIn(r, c) && getStoneColor(r, c) === color) { count++; r += dr; c += dc; }
    if (!isIn(r, c) || (getStoneColor(r, c) && getStoneColor(r, c) !== color)) block++;
    r = row - dr; c = col - dc;
    while (isIn(r, c) && getStoneColor(r, c) === color) { count++; r -= dr; c -= dc; }
    if (!isIn(r, c) || (getStoneColor(r, c) && getStoneColor(r, c) !== color)) block++;
    if (count >= 5) return 10000;
    if (count === 4 && block === 0) return 3000;
    if (count === 4 && block === 1) return 1000;
    if (count === 3 && block === 0) return 500;
    return count * 2;
}

function getStoneColor(r, c) {
    const s = boardState[r][c]; if (!s || s === 'disabled') return null;
    return typeof s === 'string' ? s : s.color;
}

function randomMove() {
    const empty = []; for (let r = 0; r < boardHeight; r++) for (let c = 0; c < boardWidth; c++) if (!boardState[r][c]) empty.push({ r, c });
    return empty.length > 0 ? empty[Math.floor(Math.random() * empty.length)] : null;
}

function checkWin(row, col, color) {
    const target = color.color || color;
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let [dr, dc] of dirs) {
        let count = 1, r = row + dr, c = col + dc;
        while (isIn(r, c) && getStoneColor(r, c) === target) { count++; r += dr; c += dc; }
        r = row - dr; c = col - dc;
        while (isIn(r, c) && getStoneColor(r, c) === target) { count++; r -= dr; c -= dc; }
        if (count >= 5) return true;
    }
    return false;
}

function isIn(r, c) { return r >= 0 && r < boardHeight && c >= 0 && c < boardWidth; }

function gameWin(color) {
    gameActive = false;
    if (bgm) { bgm.pause(); bgm.currentTime = 0; isMusicPlaying = false; bgmBtn.textContent = '🎵 开启音乐'; }
    const isPlayerWin = (color === 'black');
    if (isPlayerWin) triggerWinVFX(); else triggerLossVFX();
    const msg = isPlayerWin ? "恭喜你！子祺获胜了！" : "遗憾！技能五获胜了。";
    updateNarrator("🏆 结局：" + msg, 'system');
}

function triggerWinVFX() {
    const layer = document.getElementById('vfx-layer') || createVFXLayer();
    for (let i = 0; i < 100; i++) setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
        confetti.style.width = (Math.random() * 8 + 5) + 'px';
        confetti.style.height = (Math.random() * 15 + 5) + 'px';
        layer.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
    }, i * 20);
}

function triggerLossVFX() {
    const layer = document.getElementById('vfx-layer') || createVFXLayer();
    for (let i = 0; i < 50; i++) setTimeout(() => {
        const smoke = document.createElement('div');
        smoke.classList.add('smoke-particle');
        smoke.style.left = Math.random() * 100 + 'vw'; smoke.style.top = '100vh';
        layer.appendChild(smoke);
        setTimeout(() => smoke.remove(), 4000);
    }, i * 100);
}

function createVFXLayer() {
    const div = document.createElement('div'); div.id = 'vfx-layer';
    document.body.appendChild(div); return div;
}

// --- 手机端适配与全屏控制 ---
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => alert(`无法进入全屏: ${err.message}`));
        if (fullscreenBtn) fullscreenBtn.textContent = '退出全屏';
    } else {
        if (document.exitFullscreen) { document.exitFullscreen(); if (fullscreenBtn) fullscreenBtn.textContent = '📺 全屏模式'; }
    }
}

function updateBoardScale() {
    const area = document.querySelector('.board-area');
    if (!area) return;

    const vWidth = area.clientWidth;
    const vHeight = area.clientHeight;

    // 根据屏幕宽度判断是否为移动端，从而动态调整 padding 预留空间
    const innerPadding = window.innerWidth <= 600 ? 10 : 30;
    const topOffset = window.innerWidth <= 600 ? 60 : 0; // 移动端顶部按钮高度
    const bottomOffset = window.innerWidth <= 600 ? 130 : 0; // 移动端底部玩家+日志空间

    const availableW = vWidth - innerPadding * 2;
    const availableH = vHeight - innerPadding * 2 - topOffset - bottomOffset;

    const sizeW = Math.floor(availableW / boardWidth);
    const sizeH = Math.floor(availableH / boardHeight);

    const cellSize = Math.max(15, Math.min(sizeW, sizeH, 40));

    document.documentElement.style.setProperty('--cell-size', `${cellSize}px`);

    // 棋盘偏移修正 (如果需要，可以通过 translate 微调，但 padding 已处理)
    if (boardElement) {
        boardElement.style.gridTemplateColumns = `repeat(${boardWidth}, ${cellSize}px)`;
        boardElement.style.gridTemplateRows = `repeat(${boardHeight}, ${cellSize}px)`;
    }
}

window.addEventListener('resize', updateBoardScale);
if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && fullscreenBtn) fullscreenBtn.textContent = '📺 全屏模式';
    setTimeout(updateBoardScale, 100);
});
window.addEventListener('load', updateBoardScale);

if (document.getElementById('restart-btn')) document.getElementById('restart-btn').addEventListener('click', resetGame);
if (bgmBtn) bgmBtn.addEventListener('click', toggleMusic);

initGame();
setTimeout(updateBoardScale, 100);
