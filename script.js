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
    { name: "戏剧黑洞", func: skillBlackHole, quote: "系统提示：检测到剧场空间严重撕裂，产生了螺旋黑洞！（戏剧冲突：场上随机撕开多个螺旋黑洞，永久封锁禁区）" },
    { name: "力拔山兮", func: skillRollback, quote: "力拔山兮气盖世！这一带的因果，由我强行扭转！（时空倒流：霸气震慑下，棋盘强制回到 2 手前的状态）" },
    { name: "飞沙走石", func: skillShaqing, quote: "大师发功，飞沙走石！这一带的逻辑都被吹飞了。（风暴降临：随机吹走场上一颗现有棋子）" },
    { name: "北漂生活", func: skillPiaoyi, quote: "生活已经这么累了，棋子也想换个轨道漂移一下。（随机迁徙：场上随机一颗棋子向四周任意可移动方向漂移一格）" },
    { name: "真香警告", func: skillZhenxiang, quote: "子祺，你这黑子看起来挺顺眼，现在它是我的了。真香！（化敌为友：随机选中场上的一颗棋子并将其永久变色）" },
    { name: "泰裤辣", func: skillTaikula, quote: "感觉这十字路口，被我帅到了极冻。泰裤辣！（绝对零度：封锁随机十字格子，直到下次落子）" },
    { name: "要爆了", func: skillBoom, quote: "注意！这一带由于算力过载要爆了！躲远点！（核心过载：随机区域局部震动并炸碎 3x3 棋子）" },
    { name: "移花接木", func: skillSwap, quote: "量子纠缠触发：我们换个位置说话怎么样？（量子缠绕：场上随机一黑一白棋子互换位置）" },

    // --- 技能五子棋系列 ---
    { name: "鸡你太美", func: skillKun, quote: "只因你太美，篮球所过之处，寸草不生。（只因篮球：篮球在棋盘上反复横跳，砸碎沿途所有棋子）" },
    { name: "退！退！退！", func: skillTui, quote: "邪灵退散！大妈发功，方圆三里，无子生还！（大妈震慑：强大的声波将中心点周围的棋子全部向外弹开）" },
    { name: "这背景太假了", func: skillFakeBackground, quote: "你这背景太假了，你看这棋子它真吗？（视觉错位：棋盘发生闪烁，随机清除几个“不存在”的幻觉棋子）" },
    { name: "后翼奇袭", func: skillQueen, quote: "国际象棋降临！王后驾到，谁敢拦我？（降维打击：王后在边缘出现，横扫整行、整列或对角线）" },
    { name: "地雷震慑", func: skillLandmine, quote: "由于军棋外挂开启，这一带已经被布下了暗雷。（危机四伏：在空格埋下一颗地雷，谁踩谁爆炸）" },
    { name: "步兵成金", func: skillGoldShogi, quote: "将棋逻辑介入：虽然我很弱，但我能变异！（棋子升变：随机一颗棋子变为黄金棋子，获得永不磨灭属性）" },
    { name: "连跳三连", func: skillCheckers, quote: "跳棋乱入！我看你在这个位置很不爽，我跳！（连续跳跃：随机选择一颗棋子向前跳跃，并吃掉沿途跳过的子）" },
    { name: "强力击球", func: skillHockey, quote: "冰球选手进场！一杆进洞，全都给我去墙角待着！（暴力位移：冰球将整行棋子粗暴地推向棋盘边缘）" },
    { name: "旋球满贯", func: skillPingPong, quote: "乒乓旋球：这球带转，你防不住！（空间扭转：局部 3x3 空间顺时针旋转 90 度）" },
    { name: "暴力扣杀", func: skillBadminton, quote: "羽毛球暴扣！逻辑被砸穿了！（定点爆破：羽毛球从天而降，砸碎中心棋子及其邻近区域）" },
    { name: "网球挑球", func: skillTennis, quote: "网球挑传：走你！去别的地方待着。（随机传送：将一颗棋子挑到棋盘上另一个随机空位）" },
    { name: "破釜沉舟", func: skillSinkBoats, quote: "背水一战，不破不立！（极限翻盘：献祭自己的三个棋子，在绝佳位置降临两个新的分身）" },
    { name: "草木皆兵", func: skillCaomu, quote: "风声鹤唳，草木皆兵！你看到的不一定是真的。（幻觉陷阱：随机空位产生多个干扰残影，存在一个回合）" }
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
    updateNarrator("《技能五子棋》15x15 经典版开幕！", 'system');
    autoPlayCheck();
}

