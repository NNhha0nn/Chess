# ♟️ CỜ VUA PRO - CHƠI ONLINE VỚI BẠN & ĐẤU VỚI MÁY (AI)

Ứng dụng game cờ vua hiện đại, mượt mà và đầy đủ tính năng chuẩn quốc tế (FIDE), hỗ trợ cả **Chơi Online thời gian thực qua Web**, **Đấu với Máy (AI)** và **Chơi 2 người trên cùng thiết bị**.

---

## 🌟 3 CHẾ ĐỘ CHƠI

1. 🌐 **Chơi Online với Bạn bè (Phòng Riêng Bảo Mật)**:
   - **Mã phòng riêng & Mật khẩu (PIN)**: Người ngoài không thể vào nếu không biết mật khẩu.
   - **Giới hạn đúng 2 người**: Khóa phòng ngay khi đủ 2 người chơi (Trắng & Đen), chặn người thứ 3 vào xem hoặc phá rối.
   - **Chia sẻ link 1 chạm**: Nút sao chép link mời bạn (`https://domain/?room=...&pin=...`), bạn bè chỉ cần bấm vào là vào ngay bàn cờ.
   - **Đồng bộ nước đi thời gian thực** qua WebSocket tốc độ cao (<0.05 giây).
   - **Khung Chat & Biểu cảm Emoji trực tiếp** trong trận đấu.
   - **Đồng hồ bấm giờ thi đấu**, nút Xin hòa (Offer draw), Đầu hàng (Resign) và Đấu lại (Rematch).
2. 🤖 **Đấu với Máy (Bot AI - 4 cấp độ)**:
   - Dễ (Cấp 1), Vừa (Cấp 2), Khó (Cấp 3), Kiện tướng (Cấp 4).
   - Tùy chọn phe Trắng, Đen hoặc Ngẫu nhiên.
   - Hỗ trợ Gợi ý nước đi (Hint) và Hoàn tác (Undo).
3. 👥 **Chơi 2 Người trên cùng thiết bị (Pass & Play)**:
   - Hai người luân phiên đi cờ trên cùng một máy tính / tablet / điện thoại.

---

## 🚀 CÁCH KHỞI ĐỘNG VÀ CHƠI

### 1. Chơi thử nghiệm trên máy tính
Click đúp chuột vào file **`start.bat`**, server sẽ khởi chạy và tự động mở trình duyệt tại `http://localhost:3000`.

### 2. Đưa lên Web để chơi cùng bạn bè
Xem tài liệu hướng dẫn chi tiết từng bước tại file [DEPLOY_GUIDE.md](file:///d:/Chess/DEPLOY_GUIDE.md):
- **Cách 1: Triển khai miễn phí 100% lên Render.com** (Có link công khai 24/7).
- **Cách 2: Chạy trực tiếp từ máy tính qua Cloudflare Tunnel** (`npx cloudflared tunnel --url http://localhost:3000`) mà không cần thuê hosting.

---

## 📁 CẤU TRÚC DỰ ÁN

```
d:\Chess\
├── server.js           # Máy chủ Node.js + Express + Socket.IO quản lý phòng riêng
├── index.html          # Giao diện chính (Bàn cờ, Phòng chờ, Khung Chat, Lịch sử)
├── package.json        # Cấu hình dự án & thư viện (express, socket.io)
├── start.bat           # File khởi chạy nhanh máy chủ trên Windows
├── DEPLOY_GUIDE.md     # Hướng dẫn chi tiết cách đưa lên web miễn phí
├── README.md           # Giới thiệu & hướng dẫn sử dụng
├── css\
│   └── style.css       # Toàn bộ CSS phong cách Dark Mode, bàn cờ, chat box
├── js\
│   ├── online.js       # Quản lý kết nối Socket.IO, phòng riêng, chat, đồng bộ nước đi
│   ├── app.js          # Controller điều phối ván cờ, luật chơi và các chế độ
│   ├── engine.js       # AI Engine: Minimax, Alpha-Beta, PST, Quiescence Search
│   ├── ui.js           # Render bàn cờ, kéo thả quân, đồng hồ, modal phong cấp
│   └── sounds.js       # Bộ phát âm thanh tự tạo bằng Web Audio API
├── lib\
│   ├── chess.min.js    # Thư viện kiểm tra luật cờ quốc tế
│   └── socket.io.min.js# Thư viện Socket.IO client
└── assets\
    └── pieces\         # 12 file vector SVG quân cờ chuẩn giải đấu (wP, bK,...)
```
