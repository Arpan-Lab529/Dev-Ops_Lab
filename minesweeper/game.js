/* ==========================================================================
   Minesweeper Neo - Main Game Logic & Controller
   ========================================================================== */

class Minesweeper {
    constructor() {
        // Difficulty presets
        this.difficulties = {
            beginner: { width: 9, height: 9, mines: 10 },
            intermediate: { width: 16, height: 16, mines: 40 },
            expert: { width: 30, height: 16, mines: 99 },
            custom: { width: 10, height: 10, mines: 15 }
        };

        this.currentDiffKey = 'beginner';
        this.width = 9;
        this.height = 9;
        this.totalMines = 10;

        this.board = []; // 2D array of Cell objects
        this.gameStarted = false;
        this.gameOver = false;
        this.gameWon = false;

        this.flagsPlaced = 0;
        this.revealedCount = 0;
        this.timer = 0;
        this.timerInterval = null;

        this.flagModeActive = false; // Touch Flag Mode toggle
        this.longPressTimer = null;

        // Statistics
        this.stats = this.loadStats();

        // DOM Element References
        this.boardEl = document.getElementById('board');
        this.mineCountEl = document.getElementById('mine-count');
        this.timerCountEl = document.getElementById('timer-count');
        this.faceIconEl = document.getElementById('face-icon');
        this.faceBtnEl = document.getElementById('face-btn');

        // Toolbar Buttons
        this.flagModeBtn = document.getElementById('flag-mode-btn');
        this.flagModeStatusEl = document.getElementById('flag-mode-status');
        this.hintBtn = document.getElementById('hint-btn');

        // Theme Selector
        this.themeSelect = document.getElementById('theme-select');

        this.initTheme();
        this.bindEvents();
        this.startNewGame(this.currentDiffKey);
    }

    // --- Stats & LocalStorage --- //
    loadStats() {
        const saved = localStorage.getItem('minesweeper_neo_stats');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return {
            played: 0,
            won: 0,
            streak: 0,
            bestTimes: { beginner: null, intermediate: null, expert: null }
        };
    }

    saveStats() {
        localStorage.setItem('minesweeper_neo_stats', JSON.stringify(this.stats));
        this.updateStatsUI();
    }

    updateStatsUI() {
        document.getElementById('stat-played').textContent = this.stats.played;
        document.getElementById('stat-won').textContent = this.stats.won;
        const winRate = this.stats.played > 0 ? Math.round((this.stats.won / this.stats.played) * 100) : 0;
        document.getElementById('stat-winrate').textContent = `${winRate}%`;
        document.getElementById('stat-streak').textContent = this.stats.streak;

        document.getElementById('best-beginner').textContent = this.formatTime(this.stats.bestTimes.beginner);
        document.getElementById('best-intermediate').textContent = this.formatTime(this.stats.bestTimes.intermediate);
        document.getElementById('best-expert').textContent = this.formatTime(this.stats.bestTimes.expert);
    }

    formatTime(seconds) {
        if (seconds === null || seconds === undefined) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // --- Theme System --- //
    initTheme() {
        const savedTheme = localStorage.getItem('minesweeper_neo_theme') || 'dark-glass';
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (this.themeSelect) this.themeSelect.value = savedTheme;
    }

    setTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem('minesweeper_neo_theme', themeName);
    }