function resetGame() {
    gameActive = true;
    currentPlayer = 'black';
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.classList.remove('btn-prompt-glow');
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
                } else if (cellState.isLandmine) {
                    const mine = document.createElement('div');
                    mine.classList.add('stone', 'landmine');
                    mine.textContent = '💣';
                    mine.style.display = 'flex';
                    mine.style.justifyContent = 'center';
                    mine.style.alignItems = 'center';
                    cell.appendChild(mine);
                } else {
                    const stone = document.createElement('div');
                    const color = typeof cellState === 'string' ? cellState : cellState.color;
                    stone.classList.add('stone');
                    if (color) stone.classList.add(color);

                    if (cellState.isXiangqi) {
                        stone.classList.add('xiangqi-piece');
                        stone.textContent = cellState.text;
                    } else if (cellState.isQueen) {
                        stone.classList.add('queen-piece');
                        stone.textContent = cellState.text;
                    } else if (cellState.isGold) {
                        stone.classList.add('gold-pawn');
                        if (cellState.originalColor === 'black') {
                            stone.classList.add('gold-pawn-black');
                        } else if (cellState.originalColor === 'white') {
                            stone.classList.add('gold-pawn-white');
                        }
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
    if (moveCounter > 0) {
        setTimeout(triggerWildSkill, 600);
    } else {
        switchTurn();
        if (currentPlayer === 'white') {
            setTimeout(aiMove, 800);
        }
    }
}

function placeStone(r, c, color) {
    // 清除幻觉棋子 (草木皆兵残影)
    for (let i = 0; i < boardHeight; i++) {
        for (let j = 0; j < boardWidth; j++) {
            if (boardState[i][j] && boardState[i][j].isGhost) boardState[i][j] = null;
        }
    }

    if (taikulaCells.length > 0) {
        taikulaCells.forEach(cell => {
            if (boardState[cell.r][cell.c] === 'disabled') boardState[cell.r][cell.c] = null;
        });
        taikulaCells = [];
    }

    // 地雷检测
    if (boardState[r][c] && boardState[r][c].isLandmine) {
        updateNarrator("💥 踩到地雷了！区域爆炸！", 'system');
        boardState[r][c] = null;
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
            if (isIn(r + i, c + j) && boardState[r + i][c + j] && !boardState[r + i][c + j].isGold) {
                boardState[r + i][c + j] = null;
            }
        }
        renderBoard();
        boardElement.classList.add('shake-effect');
        setTimeout(() => boardElement.classList.remove('shake-effect'), 500);
        return false;
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

// --- 技能文字闪屏特效 (动态表现系统) ---
const SKILL_THEMES = {
    // 危险/爆发系统
    "戏剧黑洞": { color: "#9c27b0", glow: "#e91e63", anim: "skill-anim-shake" },
    "要爆了": { color: "#f44336", glow: "#ff9800", anim: "skill-anim-shake" },
    "地雷震慑": { color: "#ff5722", glow: "#ffeb3b", anim: "skill-anim-shake" },

    // 力量/重击系统
    "力拔山兮": { color: "#795548", glow: "#ffc107", anim: "skill-anim-zoom" },
    "鸡你太美": { color: "#ffeb3b", glow: "#ff9800", anim: "skill-anim-drop" },
    "暴力扣杀": { color: "#ff9800", glow: "#ff5722", anim: "skill-anim-drop" },
    "象棋乱入": { color: "#f44336", glow: "#000000", anim: "skill-anim-drop" },

    // 突进/清场系统
    "后翼奇袭": { color: "#e91e63", glow: "#9c27b0", anim: "skill-anim-slide" },
    "强力击球": { color: "#00bcd4", glow: "#03a9f4", anim: "skill-anim-slide" },
    "退！退！退！": { color: "#4caf50", glow: "#cddc39", anim: "skill-anim-slide" },

    // 虚拟/空间/异常系统
    "这背景太假了": { color: "#00ff00", glow: "#000000", anim: "skill-anim-glitch" },
    "移花接木": { color: "#00e5ff", glow: "#2979ff", anim: "skill-anim-glitch" },
    "草木皆兵": { color: "#607d8b", glow: "#000000", anim: "skill-anim-glitch" }
};

const DEFAULT_COLORS = ["#ff3366", "#00e5ff", "#cddc39", "#ff9800", "#e91e63"];
const DEFAULT_ANIMS = ["skill-anim-zoom", "skill-anim-slide", "skill-anim-drop", "skill-anim-shake", "skill-anim-glitch"];

function showSkillOverlay(skillName) {
    const overlay = document.createElement('div');
    overlay.className = 'skill-overlay-text';
    overlay.textContent = skillName + "！";

    // 获取配置并应用 CSS 变量
    let theme = SKILL_THEMES[skillName];
    if (!theme) {
        // 如果没有配置，则随机组合产生独特效果
        const rc = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
        const rg = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
        const ra = DEFAULT_ANIMS[Math.floor(Math.random() * DEFAULT_ANIMS.length)];
        theme = { color: rc, glow: rg, anim: ra };
    }

    overlay.style.setProperty('--skill-color', theme.color);
    overlay.style.setProperty('--skill-glow', theme.glow);
    overlay.style.setProperty('--skill-anim', theme.anim);

    // 强行重置动画状态以确保重复触发时依然生效
    overlay.style.animation = 'none';
    overlay.offsetHeight; // 触发回流
    overlay.style.animation = null;

    document.body.appendChild(overlay);

    // 动画结束后移除元素 (动画约 1.2s，这里给 1.5s 确保移除)
    setTimeout(() => {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }, 1500);
}

function triggerWildSkill() {
    const skill = ALL_SKILLS[Math.floor(Math.random() * ALL_SKILLS.length)];

    // 触发满屏闪字
    showSkillOverlay(skill.name);

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
    // 已删除，功能由移花接木覆盖
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
    const rollbackCount = Math.min(history.length, 2);
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
    const stones = [];
    for (let r = 0; r < boardHeight; r++) for (let c = 0; c < boardWidth; c++) {
        const color = getStoneColor(r, c);
        if (color) stones.push({ r, c, color });
    }
    if (stones.length > 0) {
        const target = stones[Math.floor(Math.random() * stones.length)];
        const newColor = target.color === 'black' ? 'white' : 'black';
        highlightCell(target.r, target.c, 2000);
        boardState[target.r][target.c] = newColor;
        renderBoard();
    }
}

function skillTaikula() {
    const r = Math.floor(Math.random() * boardHeight), c = Math.floor(Math.random() * boardWidth);
    taikulaCells = [];
    for (let j = 0; j < boardWidth; j++) if (!boardState[r][j]) { boardState[r][j] = 'disabled'; taikulaCells.push({ r, c: j }); highlightCell(r, j, 3000); }
    for (let i = 0; i < boardHeight; i++) if (!boardState[i][c]) { boardState[i][c] = 'disabled'; taikulaCells.push({ r: i, c }); highlightCell(i, c, 3000); }
    renderBoard();
}

// --- 通用辅助：寻找任意一个有效的棋子位置 ---
function getRandomStonePosition() {
    const stones = [];
    for (let r = 0; r < boardHeight; r++) {
        for (let c = 0; c < boardWidth; c++) {
            if (getStoneColor(r, c)) stones.push({ r, c });
        }
    }
    return stones.length > 0 ? stones[Math.floor(Math.random() * stones.length)] : null;
}

function skillBoom() {
    const target = getRandomStonePosition();
    let r, c;
    if (target) { r = target.r; c = target.c; }
    else { r = Math.floor(Math.random() * boardHeight); c = Math.floor(Math.random() * boardWidth); }

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

// --- 离奇荒诞技能实现 ---

function skillKun() {
    const ball = document.createElement('div');
    ball.classList.add('basketball-vfx');
    boardElement.appendChild(ball);

    let r = Math.floor(Math.random() * boardHeight);
    let c = 0;
    const path = [];
    while (c < boardWidth) {
        path.push({ r, c });
        r = Math.max(0, Math.min(boardHeight - 1, r + (Math.random() > 0.5 ? 1 : -1)));
        c++;
    }

    let i = 0;
    const interval = setInterval(() => {
        if (i >= path.length) {
            clearInterval(interval);
            ball.remove();
            renderBoard();
            return;
        }
        const pos = path[i];
        const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell-size'));
        ball.style.left = (pos.col * cellSize + cellSize / 2) + 'px'; // 这里的误差修正稍后在 updateBoardScale 处理
        // 简化动画：直接定位
        const cell = document.querySelector(`.cell[data-row="${pos.r}"][data-col="${pos.c}"]`);
        if (cell) {
            ball.style.top = cell.offsetTop + 'px';
            ball.style.left = cell.offsetLeft + 'px';
            cell.classList.add('shake-effect');
            if (boardState[pos.r][pos.c] && !boardState[pos.r][pos.c].isGold) {
                boardState[pos.r][pos.c] = null;
            }
        }
        i++;
    }, 100);
}

function skillTui() {
    const target = getRandomStonePosition();
    let r, c;
    if (target) {
        r = Math.max(2, Math.min(boardHeight - 3, target.r));
        c = Math.max(2, Math.min(boardWidth - 3, target.c));
    } else {
        r = Math.floor(Math.random() * (boardHeight - 4)) + 2;
        c = Math.floor(Math.random() * (boardWidth - 4)) + 2;
    }

    const ripple = document.createElement('div');
    ripple.classList.add('ripple-vfx');
    const centerCell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (centerCell) {
        centerCell.appendChild(ripple);
        ripple.style.left = '50%';
        ripple.style.top = '50%';
    }

    setTimeout(() => {
        const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        dirs.forEach(([dr, dc]) => {
            for (let dist = 1; dist <= 2; dist++) {
                const nr = r + dr * dist, nc = c + dc * dist;
                if (isIn(nr, nc) && boardState[nr][nc] && !boardState[nr][nc].isGold) {
                    const tr = nr + dr, tc = nc + dc;
                    if (isIn(tr, tc) && !boardState[tr][tc]) {
                        boardState[tr][tc] = boardState[nr][nc];
                        boardState[nr][nc] = null;
                    } else {
                        boardState[nr][nc] = null; // 挤出边界或撞墙则消失
                    }
                }
            }
        });
        renderBoard();
        ripple.remove();
    }, 1000);
}

function skillFakeBackground() {
    boardElement.classList.add('glitch-effect');
    setTimeout(() => {
        boardElement.classList.remove('glitch-effect');
        let count = 0;
        for (let i = 0; i < 20; i++) {
            let r = Math.floor(Math.random() * boardHeight), c = Math.floor(Math.random() * boardWidth);
            if (boardState[r][c] && !boardState[r][c].isGold && !boardState[r][c].isBlackHole) {
                boardState[r][c] = null;
                highlightCell(r, c, 500);
                count++;
                if (count >= 3) break;
            }
        }
        renderBoard();
    }, 1000);
}

function skillQueen() {
    const target = getRandomStonePosition();
    let tgtR = target ? target.r : Math.floor(Math.random() * boardHeight);
    let tgtC = target ? target.c : Math.floor(Math.random() * boardWidth);

    const side = Math.floor(Math.random() * 4);
    let r, c, dr, dc;
    // 重写瞄准逻辑：皇后从边缘出现，射线的路径必须经过 (tgtR, tgtC)
    if (side === 0) { r = 0; c = tgtC; dr = 1; dc = 0; } // Top, sweeps down
    else if (side === 1) { r = boardHeight - 1; c = tgtC; dr = -1; dc = 0; } // Bottom, sweeps up
    else if (side === 2) { r = tgtR; c = 0; dr = 0; dc = 1; } // Left, sweeps right
    else { r = tgtR; c = boardWidth - 1; dr = 0; dc = -1; } // Right, sweeps left

    const queen = { color: 'white', isQueen: true, text: '♕' };
    let curR = r, curC = c;

    const move = setInterval(() => {
        if (!isIn(curR, curC)) {
            clearInterval(move);
            renderBoard();
            return;
        }
        if (boardState[curR][curC] && !boardState[curR][curC].isGold) boardState[curR][curC] = null;
        // 视觉模拟清场
        highlightCell(curR, curC, 300);
        curR += dr; curC += dc;
        renderBoard(); // 实时渲染王后轨迹
        if (isIn(curR, curC)) boardState[curR][curC] = queen;
    }, 150);
}

function skillLandmine() {
    let r, c;
    const target = getRandomStonePosition();
    if (target) {
        // 在目标附近埋雷，防空
        const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]];
        const validSpaces = offsets.map(([dr, dc]) => ({ r: target.r + dr, c: target.c + dc })).filter(pos => isIn(pos.r, pos.c) && !boardState[pos.r][pos.c]);
        if (validSpaces.length > 0) {
            const pos = validSpaces[Math.floor(Math.random() * validSpaces.length)];
            r = pos.r; c = pos.c;
        }
    }
    if (r === undefined) {
        do { r = Math.floor(Math.random() * boardHeight); c = Math.floor(Math.random() * boardWidth); } while (boardState[r][c]);
    }

    boardState[r][c] = { isLandmine: true };
    renderBoard();
    highlightCell(r, c, 1000);
}

function skillGoldShogi() {
    const all = [];
    for (let r = 0; r < boardHeight; r++) for (let c = 0; c < boardWidth; c++) {
        const s = getStoneColor(r, c);
        if (s) all.push({ r, c, color: s });
    }
    if (all.length > 0) {
        const t = all[Math.floor(Math.random() * all.length)];
        // 增加 originalColor 属性用于标识原本颜色
        boardState[t.r][t.c] = { color: t.color, originalColor: t.color, isGold: true, text: '金' };
        renderBoard();
        highlightCell(t.r, t.c, 2000);
    }
}

function skillCheckers() {
    const candidates = [];
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    // 遍历搜索全场可跳跃组合
    for (let r = 0; r < boardHeight; r++) {
        for (let c = 0; c < boardWidth; c++) {
            const color = getStoneColor(r, c);
            if (color) {
                for (let [dr, dc] of dirs) {
                    const mr = r + dr, mc = c + dc; // 中间被跳过的子
                    const tr = r + dr * 2, tc = c + dc * 2; // 目标落位
                    if (isIn(tr, tc) && getStoneColor(mr, mc) && !boardState[tr][tc]) {
                        candidates.push({ from: { r, c }, middle: { r: mr, c: mc }, to: { r: tr, c: tc } });
                    }
                }
            }
        }
    }

    if (candidates.length === 0) {
        updateNarrator("跳棋逻辑提示：由于没有可以借力的棋子，连跳三连 失败！", 'system');
        return;
    }

    const choice = candidates[Math.floor(Math.random() * candidates.length)];

    // 视觉演示
    highlightCell(choice.from.r, choice.from.c, 1000);
    highlightCell(choice.middle.r, choice.middle.c, 1000);

    setTimeout(() => {
        boardState[choice.to.r][choice.to.c] = boardState[choice.from.r][choice.from.c];
        boardState[choice.from.r][choice.from.c] = null;
        if (!boardState[choice.middle.r][choice.middle.c].isGold) {
            boardState[choice.middle.r][choice.middle.c] = null;
        }
        renderBoard();
        highlightCell(choice.to.r, choice.to.c, 1000);
    }, 800);
}

function skillHockey() {
    const target = getRandomStonePosition();
    const r = target ? target.r : Math.floor(Math.random() * boardHeight);
    const puck = document.createElement('div');
    puck.classList.add('puck-vfx');
    boardElement.appendChild(puck);

    const dir = Math.random() > 0.5 ? 1 : -1;
    let c = dir === 1 ? 0 : boardWidth - 1;

    const move = setInterval(() => {
        if (c < 0 || c >= boardWidth) {
            clearInterval(move);
            puck.remove();
            return;
        }
        const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
        if (cell) {
            puck.style.top = cell.offsetTop + 'px';
            puck.style.left = cell.offsetLeft + 'px';
        }

        if (boardState[r][c] && !boardState[r][c].isGold && !boardState[r][c].isBlackHole) {
            const targetC = dir === 1 ? boardWidth - 1 : 0;
            // 简单逻辑：推到尽头
            let tc = targetC;
            while (tc !== c && boardState[r][tc]) tc -= dir;
            if (tc !== c) {
                boardState[r][tc] = boardState[r][c];
                boardState[r][c] = null;
            }
        }
        c += dir;
        renderBoard();
    }, 80);
}

function skillPingPong() {
    const r = Math.floor(Math.random() * (boardHeight - 3));
    const c = Math.floor(Math.random() * (boardWidth - 3));

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) highlightCell(r + i, c + j, 1000);
    }

    setTimeout(() => {
        const next = [[null, null, null], [null, null, null], [null, null, null]];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                next[j][2 - i] = boardState[r + i][c + j];
            }
        }
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) boardState[r + i][c + j] = next[i][j];
        }
        renderBoard();
    }, 1000);
}

