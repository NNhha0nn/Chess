/**
 * Chess Main Application Controller
 * Handles game flow, player turns, bot AI coordination, online multiplayer, clocks, and user settings.
 */
(function(window) {
  'use strict';

  class ChessApp {
    constructor() {
      this.game = new Chess();
      this.engine = new ChessEngine();
      this.ui = new ChessUI();
      this.sounds = window.chessSounds;

      // Game Configuration
      this.mode = 'bot';          // 'pvp' | 'bot' | 'online'
      this.botLevel = 2;          // 1 (Dễ), 2 (Vừa), 3 (Khó), 4 (Kiện tướng)
      this.playerColor = 'w';     // 'w' | 'b' | 'random'
      this.humanColor = 'w';      // Actual human color in bot or online mode ('w' or 'b')
      this.timeControl = 300;     // Seconds (0 = unlimited, 180, 300, 600)

      // Online Player Names
      this.whitePlayerName = 'Người chơi 1 (Trắng)';
      this.blackPlayerName = 'Người chơi 2 (Đen)';

      // Clocks & Timer State
      this.whiteTime = 300;
      this.blackTime = 300;
      this.timerInterval = null;
      this.isPaused = false;
      this.isGameOver = false;

      // Last move tracking
      this.lastMove = null;
    }

    init() {
      this.ui.init();
      this.bindDOMEvents();
      if (window.chessOnline) {
        window.chessOnline.init();
      }
      this.startNewGame();
    }

    bindDOMEvents() {
      // 1. Mode Tabs
      const tabPvP = document.getElementById('tabPvP');
      const tabBot = document.getElementById('tabBot');
      const tabOnline = document.getElementById('tabOnline');

      const botSettingsGroup = document.getElementById('botSettingsGroup');
      const onlineSettingsGroup = document.getElementById('onlineSettingsGroup');
      const standardControls = document.getElementById('standardControls');

      tabPvP.addEventListener('click', () => {
        tabPvP.classList.add('active');
        tabBot.classList.remove('active');
        tabOnline.classList.remove('active');

        botSettingsGroup.style.display = 'none';
        onlineSettingsGroup.style.display = 'none';
        standardControls.style.display = 'block';

        this.mode = 'pvp';
        this.startNewGame();
      });

      tabBot.addEventListener('click', () => {
        tabBot.classList.add('active');
        tabPvP.classList.remove('active');
        tabOnline.classList.remove('active');

        botSettingsGroup.style.display = 'flex';
        onlineSettingsGroup.style.display = 'none';
        standardControls.style.display = 'block';

        this.mode = 'bot';
        this.startNewGame();
      });

      tabOnline.addEventListener('click', () => {
        tabOnline.classList.add('active');
        tabPvP.classList.remove('active');
        tabBot.classList.remove('active');

        botSettingsGroup.style.display = 'none';
        onlineSettingsGroup.style.display = 'flex';
        standardControls.style.display = 'none';

        this.mode = 'online';
        if (window.chessOnline) {
          window.chessOnline.connectSocket().catch(() => {});
        }
      });

      // 2. Bot Level Buttons
      const botLevelBtns = document.querySelectorAll('[data-level]');
      botLevelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          botLevelBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.botLevel = parseInt(btn.dataset.level, 10);
          this.ui.showToast(`Đã chọn độ khó: ${btn.textContent.trim()}`);
          this.updatePlayerLabels();
        });
      });

      // 3. Side / Color Choice
      const sideBtns = document.querySelectorAll('#botSettingsGroup [data-side]');
      sideBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          sideBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.playerColor = btn.dataset.side;
          this.startNewGame();
        });
      });

      // Online side selector
      const onlineSideBtns = document.querySelectorAll('#onlineSideSelect [data-side]');
      onlineSideBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          onlineSideBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      // 4. Time Control Buttons
      const timeBtns = document.querySelectorAll('#standardTimeControl [data-time]');
      timeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          timeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.timeControl = parseInt(btn.dataset.time, 10);
          this.startNewGame();
        });
      });

      // Online time selector
      const onlineTimeBtns = document.querySelectorAll('#onlineTimeSelect [data-time]');
      onlineTimeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          onlineTimeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      // 5. Board Theme Selector
      const themeBtns = document.querySelectorAll('[data-theme]');
      themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          themeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.ui.setTheme(btn.dataset.theme);
        });
      });

      // 6. Action Controls
      document.getElementById('btnNewGame').addEventListener('click', () => this.startNewGame());
      document.getElementById('btnUndo').addEventListener('click', () => this.undoMove());
      document.getElementById('btnHint').addEventListener('click', () => this.showHint());
      document.getElementById('btnFlip').addEventListener('click', () => this.ui.flipBoard());

      // 7. Sound Toggle
      const soundBtn = document.getElementById('btnSound');
      soundBtn.addEventListener('click', () => {
        const isMuted = this.sounds.toggleMute();
        soundBtn.querySelector('.icon').textContent = isMuted ? '🔇' : '🔊';
        this.ui.showToast(isMuted ? 'Đã tắt âm thanh' : 'Đã bật âm thanh');
      });

      // 8. Copy PGN
      document.getElementById('btnCopyPGN').addEventListener('click', () => this.copyPGN());

      // 9. Modal Play Again
      document.getElementById('btnModalNewGame').addEventListener('click', () => {
        this.ui.hideGameOverModal();
        if (this.mode === 'online' && window.chessOnline && window.chessOnline.currentRoom) {
          window.chessOnline.socket.emit('offer-rematch', { roomId: window.chessOnline.currentRoom });
          this.ui.showToast('Đã gửi lời mời Tái đấu tới đối thủ.');
        } else {
          this.startNewGame();
        }
      });

      document.getElementById('btnModalClose').addEventListener('click', () => {
        this.ui.hideGameOverModal();
      });
    }

    startNewGame() {
      this.game = new Chess();
      this.isGameOver = false;
      this.isPaused = false;
      this.lastMove = null;

      // Determine human color in Bot mode
      if (this.mode === 'bot') {
        if (this.playerColor === 'random') {
          this.humanColor = Math.random() < 0.5 ? 'w' : 'b';
        } else {
          this.humanColor = this.playerColor;
        }
      } else {
        this.humanColor = 'w';
      }

      // Board orientation: match human color
      if (this.mode === 'bot' && this.humanColor === 'b') {
        this.ui.setFlipped(true);
      } else {
        this.ui.setFlipped(false);
      }

      // Reset Clocks
      this.stopTimer();
      this.whiteTime = this.timeControl;
      this.blackTime = this.timeControl;
      this.updateClockDisplay();

      // Clear UI selections
      this.ui.selectedSquare = null;
      this.ui.legalMoves = [];

      // Update Labels and Avatars
      this.updatePlayerLabels();

      // Update Board & Pieces
      this.ui.updateBoardPieces(this.game);
      this.ui.updateHighlights();
      this.ui.updateCaptured(this.game);
      this.ui.updateMoveHistory([]);
      this.ui.updateEvalBar(0);
      this.updateStatusBadge();

      // If Bot is White (human is Black), trigger Bot first move
      if (this.mode === 'bot' && this.humanColor === 'b') {
        setTimeout(() => this.triggerBotMove(), 600);
      } else if (this.timeControl > 0) {
        this.startTimer();
      }

      this.ui.showToast('Bắt đầu ván mới!');
    }

    /**
     * Start game for Online Multiplayer
     */
    startOnlineGame({ myColor, whiteName, blackName, timeControl }) {
      this.game = new Chess();
      this.mode = 'online';
      this.isGameOver = false;
      this.isPaused = false;
      this.lastMove = null;

      this.humanColor = myColor;
      this.whitePlayerName = whiteName || 'Người chơi 1 (Trắng)';
      this.blackPlayerName = blackName || 'Người chơi 2 (Đen)';
      this.timeControl = parseInt(timeControl, 10) || 0;

      // Set board orientation so your pieces are at the bottom
      this.ui.setFlipped(this.humanColor === 'b');

      // Clocks
      this.stopTimer();
      this.whiteTime = this.timeControl;
      this.blackTime = this.timeControl;
      this.updateClockDisplay();

      // UI update
      this.ui.selectedSquare = null;
      this.ui.legalMoves = [];
      this.updatePlayerLabels();
      this.ui.updateBoardPieces(this.game);
      this.ui.updateHighlights();
      this.ui.updateCaptured(this.game);
      this.ui.updateMoveHistory([]);
      this.ui.updateEvalBar(0);
      this.updateStatusBadge();

      if (this.timeControl > 0) {
        this.startTimer();
      }
    }

    updatePlayerLabels() {
      const topNameEl = document.getElementById('topPlayerName');
      const topAvatarEl = document.getElementById('topPlayerAvatar');
      const bottomNameEl = document.getElementById('bottomPlayerName');
      const bottomAvatarEl = document.getElementById('bottomPlayerAvatar');

      const isBottomWhite = !this.ui.flipped;

      if (this.mode === 'online') {
        if (this.humanColor === 'w') {
          bottomNameEl.textContent = `${this.whitePlayerName} (Bạn - Trắng)`;
          bottomAvatarEl.textContent = '👤';
          topNameEl.textContent = `${this.blackPlayerName} (Đen)`;
          topAvatarEl.textContent = '🌐';
        } else {
          bottomNameEl.textContent = `${this.blackPlayerName} (Bạn - Đen)`;
          bottomAvatarEl.textContent = '👤';
          topNameEl.textContent = `${this.whitePlayerName} (Trắng)`;
          topAvatarEl.textContent = '🌐';
        }
      } else if (this.mode === 'pvp') {
        if (isBottomWhite) {
          bottomNameEl.textContent = 'Người chơi 1 (Trắng)';
          bottomAvatarEl.textContent = '👤';
          topNameEl.textContent = 'Người chơi 2 (Đen)';
          topAvatarEl.textContent = '👤';
        } else {
          bottomNameEl.textContent = 'Người chơi 2 (Đen)';
          bottomAvatarEl.textContent = '👤';
          topNameEl.textContent = 'Người chơi 1 (Trắng)';
          topAvatarEl.textContent = '👤';
        }
      } else {
        const levelNames = { 1: 'Dễ (Tập sự)', 2: 'Trung bình', 3: 'Khó', 4: 'Kiện tướng' };
        const botTitle = `Máy - ${levelNames[this.botLevel] || 'AI'}`;

        if (this.humanColor === 'w') {
          bottomNameEl.textContent = 'Bạn (Trắng)';
          bottomAvatarEl.textContent = '👤';
          topNameEl.textContent = `${botTitle} (Đen)`;
          topAvatarEl.textContent = '🤖';
        } else {
          bottomNameEl.textContent = 'Bạn (Đen)';
          bottomAvatarEl.textContent = '👤';
          topNameEl.textContent = `${botTitle} (Trắng)`;
          topAvatarEl.textContent = '🤖';
        }
      }
    }

    /**
     * User clicked a square
     */
    onSquareClicked(squareId) {
      if (this.isGameOver) return;

      // In Bot mode: only allow human color
      if (this.mode === 'bot' && this.game.turn() !== this.humanColor) {
        return;
      }

      // In Online mode: only allow human to move their own pieces on their own turn!
      if (this.mode === 'online') {
        if (this.game.turn() !== this.humanColor) {
          this.ui.showToast('Chưa tới lượt của bạn!');
          return;
        }
      }

      const clickedPiece = this.game.get(squareId);
      const currentTurn = this.game.turn();

      // Case 1: Selecting another piece of same color
      if (clickedPiece && clickedPiece.color === currentTurn) {
        this.selectSquare(squareId);
        return;
      }

      // Case 2: Attempting to move selected piece to target square
      if (this.ui.selectedSquare) {
        const isLegal = this.ui.legalMoves.some(m => m.to === squareId);
        if (isLegal) {
          this.attemptMove(this.ui.selectedSquare, squareId);
          return;
        }
      }

      // Case 3: Click on empty or invalid square -> Deselect
      this.ui.selectedSquare = null;
      this.ui.legalMoves = [];
      this.ui.updateHighlights(this.lastMove, this.getKingCheckSquare());
    }

    selectSquare(squareId) {
      const piece = this.game.get(squareId);
      if (!piece || piece.color !== this.game.turn()) return;

      // In online mode, verify piece belongs to your assigned color
      if (this.mode === 'online' && piece.color !== this.humanColor) return;

      this.ui.selectedSquare = squareId;
      this.ui.legalMoves = this.game.moves({ square: squareId, verbose: true });
      this.ui.updateHighlights(this.lastMove, this.getKingCheckSquare());
    }

    /**
     * Attempt to execute a move from source to target square
     */
    async attemptMove(fromSquare, toSquare) {
      const moves = this.game.moves({ square: fromSquare, verbose: true });
      const matchedMove = moves.find(m => m.to === toSquare);

      if (!matchedMove) {
        this.ui.selectedSquare = null;
        this.ui.legalMoves = [];
        this.ui.updateHighlights(this.lastMove, this.getKingCheckSquare());
        return;
      }

      // Check for pawn promotion
      let promotionChoice = undefined;
      if (matchedMove.flags && matchedMove.flags.includes('p')) {
        promotionChoice = await this.ui.promptPromotion(this.game.turn());
      }

      const moveObj = {
        from: fromSquare,
        to: toSquare,
        promotion: promotionChoice
      };

      this.executeMove(moveObj, true);
    }

    /**
     * Receive move made by remote opponent via socket
     */
    receiveOpponentMove(moveObj) {
      this.executeMove(moveObj, false);
    }

    /**
     * Apply move to the board and trigger animations, sound, checks
     * @param {Object} moveObj - { from, to, promotion }
     * @param {Boolean} isLocalPlayerMove - true if originated on this client
     */
    executeMove(moveObj, isLocalPlayerMove = true) {
      const move = this.game.move(moveObj);
      if (!move) return;

      this.lastMove = move;
      this.ui.selectedSquare = null;
      this.ui.legalMoves = [];

      // Sound feedback
      if (this.game.in_checkmate()) {
        const winner = this.game.turn() === 'w' ? 'Đen' : 'Trắng';
        if (this.mode === 'bot' || this.mode === 'online') {
          const userWon = (winner === 'Trắng' && this.humanColor === 'w') || (winner === 'Đen' && this.humanColor === 'b');
          if (userWon) this.sounds.playVictory();
          else this.sounds.playDefeat();
        } else {
          this.sounds.playVictory();
        }
      } else if (this.game.in_check()) {
        this.sounds.playCheck();
      } else if (move.flags && (move.flags.includes('k') || move.flags.includes('q'))) {
        this.sounds.playCastle();
      } else if (move.promotion) {
        this.sounds.playPromotion();
      } else if (move.captured) {
        this.sounds.playCapture();
      } else {
        this.sounds.playMove();
      }

      // Update UI components
      this.ui.updateBoardPieces(this.game);
      this.ui.updateHighlights(this.lastMove, this.getKingCheckSquare());
      this.ui.updateCaptured(this.game);
      this.ui.updateMoveHistory(this.game.history());
      this.updateStatusBadge();

      // Update Evaluation bar
      const evalScore = this.engine.evaluate(this.game);
      this.ui.updateEvalBar(evalScore);

      // If online and move was local, forward to socket server
      if (this.mode === 'online' && isLocalPlayerMove && window.chessOnline) {
        window.chessOnline.sendMove(moveObj, this.game.fen(), this.game.history());
      }

      // Check Game Over conditions
      if (this.checkGameOver()) {
        this.stopTimer();
        return;
      }

      // Restart / switch timer
      if (this.timeControl > 0) {
        this.startTimer();
      }

      // If playing with Bot and it's now Bot's turn
      if (this.mode === 'bot' && this.game.turn() !== this.humanColor) {
        this.triggerBotMove();
      }
    }

    /**
     * Coordinate Bot's move with realistic delay & engine
     */
    triggerBotMove() {
      if (this.isGameOver) return;

      const banner = document.getElementById('botThinkingBanner');
      if (banner) banner.classList.add('visible');

      const delay = Math.max(350, Math.floor(Math.random() * 400 + 350));

      setTimeout(() => {
        if (this.isGameOver) {
          if (banner) banner.classList.remove('visible');
          return;
        }

        const result = this.engine.getBestMove(this.game, this.botLevel);
        if (banner) banner.classList.remove('visible');

        if (result && result.move) {
          const m = result.move;
          this.executeMove({
            from: m.from,
            to: m.to,
            promotion: m.promotion || (m.flags && m.flags.includes('p') ? 'q' : undefined)
          }, true);
        }
      }, delay);
    }

    /**
     * Find square where current turn's king is situated if in check
     */
    getKingCheckSquare() {
      if (!this.game.in_check()) return null;
      const turn = this.game.turn();
      const board = this.game.board();

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.type === 'k' && p.color === turn) {
            const file = String.fromCharCode('a'.charCodeAt(0) + c);
            const rank = (8 - r).toString();
            return file + rank;
          }
        }
      }
      return null;
    }

    /**
     * Check if game has ended
     */
    checkGameOver() {
      if (this.game.in_checkmate()) {
        this.isGameOver = true;
        const winner = this.game.turn() === 'w' ? 'Quân Đen' : 'Quân Trắng';
        this.ui.showGameOverModal('Chiếu Bí! (Checkmate)', `${winner} đã giành chiến thắng ngoạn mục!`);
        return true;
      }

      if (this.game.in_stalemate()) {
        this.isGameOver = true;
        this.ui.showGameOverModal('Hòa Cờ (Stalemate)', 'Hết nước đi hợp lệ (Pat). Ván đấu kết thúc với kết quả Hòa!');
        this.sounds.playDefeat();
        return true;
      }

      if (this.game.in_threefold_repetition()) {
        this.isGameOver = true;
        this.ui.showGameOverModal('Hòa Cờ', 'Thế cờ lặp lại 3 lần. Ván đấu kết thúc với kết quả Hòa!');
        this.sounds.playDefeat();
        return true;
      }

      if (this.game.insufficient_material()) {
        this.isGameOver = true;
        this.ui.showGameOverModal('Hòa Cờ', 'Cả 2 bên không đủ lực lượng quân để chiếu bí.');
        this.sounds.playDefeat();
        return true;
      }

      if (this.game.in_draw()) {
        this.isGameOver = true;
        this.ui.showGameOverModal('Hòa Cờ', 'Quy tắc 50 nước đi không có bắt quân hoặc đi tốt.');
        this.sounds.playDefeat();
        return true;
      }

      return false;
    }

    endGameDraw(reason) {
      this.isGameOver = true;
      this.stopTimer();
      this.ui.showGameOverModal('Hòa Cờ!', reason || 'Ván đấu kết thúc với kết quả Hòa.');
      this.sounds.playDefeat();
    }

    /**
     * Handle timeout
     */
    handleTimeout(loserColor) {
      this.isGameOver = true;
      this.stopTimer();

      const winner = loserColor === 'w' ? 'Quân Đen' : 'Quân Trắng';
      const loserName = loserColor === 'w' ? 'Quân Trắng' : 'Quân Đen';

      this.ui.showGameOverModal('Hết Thời Gian!', `${loserName} đã hết thời gian thi đấu. ${winner} giành chiến thắng!`);

      if (this.mode === 'bot' || this.mode === 'online') {
        if (loserColor === this.humanColor) this.sounds.playDefeat();
        else this.sounds.playVictory();
      } else {
        this.sounds.playVictory();
      }
    }

    /**
     * Status badge in header
     */
    updateStatusBadge() {
      const badge = document.getElementById('headerStatusBadge');
      if (!badge) return;

      if (this.isGameOver) {
        badge.className = 'badge';
        badge.textContent = '🏁 Ván đấu kết thúc';
        return;
      }

      const turn = this.game.turn();
      const inCheck = this.game.in_check();

      badge.className = 'badge';
      if (inCheck) {
        badge.classList.add('status-check');
        badge.textContent = `⚠️ ${turn === 'w' ? 'Trắng' : 'Đen'} đang bị Chiếu!`;
      } else {
        if (turn === 'w') {
          badge.classList.add('turn-white');
          badge.textContent = '⚪ Lượt quân Trắng';
        } else {
          badge.classList.add('turn-black');
          badge.textContent = '⚫ Lượt quân Đen';
        }
      }
    }

    /**
     * Timer Management
     */
    startTimer() {
      this.stopTimer();
      if (this.timeControl <= 0 || this.isGameOver) return;

      this.timerInterval = setInterval(() => {
        const turn = this.game.turn();
        if (turn === 'w') {
          this.whiteTime--;
          if (this.whiteTime <= 0) {
            this.whiteTime = 0;
            this.handleTimeout('w');
          }
        } else {
          this.blackTime--;
          if (this.blackTime <= 0) {
            this.blackTime = 0;
            this.handleTimeout('b');
          }
        }
        this.updateClockDisplay();
      }, 1000);

      this.updateClockDisplay();
    }

    stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }

    updateClockDisplay() {
      const isBottomWhite = !this.ui.flipped;

      const topTimerEl = document.getElementById('topPlayerTimer');
      const bottomTimerEl = document.getElementById('bottomPlayerTimer');

      const whiteTimerEl = isBottomWhite ? bottomTimerEl : topTimerEl;
      const blackTimerEl = isBottomWhite ? topTimerEl : bottomTimerEl;

      if (this.timeControl <= 0) {
        if (whiteTimerEl) whiteTimerEl.textContent = '∞';
        if (blackTimerEl) blackTimerEl.textContent = '∞';
        return;
      }

      if (whiteTimerEl) {
        whiteTimerEl.textContent = this.ui.formatTime(this.whiteTime);
        whiteTimerEl.classList.toggle('active', this.game.turn() === 'w' && !this.isGameOver);
        whiteTimerEl.classList.toggle('low-time', this.whiteTime < 30);
      }

      if (blackTimerEl) {
        blackTimerEl.textContent = this.ui.formatTime(this.blackTime);
        blackTimerEl.classList.toggle('active', this.game.turn() === 'b' && !this.isGameOver);
        blackTimerEl.classList.toggle('low-time', this.blackTime < 30);
      }
    }

    /**
     * Undo Move
     */
    undoMove() {
      if (this.mode === 'online') {
        this.ui.showToast('Không thể đi lại trong chế độ Online!');
        return;
      }

      if (this.isGameOver) {
        this.ui.showToast('Ván đấu đã kết thúc');
        return;
      }

      if (this.mode === 'pvp') {
        const undone = this.game.undo();
        if (undone) {
          this.lastMove = null;
          this.ui.updateBoardPieces(this.game);
          this.ui.updateHighlights();
          this.ui.updateCaptured(this.game);
          this.ui.updateMoveHistory(this.game.history());
          this.updateStatusBadge();
          this.ui.showToast('Đã hoàn tác 1 nước đi');
        }
      } else {
        // In bot mode, undo 2 moves (both bot and user moves)
        if (this.game.turn() === this.humanColor) {
          this.game.undo();
          this.game.undo();
        } else {
          this.game.undo();
        }

        this.lastMove = null;
        this.ui.updateBoardPieces(this.game);
        this.ui.updateHighlights();
        this.ui.updateCaptured(this.game);
        this.ui.updateMoveHistory(this.game.history());
        this.updateStatusBadge();
        this.ui.showToast('Đã hoàn tác nước đi');
      }
    }

    /**
     * Show Hint
     */
    showHint() {
      if (this.mode === 'online') {
        this.ui.showToast('Chế độ thi đấu Online không thể sử dụng Gợi ý!');
        return;
      }

      if (this.isGameOver) {
        this.ui.showToast('Ván đấu đã kết thúc');
        return;
      }

      if (this.mode === 'bot' && this.game.turn() !== this.humanColor) {
        this.ui.showToast('Đang chờ máy đi nước cờ...');
        return;
      }

      const hint = this.engine.getHint(this.game);
      if (hint) {
        this.ui.showHintHighlight(hint.from, hint.to);
        this.ui.showToast(`💡 Gợi ý: Đi ${hint.san} (${hint.reason})`);
      } else {
        this.ui.showToast('Không tìm thấy gợi ý phù hợp.');
      }
    }

    /**
     * Copy PGN to Clipboard
     */
    copyPGN() {
      const pgn = this.game.pgn();
      if (!pgn || pgn.trim() === '') {
        this.ui.showToast('Chưa có nước đi nào để sao chép!');
        return;
      }

      navigator.clipboard.writeText(pgn).then(() => {
        this.ui.showToast('📋 Đã sao chép PGN vào bộ nhớ tạm!');
      }).catch(() => {
        this.ui.showToast('Không thể sao chép PGN');
      });
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.chessApp = new ChessApp();
    window.chessApp.init();
  });
})(window);
