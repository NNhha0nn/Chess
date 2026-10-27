/**
 * Chess UI Controller
 * Manages board rendering, piece interaction (drag/click), highlights, timers, and modals.
 */
(function(window) {
  'use strict';

  class ChessUI {
    constructor() {
      this.boardEl = document.getElementById('boardGrid');
      this.flipped = false;
      this.selectedSquare = null;
      this.legalMoves = [];
      this.promotionResolve = null;

      // Drag state
      this.draggedSquare = null;
      this.dragGhost = null;

      // Theme
      this.currentTheme = 'green';
    }

    init() {
      this.renderBoard();
      this.setupBoardEvents();
      this.setupPromotionModal();
    }

    setTheme(theme) {
      this.currentTheme = theme;
      document.body.setAttribute('data-board-theme', theme);
    }

    flipBoard() {
      this.flipped = !this.flipped;
      this.renderBoard();
      this.updateBoardPieces(window.chessApp.game);
      this.updateHighlights();
    }

    setFlipped(flipped) {
      if (this.flipped !== flipped) {
        this.flipped = flipped;
        this.renderBoard();
        this.updateBoardPieces(window.chessApp.game);
        this.updateHighlights();
      }
    }

    /**
     * Render the 64 squares grid with files and ranks
     */
    renderBoard() {
      this.boardEl.innerHTML = '';

      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

      const displayRanks = this.flipped ? [...ranks].reverse() : ranks;
      const displayFiles = this.flipped ? [...files].reverse() : files;

      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const file = displayFiles[f];
          const rank = displayRanks[r];
          const squareId = file + rank;

          const squareDiv = document.createElement('div');
          squareDiv.className = `square ${(r + f) % 2 === 0 ? 'light' : 'dark'}`;
          squareDiv.dataset.square = squareId;

          // Rank label on leftmost file
          if (f === 0) {
            const rankLabel = document.createElement('span');
            rankLabel.className = 'coord-rank';
            rankLabel.textContent = rank;
            squareDiv.appendChild(rankLabel);
          }

          // File label on bottommost rank
          if (r === 7) {
            const fileLabel = document.createElement('span');
            fileLabel.className = 'coord-file';
            fileLabel.textContent = file;
            squareDiv.appendChild(fileLabel);
          }

          this.boardEl.appendChild(squareDiv);
        }
      }
    }

    /**
     * Update piece icons on squares according to game board state
     */
    updateBoardPieces(game) {
      const board = game.board();

      // Clear existing pieces from all squares
      const squares = this.boardEl.querySelectorAll('.square');
      squares.forEach(sq => {
        const existingPiece = sq.querySelector('.piece');
        if (existingPiece) sq.removeChild(existingPiece);
      });

      // Place pieces from game state
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (!piece) continue;

          const file = String.fromCharCode('a'.charCodeAt(0) + c);
          const rank = (8 - r).toString();
          const squareId = file + rank;

          const sqEl = this.boardEl.querySelector(`[data-square="${squareId}"]`);
          if (sqEl) {
            const pieceDiv = document.createElement('div');
            pieceDiv.className = 'piece';
            pieceDiv.draggable = true;
            pieceDiv.dataset.square = squareId;
            pieceDiv.dataset.piece = `${piece.color}${piece.type.toUpperCase()}`;

            const img = document.createElement('img');
            img.src = `assets/pieces/${piece.color}${piece.type.toUpperCase()}.svg`;
            img.alt = `${piece.color} ${piece.type}`;

            pieceDiv.appendChild(img);
            sqEl.appendChild(pieceDiv);
          }
        }
      }
    }

    /**
     * Update board highlights (selected square, legal move dots, last move, in check)
     */
    updateHighlights(lastMove = null, checkSquare = null) {
      // Clear previous move dots and selections
      const squares = this.boardEl.querySelectorAll('.square');
      squares.forEach(sq => {
        sq.classList.remove('selected', 'move-dest', 'move-capture', 'hint');
      });

      // Highlight selected square
      if (this.selectedSquare) {
        const selEl = this.boardEl.querySelector(`[data-square="${this.selectedSquare}"]`);
        if (selEl) selEl.classList.add('selected');

        // Highlight legal move destinations
        this.legalMoves.forEach(move => {
          const targetEl = this.boardEl.querySelector(`[data-square="${move.to}"]`);
          if (targetEl) {
            if (move.captured) {
              targetEl.classList.add('move-capture');
            } else {
              targetEl.classList.add('move-dest');
            }
          }
        });
      }

      // Last move highlights
      if (lastMove) {
        squares.forEach(sq => sq.classList.remove('last-move'));
        const fromEl = this.boardEl.querySelector(`[data-square="${lastMove.from}"]`);
        const toEl = this.boardEl.querySelector(`[data-square="${lastMove.to}"]`);
        if (fromEl) fromEl.classList.add('last-move');
        if (toEl) toEl.classList.add('last-move');
      }

      // Check alert
      squares.forEach(sq => sq.classList.remove('in-check'));
      if (checkSquare) {
        const kingSq = this.boardEl.querySelector(`[data-square="${checkSquare}"]`);
        if (kingSq) kingSq.classList.add('in-check');
      }
    }

    /**
     * Highlight hint move
     */
    showHintHighlight(fromSquare, toSquare) {
      const fromEl = this.boardEl.querySelector(`[data-square="${fromSquare}"]`);
      const toEl = this.boardEl.querySelector(`[data-square="${toSquare}"]`);
      if (fromEl) fromEl.classList.add('hint');
      if (toEl) toEl.classList.add('hint');

      setTimeout(() => {
        if (fromEl) fromEl.classList.remove('hint');
        if (toEl) toEl.classList.remove('hint');
      }, 3500);
    }

    /**
     * Setup Board interaction (click-to-move and drag-and-drop)
     */
    setupBoardEvents() {
      // 1. Board click delegation
      this.boardEl.addEventListener('click', (e) => {
        const squareEl = e.target.closest('.square');
        if (!squareEl) return;

        const squareId = squareEl.dataset.square;
        window.chessApp.onSquareClicked(squareId);
      });

      // 2. Drag & Drop events
      this.boardEl.addEventListener('dragstart', (e) => {
        const pieceEl = e.target.closest('.piece');
        if (!pieceEl) return;

        const squareId = pieceEl.dataset.square;
        this.draggedSquare = squareId;

        e.dataTransfer.setData('text/plain', squareId);
        e.dataTransfer.effectAllowed = 'move';

        // Select the square for legal move dots
        window.chessApp.selectSquare(squareId);
      });

      this.boardEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      this.boardEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const squareEl = e.target.closest('.square');
        if (!squareEl || !this.draggedSquare) return;

        const targetSquare = squareEl.dataset.square;
        const sourceSquare = this.draggedSquare;
        this.draggedSquare = null;

        if (sourceSquare !== targetSquare) {
          window.chessApp.attemptMove(sourceSquare, targetSquare);
        }
      });

      this.boardEl.addEventListener('dragend', () => {
        this.draggedSquare = null;
      });
    }

    /**
     * Promotion Modal Setup
     */
    setupPromotionModal() {
      const modal = document.getElementById('promotionModal');
      const choices = modal.querySelectorAll('.promotion-item');

      choices.forEach(btn => {
        btn.addEventListener('click', () => {
          const pieceType = btn.dataset.piece;
          modal.classList.remove('active');
          if (this.promotionResolve) {
            this.promotionResolve(pieceType);
            this.promotionResolve = null;
          }
        });
      });
    }

    /**
     * Show promotion prompt returning a Promise that resolves with 'q', 'r', 'b', 'n'
     */
    promptPromotion(color) {
      return new Promise((resolve) => {
        this.promotionResolve = resolve;
        const modal = document.getElementById('promotionModal');
        const choices = modal.querySelectorAll('.promotion-item');

        choices.forEach(btn => {
          const type = btn.dataset.piece;
          const img = btn.querySelector('img');
          img.src = `assets/pieces/${color}${type.toUpperCase()}.svg`;
        });

        modal.classList.add('active');
      });
    }

    /**
     * Update captured pieces and material advantage
     */
    updateCaptured(game) {
      const board = game.board();
      const currentPieces = { w: { p:0, n:0, b:0, r:0, q:0 }, b: { p:0, n:0, b:0, r:0, q:0 } };

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.type !== 'k') {
            currentPieces[p.color][p.type]++;
          }
        }
      }

      const initialPieces = { p: 8, n: 2, b: 2, r: 2, q: 1 };
      const capturedByWhite = []; // Black pieces lost
      const capturedByBlack = []; // White pieces lost

      ['p', 'n', 'b', 'r', 'q'].forEach(type => {
        const whiteLost = initialPieces[type] - currentPieces.w[type];
        for (let i = 0; i < whiteLost; i++) capturedByBlack.push(type);

        const blackLost = initialPieces[type] - currentPieces.b[type];
        for (let i = 0; i < blackLost; i++) capturedByWhite.push(type);
      });

      // Render captured pieces
      const topCapturedEl = document.getElementById('topCaptured');
      const bottomCapturedEl = document.getElementById('bottomCaptured');

      const isBottomWhite = !this.flipped;
      const whiteCapturedList = isBottomWhite ? bottomCapturedEl : topCapturedEl;
      const blackCapturedList = isBottomWhite ? topCapturedEl : bottomCapturedEl;

      const renderList = (el, pieces, color) => {
        el.innerHTML = '';
        pieces.forEach(type => {
          const img = document.createElement('img');
          img.src = `assets/pieces/${color}${type.toUpperCase()}.svg`;
          img.className = 'captured-icon';
          img.alt = type;
          el.appendChild(img);
        });
      };

      // White captures Black pieces ('b')
      renderList(whiteCapturedList, capturedByWhite, 'b');
      // Black captures White pieces ('w')
      renderList(blackCapturedList, capturedByBlack, 'w');

      // Material advantage calculation
      const values = { p: 1, n: 3, b: 3, r: 5, q: 9 };
      let whiteScore = 0;
      let blackScore = 0;

      capturedByWhite.forEach(t => whiteScore += values[t] || 0);
      capturedByBlack.forEach(t => blackScore += values[t] || 0);

      const diff = whiteScore - blackScore;
      const whiteDiffEl = document.getElementById('whiteScoreDiff');
      const blackDiffEl = document.getElementById('blackScoreDiff');

      if (whiteDiffEl && blackDiffEl) {
        if (diff > 0) {
          whiteDiffEl.textContent = `+${diff}`;
          blackDiffEl.textContent = '';
        } else if (diff < 0) {
          whiteDiffEl.textContent = '';
          blackDiffEl.textContent = `+${Math.abs(diff)}`;
        } else {
          whiteDiffEl.textContent = '';
          blackDiffEl.textContent = '';
        }
      }
    }

    /**
     * Update Move History table
     */
    updateMoveHistory(history) {
      const container = document.getElementById('historyList');
      container.innerHTML = '';

      for (let i = 0; i < history.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const whiteMove = history[i];
        const blackMove = history[i + 1] || '';

        const row = document.createElement('div');
        row.className = 'history-row';

        const numEl = document.createElement('span');
        numEl.className = 'history-num';
        numEl.textContent = `${moveNum}.`;

        const wEl = document.createElement('span');
        wEl.className = 'history-move';
        wEl.textContent = whiteMove;

        const bEl = document.createElement('span');
        bEl.className = 'history-move';
        bEl.textContent = blackMove;

        row.appendChild(numEl);
        row.appendChild(wEl);
        row.appendChild(bEl);
        container.appendChild(row);
      }

      // Auto-scroll to bottom
      container.scrollTop = container.scrollHeight;
    }

    /**
     * Update Advantage / Eval Bar
     */
    updateEvalBar(score) {
      const barWhite = document.getElementById('evalBarWhite');
      if (!barWhite) return;

      // Map score (-1000 to +1000) into 5% to 95%
      let pct = 50 + (score / 15);
      if (pct < 5) pct = 5;
      if (pct > 95) pct = 95;

      barWhite.style.height = `${pct}%`;
    }

    /**
     * Format time in MM:SS
     */
    formatTime(seconds) {
      if (seconds === null || seconds === undefined || isNaN(seconds)) return '--:--';
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    /**
     * Show Toast Notification
     */
    showToast(message) {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      container.appendChild(toast);

      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 3000);
    }

    /**
     * Show Game Over Modal
     */
    showGameOverModal(title, body) {
      const modal = document.getElementById('gameOverModal');
      document.getElementById('gameOverTitle').textContent = title;
      document.getElementById('gameOverBody').textContent = body;
      modal.classList.add('active');
    }

    hideGameOverModal() {
      const modal = document.getElementById('gameOverModal');
      modal.classList.remove('active');
    }
  }

  window.ChessUI = ChessUI;
})(window);