function skillBadminton() {
    const target = getRandomStonePosition();
    const r = target ? target.r : Math.floor(Math.random() * boardHeight);
    const c = target ? target.c : Math.floor(Math.random() * boardWidth);

    const shuttle = document.createElement('div');
    shuttle.classList.add('shuttlecock-vfx');
    shuttle.textContent = '🏸';
    shuttle.style.top = '-50px';
    shuttle.style.left = '50%';
    document.body.appendChild(shuttle);

    setTimeout(() => {
        const target = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
        if (target) {
            const rect = target.getBoundingClientRect();
            shuttle.style.top = rect.top + 'px';
            shuttle.style.left = rect.left + 'px';
        }

        setTimeout(() => {
            for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
                if (isIn(r + i, c + j) && boardState[r + i][c + j] && !boardState[r + i][c + j].isGold) {
                    boardState[r + i][c + j] = null;
                }
            }
            boardElement.classList.add('shake-effect');
            setTimeout(() => boardElement.classList.remove('shake-effect'), 500);
            renderBoard();
            shuttle.remove();
        }, 500);
    }, 50);
}

function skillTennis() {
    const stones = [];
    for (let r = 0; r < boardHeight; r++) for (let c = 0; c < boardWidth; c++) {
        if (getStoneColor(r, c)) stones.push({ r, c });
    }
    if (stones.length === 0) return;

    const s = stones[Math.floor(Math.random() * stones.length)];
    let nr, nc;
    do {
        nr = Math.floor(Math.random() * boardHeight);
        nc = Math.floor(Math.random() * boardWidth);
    } while (boardState[nr][nc]);

    highlightCell(s.r, s.c, 1000);
    setTimeout(() => {
        boardState[nr][nc] = boardState[s.r][s.c];
        boardState[s.r][s.c] = null;
        highlightCell(nr, nc, 1000);
        renderBoard();
    }, 1000);
}

