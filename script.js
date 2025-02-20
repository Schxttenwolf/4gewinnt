class Connect4 {
    constructor() {
        this.board = Array(6).fill().map(() => Array(7).fill(0));
        this.currentPlayer = 1;
        this.loadGameState();
        this.initializeGame();
    }

    loadGameState() {
        const savedState = localStorage.getItem('connect4State');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.gameMode = state.gameMode || 'friend';
            this.difficulty = state.difficulty || 'hard';
            this.scores = state.scores || {1: 0, 2: 0};
            this.language = state.language || 'de';
            this.board = state.board || Array(6).fill().map(() => Array(7).fill(0));
            this.currentPlayer = state.currentPlayer || 1;
        } else {
            this.gameMode = 'friend';
            this.difficulty = 'hard';
            this.scores = {1: 0, 2: 0};
            this.language = 'de';
        }
    }

    saveGameState() {
        const state = {
            gameMode: this.gameMode,
            difficulty: this.difficulty,
            scores: this.scores,
            language: this.language,
            board: this.board,
            currentPlayer: this.currentPlayer
        };
        localStorage.setItem('connect4State', JSON.stringify(state));
    }

    initializeGame() {
        this.createBoard();
        this.setupEventListeners();
        this.updateScoreDisplay();
        this.updatePlayerHighlight();
        this.updateBoardDisplay();
        this.updateStatus(`${this.getPlayerName(this.currentPlayer)} ist am Zug`);
        document.getElementById('language').value = this.language;
        document.getElementById('gameMode').value = this.gameMode;
        document.getElementById('difficulty').value = this.difficulty;
        document.getElementById('difficulty').style.display = 
            this.gameMode === 'ai' ? 'inline' : 'none';
        this.updateLabels();
    }

    createBoard() {
        const boardElement = document.querySelector('.board');
        boardElement.innerHTML = '';
        
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 7; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.col = col;
                boardElement.appendChild(cell);
            }
        }
    }

    setupEventListeners() {
        document.querySelector('.board').addEventListener('click', (e) => {
            if (e.target.classList.contains('cell')) {
                const col = e.target.dataset.col;
                this.makeMove(parseInt(col));
            }
        });

        document.getElementById('gameMode').addEventListener('change', (e) => {
            this.gameMode = e.target.value;
            document.getElementById('difficulty').style.display = 
                this.gameMode === 'ai' ? 'inline' : 'none';
            this.saveGameState();
            this.resetGame();
        });

        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.saveGameState();
        });

        document.getElementById('language').addEventListener('change', (e) => {
            this.language = e.target.value;
            this.saveGameState();
            this.updateLabels();
        });

        document.getElementById('resetGame').addEventListener('click', () => {
            this.resetGame();
        });

        document.getElementById('resetScores').addEventListener('click', () => {
            this.resetScores();
        });
    }

    makeMove(col) {
        if (this.isValidMove(col)) {
            const row = this.getLowestEmptyRow(col);
            this.board[row][col] = this.currentPlayer;
            
            const index = row * 7 + parseInt(col);
            const cell = document.querySelectorAll('.cell')[index];
            cell.classList.add('dropping');
            
            cell.addEventListener('animationend', () => {
                cell.classList.remove('dropping');
            }, { once: true });

            this.updateBoardDisplay();
            this.saveGameState();

            if (this.checkWin(row, col)) {
                this.handleWin();
            } else if (this.isBoardFull()) {
                this.resetGame();
            } else {
                this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                this.updatePlayerHighlight();
                this.updateStatus(`${this.getPlayerName(this.currentPlayer)} ist dran`);
                this.saveGameState();

                if (this.gameMode === 'ai' && this.currentPlayer === 2) {
                    setTimeout(() => this.makeAIMove(), 600);
                }
            }
        }
    }

    makeAIMove() {
        const col = this.calculateBestMove();
        this.makeMove(col);
    }

    calculateBestMove() {
        if (this.difficulty === 'easy') {
            return Math.floor(Math.random() * 7);
        }

        const depth = this.difficulty === 'hard' ? 6 : 4;
        let bestScore = -Infinity;
        let bestMove = 0;

        for (let col = 0; col < 7; col++) {
            if (this.isValidMove(col)) {
                const row = this.getLowestEmptyRow(col);
                this.board[row][col] = 2;
                const score = this.minimax(depth, false, -Infinity, Infinity);
                this.board[row][col] = 0;

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = col;
                }
            }
        }

        return bestMove;
    }

    minimax(depth, isMaximizing, alpha, beta) {
        if (depth === 0) return this.evaluateBoard();
        if (this.checkWinningMove()) return isMaximizing ? -1000 : 1000;
        if (this.isBoardFull()) return 0;

        if (isMaximizing) {
            let maxScore = -Infinity;
            for (let col = 0; col < 7; col++) {
                if (this.isValidMove(col)) {
                    const row = this.getLowestEmptyRow(col);
                    this.board[row][col] = 2;
                    const score = this.minimax(depth - 1, false, alpha, beta);
                    this.board[row][col] = 0;
                    maxScore = Math.max(maxScore, score);
                    alpha = Math.max(alpha, score);
                    if (beta <= alpha) break;
                }
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            for (let col = 0; col < 7; col++) {
                if (this.isValidMove(col)) {
                    const row = this.getLowestEmptyRow(col);
                    this.board[row][col] = 1;
                    const score = this.minimax(depth - 1, true, alpha, beta);
                    this.board[row][col] = 0;
                    minScore = Math.min(minScore, score);
                    beta = Math.min(beta, score);
                    if (beta <= alpha) break;
                }
            }
            return minScore;
        }
    }

    evaluateBoard() {
        let score = 0;
        // Horizontal, vertical und diagonal prüfen
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 7; col++) {
                if (col <= 3) {
                    score += this.evaluateWindow(
                        [this.board[row][col], this.board[row][col+1],
                         this.board[row][col+2], this.board[row][col+3]]
                    );
                }
                if (row <= 2) {
                    score += this.evaluateWindow(
                        [this.board[row][col], this.board[row+1][col],
                         this.board[row+2][col], this.board[row+3][col]]
                    );
                }
                if (row <= 2 && col <= 3) {
                    score += this.evaluateWindow(
                        [this.board[row][col], this.board[row+1][col+1],
                         this.board[row+2][col+2], this.board[row+3][col+3]]
                    );
                }
                if (row <= 2 && col >= 3) {
                    score += this.evaluateWindow(
                        [this.board[row][col], this.board[row+1][col-1],
                         this.board[row+2][col-2], this.board[row+3][col-3]]
                    );
                }
            }
        }
        return score;
    }

    evaluateWindow(window) {
        const aiCount = window.filter(cell => cell === 2).length;
        const playerCount = window.filter(cell => cell === 1).length;
        const emptyCount = window.filter(cell => cell === 0).length;

        if (aiCount === 4) return 100;
        if (playerCount === 4) return -100;
        if (aiCount === 3 && emptyCount === 1) return 5;
        if (playerCount === 3 && emptyCount === 1) return -5;
        if (aiCount === 2 && emptyCount === 2) return 2;
        if (playerCount === 2 && emptyCount === 2) return -2;
        return 0;
    }

    isValidMove(col) {
        return this.board[0][col] === 0;
    }

    getLowestEmptyRow(col) {
        for (let row = 5; row >= 0; row--) {
            if (this.board[row][col] === 0) return row;
        }
        return -1;
    }

    checkWin(row, col) {
        const directions = [
            [[0, 1], [0, -1]],
            [[1, 0], [-1, 0]],
            [[1, 1], [-1, -1]],
            [[1, -1], [-1, 1]]
        ];

        return directions.some(dir => {
            const count = 1 + 
                this.countInDirection(row, col, dir[0][0], dir[0][1]) +
                this.countInDirection(row, col, dir[1][0], dir[1][1]);
            return count >= 4;
        });
    }

    countInDirection(row, col, rowDir, colDir) {
        let count = 0;
        let currentRow = row + rowDir;
        let currentCol = col + colDir;

        while (
            currentRow >= 0 && currentRow < 6 &&
            currentCol >= 0 && currentCol < 7 &&
            this.board[currentRow][currentCol] === this.currentPlayer
        ) {
            count++;
            currentRow += rowDir;
            currentCol += colDir;
        }

        return count;
    }

    handleWin() {
        this.scores[this.currentPlayer]++;
        this.saveGameState();
        this.updateScoreDisplay();
        this.updateStatus(`${this.getPlayerName(this.currentPlayer)} gewinnt!`, this.currentPlayer);
        setTimeout(() => this.resetGame(), 2000);
    }

    updateStatus(message, player = null) {
        const statusDiv = document.querySelector('.current-status');
        statusDiv.textContent = message;
        statusDiv.className = 'current-status' + (player ? ` player${player}` : ' game-status');
        
        if (player) {
            setTimeout(() => {
                statusDiv.className = 'current-status game-status';
            }, 2000);
        }
    }

    getPlayerName(player) {
        if (player === 1) return 'Spieler 1';
        return this.gameMode === 'ai' ? 
            'Algorithmus' : 
            'Spieler 2';
    }

    updateBoardDisplay() {
        const cells = document.querySelectorAll('.cell');
        this.board.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const index = rowIndex * 7 + colIndex;
                cells[index].className = cell === 0 ? 'cell empty' : `cell player${cell}`;
            });
        });

        for (let col = 0; col < 7; col++) {
            if (!this.isValidMove(col)) {
                for (let row = 0; row < 6; row++) {
                    const index = row * 7 + col;
                    cells[index].classList.remove('empty');
                }
            }
        }
    }

    updatePlayerHighlight() {
        document.querySelector('.player1').classList.toggle('active', this.currentPlayer === 1);
        document.querySelector('.player2').classList.toggle('active', this.currentPlayer === 2);
    }

    updateScoreDisplay() {
        document.querySelector('.player1 .player-score').textContent = this.scores[1];
        document.querySelector('.player2 .player-score').textContent = this.scores[2];
    }

    updateLabels() {
        const translations = {
            de: {
                player1: 'Spieler 1',
                player2: 'Spieler 2',
                ai: 'Algorithmus',
                newGame: 'Neues Spiel',
                resetScores: 'Punktestand zurücksetzen',
                vsPlayer: 'Gegen Freund',
                vsAI: 'Gegen Algorithmus',
                easy: 'Einfach',
                medium: 'Mittel',
                hard: 'Schwer',
                confirmReset: 'Möchten Sie wirklich den Punktestand zurücksetzen?'
            },
            en: {
                player1: 'Player 1',
                player2: 'Player 2',
                ai: 'Algorithm',
                newGame: 'New Game',
                resetScores: 'Reset Scores',
                vsPlayer: 'vs Friend',
                vsAI: 'vs Algorithm',
                easy: 'Easy',
                medium: 'Medium',
                hard: 'Hard',
                confirmReset: 'Do you really want to reset the scores?'
            }
        };

        document.querySelector('.player1 .player-name').textContent = translations[this.language].player1;
        document.querySelector('.player2 .player-name').textContent = this.gameMode === 'ai' ? translations[this.language].ai : translations[this.language].player2;

        document.getElementById('resetGame').textContent = translations[this.language].newGame;
        document.getElementById('resetScores').textContent = translations[this.language].resetScores;

        const gameModeSelect = document.getElementById('gameMode');
        gameModeSelect.options[0].textContent = translations[this.language].vsPlayer;
        gameModeSelect.options[1].textContent = translations[this.language].vsAI;

        const difficultySelect = document.getElementById('difficulty');
        difficultySelect.options[0].textContent = translations[this.language].easy;
        difficultySelect.options[1].textContent = translations[this.language].medium;
        difficultySelect.options[2].textContent = translations[this.language].hard;
    }

    resetGame() {
        this.board = Array(6).fill().map(() => Array(7).fill(0));
        this.currentPlayer = 1;
        this.updateBoardDisplay();
        this.updatePlayerHighlight();
        this.updateStatus(`${this.getPlayerName(this.currentPlayer)} ist am Zug`);
        this.saveGameState();
    }

    isBoardFull() {
        return this.board[0].every(cell => cell !== 0);
    }

    checkWinningMove() {
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 7; col++) {
                if (this.board[row][col] !== 0 && this.checkWin(row, col)) {
                    return true;
                }
            }
        }
        return false;
    }

    resetScores() {
        this.scores = {1: 0, 2: 0};
        this.saveGameState();
        this.updateScoreDisplay();
    }
}

// Spiel starten
new Connect4(); 