/**
 * Chess Online Multiplayer Controller
 * Manages Socket.IO connection, private room creation, password validation,
 * live move synchronization, in-game chat, draw offers, and rematches.
 */
(function(window) {
  'use strict';

  class ChessOnlineManager {
    constructor() {
      this.socket = null;
      this.currentRoom = null;
      this.myColor = null;       // 'w' or 'b'
      this.playerName = 'Người chơi';
      this.isConnected = false;
      this.opponentConnected = false;
    }

    init() {
      this.bindDOMEvents();
      this.checkUrlParams();
    }

    /**
     * Connect to Socket.IO Server if available
     */
    connectSocket() {
      if (this.socket && this.socket.connected) return Promise.resolve(this.socket);

      return new Promise((resolve, reject) => {
        if (typeof io === 'undefined') {
          window.chessApp.ui.showToast('⚠️ Không tìm thấy Socket.IO. Vui lòng chạy qua web server!');
          return reject(new Error('Socket.io not found'));
        }

        // Connect to current host or default port 3000
        const serverUrl = window.location.protocol.startsWith('http')
          ? window.location.origin
          : 'http://localhost:3000';

        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 10000
        });

        this.socket.on('connect', () => {
          this.isConnected = true;
          this.updateConnectionBadge(true);
          resolve(this.socket);
        });

        this.socket.on('connect_error', () => {
          this.updateConnectionBadge(false);
        });

        this.socket.on('disconnect', () => {
          this.isConnected = false;
          this.updateConnectionBadge(false);
        });

        this.setupSocketListeners();
      });
    }

    updateConnectionBadge(connected) {
      const badge = document.getElementById('onlineIndicatorBadge');
      if (!badge) return;
      if (connected) {
        badge.innerHTML = '<span class="online-dot"></span><span>Đã kết nối Server</span>';
        badge.style.display = 'inline-flex';
      } else {
        badge.innerHTML = '<span class="online-dot" style="background:#ef4444;box-shadow:none;"></span><span>Mất kết nối</span>';
        badge.style.display = 'inline-flex';
      }
    }

    setupSocketListeners() {
      // 1. Room Created
      this.socket.on('room-created', (data) => {
        this.currentRoom = data.roomId;
        this.myColor = data.color;
        this.onRoomReady(data);
        window.chessApp.ui.showToast(`✅ Đã tạo phòng "${data.roomId}". Hãy gửi link cho bạn bè!`);
      });

      // 2. Room Joined
      this.socket.on('room-joined', (data) => {
        this.currentRoom = data.roomId;
        this.myColor = data.color;
        this.opponentConnected = true;
        this.onRoomReady(data);
        window.chessApp.ui.showToast(`✅ Đã tham gia phòng "${data.roomId}"!`);
      });

      // 3. Both Players Ready / Game Start
      this.socket.on('game-start', (data) => {
        this.opponentConnected = true;
        this.updateRoomStatusUI('🟢 Bạn của bạn đã vào phòng! Ván đấu bắt đầu.');
        window.chessApp.ui.showToast('🏁 Đối thủ đã sẵn sàng! Bắt đầu thi đấu.');

        // Start game in online mode
        window.chessApp.startOnlineGame({
          myColor: this.myColor,
          whiteName: data.whitePlayer,
          blackName: data.blackPlayer,
          timeControl: data.timeControl
        });
      });

      // 4. Opponent made a move
      this.socket.on('opponent-move', (data) => {
        window.chessApp.receiveOpponentMove(data.moveObj);
      });

      // 5. In-game Chat
      this.socket.on('receive-chat', (data) => {
        this.renderChatMessage(data.sender, data.text, data.time);
      });

      // 6. Draw Offers
      this.socket.on('draw-offered', () => {
        if (confirm('Đối thủ gửi lời mời Cầu Hòa. Bạn có đồng ý hòa ván cờ này không?')) {
          this.socket.emit('respond-draw', { roomId: this.currentRoom, accepted: true });
        } else {
          this.socket.emit('respond-draw', { roomId: this.currentRoom, accepted: false });
        }
      });

      this.socket.on('draw-result', (data) => {
        if (data.accepted) {
          window.chessApp.endGameDraw('Hai bên đã đồng thuận Hòa cờ!');
        } else {
          window.chessApp.ui.showToast('Đối thủ đã từ chối lời mời Cầu Hòa.');
        }
      });

      // 7. Resignation
      this.socket.on('player-resigned', (data) => {
        const winner = data.resignedColor === 'w' ? 'Quân Đen' : 'Quân Trắng';
        const loser = data.resignedColor === 'w' ? 'Quân Trắng' : 'Quân Đen';
        window.chessApp.isGameOver = true;
        window.chessApp.stopTimer();
        window.chessApp.ui.showGameOverModal('Đối Thủ Đầu Hàng!', `${loser} đã xin đầu hàng. ${winner} giành chiến thắng!`);
        if (data.resignedColor !== this.myColor) {
          window.chessSounds.playVictory();
        } else {
          window.chessSounds.playDefeat();
        }
      });

      // 8. Rematch
      this.socket.on('rematch-offered', () => {
        if (confirm('Đối thủ mời bạn chơi tiếp ván mới (đổi phe). Bạn có đồng ý không?')) {
          this.socket.emit('accept-rematch', { roomId: this.currentRoom });
        }
      });

      this.socket.on('rematch-start', (data) => {
        this.myColor = data.color;
        window.chessApp.startOnlineGame({
          myColor: this.myColor,
          whiteName: this.myColor === 'w' ? this.playerName : 'Bạn của bạn',
          blackName: this.myColor === 'b' ? this.playerName : 'Bạn của bạn',
          timeControl: data.timeControl
        });
        window.chessApp.ui.showToast('🔄 Bắt đầu ván tái đấu!');
      });

      // 9. Opponent Disconnected
      this.socket.on('opponent-disconnected', () => {
        this.opponentConnected = false;
        this.updateRoomStatusUI('⚠️ Đối thủ bị mất kết nối. Đang chờ kết nối lại...');
        window.chessApp.ui.showToast('Đối thủ vừa ngắt kết nối!');
      });

      // 10. Errors
      this.socket.on('error-msg', (msg) => {
        window.chessApp.ui.showToast(`❌ ${msg}`);
      });
    }

    /**
     * Check if user opened page with ?room=xxx&pin=yyy
     */
    checkUrlParams() {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      const pinParam = urlParams.get('pin');

      if (roomParam) {
        // Switch to Online mode tab
        setTimeout(() => {
          const tabOnline = document.getElementById('tabOnline');
          if (tabOnline) tabOnline.click();

          const joinTabBtn = document.getElementById('btnOnlineSubJoin');
          if (joinTabBtn) joinTabBtn.click();

          const joinRoomInput = document.getElementById('joinRoomId');
          if (joinRoomInput) joinRoomInput.value = roomParam;

          const joinPinInput = document.getElementById('joinRoomPin');
          if (joinPinInput && pinParam) joinPinInput.value = pinParam;

          window.chessApp.ui.showToast(`📌 Đã nhận mã phòng từ liên kết: ${roomParam}`);
        }, 300);
      }
    }

    bindDOMEvents() {
      // Sub-tabs in Online Mode (Tạo phòng vs Vào phòng)
      const btnSubCreate = document.getElementById('btnOnlineSubCreate');
      const btnSubJoin = document.getElementById('btnOnlineSubJoin');
      const formCreate = document.getElementById('formOnlineCreate');
      const formJoin = document.getElementById('formOnlineJoin');

      if (btnSubCreate && btnSubJoin) {
        btnSubCreate.addEventListener('click', () => {
          btnSubCreate.classList.add('active');
          btnSubJoin.classList.remove('active');
          formCreate.style.display = 'flex';
          formJoin.style.display = 'none';
        });

        btnSubJoin.addEventListener('click', () => {
          btnSubJoin.classList.add('active');
          btnSubCreate.classList.remove('active');
          formJoin.style.display = 'flex';
          formCreate.style.display = 'none';
        });
      }

      // Generate random room id
      const btnRandomRoom = document.getElementById('btnRandomRoomId');
      if (btnRandomRoom) {
        btnRandomRoom.addEventListener('click', () => {
          const code = 'co-vua-' + Math.floor(100 + Math.random() * 900);
          document.getElementById('createRoomId').value = code;
        });
      }

      // Button: Create Room
      const btnDoCreate = document.getElementById('btnDoCreateRoom');
      if (btnDoCreate) {
        btnDoCreate.addEventListener('click', async () => {
          try {
            await this.connectSocket();
            const name = (document.getElementById('onlinePlayerName').value || 'Bạn').trim();
            let roomId = (document.getElementById('createRoomId').value || '').trim();
            if (!roomId) {
              roomId = 'co-vua-' + Math.floor(100 + Math.random() * 900);
              document.getElementById('createRoomId').value = roomId;
            }
            const password = (document.getElementById('createRoomPin').value || '').trim();

            const activeSideBtn = document.querySelector('#onlineSideSelect .seg-btn.active');
            const preferredColor = activeSideBtn ? activeSideBtn.dataset.side : 'w';

            const activeTimeBtn = document.querySelector('#onlineTimeSelect .seg-btn.active');
            const timeControl = activeTimeBtn ? parseInt(activeTimeBtn.dataset.time, 10) : 300;

            this.playerName = name;
            this.socket.emit('create-room', {
              roomId,
              password,
              timeControl,
              preferredColor,
              playerName: name
            });
          } catch (err) {
            console.error(err);
          }
        });
      }

      // Button: Join Room
      const btnDoJoin = document.getElementById('btnDoJoinRoom');
      if (btnDoJoin) {
        btnDoJoin.addEventListener('click', async () => {
          try {
            await this.connectSocket();
            const name = (document.getElementById('joinPlayerName').value || 'Bạn').trim();
            const roomId = (document.getElementById('joinRoomId').value || '').trim();
            const password = (document.getElementById('joinRoomPin').value || '').trim();

            if (!roomId) {
              window.chessApp.ui.showToast('Vui lòng nhập Mã phòng!');
              return;
            }

            this.playerName = name;
            this.socket.emit('join-room', {
              roomId,
              password,
              playerName: name
            });
          } catch (err) {
            console.error(err);
          }
        });
      }

      // Button: Copy Invite Link
      const btnCopyLink = document.getElementById('btnCopyInviteLink');
      if (btnCopyLink) {
        btnCopyLink.addEventListener('click', () => {
          if (!this.currentRoom) return;
          const pin = (document.getElementById('createRoomPin').value || '').trim();
          let link = `${window.location.origin}${window.location.pathname}?room=${this.currentRoom}`;
          if (pin) link += `&pin=${encodeURIComponent(pin)}`;

          navigator.clipboard.writeText(link).then(() => {
            window.chessApp.ui.showToast('📋 Đã sao chép link mời bạn bè!');
          }).catch(() => {
            prompt('Hãy sao chép liên kết này và gửi cho bạn bè:', link);
          });
        });
      }

      // Leave Room
      const btnLeave = document.getElementById('btnLeaveRoom');
      if (btnLeave) {
        btnLeave.addEventListener('click', () => {
          if (confirm('Bạn có chắc muốn rời phòng thi đấu hiện tại?')) {
            window.location.href = window.location.pathname;
          }
        });
      }

      // Resign
      const btnResign = document.getElementById('btnOnlineResign');
      if (btnResign) {
        btnResign.addEventListener('click', () => {
          if (confirm('Bạn có chắc muốn Xin đầu hàng?')) {
            this.socket.emit('resign', { roomId: this.currentRoom });
          }
        });
      }

      // Offer Draw
      const btnDraw = document.getElementById('btnOnlineOfferDraw');
      if (btnDraw) {
        btnDraw.addEventListener('click', () => {
          this.socket.emit('offer-draw', { roomId: this.currentRoom });
          window.chessApp.ui.showToast('Đã gửi lời mời Cầu Hòa tới đối thủ.');
        });
      }

      // Rematch
      const btnRematch = document.getElementById('btnOnlineRematch');
      if (btnRematch) {
        btnRematch.addEventListener('click', () => {
          this.socket.emit('offer-rematch', { roomId: this.currentRoom });
          window.chessApp.ui.showToast('Đã gửi lời mời Tái đấu tới đối thủ.');
        });
      }

      // In-game Chat Send
      const chatInput = document.getElementById('chatTextInput');
      const chatSendBtn = document.getElementById('btnSendChat');
      const sendAction = () => {
        const text = (chatInput.value || '').trim();
        if (!text || !this.currentRoom || !this.socket) return;
        this.socket.emit('send-chat', {
          roomId: this.currentRoom,
          text: text,
          sender: this.playerName
        });
        chatInput.value = '';
      };

      if (chatSendBtn) chatSendBtn.addEventListener('click', sendAction);
      if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') sendAction();
        });
      }

      // Quick Emoji Buttons
      const emojiBtns = document.querySelectorAll('.emoji-btn');
      emojiBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const emoji = btn.textContent;
          if (!this.currentRoom || !this.socket) return;
          this.socket.emit('send-chat', {
            roomId: this.currentRoom,
            text: emoji,
            sender: this.playerName
          });
        });
      });
    }

    onRoomReady(data) {
      document.getElementById('onlineLobbyForms').style.display = 'none';
      document.getElementById('onlineActiveRoomCard').style.display = 'flex';

      document.getElementById('currentRoomIdDisplay').textContent = data.roomId;
      document.getElementById('currentRoomColorDisplay').textContent = data.color === 'w' ? 'Quân Trắng (⚪)' : 'Quân Đen (⚫)';

      this.updateRoomStatusUI('Đang chờ bạn của bạn vào phòng...');
    }

    updateRoomStatusUI(text) {
      const el = document.getElementById('roomStatusDisplay');
      if (el) {
        el.textContent = text;
        if (this.opponentConnected) el.classList.add('connected');
        else el.classList.remove('connected');
      }
    }

    sendMove(moveObj, fen, history) {
      if (!this.socket || !this.currentRoom) return;
      this.socket.emit('make-move', {
        roomId: this.currentRoom,
        moveObj,
        fen,
        history
      });
    }

    renderChatMessage(sender, text, time) {
      const list = document.getElementById('chatMessagesList');
      if (!list) return;

      const msgEl = document.createElement('div');
      msgEl.className = 'chat-msg';

      const timeEl = document.createElement('span');
      timeEl.className = 'time';
      timeEl.textContent = time || '';

      const senderEl = document.createElement('span');
      senderEl.className = 'sender';
      senderEl.textContent = `${sender}:`;

      const textEl = document.createElement('span');
      textEl.textContent = ` ${text}`;

      msgEl.appendChild(timeEl);
      msgEl.appendChild(senderEl);
      msgEl.appendChild(textEl);

      list.appendChild(msgEl);
      list.scrollTop = list.scrollHeight;
    }
  }

  window.ChessOnlineManager = ChessOnlineManager;
  window.chessOnline = new ChessOnlineManager();
})(window);