function skillSinkBoats() {
    const color = currentPlayer;
    const myStones = [];
    for (let r = 0; r < boardHeight; r++) for (let c = 0; c < boardWidth; c++) {
        if (getStoneColor(r, c) === color) myStones.push({ r, c });
    }

    // 献祭三个
    for (let i = 0; i < 3 && myStones.length > 0; i++) {
        const idx = Math.floor(Math.random() * myStones.length);
        const s = myStones.splice(idx, 1)[0];
        boardState[s.r][s.c] = null;
        highlightCell(s.r, s.c, 1000);
    }

    // 降临两个（找高价值位，简化为找两个空位）
    for (let i = 0; i < 2; i++) {
        const move = findBestWeightedMove();
        if (move) {
            boardState[move.r][move.c] = color;
            highlightCell(move.r, move.c, 2000);
        }
    }
    renderBoard();
}

function skillCaomu() {
    let created = 0;
    for (let i = 0; i < 30 && created < 3; i++) {
        const r = Math.floor(Math.random() * boardHeight);
        const c = Math.floor(Math.random() * boardWidth);
        if (!boardState[r][c]) {
            boardState[r][c] = { isGhost: true, color: Math.random() > 0.5 ? 'black' : 'white' };
            highlightCell(r, c, 1000);
            created++;
        }
    }
    renderBoard();
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
    while (isIn(r, c) && boardState[r][c] === color) { count++; r += dr; c += dc; }
    if (!isIn(r, c) || boardState[r][c] !== null) block++;
    r = row - dr; c = col - dc;
    while (isIn(r, c) && boardState[r][c] === color) { count++; r -= dr; c -= dc; }
    if (!isIn(r, c) || boardState[r][c] !== null) block++;
    if (count >= 5) return 10000;
    if (count === 4 && block === 0) return 3000;
    if (count === 4 && block === 1) return 1000;
    if (count === 3 && block === 0) return 500;
    return count * 2;
}

