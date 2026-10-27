/**
 * Chess AI Engine with Minimax, Alpha-Beta Pruning, Piece-Square Tables & Opening Book
 */
(function(window) {
  'use strict';

  const PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
  };

  // Piece-Square Tables (8x8, White perspective: row 0 = rank 8, row 7 = rank 1)
  const PST = {
    p: [
      [  0,   0,   0,   0,   0,   0,   0,   0],
      [ 50,  50,  50,  50,  50,  50,  50,  50],
      [ 10,  10,  20,  30,  30,  20,  10,  10],
      [  5,   5,  10,  27,  27,  10,   5,   5],
      [  0,   0,   0,  22,  22,   0,   0,   0],
      [  5,  -5, -10,   0,   0, -10,  -5,   5],
      [  5,  10,  10, -20, -20,  10,  10,   5],
      [  0,   0,   0,   0,   0,   0,   0,   0]
    ],
    n: [
      [-50, -40, -30, -30, -30, -30, -40, -50],
      [-40, -20,   0,   0,   0,   0, -20, -40],
      [-30,   0,  12,  16,  16,  12,   0, -30],
      [-30,   5,  16,  22,  22,  16,   5, -30],
      [-30,   0,  16,  22,  22,  16,   0, -30],
      [-30,   5,  12,  16,  16,  12,   5, -30],
      [-40, -20,   0,   5,   5,   0, -20, -40],
      [-50, -40, -30, -30, -30, -30, -40, -50]
    ],
    b: [
      [-20, -10, -10, -10, -10, -10, -10, -20],
      [-10,   0,   0,   0,   0,   0,   0, -10],
      [-10,   0,   5,  10,  10,   5,   0, -10],
      [-10,   5,   5,  10,  10,   5,   5, -10],
      [-10,   0,  10,  12,  12,  10,   0, -10],
      [-10,  10,  10,  10,  10,  10,  10, -10],
      [-10,   5,   0,   0,   0,   0,   5, -10],
      [-20, -10, -10, -10, -10, -10, -10, -20]
    ],
    r: [
      [  0,   0,   0,   0,   0,   0,   0,   0],
      [  5,  10,  10,  10,  10,  10,  10,   5],
      [ -5,   0,   0,   0,   0,   0,   0,  -5],
      [ -5,   0,   0,   0,   0,   0,   0,  -5],
      [ -5,   0,   0,   0,   0,   0,   0,  -5],
      [ -5,   0,   0,   0,   0,   0,   0,  -5],
      [ -5,   0,   0,   0,   0,   0,   0,  -5],
      [  0,   0,   0,   5,   5,   0,   0,   0]
    ],
    q: [
      [-20, -10, -10,  -5,  -5, -10, -10, -20],
      [-10,   0,   0,   0,   0,   0,   0, -10],
      [-10,   0,   5,   5,   5,   5,   0, -10],
      [ -5,   0,   5,   5,   5,   5,   0,  -5],
      [  0,   0,   5,   5,   5,   5,   0,  -5],
      [-10,   5,   5,   5,   5,   5,   0, -10],
      [-10,   0,   5,   0,   0,   0,   0, -10],
      [-20, -10, -10,  -5,  -5, -10, -10, -20]
    ],
    k: [
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-20, -30, -30, -40, -40, -30, -30, -20],
      [-10, -20, -20, -20, -20, -20, -20, -10],
      [ 20,  20,   0,   0,   0,   0,  20,  20],
      [ 20,  30,  10,   0,   0,  10,  30,  20]
    ]
  };

  // Popular openings book
  const OPENING_BOOK = {
    '': ['e4', 'd4', 'Nf3', 'c4'],
    'e4': ['e5', 'c5', 'e6', 'c6'],
    'd4': ['d5', 'Nf6', 'e6'],
    'c4': ['e5', 'c5', 'Nf6'],
    'Nf3': ['d5', 'Nf6'],
    'e4 e5': ['Nf3', 'Bc4', 'Nc3'],
    'e4 e5 Nf3': ['Nc6', 'Nf6'],
    'e4 e5 Nf3 Nc6': ['Bc4', 'Bb5', 'd4'],
    'e4 e5 Nf3 Nc6 Bc4': ['Bc5', 'Nf6'],
    'e4 e5 Nf3 Nc6 Bb5': ['a6', 'Nf6'],
    'e4 c5': ['Nf3', 'Nc3'],
    'e4 c5 Nf3': ['d6', 'Nc6', 'e6'],
    'd4 d5': ['c4', 'Nf3', 'Bf4'],
    'd4 d5 c4': ['e6', 'c6', 'dxc4'],
    'd4 Nf6': ['c4', 'Nf3', 'Bg5'],
    'd4 Nf6 c4': ['e6', 'g6', 'c5']
  };

  class ChessEngine {
    constructor() {
      this.nodesEvaluated = 0;
    }

    /**
     * Static evaluation of the board
     * Returns positive score for White advantage, negative for Black advantage
     */
    evaluate(game) {
      if (game.in_checkmate()) {
        return game.turn() === 'w' ? -99999 : 99999;
      }
      if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
        return 0;
      }

      let total = 0;
      const board = game.board();

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (!piece) continue;

          const type = piece.type;
          const color = piece.color;
          const val = PIECE_VALUES[type] || 0;
          const pstVal = (color === 'w') ? PST[type][r][c] : PST[type][7 - r][c];

          if (color === 'w') {
            total += (val + pstVal);
          } else {
            total -= (val + pstVal);
          }
        }
      }

      return total;
    }

    /**
     * Move ordering heuristic to accelerate Alpha-Beta pruning
     * MVV-LVA (Most Valuable Victim, Least Valuable Attacker)
     */
    orderMoves(moves) {
      return moves.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        if (a.captured) {
          scoreA = 10 * (PIECE_VALUES[a.captured] || 0) - (PIECE_VALUES[a.piece] || 0);
        }
        if (b.captured) {
          scoreB = 10 * (PIECE_VALUES[b.captured] || 0) - (PIECE_VALUES[b.piece] || 0);
        }

        if (a.promotion) scoreA += 850;
        if (b.promotion) scoreB += 850;

        if (a.san && a.san.includes('+')) scoreA += 50;
        if (b.san && b.san.includes('+')) scoreB += 50;

        return scoreB - scoreA;
      });
    }

    /**
     * Quiescence search to avoid horizon effect on tactical trades
     */
    quiescence(game, alpha, beta, isMaximizing, qDepth = 2) {
      this.nodesEvaluated++;
      const standPat = this.evaluate(game);

      if (qDepth <= 0 || game.game_over()) {
        return standPat;
      }

      if (isMaximizing) {
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;

        // Only search captures in quiescence
        const captures = this.orderMoves(
          game.moves({ verbose: true }).filter(m => m.captured || m.promotion)
        );

        for (const move of captures) {
          game.move(move);
          const score = this.quiescence(game, alpha, beta, false, qDepth - 1);
          game.undo();

          if (score >= beta) return beta;
          if (score > alpha) alpha = score;
        }
        return alpha;
      } else {
        if (standPat <= alpha) return alpha;
        if (standPat < beta) beta = standPat;

        const captures = this.orderMoves(
          game.moves({ verbose: true }).filter(m => m.captured || m.promotion)
        );

        for (const move of captures) {
          game.move(move);
          const score = this.quiescence(game, alpha, beta, true, qDepth - 1);
          game.undo();

          if (score <= alpha) return alpha;
          if (score < beta) beta = score;
        }
        return beta;
      }
    }

    /**
     * Minimax with Alpha-Beta Pruning
     */
    minimax(game, depth, alpha, beta, isMaximizing, useQuiescence = false) {
      this.nodesEvaluated++;

      if (depth === 0) {
        if (useQuiescence) {
          return this.quiescence(game, alpha, beta, isMaximizing, 2);
        }
        return this.evaluate(game);
      }

      if (game.game_over()) {
        return this.evaluate(game);
      }

      const moves = this.orderMoves(game.moves({ verbose: true }));

      if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
          game.move(move);
          const evalScore = this.minimax(game, depth - 1, alpha, beta, false, useQuiescence);
          game.undo();

          maxEval = Math.max(maxEval, evalScore);
          alpha = Math.max(alpha, evalScore);
          if (beta <= alpha) break; // Beta cutoff
        }
        return maxEval;
      } else {
        let minEval = Infinity;
        for (const move of moves) {
          game.move(move);
          const evalScore = this.minimax(game, depth - 1, alpha, beta, true, useQuiescence);
          game.undo();

          minEval = Math.min(minEval, evalScore);
          beta = Math.min(beta, evalScore);
          if (beta <= alpha) break; // Alpha cutoff
        }
        return minEval;
      }
    }

    /**
     * Check opening book for instant, natural moves
     */
    getOpeningMove(game) {
      const history = game.history();
      if (history.length > 8) return null;

      const pgnKey = history.join(' ');
      const candidates = OPENING_BOOK[pgnKey];

      if (candidates && candidates.length > 0) {
        // Pick random move from opening book
        const san = candidates[Math.floor(Math.random() * candidates.length)];
        const moves = game.moves({ verbose: true });
        const matched = moves.find(m => m.san === san);
        if (matched) return matched;
      }
      return null;
    }

    /**
     * Calculate best move for a given difficulty level
     * Level 1: Easy (Dễ)
     * Level 2: Medium (Trung bình)
     * Level 3: Hard (Khó)
     * Level 4: Master (Kiện tướng)
     */
    getBestMove(game, level = 2) {
      this.nodesEvaluated = 0;
      const startTime = performance.now();
      const moves = game.moves({ verbose: true });
      if (moves.length === 0) return null;

      // 1. Try opening book first
      const bookMove = this.getOpeningMove(game);
      if (bookMove) {
        return {
          move: bookMove,
          score: 0,
          depth: 0,
          nodes: 1,
          time: Math.round(performance.now() - startTime),
          fromBook: true
        };
      }

      const isWhite = game.turn() === 'w';

      // Level 1: Easy (Tập sự)
      // 50% random move, 50% basic capture or check
      if (level === 1) {
        const captures = moves.filter(m => m.captured || m.promotion);
        if (captures.length > 0 && Math.random() < 0.6) {
          const move = captures[Math.floor(Math.random() * captures.length)];
          return { move, score: 0, depth: 1, nodes: moves.length, time: 20 };
        }
        const move = moves[Math.floor(Math.random() * moves.length)];
        return { move, score: 0, depth: 1, nodes: moves.length, time: 20 };
      }

      // Level 2: Medium (Trung bình) - Depth 2
      if (level === 2) {
        return this.searchBestMove(game, 2, false);
      }

      // Level 3: Hard (Khó) - Depth 3 with Alpha-Beta
      if (level === 3) {
        return this.searchBestMove(game, 3, false);
      }

      // Level 4: Master (Kiện tướng) - Depth 3-4 with Quiescence search
      if (level === 4) {
        return this.searchBestMove(game, 3, true);
      }

      return this.searchBestMove(game, 2, false);
    }

    searchBestMove(game, depth, useQuiescence = false) {
      const startTime = performance.now();
      const moves = this.orderMoves(game.moves({ verbose: true }));
      if (moves.length === 0) return null;

      const isWhite = game.turn() === 'w';
      let bestMove = moves[0];
      let bestScore = isWhite ? -Infinity : Infinity;

      for (const move of moves) {
        game.move(move);
        const score = this.minimax(
          game,
          depth - 1,
          -Infinity,
          Infinity,
          !isWhite,
          useQuiescence
        );
        game.undo();

        if (isWhite) {
          if (score > bestScore) {
            bestScore = score;
            bestMove = move;
          }
        } else {
          if (score < bestScore) {
            bestScore = score;
            bestMove = move;
          }
        }
      }

      const time = Math.round(performance.now() - startTime);
      return {
        move: bestMove,
        score: bestScore,
        depth: depth,
        nodes: this.nodesEvaluated,
        time: time
      };
    }

    /**
     * Compute hint for the player
     */
    getHint(game) {
      const result = this.searchBestMove(game, 3, false);
      if (!result || !result.move) return null;

      const m = result.move;
      let reason = 'Tối ưu hóa vị trí chiến thuật';

      if (m.captured) {
        const pieceNames = { p: 'Tốt', n: 'Mã', b: 'Tượng', r: 'Xe', q: 'Hậu', k: 'Vua' };
        reason = `Bắt ${pieceNames[m.captured] || 'quân'} tại ô ${m.to}`;
      } else if (m.san && m.san.includes('+')) {
        reason = `Chiếu Vua đối phương tại ô ${m.to}`;
      } else if (m.flags && (m.flags.includes('k') || m.flags.includes('q'))) {
        reason = 'Nhập thành đưa Vua vào vị trí an toàn';
      } else if (m.piece === 'p' && (m.to.includes('4') || m.to.includes('5'))) {
        reason = 'Kiểm soát khu vực trung tâm bàn cờ';
      } else if (m.piece === 'n' || m.piece === 'b') {
        reason = 'Phát triển quân cờ tích cực';
      }

      return {
        move: m,
        san: m.san,
        from: m.from,
        to: m.to,
        reason: reason
      };
    }
  }

  window.ChessEngine = ChessEngine;
})(window);
