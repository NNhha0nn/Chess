/**
 * Chess Pro - Realtime Multiplayer Server with Private Rooms & Passwords
 * Node.js + Express + Socket.IO
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
// Optional Master Access Code (nếu muốn khóa toàn bộ trang)
const MASTER_PASSCODE = process.env.MASTER_PASSCODE || '';

// Serve static assets from project root
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// API check master passcode (nếu được thiết lập)
app.post('/api/verify-access', (req, res) => {
  const { code } = req.body;
  if (!MASTER_PASSCODE) {
    return res.json({ success: true, required: false });
  }
  if (code === MASTER_PASSCODE) {
    return res.json({ success: true, required: true });
  }
  return res.status(403).json({ success: false, message: 'Mật mã truy cập không chính xác!' });
});

/**
 * In-Memory Rooms Store
 * Structure:
 * roomId: {
 *   password: string,
 *   timeControl: number,
 *   players: {
 *     white: { socketId, name },
 *     black: { socketId, name }
 *   },
 *   fen: string,
 *   history: Array,
 *   drawOfferedBy: string | null,
 *   rematchOfferedBy: string | null,
 *   createdAt: number
 * }
 */
const rooms = new Map();

io.on('connection', (socket) => {
  let currentRoomId = null;
  let playerColor = null;

  // 1. CREATE PRIVATE ROOM
  socket.on('create-room', ({ roomId, password, timeControl, preferredColor, playerName }) => {
    const cleanRoomId = (roomId || '').trim().toLowerCase();
    if (!cleanRoomId) {
      socket.emit('error-msg', 'Tên phòng không được để trống!');
      return;
    }

    if (rooms.has(cleanRoomId)) {
      socket.emit('error-msg', 'Phòng này đã tồn tại! Vui lòng chọn tên khác hoặc vào phòng.');
      return;
    }

    // Determine host color
    let hostColor = 'w';
    if (preferredColor === 'b') hostColor = 'b';
    else if (preferredColor === 'random') hostColor = Math.random() < 0.5 ? 'w' : 'b';

    const roomData = {
      id: cleanRoomId,
      password: (password || '').trim(),
      timeControl: parseInt(timeControl, 10) || 300,
      players: {
        white: hostColor === 'w' ? { socketId: socket.id, name: playerName || 'Người chơi 1' } : null,
        black: hostColor === 'b' ? { socketId: socket.id, name: playerName || 'Người chơi 1' } : null
      },
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      history: [],
      drawOfferedBy: null,
      rematchOfferedBy: null,
      createdAt: Date.now()
    };

    rooms.set(cleanRoomId, roomData);
    currentRoomId = cleanRoomId;
    playerColor = hostColor;

    socket.join(cleanRoomId);

    socket.emit('room-created', {
      roomId: cleanRoomId,
      color: hostColor,
      timeControl: roomData.timeControl,
      hasPassword: !!roomData.password
    });
  });

  // 2. JOIN PRIVATE ROOM
  socket.on('join-room', ({ roomId, password, playerName }) => {
    const cleanRoomId = (roomId || '').trim().toLowerCase();
    const room = rooms.get(cleanRoomId);

    if (!room) {
      socket.emit('error-msg', 'Phòng không tồn tại hoặc đã đóng!');
      return;
    }

    // Verify password if room has password
    if (room.password && room.password !== (password || '').trim()) {
      socket.emit('error-msg', 'Mật khẩu phòng không đúng!');
      return;
    }

    // Check if room is already full (Max 2 players)
    if (room.players.white && room.players.black) {
      // Check if this socket is reconnecting
      if (room.players.white.socketId === socket.id) {
        currentRoomId = cleanRoomId;
        playerColor = 'w';
        socket.join(cleanRoomId);
        socket.emit('reconnected', { color: 'w', fen: room.fen, history: room.history });
        return;
      }
      if (room.players.black.socketId === socket.id) {
        currentRoomId = cleanRoomId;
        playerColor = 'b';
        socket.join(cleanRoomId);
        socket.emit('reconnected', { color: 'b', fen: room.fen, history: room.history });
        return;
      }

      socket.emit('error-msg', 'Phòng này đã đủ 2 người chơi! Bạn không thể vào.');
      return;
    }

    // Assign color for guest
    let guestColor = 'b';
    if (!room.players.white) {
      guestColor = 'w';
      room.players.white = { socketId: socket.id, name: playerName || 'Người chơi 2' };
    } else {
      room.players.black = { socketId: socket.id, name: playerName || 'Người chơi 2' };
    }

    currentRoomId = cleanRoomId;
    playerColor = guestColor;
    socket.join(cleanRoomId);

    // Notify guest
    socket.emit('room-joined', {
      roomId: cleanRoomId,
      color: guestColor,
      timeControl: room.timeControl,
      fen: room.fen,
      history: room.history,
      whitePlayer: room.players.white.name,
      blackPlayer: room.players.black.name
    });

    // Notify both that game is ready to begin
    io.to(cleanRoomId).emit('game-start', {
      whitePlayer: room.players.white.name,
      blackPlayer: room.players.black.name,
      timeControl: room.timeControl
    });
  });

  // 3. MOVE EXECUTION
  socket.on('make-move', ({ roomId, moveObj, fen, history }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.fen = fen;
    room.history = history;
    room.drawOfferedBy = null;

    // Broadcast opponent move to the other player in the room
    socket.to(roomId).emit('opponent-move', { moveObj, fen, history });
  });

  // 4. CHAT & EMOJIS
  socket.on('send-chat', ({ roomId, text, sender }) => {
    if (!rooms.has(roomId)) return;
    io.to(roomId).emit('receive-chat', {
      text: (text || '').slice(0, 200),
      sender: sender || (playerColor === 'w' ? 'Trắng' : 'Đen'),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // 5. DRAW OFFER
  socket.on('offer-draw', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.drawOfferedBy = playerColor;
    socket.to(roomId).emit('draw-offered', { fromColor: playerColor });
  });

  socket.on('respond-draw', ({ roomId, accepted }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.drawOfferedBy = null;
    io.to(roomId).emit('draw-result', { accepted, byColor: playerColor });
  });

  // 6. RESIGN
  socket.on('resign', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    io.to(roomId).emit('player-resigned', { resignedColor: playerColor });
  });

  // 7. REMATCH
  socket.on('offer-rematch', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.rematchOfferedBy = playerColor;
    socket.to(roomId).emit('rematch-offered', { fromColor: playerColor });
  });

  socket.on('accept-rematch', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Swap colors for rematch
    const temp = room.players.white;
    room.players.white = room.players.black;
    room.players.black = temp;

    room.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    room.history = [];
    room.rematchOfferedBy = null;
    room.drawOfferedBy = null;

    if (room.players.white) {
      io.to(room.players.white.socketId).emit('rematch-start', {
        color: 'w',
        timeControl: room.timeControl
      });
    }
    if (room.players.black) {
      io.to(room.players.black.socketId).emit('rematch-start', {
        color: 'b',
        timeControl: room.timeControl
      });
    }
  });

  // 8. DISCONNECTION
  socket.on('disconnect', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    socket.to(currentRoomId).emit('opponent-disconnected', {
      color: playerColor
    });

    // Clean up room if both disconnected after 5 minutes
    if (room.players.white && room.players.white.socketId === socket.id) {
      room.players.white = null;
    }
    if (room.players.black && room.players.black.socketId === socket.id) {
      room.players.black = null;
    }

    if (!room.players.white && !room.players.black) {
      setTimeout(() => {
        const r = rooms.get(currentRoomId);
        if (r && !r.players.white && !r.players.black) {
          rooms.delete(currentRoomId);
        }
      }, 5 * 60 * 1000);
    }
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`   CO VUA PRO - REALTIME SERVER RUNNING ON PORT ${PORT}`);
  console.log(`   Local URL:   http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