function getStoneColor(r, c) {
    // 严格判断：只有纯字符串的 'black' 或 'white' 才是真正的棋子。其它所有形态（地雷、黑洞、金将、残影等）均为占位子。
    if (boardState[r][c] === 'black' || boardState[r][c] === 'white') return boardState[r][c];
    return null;
}

function randomMove() {
    const empty = []; for (let r = 0; r < boardHeight; r++) for (let c = 0; c < boardWidth; c++) if (!boardState[r][c]) empty.push({ r, c });
    return empty.length > 0 ? empty[Math.floor(Math.random() * empty.length)] : null;
}

function checkWin(row, col, color) {
    const target = typeof color === 'string' ? color : color.color;
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let [dr, dc] of dirs) {
        let count = 1, r = row + dr, c = col + dc;
        while (isIn(r, c) && boardState[r][c] === target) { count++; r += dr; c += dc; }
        r = row - dr; c = col - dc;
        while (isIn(r, c) && boardState[r][c] === target) { count++; r -= dr; c -= dc; }
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

    // 引导重启
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.classList.add('btn-prompt-glow');
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

// --- 适配布局与一屏自适应逻辑 ---
function updateBoardScale() {
    const area = document.querySelector('.board-area');
    if (!area) return;

    const vWidth = area.clientWidth;
    const vHeight = area.clientHeight;

    // 区分移动端与 PC 端
    const isMobile = window.innerWidth <= 900;

    // 手机端：顶部按钮 (60px) + 底部日志高度空间 (160px 左右)
    // PC 端：主要依靠 flex 布局，但为了保证“一屏”，需要抵扣页面其余固定元素的像素高度
    const topOffset = isMobile ? 70 : 100; // 各种 Header/Buttons
    const bottomOffset = isMobile ? 180 : 80; // 底部玩家/日志
    const horizontalPadding = isMobile ? 20 : 40;

    const availableW = vWidth - horizontalPadding;
    const availableH = vHeight - topOffset - bottomOffset;

    const sizeW = Math.floor(availableW / boardWidth);
    const sizeH = Math.floor(availableH / boardHeight);

    // 最大不超过 45px (PC) 或适配屏幕的最大值
    const maxPixel = isMobile ? 40 : 45;
    const cellSize = Math.max(15, Math.min(sizeW, sizeH, maxPixel));

    document.documentElement.style.setProperty('--cell-size', `${cellSize}px`);

    if (boardElement) {
        boardElement.style.gridTemplateColumns = `repeat(${boardWidth}, ${cellSize}px)`;
        boardElement.style.gridTemplateRows = `repeat(${boardHeight}, ${cellSize}px)`;
    }
}

window.addEventListener('resize', updateBoardScale);
window.addEventListener('load', updateBoardScale);

if (document.getElementById('restart-btn')) document.getElementById('restart-btn').addEventListener('click', resetGame);
if (bgmBtn) bgmBtn.addEventListener('click', toggleMusic);

initGame();
setTimeout(updateBoardScale, 100);
