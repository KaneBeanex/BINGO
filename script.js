/** BINGO PWA - FINAL VERSION **/

let myBoard = [];
let cpuBoard = [];
let calledNumbers = new Set();

let gameMode = 'CPU';
let isMyTurn = true;

const screens = {
    menu: document.getElementById('menu-screen'),
    lobby: document.getElementById('lobby-screen'),
    game: document.getElementById('game-screen')
};

// --- BASIC UTILS ---
function showScreen(screenKey) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[screenKey].classList.remove('hidden');
}

function createBoard() {
    let nums = Array.from({ length: 25 }, (_, i) => i + 1);
    nums.sort(() => Math.random() - 0.5);
    let board = [];
    for (let i = 0; i < 25; i += 5) board.push(nums.slice(i, i + 5));
    return board;
}

// --- RENDER ---
function renderBoard() {
    const grid = document.getElementById('bingo-board');
    grid.innerHTML = '';

    myBoard.flat().forEach(val => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.textContent = val;

        if (calledNumbers.has(val)) cell.classList.add('marked');

        cell.onclick = () => handleMove(val);
        grid.appendChild(cell);
    });
}

function renderOpponentBoard(board) {
    const grid = document.getElementById('opponent-board');
    grid.innerHTML = '';

    board.flat().forEach(val => {
        const cell = document.createElement('div');
        cell.className = 'cell opponent';

        if (calledNumbers.has(val)) {
            cell.classList.add('marked');
        }

        grid.appendChild(cell);
    });
}

// --- SMART CPU ---
function getAllLines(board) {
    let lines = [];

    for (let i = 0; i < 5; i++) lines.push(board[i]);
    for (let i = 0; i < 5; i++) lines.push(board.map(r => r[i]));

    lines.push([0,1,2,3,4].map(i => board[i][i]));
    lines.push([0,1,2,3,4].map(i => board[i][4-i]));

    return lines;
}

function scoreNumber(num, board) {
    let lines = getAllLines(board);
    let score = 0;

    for (let line of lines) {
        if (!line.includes(num)) continue;

        let marked = line.filter(v => calledNumbers.has(v)).length;

        if (marked === 4) score += 100;
        else if (marked === 3) score += 10;
        else if (marked === 2) score += 4;
        else if (marked === 1) score += 1;
    }
    return score;
}

function getBestMove() {
    let remaining = Array.from({length:25}, (_,i)=>i+1)
        .filter(n => !calledNumbers.has(n));

    let best = [];
    let max = -1;

    for (let num of remaining) {
        let score = scoreNumber(num, cpuBoard);

        if (score > max) {
            max = score;
            best = [num];
        } else if (score === max) {
            best.push(num);
        }
    }

    return best[Math.floor(Math.random()*best.length)];
}

// --- SLASH ---
function playSlash(type, index) {
    const grid = document.getElementById('bingo-board');
    const slash = document.createElement('div');
    slash.className = 'slash';

    if (type === 'row') slash.style.top = `${index * 20}%`;
    if (type === 'col') {
        slash.style.transform = 'rotate(90deg)';
        slash.style.left = `${index * 20}%`;
    }
    if (type === 'diag1') slash.style.transform = 'rotate(45deg)';
    if (type === 'diag2') slash.style.transform = 'rotate(-45deg)';

    grid.appendChild(slash);
    setTimeout(()=>slash.remove(), 600);
}

function getCompletedLines(board) {
    let res = [];
    let m = board.map(r => r.map(v => calledNumbers.has(v)));

    for (let i = 0; i < 5; i++) {
        if (m[i].every(v=>v)) res.push({type:'row', index:i});
        if (m.map(r=>r[i]).every(v=>v)) res.push({type:'col', index:i});
    }

    if ([0,1,2,3,4].every(i=>m[i][i])) res.push({type:'diag1'});
    if ([0,1,2,3,4].every(i=>m[i][4-i])) res.push({type:'diag2'});

    return res;
}

// --- GAME ---
function handleMove(val) {
    if (!isMyTurn || calledNumbers.has(val)) return;

    calledNumbers.add(val);
    renderBoard();
    renderOpponentBoard(cpuBoard);

    let lines = getCompletedLines(myBoard);
    lines.forEach(l => playSlash(l.type, l.index));

    if (lines.length >= 5) return endGame("🎉 YOU WIN");

    isMyTurn = false;
    setTimeout(cpuTurn, 700);
}

function cpuTurn() {
    let move = getBestMove();
    calledNumbers.add(move);

    renderBoard();
    renderOpponentBoard(cpuBoard);

    let lines = getCompletedLines(cpuBoard);
    lines.forEach(l => playSlash(l.type, l.index));

    if (lines.length >= 5) return endGame("💀 CPU WINS");

    isMyTurn = true;
}

// --- START ---
function startGame() {
    myBoard = createBoard();
    cpuBoard = createBoard();
    calledNumbers.clear();

    showScreen('game');
    renderBoard();
    renderOpponentBoard(cpuBoard);
}

// --- END ---
function endGame(msg) {
    alert(msg);
    location.reload();
}

// --- EVENTS ---
document.getElementById('btn-cpu').onclick = startGame;