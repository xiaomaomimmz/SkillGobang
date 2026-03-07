// --- 游戏配置 ---
let boardWidth = 9;
let boardHeight = 3;
let level = 1;
let gameActive = true;
let currentPlayer = 'black'; // 子祺
let boardState = []; // 2D 数组
let history = [];
let isFoggy = false;

// --- DOM 元素 ---
const boardElement = document.getElementById('board');
const boardViewport = document.getElementById('board-viewport');
const narratorText = document.getElementById('narrator-text');
const levelDisplay = document.getElementById('level-display');
const sizeDisplay = document.getElementById('size-display');
const playerZiqi = document.getElementById('player-ziqi');
const playerJinengwu = document.getElementById('player-jinengwu');
const modal = document.getElementById('modal');
const winnerText = document.getElementById('winner-text');
const modalNext = document.getElementById('modal-next');

// --- 扩大的搞怪技能列表 ---
const ALL_SKILLS = [
    { name: "凡尔赛文学", func: skillFansai, quote: "哎呀，随便下一手竟然这么完美，真是苦恼呢。" },
    { name: "你是我的眼", func: skillEyes, quote: "虽然我看不见，但我的心能感受到你的绝望。" },
    { name: "真香警告", func: skillZhenxiang, quote: "这步棋你以为稳了？呵，真香！" },
    { name: "泰裤辣", func: skillTaikula, quote: "这一手，帅到连棋盘都冻结了！泰裤辣！" },
    { name: "退! 退! 退!", func: skillTui, quote: "妖邪退散！把你刚才那颗烂棋拿走！" },
    { name: "炸雷", func: skillBoom, quote: "在这个充满喧嚣的世界，只有爆炸才是艺术！" },
    { name: "反复横跳", func: skillJump, quote: "看我的奥义：左左右右，BABA！" },
    { name: "消失的她", func: skillXiaoshi, quote: "棋子也会有它自己的旅行，不必找了。" }
];

// --- 初始化 ---
function initGame() {
    boardState = Array(boardHeight).fill(null).map(() => Array(boardWidth).fill(null));
    renderBoard();
    updateNarrator("《技能五子棋》已更新！9x3迷你开局，小心技能。");
    updateStats();
    isFoggy = false;
    document.body.classList.remove('fensai-mode');
    setTimeout(scrollToBottom, 100);
}

function renderBoard() {
    boardElement.style.gridTemplateColumns = `repeat(${boardWidth}, 40px)`;
    boardElement.style.gridTemplateRows = `repeat(${boardHeight}, 40px)`;
    boardElement.innerHTML = '';

    for (let r = 0; r < boardHeight; r++) {
        for (let c = 0; c < boardWidth; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;

            if (boardState[r][c]) {
                const stone = document.createElement('div');
                stone.classList.add('stone', boardState[r][c], 'animate-spawn');
                cell.appendChild(stone);
            }

            cell.addEventListener('click', () => playerMove(r, c));
            boardElement.appendChild(cell);
        }
    }
}

// --- 核心交互 ---
function playerMove(r, c) {
    if (!gameActive || currentPlayer !== 'black' || boardState[r][c]) return;

    placeStone(r, c, 'black');
    if (!gameActive) return;

    // 提高技能触发率到 40%, 增加搞怪感
    if (Math.random() < 0.4) {
        setTimeout(triggerWildSkill, 600);
    } else {
        switchTurn();
        setTimeout(aiMove, 800);
    }
}

function placeStone(r, c, color) {
    boardState[r][c] = color;
    history.push({ r, c, color });
    renderBoard(); // 简单起见重绘全体

    if (checkWin(r, c, color)) {
        gameWin(color);
        return true;
    }
    return false;
}

function switchTurn() {
    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    playerZiqi.classList.toggle('active');
    playerJinengwu.classList.toggle('active');
    updateNarrator(currentPlayer === 'black' ? "子祺，轮到你受苦了。" : "技能五正在憋坏主意...");
}

// --- 技能引擎 ---
function triggerWildSkill() {
    const skill = ALL_SKILLS[Math.floor(Math.random() * ALL_SKILLS.length)];
    updateNarrator(`【${skill.name}】触发！${skill.quote}`);

    // 视觉反馈
    boardElement.style.filter = "hue-rotate(90deg) brightness(1.2)";

    setTimeout(() => {
        boardElement.style.filter = "";
        skill.func();
        switchTurn();
        setTimeout(aiMove, 1000);
    }, 1500);
}

// --- 技能实现 ---

function skillFansai() {
    // 效果：将对方最后一颗子变色，并全屏金色滤镜
    document.body.classList.add('fensai-mode');
    if (history.length > 0) {
        const last = history[history.length - 1];
        boardState[last.r][last.c] = 'white';
    }
    renderBoard();
    setTimeout(() => document.body.classList.remove('fensai-mode'), 3000);
}

function skillEyes() {
    // 效果：棋盘模糊 5 秒
    boardViewport.style.filter = "blur(8px) contrast(0.5)";
    setTimeout(() => boardViewport.style.filter = "", 5000);
}

