/**
 * BINGO PWA - SCRIPT.JS
 */

// --- 1. GLOBAL STATE ---
let myBoard = [];
let cpuBoard = []; // FIXED: CPU needs a board to win!
let calledNumbers = new Set();
let peer = null;
let conn = null;
let gameMode = 'CPU'; 
let isMyTurn = true;
let amIHost = false;

const screens = {
    menu: document.getElementById('menu-screen'),
    lobby: document.getElementById('lobby-screen'),
    game: document.getElementById('game-screen')
};

// --- 2. UTILITY & GAME LOGIC ---

function showScreen(screenKey) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[screenKey].classList.remove('hidden');
}

function createBoard() {
    let nums = Array.from({ length: 25 }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    let board = [];
    for (let i = 0; i < 25; i += 5) board.push(nums.slice(i, i + 5));
    return board;
}

function countBingos(board, called) {
    let lines = 0;
    const marked = board.map(row => row.map(v => called.has(v)));
    
    for (let i = 0; i < 5; i++) {
        if (marked[i].every(v => v)) lines++; // Rows
        if (marked.map(r => r[i]).every(v => v)) lines++; // Cols
    }
    if ([0,1,2,3,4].every(i => marked[i][i])) lines++; // Diag 1
    if ([0,1,2,3,4].every(i => marked[i][4-i])) lines++; // Diag 2
    return lines;
}

// --- 3. UI RENDERING & GAME STATE ---

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

// FIXED: Centralized win/loss and UI updates
function updateStats() {
    const myLines = countBingos(myBoard, calledNumbers);
    document.getElementById('my-lines').textContent = myLines;

    if (gameMode === 'CPU') {
        const cpuLines = countBingos(cpuBoard, calledNumbers);
        document.getElementById('opp-lines').textContent = cpuLines;

        if (myLines >= 5 && cpuLines >= 5) setTimeout(() => endGame("🤝 It's a TIE!"), 100);
        else if (myLines >= 5) setTimeout(() => endGame("🎉 BINGO! YOU WIN!"), 100);
        else if (cpuLines >= 5) setTimeout(() => endGame("💀 CPU WINS! Better luck next time."), 100);
    } 
    else if (gameMode === 'PVP') {
        if (myLines >= 5) {
            if (conn) conn.send({ type: 'WIN' });
            setTimeout(() => endGame("🎉 BINGO! YOU WIN!"), 100);
        } else {
            if (conn) conn.send({ type: 'SYNC_LINES', lines: myLines });
        }
    }
}

// --- 4. MOVE HANDLING ---

function handleMove(val) {
    if (!isMyTurn || calledNumbers.has(val)) return;

    calledNumbers.add(val);
    renderBoard();
    updateStats();
    
    // Stop game from continuing if someone won
    if (countBingos(myBoard, calledNumbers) >= 5) return;

    if (gameMode === 'PVP' && conn) {
        conn.send({ type: 'MOVE', value: val });
        setTurn(false);
    } else if (gameMode === 'CPU') {
        isMyTurn = false;
        setTimeout(cpuTurn, 800);
    }
}

function setTurn(myTurn) {
    isMyTurn = myTurn;
    const indicator = document.getElementById('turn-indicator');
    indicator.textContent = myTurn ? "Your Turn!" : "Waiting for Opponent...";
    indicator.className = myTurn ? "active-turn" : "waiting";
}

function cpuTurn() {
    let remaining = Array.from({length: 25}, (_, i) => i + 1).filter(n => !calledNumbers.has(n));
    if (remaining.length > 0) {
        let pick = remaining[Math.floor(Math.random() * remaining.length)];
        calledNumbers.add(pick);
        renderBoard();
        updateStats();
        if (countBingos(cpuBoard, calledNumbers) < 5) setTurn(true);
    }
}

// --- 5. NETWORKING (PEERJS) ---

function initPeer() {
    peer = new Peer();
    peer.on('open', (id) => {
        document.getElementById('my-join-code').textContent = id;
    });

    peer.on('connection', (connection) => {
        conn = connection;
        amIHost = true;
        setupSocket();
    });
}

function setupSocket() {
    conn.on('open', () => {
        startGame('PVP');
    });

    // FIXED: Network Protocol for tracking opponent lines and wins
    conn.on('data', (data) => {
        if (data.type === 'MOVE') {
            calledNumbers.add(data.value);
            renderBoard();
            updateStats();
            setTurn(true);
        } else if (data.type === 'SYNC_LINES') {
            document.getElementById('opp-lines').textContent = data.lines;
        } else if (data.type === 'WIN') {
            setTimeout(() => endGame("💀 Opponent got BINGO! You lose."), 100);
        }
    });
}

function startGame(mode) {
    gameMode = mode;
    myBoard = createBoard();
    calledNumbers.clear();
    
    if (mode === 'CPU') {
        cpuBoard = createBoard();
        document.getElementById('opp-name').textContent = "CPU";
        setTurn(true);
    } else {
        document.getElementById('opp-name').textContent = "Opponent";
        setTurn(amIHost); // Host gets first turn
    }

    showScreen('game');
    renderBoard();
    updateStats();
}

function endGame(msg) {
    alert(msg);
    location.reload(); 
}

// --- 6. EVENT LISTENERS ---

document.getElementById('btn-cpu').onclick = () => startGame('CPU');

document.getElementById('btn-pvp').onclick = () => {
    showScreen('lobby');
    initPeer();
};

document.getElementById('btn-join').onclick = () => {
    const code = document.getElementById('join-code-input').value;
    if (!code) return alert("Enter a code!");
    document.getElementById('join-status').textContent = "Connecting...";
    conn = peer.connect(code);
    amIHost = false;
    setupSocket();
};

document.getElementById('btn-back-menu').onclick = () => showScreen('menu');
document.getElementById('btn-quit').onclick = () => location.reload();
