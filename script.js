/**    
 * BINGO PWA - SCRIPT.JS (SMART CPU + PSEUDO BOARD + SLASH FX)    
 */    

// --- 1. GLOBAL STATE ---    
let myBoard = [];    
let cpuBoard = [];    
let calledNumbers = new Set();    
let peer = null;    
let conn = null;    
let gameMode = 'CPU';     
let isMyTurn = true;    
let amIHost = false;
let rematchRequested = false;
let opponentRematch = false;
let alreadyCompleted = new Set();

const screens = {    
    menu: document.getElementById('menu-screen'),    
    lobby: document.getElementById('lobby-screen'),    
    game: document.getElementById('game-screen')    
};    

// --- 2. UTILITIES ---    

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
        if (marked[i].every(v => v)) lines++;    
        if (marked.map(r => r[i]).every(v => v)) lines++;    
    }    
    if ([0,1,2,3,4].every(i => marked[i][i])) lines++;    
    if ([0,1,2,3,4].every(i => marked[i][4-i])) lines++;    
    return lines;    
}    

// --- 🧠 SMART CPU ---    

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
    let remaining = Array.from({length: 25}, (_, i) => i + 1)
        .filter(n => !calledNumbers.has(n));

    let bestScore = -1;
    let bestMoves = [];

    for (let num of remaining) {
        let score = scoreNumber(num, cpuBoard);

        if (score > bestScore) {
            bestScore = score;
            bestMoves = [num];
        } else if (score === bestScore) {
            bestMoves.push(num);
        }
    }

    if (bestScore === 0) {
        return remaining[Math.floor(Math.random() * remaining.length)];
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// --- ⚔️ SLASH FX ---    

function getCompletedLines(board, called) {
    const completed = [];
    const marked = board.map(row => row.map(v => called.has(v)));

    for (let i = 0; i < 5; i++) {
        if (marked[i].every(v => v)) completed.push({type:'row', index:i});
        if (marked.map(r => r[i]).every(v => v)) completed.push({type:'col', index:i});
    }

    if ([0,1,2,3,4].every(i => marked[i][i])) completed.push({type:'diag1'});
    if ([0,1,2,3,4].every(i => marked[i][4-i])) completed.push({type:'diag2'});

    return completed;
}

function playSlashAnimation(type, index) {
    const grid = document.getElementById('bingo-board');
    const strike = document.createElement('div');
    strike.className = 'line-strike';

    const cellSize = grid.offsetWidth / 5;

    if (type === 'row') {
        strike.style.height = '4px';
        strike.style.width = '100%';
        strike.style.top = `${index * cellSize + cellSize/2}px`;
    } 
    else if (type === 'col') {
        strike.style.width = '4px';
        strike.style.height = '100%';
        strike.style.left = `${index * cellSize + cellSize/2}px`;
    } 
    else if (type === 'diag1') {
        strike.style.width = '140%';
        strike.style.height = '4px';
        strike.style.transform = 'rotate(45deg)';
        strike.style.top = '50%';
        strike.style.transformOrigin = 'center';
        strike.style.left = '-20%';
    } 
    else if (type === 'diag2') {
        strike.style.width = '140%';
        strike.style.height = '4px';
        strike.style.transform = 'rotate(-45deg)';
        strike.style.top = '50%';
        strike.style.transformOrigin = 'center';
        strike.style.left = '-20%';
    }

    grid.appendChild(strike);
    setTimeout(() => strike.remove(), 600);
}

// --- 🎮 RENDER ---    

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
    if (!grid) return;

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

// --- 📊 GAME STATE ---    

function updateStats() {    
    const myLines = countBingos(myBoard, calledNumbers);    
    document.getElementById('my-lines').textContent = myLines;    

    const completed = getCompletedLines(myBoard, calledNumbers);
    completed.forEach(line => {
        const key = line.type + '-' + (line.index ?? 'x');
        if (!alreadyCompleted.has(key)) {
            alreadyCompleted.add(key);
            playSlashAnimation(line.type, line.index);
        }
});

    if (gameMode === 'CPU') {    
        const cpuLines = countBingos(cpuBoard, calledNumbers);    
        document.getElementById('opp-lines').textContent = cpuLines;    
        renderOpponentBoard(cpuBoard);

        if (myLines >= 5 && cpuLines >= 5) setTimeout(() => endGame("🤝 TIE!"), 100);    
        else if (myLines >= 5) setTimeout(() => endGame("🎉 YOU WIN!"), 100);    
        else if (cpuLines >= 5) setTimeout(() => endGame("💀 CPU WINS!"), 100);    
    }     
    else if (gameMode === 'PVP') {    
        if (myLines >= 5) {    
            if (conn) conn.send({ type: 'WIN' });    
            setTimeout(() => endGame("🎉 YOU WIN!"), 100);    
        } else {    
            if (conn) conn.send({ type: 'SYNC_LINES', lines: myLines });    
        }    
    }    
}    

// --- 🎯 MOVES ---    

function handleMove(val) {    
    if (!isMyTurn || calledNumbers.has(val)) return;    

    calledNumbers.add(val);    
    renderBoard();    
    updateStats();    

    if (countBingos(myBoard, calledNumbers) >= 5) return;    

    if (gameMode === 'PVP' && conn) {    
        conn.send({ type: 'MOVE', value: val });    
        setTurn(false);    
    } else {    
        isMyTurn = false;    
        setTimeout(cpuTurn, 800);    
    }    
}    

function setTurn(myTurn) {    
    isMyTurn = myTurn;    
    const indicator = document.getElementById('turn-indicator');    
    indicator.textContent = myTurn ? "Your Turn!" : "CPU Thinking...";    
    indicator.className = myTurn ? "active-turn" : "waiting";    
}    

function cpuTurn() {    
    let pick = getBestMove();    
    calledNumbers.add(pick);    
    renderBoard();    
    updateStats();    

    if (countBingos(cpuBoard, calledNumbers) < 5) setTurn(true);    
}    

// --- 🌐 NETWORK ---    

function initPeer() {    
    peer = new Peer();    
    peer.on('open', id => {
        document.getElementById('my-join-code').textContent = id;
    });

    peer.on('connection', connection => {
        conn = connection;
        amIHost = true;
        setupSocket();
    });
}

function setupSocket() {
    conn.on('open', () => startGame('PVP'));

    conn.on('data', data => {

        if (data.type === 'MOVE') {
            calledNumbers.add(data.value);
            renderBoard();
            renderOpponentBoard(myBoard);
            updateStats();
            setTurn(true);
        }

        else if (data.type === 'SYNC_LINES') {
            document.getElementById('opp-lines').textContent = data.lines;
        }

        else if (data.type === 'WIN') {
            setTimeout(() => endGame("💀 You Lose!"), 100);
        }

        else if (data.type === 'REMATCH_REQUEST') {
            opponentRematch = true;

            if (rematchRequested) {
                startGame('PVP');
            } else {
                const accept = confirm("🔁 Opponent wants a rematch!");
                if (accept) {
                    rematchRequested = true;
                    conn.send({ type: 'REMATCH_REQUEST' });
                    startGame('PVP');
                } else {
                    conn.send({ type: 'REMATCH_DECLINE' });
                    location.reload();
                }
            }
        }

        else if (data.type === 'REMATCH_DECLINE') {
            alert("Opponent declined rematch.");
            location.reload();
        }

    });
}

// --- 🚀 START / END ---    

function startGame(mode) {    
    gameMode = mode;    
    myBoard = createBoard();    
    calledNumbers.clear();
    alreadyCompleted.clear();
    rematchRequested = false;
    opponentRematch = false;

    if (mode === 'CPU') {    
        cpuBoard = createBoard();    
        document.getElementById('opp-name').textContent = "CPU";    
        renderOpponentBoard(cpuBoard);
        setTurn(true);    
    } else {    
        document.getElementById('opp-name').textContent = "Opponent";    
        setTurn(amIHost);    
    }    

    showScreen('game');    
    renderBoard();    
    updateStats();    
}    

function endGame(msg) {
    if (gameMode === 'PVP' && conn) {
        const wantRematch = confirm(msg + "\n\n🔁 Rematch?");
        
        if (wantRematch) {
            rematchRequested = true;
            conn.send({ type: 'REMATCH_REQUEST' });

            // If opponent already asked → start instantly
            if (opponentRematch) startGame('PVP');
        } else {
            conn.send({ type: 'REMATCH_DECLINE' });
            location.reload();
        }
    } else {
        alert(msg);
        location.reload();
    }
}
// --- EVENTS ---    

document.getElementById('btn-cpu').onclick = () => startGame('CPU');    

document.getElementById('btn-pvp').onclick = () => {    
    showScreen('lobby');    
    initPeer();    
};    

document.getElementById('btn-join').onclick = () => {    
    const code = document.getElementById('join-code-input').value;    
    if (!code) return alert("Enter a code!");    
    conn = peer.connect(code);    
    amIHost = false;    
    setupSocket();    
};    

document.getElementById('btn-back-menu').onclick = () => showScreen('menu');    
document.getElementById('btn-quit').onclick = () => location.reload();