function skillZhenxiang() {
    // 效果：撤回刚才那步棋，并在随机位置给对方放一个子
    if (history.length > 0) {
        const last = history.pop();
        boardState[last.r][last.c] = null;
        let er, ec;
        do {
            er = Math.floor(Math.random() * boardHeight);
            ec = Math.floor(Math.random() * boardWidth);
        } while (boardState[er][ec]);
        boardState[er][ec] = 'white';
        renderBoard();
    }
}

function skillTaikula() {
    // 效果：随机冻结一行
    const row = Math.floor(Math.random() * boardHeight);
    updateNarrator(`太裤辣！第 ${row + 1} 行被冻结了，谁也下不了！`);
    // 逻辑：直接清空该行并闪烁
    for (let c = 0; c < boardWidth; c++) boardState[row][c] = 'disabled';
    renderBoard();
    setTimeout(() => {
        for (let c = 0; c < boardWidth; c++) if (boardState[row][c] === 'disabled') boardState[row][c] = null;
        renderBoard();
    }, 4000);
}

function skillTui() {
    const playerStones = [];
    for (let r = 0; r < boardHeight; r++) {
        for (let c = 0; c < boardWidth; c++) if (boardState[r][c] === 'black') playerStones.push({ r, c });
    }
    if (playerStones.length > 0) {
        const target = playerStones[Math.floor(Math.random() * playerStones.length)];
        boardState[target.r][target.c] = null;
        renderBoard();
    }
}

function skillBoom() {
    const r = Math.floor(Math.random() * boardHeight);
    const c = Math.floor(Math.random() * boardWidth);
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            let nr = r + i, nc = c + j;
            if (nr >= 0 && nr < boardHeight && nc >= 0 && nc < boardWidth) boardState[nr][nc] = null;
        }
    }
    renderBoard();
}

function skillJump() {
    // 奥义反复横跳：全体向右平移一格，溢出的回到左边
    for (let r = 0; r < boardHeight; r++) {
        let row = boardState[r];
        let last = row.pop();
        row.unshift(last);
    }
    renderBoard();
}

function skillXiaoshi() {
    let count = 0;
    for (let r = 0; r < boardHeight; r++) {
        for (let c = 0; c < boardWidth; c++) {
            if (boardState[r][c] && Math.random() < 0.2) {
                boardState[r][c] = null;
                count++;
            }
        }
    }
    renderBoard();
}

// --- AI 逻辑 ---
function aiMove() {
    if (!gameActive) return;
    let target = findBestMove('white') || findBestMove('black') || randomMove();
    if (target) {
        placeStone(target.r, target.c, 'white');
        if (gameActive) switchTurn();
    }
}

function findBestMove(color) {
    for (let r = 0; r < boardHeight; r++) {
        for (let c = 0; c < boardWidth; c++) {
            if (!boardState[r][c]) {
                if (checkPotentialWin(r, c, color, 4)) return { r, c };
                if (checkPotentialWin(r, c, color, 3)) return { r, c };
            }
        }
    }
    return null;
}

function randomMove() {
    let empty = [];
    for (let r = 0; r < boardHeight; r++) {
        for (let c = 0; c < boardWidth; c++) if (!boardState[r][c]) empty.push({ r, c });
    }
    return empty[Math.floor(Math.random() * empty.length)];
}

// --- 胜负检查 ---
function checkWin(row, col, color) {
    if (color === 'disabled') return false;
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let [dr, dc] of dirs) {
        let count = 1;
        let r = row + dr, c = col + dc;
        while (isIn(r, c) && boardState[r][c] === color) { count++; r += dr; c += dc; }
        r = row - dr; c = col - dc;
        while (isIn(r, c) && boardState[r][c] === color) { count++; r -= dr; c -= dc; }
        if (count >= 5) return true;
    }
    return false;
}

function checkPotentialWin(row, col, color, target) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let [dr, dc] of dirs) {
        let count = 1;
        let r = row + dr, c = col + dc;
        while (isIn(r, c) && boardState[r][c] === color) { count++; r += dr; c += dc; }
        r = row - dr; c = col - dc;
        while (isIn(r, c) && boardState[r][c] === color) { count++; r -= dr; c -= dc; }
        if (count >= target) return true;
    }
    return false;
}

function isIn(r, c) { return r >= 0 && r < boardHeight && c >= 0 && c < boardWidth; }

// --- 关卡系统 ---
function gameWin(color) {
    gameActive = false;
    if (color === 'black') {
        winnerText.textContent = "子祺，你竟然在高维度打击下赢了！";
        modal.style.display = 'flex';
    } else {
        updateNarrator("技能五不屑地笑了：凡人的智慧。");
        setTimeout(() => { alert("你输了！技能五太强了。"); resetGame(); }, 1500);
    }
}

function nextLevel() {
    level++;
    boardHeight += 3; // 每次上长 3 行
    gameActive = true;
    currentPlayer = 'black';
    modal.style.display = 'none';
    initGame();
}

function resetGame() {
    level = 1; boardHeight = 3; gameActive = true; currentPlayer = 'black';
    initGame();
}

function updateStats() {
    levelDisplay.textContent = level;
    sizeDisplay.textContent = `${boardWidth}x${boardHeight}`;
}
function scrollToBottom() { boardViewport.scrollTop = boardViewport.scrollHeight; }

modalNext.addEventListener('click', nextLevel);
document.getElementById('restart-btn').addEventListener('click', resetGame);
initGame();