    // --- Core Game Initialization --- //
    startNewGame(diffKey = this.currentDiffKey, customConfig = null) {
        this.stopTimer();
        this.timer = 0;
        this.timerCountEl.textContent = '000';

        this.currentDiffKey = diffKey;
        if (diffKey === 'custom' && customConfig) {
            this.difficulties.custom = customConfig;
        }

        const config = this.difficulties[this.currentDiffKey];
        this.width = config.width;
        this.height = config.height;
        this.totalMines = Math.min(config.mines, Math.floor(this.width * this.height * 0.85));

        this.gameStarted = false;
        this.gameOver = false;
        this.gameWon = false;
        this.flagsPlaced = 0;
        this.revealedCount = 0;

        this.updateMineCounter();
        this.faceIconEl.textContent = '😀';

        // Update difficulty button active state
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.diff === this.currentDiffKey);
        });

        this.createBoardData();
        this.renderBoardUI();
    }

    createBoardData() {
        this.board = [];
        for (let r = 0; r < this.height; r++) {
            const row = [];
            for (let c = 0; c < this.width; c++) {
                row.push({
                    r, c,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    adjacentMines: 0
                });
            }
            this.board.push(row);
        }
    }

    // First Click Guarantee: place mines after first click so clicked area is safe!
    generateMines(firstR, firstC) {
        let placed = 0;
        const totalCells = this.width * this.height;

        while (placed < this.totalMines) {
            const randR = Math.floor(Math.random() * this.height);
            const randC = Math.floor(Math.random() * this.width);

            // Distance check: ensure first clicked cell AND its 8 adjacent neighbors are safe
            const isFirstCellArea = Math.abs(randR - firstR) <= 1 && Math.abs(randC - firstC) <= 1;

            if (!isFirstCellArea && !this.board[randR][randC].isMine) {
                this.board[randR][randC].isMine = true;
                placed++;
            }
        }

        // Calculate adjacent mine numbers
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                if (!this.board[r][c].isMine) {
                    this.board[r][c].adjacentMines = this.countNeighborMines(r, c);
                }
            }
        }
    }

    countNeighborMines(r, c) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (this.isValidCell(nr, nc) && this.board[nr][nc].isMine) {
                    count++;
                }
            }
        }
        return count;
    }

    isValidCell(r, c) {
        return r >= 0 && r < this.height && c >= 0 && c < this.width;
    }

    // --- Render Grid UI --- //
    renderBoardUI() {
        this.boardEl.innerHTML = '';
        this.boardEl.style.gridTemplateColumns = `repeat(${this.width}, 1fr)`;

        // Calculate adaptive cell sizes
        let cellSize = 36;
        if (this.width > 24) cellSize = 26;
        else if (this.width > 16) cellSize = 30;

        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                const cell = this.board[r][c];
                const cellEl = document.createElement('div');
                cellEl.classList.add('cell', 'covered');
                cellEl.style.width = `${cellSize}px`;
                cellEl.style.height = `${cellSize}px`;
                cellEl.style.fontSize = `${Math.floor(cellSize * 0.55)}px`;
                cellEl.dataset.r = r;
                cellEl.dataset.c = c;

                cell.el = cellEl;
                this.boardEl.appendChild(cellEl);
            }
        }
    }

    // --- Timer Handling --- //
    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timer++;
            if (this.timer > 999) this.timer = 999;
            this.timerCountEl.textContent = this.timer.toString().padStart(3, '0');
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateMineCounter() {
        const remaining = this.totalMines - this.flagsPlaced;
        const sign = remaining < 0 ? '-' : '';
        const absVal = Math.abs(remaining).toString().padStart(3, '0');
        this.mineCountEl.textContent = `${sign}${absVal}`.slice(-3);
    }

    // --- Gameplay Actions --- //

    // Primary Click (Reveal Cell)
    handleCellClick(r, c) {
        if (this.gameOver || this.gameWon) return;

        const cell = this.board[r][c];
        if (cell.isFlagged || cell.isRevealed) return;

        // If in Flag Mode (for mobile), treat click as flag
        if (this.flagModeActive) {
            this.handleCellRightClick(r, c);
            return;
        }

        // Start game on first click
        if (!this.gameStarted) {
            this.gameStarted = true;
            this.generateMines(r, c);
            this.startTimer();
        }

        // Clear any hint highlights
        this.clearHintHighlights();

        // Hit a mine!
        if (cell.isMine) {
            this.triggerDefeat(r, c);
            return;
        }

        // Uncover cell
        window.soundEngine.playClick();
        this.revealCell(r, c);

        // Check victory
        this.checkWinCondition();
    }

    revealCell(r, c) {
        const cell = this.board[r][c];
        if (cell.isRevealed || cell.isFlagged) return;

        cell.isRevealed = true;
        this.revealedCount++;

        const el = cell.el;
        el.classList.remove('covered');
        el.classList.add('revealed', 'pop');

        if (cell.adjacentMines > 0) {
            el.textContent = cell.adjacentMines;
            el.dataset.num = cell.adjacentMines;
        } else {
            // 0 adjacent mines -> Cascade flood fill
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (this.isValidCell(nr, nc)) {
                        this.revealCell(nr, nc);
                    }
                }
            }
        }
    }

    // Right-Click (Toggle Flag)
    handleCellRightClick(r, c) {
        if (this.gameOver || this.gameWon) return;
        const cell = this.board[r][c];
        if (cell.isRevealed) return;

        cell.isFlagged = !cell.isFlagged;
        const el = cell.el;

        if (cell.isFlagged) {
            this.flagsPlaced++;
            el.classList.add('flagged');
            el.textContent = '🚩';
            window.soundEngine.playFlag();
        } else {
            this.flagsPlaced--;
            el.classList.remove('flagged');
            el.textContent = '';
            window.soundEngine.playUnflag();
        }

        this.updateMineCounter();
    }

    // Chording Action (Click on revealed number)
    handleCellChord(r, c) {
        if (this.gameOver || this.gameWon || !this.gameStarted) return;
        const cell = this.board[r][c];
        if (!cell.isRevealed || cell.adjacentMines === 0) return;

        // Count adjacent flags
        let flaggedNeighbors = 0;
        const unrevealedNeighbors = [];

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (this.isValidCell(nr, nc)) {
                    const nCell = this.board[nr][nc];
                    if (nCell.isFlagged) flaggedNeighbors++;
                    else if (!nCell.isRevealed) unrevealedNeighbors.push(nCell);
                }
            }
        }

        // If flags match adjacent mine count, reveal all unflagged neighbors!
        if (flaggedNeighbors === cell.adjacentMines && unrevealedNeighbors.length > 0) {
            window.soundEngine.playChord();
            let hitMine = false;

            for (const nCell of unrevealedNeighbors) {
                if (nCell.isMine) {
                    hitMine = true;
                    this.triggerDefeat(nCell.r, nCell.c);
                    break;
                } else {
                    this.revealCell(nCell.r, nCell.c);
                }
            }

            if (!hitMine) {
                this.checkWinCondition();
            }
        }
    }

    // Smart Hint System
    getHint() {
        if (this.gameOver || this.gameWon) return;

        // If game not started, pick any safe center cell
        if (!this.gameStarted) {
            const centerR = Math.floor(this.height / 2);
            const centerC = Math.floor(this.width / 2);
            this.highlightHintCell(centerR, centerC);
            return;
        }

        this.clearHintHighlights();

        // 1. Try single-cell logical deduction (find guaranteed safe cell)
        let foundSafeCell = null;

        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                const cell = this.board[r][c];
                if (cell.isRevealed && cell.adjacentMines > 0) {
                    let flags = 0;
                    const unrevealed = [];

                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = r + dr;
                            const nc = c + dc;
                            if (this.isValidCell(nr, nc)) {
                                const ncCell = this.board[nr][nc];
                                if (ncCell.isFlagged) flags++;
                                else if (!ncCell.isRevealed) unrevealed.push(ncCell);
                            }
                        }
                    }

                    if (flags === cell.adjacentMines && unrevealed.length > 0) {
                        foundSafeCell = unrevealed[0];
                        break;
                    }
                }
            }
            if (foundSafeCell) break;
        }

        // 2. Fallback: Find any unrevealed non-mine cell
        if (!foundSafeCell) {
            const candidates = [];
            for (let r = 0; r < this.height; r++) {
                for (let c = 0; c < this.width; c++) {
                    const cell = this.board[r][c];
                    if (!cell.isRevealed && !cell.isFlagged && !cell.isMine) {
                        candidates.push(cell);
                    }
                }
            }
            if (candidates.length > 0) {
                foundSafeCell = candidates[Math.floor(Math.random() * candidates.length)];
            }
        }

        if (foundSafeCell) {
            window.soundEngine.playHint();
            this.highlightHintCell(foundSafeCell.r, foundSafeCell.c);
        }
    }

    highlightHintCell(r, c) {
        const cell = this.board[r][c];
        if (cell && cell.el) {
            cell.el.classList.add('hint-highlight');
        }
    }

    clearHintHighlights() {
        document.querySelectorAll('.cell.hint-highlight').forEach(el => {
            el.classList.remove('hint-highlight');
        });
    }

    // Check Victory
    checkWinCondition() {
        const totalCells = this.width * this.height;
        if (this.revealedCount === totalCells - this.totalMines) {
            this.triggerVictory();
        }
    }

    // Trigger Defeat
    triggerDefeat(hitR, hitC) {
        this.gameOver = true;
        this.stopTimer();
        this.faceIconEl.textContent = '💥';
        window.soundEngine.playExplosion();

        // Trigger particle explosion at hit cell
        const hitCell = this.board[hitR][hitC];
        if (hitCell && hitCell.el) {
            const rect = hitCell.el.getBoundingClientRect();
            if (window.effectsManager) {
                window.effectsManager.triggerExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2);
            }
        }

        // Reveal all mines & show incorrect flags
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                const cell = this.board[r][c];
                const el = cell.el;

                if (r === hitR && c === hitC) {
                    el.classList.remove('covered');
                    el.classList.add('revealed', 'mine', 'mine-exploded');
                    el.textContent = '💥';
                } else if (cell.isMine && !cell.isFlagged) {
                    el.classList.remove('covered');
                    el.classList.add('revealed', 'mine');
                    el.textContent = '💣';
                } else if (!cell.isMine && cell.isFlagged) {
                    el.textContent = '❌';
                }
            }
        }

        // Update Stats
        this.stats.played++;
        this.stats.streak = 0;
        this.saveStats();

        // Show Loss Modal after short delay
        setTimeout(() => {
            this.showResultModal(false);
        }, 1000);
    }

    // Trigger Victory
    triggerVictory() {
        this.gameWon = true;
        this.stopTimer();
        this.faceIconEl.textContent = '😎';
        window.soundEngine.playWin();

        if (window.effectsManager) {
            window.effectsManager.triggerConfetti();
        }

        // Auto-flag all remaining mines
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                const cell = this.board[r][c];
                if (cell.isMine && !cell.isFlagged) {
                    cell.isFlagged = true;
                    cell.el.classList.add('flagged');
                    cell.el.textContent = '🚩';
                }
            }
        }
        this.flagsPlaced = this.totalMines;
        this.updateMineCounter();

        // Update Stats & Best Times
        this.stats.played++;
        this.stats.won++;
        this.stats.streak++;

        let isNewRecord = false;
        if (['beginner', 'intermediate', 'expert'].includes(this.currentDiffKey)) {
            const currentBest = this.stats.bestTimes[this.currentDiffKey];
            if (currentBest === null || this.timer < currentBest) {
                this.stats.bestTimes[this.currentDiffKey] = this.timer;
                isNewRecord = true;
            }
        }

        this.saveStats();

        // Show Win Modal
        setTimeout(() => {
            this.showResultModal(true, isNewRecord);
        }, 600);
    }

    // Show Result Overlay
    showResultModal(won, isNewRecord = false) {
        const modal = document.getElementById('result-modal');
        const iconEl = document.getElementById('result-icon');
        const titleEl = document.getElementById('result-title');
        const subtitleEl = document.getElementById('result-subtitle');
        const timeEl = document.getElementById('result-time');
        const recordBadge = document.getElementById('result-record-badge');

        iconEl.textContent = won ? '🎉' : '💥';
        titleEl.textContent = won ? 'VICTORY!' : 'GAME OVER';
        subtitleEl.textContent = won ? 'All mines successfully defused!' : 'You detonated a mine!';
        timeEl.textContent = this.formatTime(this.timer);
        recordBadge.style.display = (won && isNewRecord) ? 'block' : 'none';

        modal.classList.remove('hidden');
    }

    // --- DOM Event Bindings --- //
    bindEvents() {
        // Reset face button
        this.faceBtnEl.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.startNewGame();
        });

        // Difficulty selector buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const diff = e.currentTarget.dataset.diff;
                if (diff === 'custom') {
                    document.getElementById('custom-modal').classList.remove('hidden');
                } else {
                    window.soundEngine.playClick();
                    this.startNewGame(diff);
                }
            });
        });

        // Theme Switcher
        if (this.themeSelect) {
            this.themeSelect.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        }

        // Sound Toggle
        const soundBtn = document.getElementById('sound-btn');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                const enabled = window.soundEngine.toggleSound();
                soundBtn.querySelector('.sound-icon').textContent = enabled ? '🔊' : '🔇';
            });
        }

        // Flag Mode Toggle for Touch/Mobile
        if (this.flagModeBtn) {
            this.flagModeBtn.addEventListener('click', () => {
                this.flagModeActive = !this.flagModeActive;
                this.flagModeBtn.classList.toggle('active', this.flagModeActive);
                this.flagModeStatusEl.textContent = this.flagModeActive ? 'ON 🚩' : 'OFF';
                window.soundEngine.playClick();
            });
        }

        // Hint Button
        if (this.hintBtn) {
            this.hintBtn.addEventListener('click', () => {
                this.getHint();
            });
        }

        // Help Modal
        document.getElementById('help-btn').addEventListener('click', () => {
            document.getElementById('help-modal').classList.remove('hidden');
        });

        // Stats Modal
        document.getElementById('stats-btn').addEventListener('click', () => {
            this.updateStatsUI();
            document.getElementById('stats-modal').classList.remove('hidden');
        });

        // Close buttons for modals
        document.querySelectorAll('.close-modal-btn, [data-close]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.currentTarget.dataset.close;
                if (targetId) {
                    document.getElementById(targetId).classList.add('hidden');
                }
            });
        });

        // Custom Form submit
        const customForm = document.getElementById('custom-form');
        if (customForm) {
            customForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const w = parseInt(document.getElementById('custom-width').value, 10);
                const h = parseInt(document.getElementById('custom-height').value, 10);
                const m = parseInt(document.getElementById('custom-mines').value, 10);

                document.getElementById('custom-modal').classList.add('hidden');
                this.startNewGame('custom', { width: w, height: h, mines: m });
            });
        }

        document.getElementById('custom-cancel').addEventListener('click', () => {
            document.getElementById('custom-modal').classList.add('hidden');
        });

        // Reset Stats
        document.getElementById('reset-stats-btn').addEventListener('click', () => {
            if (confirm("Are you sure you want to reset all game statistics?")) {
                this.stats = { played: 0, won: 0, streak: 0, bestTimes: { beginner: null, intermediate: null, expert: null } };
                this.saveStats();
            }
        });

        // Play Again button on Result Modal
        document.getElementById('result-play-again').addEventListener('click', () => {
            document.getElementById('result-modal').classList.add('hidden');
            this.startNewGame();
        });

        // Grid Click Delegation
        this.boardEl.addEventListener('click', (e) => {
            const cellEl = e.target.closest('.cell');
            if (!cellEl) return;
            const r = parseInt(cellEl.dataset.r, 10);
            const c = parseInt(cellEl.dataset.c, 10);
            this.handleCellClick(r, c);
        });

        // Context Menu / Right-click Delegation
        this.boardEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const cellEl = e.target.closest('.cell');
            if (!cellEl) return;
            const r = parseInt(cellEl.dataset.r, 10);
            const c = parseInt(cellEl.dataset.c, 10);
            this.handleCellRightClick(r, c);
        });

        // Double Click / Middle Click for Chording
        this.boardEl.addEventListener('dblclick', (e) => {
            const cellEl = e.target.closest('.cell');
            if (!cellEl) return;
            const r = parseInt(cellEl.dataset.r, 10);
            const c = parseInt(cellEl.dataset.c, 10);
            this.handleCellChord(r, c);
        });

        this.boardEl.addEventListener('mousedown', (e) => {
            // Middle click (button === 1)
            if (e.button === 1) {
                e.preventDefault();
                const cellEl = e.target.closest('.cell');
                if (!cellEl) return;
                const r = parseInt(cellEl.dataset.r, 10);
                const c = parseInt(cellEl.dataset.c, 10);
                this.handleCellChord(r, c);
            }
        });

        // Touch Long-press support for Mobile Devices
        this.boardEl.addEventListener('touchstart', (e) => {
            const cellEl = e.target.closest('.cell');
            if (!cellEl) return;
            const r = parseInt(cellEl.dataset.r, 10);
            const c = parseInt(cellEl.dataset.c, 10);

            this.longPressTimer = setTimeout(() => {
                this.handleCellRightClick(r, c);
                this.longPressTimer = null;
            }, 350);
        }, { passive: true });

        this.boardEl.addEventListener('touchend', () => {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        });

        this.boardEl.addEventListener('touchmove', () => {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        });
    }
}

// Instantiate game when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.minesweeperGame = new Minesweeper();
});
