# THIẾT KẾ GAME — TOÀN DÂN CẦU SINH (bản MVP)

> Tài liệu thiết kế cho bản MVP: game 3D multiplayer chơi trên trình duyệt.

## 1. Tổng quan

- **Thể loại:** Sinh tồn 3D góc nhìn thứ ba, multiplayer hợp tác.
- **Nền tảng:** Web (mở link là chơi, không cần cài đặt).
- **Số người chơi:** 4–16 người/phòng (MVP).
- **Mục tiêu vòng chơi:** Sống sót 30 ngày trong game (mỗi ngày ~3 phút thật) và đánh bại Hắc Thú Vương.

## 2. Gameplay cốt lõi

### Phong cách hình ảnh (theo video)
- **Đô thị đổ nát về đêm:** nhà cao tầng sập xệ, mặt đất nứt nẻ, bầu trời đen kịt có mây xoáy, sương mù dày — tông màu u ám, điện ảnh.
- Quái Hắc Thú: thân gai nhọn, mắt phát sáng trong bóng tối.

### Vòng lặp ngày/đêm
- **Ban ngày (2 phút):** an toàn tương đối — lục soát tàn tích (thuốc, đồ hộp, mì gói), thu gom phế liệu, sửa chữa nơi trú ẩn, giao thương.
- **Ban đêm (1 phút):** Hắc Thú xuất hiện theo bầy, tấn công người chơi và công trình. Phòng thủ hoặc trốn trong thành.

### Chỉ số sinh tồn
- **Máu (HP):** về 0 → gục, đồng đội có 60 giây để hồi sinh.
- **Đói:** giảm dần theo thời gian; về 0 thì máu tụt. Ăn quả/thịt để hồi.
- **Thể lực:** chạy nhanh và chặt chém tốn thể lực, đứng yên hồi lại.

### Thu thập & chế tạo
- Tài nguyên theo video: **thuốc men** (thuốc hạ sốt), **đồ ăn** (mì gói, đồ hộp), **phế liệu** (linh kiện), **vật liệu xây dựng**.
- Lục soát tàn tích thành phố để tìm vật phẩm; phế liệu dùng để chế tạo và sửa chữa.
- Chế tạo: Vũ khí thô → Vũ khí gia cố → Bẫy; Lều bạt → Tường chắn → Tháp canh.
- Công thức đơn giản, mở khóa dần theo ngày.

### Chợ giao dịch (lấy từ video)
- Người chơi mở **bảng giao dịch** kiểu hologram, đăng bán/đổi vật phẩm với nhau (đúng như cảnh tablet trong video).
- Vật phẩm cứu mạng (thuốc, đồ ăn) có giá trị cao — tạo kinh tế người chơi tự vận hành.

### Kỹ năng lên cấp (đúng mô-típ "làm gì cũng lên cấp")
- Chặt cây nhiều → kỹ năng Đốn Củi tăng → chặt nhanh hơn.
- Chiến đấu nhiều → kỹ năng Chiến Đấu tăng → đánh mạnh hơn.
- Mỗi kỹ năng tối đa cấp 10.

### Hắc Thú (quái)
- Cấp 1–2: Sói Đen (ban đêm, đi lẻ).
- Cấp 3–5: Bầy Sói + Gấu Đột Biến.
- Ngày 30: **Hắc Thú Vương** — boss lớn, cần cả phòng hợp lực.

## 3. Multiplayer (MVP)

- Mỗi phòng là **một thế giới chung**: thấy nhau di chuyển, chặt cây, đánh quái theo thời gian thực.
- **Chat nhanh** trong game (mẫu câu + chat tự do).
- Tài nguyên trong thế giới là **chung** — ai nhanh tay thì được (tạo tương tác/thương lượng tự nhiên).
- Chế độ thân thiện mặc định: **không gây sát thương lên người chơi khác** (tránh phá game lúc MVP).
- Server authoritative đơn giản: server giữ vị trí/máu/quái, client gửi input — chống gian lận cơ bản.

## 4. Kiến trúc kỹ thuật

```
Trình duyệt (Client)                    Oracle VM (Server)
┌─────────────────────┐                ┌──────────────────────┐
│ Three.js: render 3D │  WebSocket     │ Node.js + ws:        │
│ WASD + chuột        │◄──────────────►│ - game loop 20 tick/s│
│ Dự đoán di chuyển   │   (wss)        │ - sync vị trí/máu    │
│                     │                │ - spawn quái, ngày   │
└─────────────────────┘                │ - chat             │
                                       └──────────────────────┘
```

- **Client:** Three.js (3D low-poly nhẹ máy), HTML/CSS UI tiếng Việt.
- **Server:** Node.js + thư viện `ws`, một file server duy nhất — nhẹ, chạy tốt trên VM 2 nhân/12GB RAM.
- **Host:** Oracle Cloud VM (Ubuntu ARM), nginx làm reverse proxy, wss bảo mật.
- **Dự phòng:** nếu không kết nối được server → tự chơi đơn với quái AI.

## 5. Điều khiển (bản web)

| Phím | Hành động |
|---|---|
| W A S D | Di chuyển |
| Chuột | Xoay góc nhìn |
| Click trái | Chặt/đánh/thu thập |
| E | Tương tác (nhặt, mở) |
| B | Mở bảng chế tạo |
| 1–5 | Chọn vật phẩm nhanh |

## 6. Phạm vi MVP (cam kết làm được)

1. ✅ Thế giới 3D: địa hình, cây, đá, ngày/đêm.
2. ✅ Nhân vật di chuyển, thu thập, chế tạo cơ bản.
3. ✅ Quái Hắc Thú + boss cuối.
4. ✅ Multiplayer: vào cùng phòng, thấy nhau, chat.
5. ✅ UI tiếng Việt: máu/đói/thể lực, túi đồ, bảng chế tạo.
6. ✅ Server + hướng dẫn deploy lên Oracle VM.

## 7. Ngoài phạm vi MVP (để sau)

- Đồ họa đẹp, hiệu ứng phức tạp.
- Hàng trăm người/phòng, nhiều phòng (sharding).
- Tài khoản, lưu tiến trình lâu dài, bảng xếp hạng.
- Nạp tiền, shop vật phẩm.
- Bản mobile app.
