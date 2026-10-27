# 🌐 HƯỚNG DẪN ĐƯA GAME CỜ VUA LÊN WEB & CHƠI RIÊNG VỚI BẠN BÈ

Hệ thống được thiết kế đặc biệt với cơ chế **Phòng riêng biệt (Private Room)**, **Mật khẩu bảo vệ (PIN Code)** và **Giới hạn đúng 2 người chơi** (người thứ 3 không thể vào xem trộm hay phá ván cờ).

---

## 🔒 TẠI SAO CHỈ BẠN VÀ BẠN CỦA BẠN CHƠI ĐƯỢC?

1. **Mã phòng riêng**: Bạn tự đặt mã phòng (ví dụ: `tuan-nam-2026`) hoặc tạo ngẫu nhiên.
2. **Mật khẩu phòng (PIN)**: Bất kỳ ai vào phòng đều bắt buộc phải nhập đúng mật khẩu này.
3. **Giới hạn tuyệt đối 2 người**: Ngay khi bạn và bạn của bạn đã vào phòng (1 Trắng, 1 Đen), server sẽ tự động **khóa phòng**. Bất kỳ người lạ nào trên mạng có link cũng sẽ bị từ chối truy cập ngay lập tức (*"Phòng này đã đủ 2 người chơi! Bạn không thể vào"*).
4. **Link mời 1 chạm**: Bạn chỉ cần bấm nút `📋 Sao chép Link mời bạn chơi` và gửi qua Zalo/Messenger. Khi bạn của bạn bấm vào link, mã phòng và mật khẩu sẽ tự động điền sẵn để vào ngay.

---

## 🚀 CÁCH 1: ĐƯA LÊN WEB MIỄN PHÍ QUA RENDER.COM (KHUYÊN DÙNG NHẤT)

Render.com cho phép bạn host ứng dụng Node.js + WebSocket hoàn toàn miễn phí, có sẵn HTTPS (SSL) và chạy 24/7.

### Bước 1: Đưa thư mục code lên GitHub
1. Tạo một tài khoản trên [GitHub.com](https://github.com) (nếu chưa có).
2. Tạo một repository mới (đặt tên ví dụ: `chess-online`).
3. Mở terminal tại thư mục `d:\Chess` và đẩy code lên:
   ```bash
   git init
   git add .
   git commit -m "feat: co vua pro online"
   git branch -M main
   git remote add origin https://github.com/TÊN_GITHUB_CỦA_BẠN/chess-online.git
   git push -u origin main
   ```

### Bước 2: Triển khai trên Render.com
1. Đăng ký tài khoản miễn phí tại [Render.com](https://render.com).
2. Bấm nút **New +** -> Chọn **Web Service**.
3. Kết nối với repository GitHub `chess-online` của bạn.
4. Cấu hình các thông số:
   - **Name**: `co-vua-cua-toi` (tên tùy ý)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan Type**: `Free`
5. Bấm **Create Web Service**.
6. Chờ Render build trong khoảng 1-2 phút, bạn sẽ nhận được đường link dạng:
   👉 `https://co-vua-cua-toi.onrender.com`

Bây giờ bạn và bạn của bạn chỉ cần mở link này trên điện thoại hoặc máy tính là có thể tạo phòng và thi đấu với nhau ở bất kỳ đâu!

---

## ⚡ CÁCH 2: CHƠI QUA MẠNG NGAY TỪ MÁY BẠN (KHÔNG CẦN TẠO HOSTING)

Nếu bạn không muốn tạo tài khoản GitHub hay Render, bạn có thể biến chính máy tính của mình thành máy chủ và tạo link cho bạn bè qua **Cloudflare Tunnel** (Hoàn toàn miễn phí, không cần mở port modem):

1. Mở file `start.bat` để chạy server trên máy tính của bạn (đang chạy ở `http://localhost:3000`).
2. Mở một cửa sổ PowerShell hoặc Command Prompt khác, chạy lệnh sau:
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```
3. Cloudflare sẽ tạo cho bạn một đường link HTTPS công khai tạm thời, ví dụ:
   👉 `https://random-name-123.trycloudflare.com`
4. Bạn gửi đường link đó cho bạn của bạn qua Messenger/Zalo. Cả hai có thể vào chơi trực tiếp với nhau ngay lập tức!

---

## 🎮 HƯỚNG DẪN 2 BẠN THI ĐẤU

1. **Người thứ nhất (Tạo phòng)**:
   - Mở web -> Chọn tab **🌐 Chơi Online**.
   - Nhập tên của bạn (ví dụ: `Tuấn`).
   - Nhập mã phòng (ví dụ: `ban-toi`) và mật khẩu (ví dụ: `1234`).
   - Chọn thời gian ván cờ (ví dụ: `5 phút`).
   - Bấm **Tạo Phòng & Lấy Link Mời**.
   - Bấm nút **📋 Sao Chép Link Mời Bạn Chơi** và gửi cho bạn của mình.

2. **Người thứ hai (Tham gia)**:
   - Bấm vào link bạn vừa gửi.
   - Nhập tên (ví dụ: `Nam`).
   - Bấm **Vào Phòng Thi Đấu**.

3. **Bắt đầu thi đấu**:
   - Hai bạn sẽ được xếp vào 2 phe (Trắng và Đen).
   - Nước đi được đồng bộ tức thì qua WebSocket thời gian thực (<0.05 giây).
   - Có sẵn thanh trò chuyện, biểu cảm emoji, nút xin hòa, xin đầu hàng và xin đấu lại khi ván cờ kết thúc!
