# TOÀN DÂN CẦU SINH — Game sinh tồn 3D multiplayer

Game 3D chơi trên trình duyệt, lấy cảm hứng từ video "Toàn Dân Mạc Lộ Cầu Sinh".
Sống sót 30 ngày trong thành phố đổ nát. Ngày 30, Hắc Thú Vương giáng lâm.

## Chạy bằng Docker Desktop (khuyên dùng khi test)

```bash
cd game-toan-dan-cau-sinh
docker compose up -d --build
```

- Client: mở trình duyệt vào http://localhost:8080
- Nhập địa chỉ server: `ws://localhost:3001` → VÀO GAME
- Dừng: `docker compose down`

## Chơi ngay (không cần server)

Mở file `client/index.html` bằng trình duyệt → để trống ô "Địa chỉ server" → VÀO GAME.
Chế độ chơi đơn: quái do máy điều khiển.

## Chơi multiplayer

### 1. Chạy server

```bash
cd server
npm install
npm start        # mặc định port 3001
```

### 2. Mở client

Mở `client/index.html`, nhập địa chỉ server vào ô "Địa chỉ server":
- Chạy local: `ws://localhost:3001`
- Server Render: `wss://ten-app.onrender.com` (không cần ghi `wss://`, game tự thêm)

## Deploy miễn phí

### Client lên Vercel (free)
1. Đẩy thư mục `client/` lên GitHub
2. Vào [vercel.com](https://vercel.com) → Import repo → Deploy (không cần build gì cả)

### Server lên Render (free)
1. Đẩy thư mục `server/` lên GitHub
2. Vào [render.com](https://render.com) → New → Web Service → chọn repo
3. Start command: `npm start` (Render tự đặt PORT)
4. Lưu ý: bản free **ngủ sau 15 phút** không ai chơi — người đầu tiên vào chờ ~30-50 giây

### Server lên Oracle Cloud VM (free vĩnh viễn, khuyên dùng)
```bash
# Trên VM Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
cd server && npm install
npm install -g pm2
pm2 start server.js --name cau-sinh
pm2 save && pm2 startup
```
Mở port TCP (ví dụ 3001) trong Security List của Oracle, client trỏ tới `ws://IP-VM:3001`.

## Điều khiển

| Phím | Hành động |
|------|-----------|
| W A S D | Di chuyển |
| Chuột (click để khóa) | Xoay góc nhìn |
| Click trái | Đánh |
| Shift | Chạy nhanh |
| E | Nhặt thùng hàng / đồ rơi |
| B | Chế tạo |
| I | Túi đồ (click = dùng/mặc, Shift+click = đánh rơi) |
| U | Panel trang bị |
| G | Đánh rơi vật phẩm đang chọn (để giao dịch) |
| Enter | Chat |

## Rương trang bị (mới rev11)

- **Rương vàng phát sáng** (có cột sáng bắn lên trời) xuất hiện trong thành phố — mỗi ngày rơi thêm 1 rương
- Mở rương nhận **trang bị theo độ hiếm**: Hiếm (xanh) → Sử thi (tím) → Huyền thoại (vàng)
- Vũ khí: Kiếm Sắt, Cung Gỗ, Kiếm Thép (+35 dmg), Búa Hắc Ám (+55 dmg)
- Giáp: Giáp Da (+30 máu), Giáp Sắt (+60 máu, -10% sát thương), Giáp Hoàng Kim (+100 máu, -20% sát thương)
- Vào Túi đồ (I) click trang bị để **mặc**, phím U xem panel trang bị

## Mẹo sinh tồn

- Ban ngày: loot thùng hàng phát sáng, chế tạo vũ khí
- Ban đêm: quái đi săn theo bầy — ở gần lều hoặc đi cùng người khác
- Thuốc hạ sốt (💊) hồi máu, mì gói (🍜) chống đói
- Đánh rơi đồ (G) để giao dịch với người chơi khác
