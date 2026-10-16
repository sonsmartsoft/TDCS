# PLAN NÂNG CẢ TOÀN DIỆN — TOÀN DÂN CẦU SINH

> Dự án: game sinh tồn 3D multiplayer trên trình duyệt (Three.js + Node.js + ws).  
> Repo: https://github.com/sonsmartsoft/TDCS.git (branch `master`)  
> Bản hiện tại: MVP rev8 (đã commit: `25494c8`)  
> Ngôn ngữ: Tiếng Việt. Mục tiêu: từ MVP đơn giản → sản phẩm sẵn sàng chạy public.

---

## 1. TÌNH TRẠNG HIỆN TẠI (MVP rev8)

### Thành phần đã có
| Thư mục/File | Mô tả |
|---|---|
| `client/game.js` (~1144 dòng) | Three.js r128, render 3D, input, HUD, UI, offline mode |
| `client/index.html` | Màn hình chào, HUD, túi đồ, chế tạo, chat, điều khiển cảm ứng |
| `client/style.css` | Giao diện hologram "HỆ THỐNG" tiếng Việt |
| `client/Dockerfile` | nginx serve static |
| `server/server.js` (~309 dòng) | Node.js + `ws`, game loop 20 tick/s, 월드 120x120, ngày/đêm, quái, boss |
| `server/package.json` | `ws` ^8.18.0, start: `node server.js` |
| `server/Dockerfile` | node:20-alpine |
| `docker-compose.yml` | server (3001) + client (8080) |
| `COT-TRUYEN.md`, `THIET-KE-GAME.md`, `README.md` | Cốt truyện, thiết kế, hướng dẫn deploy |
| `video/frames/` | 26 khung hình tham khảo phong cách điện khảo |

### Ưu điểm
- Chơi được ngay trên trình duyệt, không cần cài.
- Có chế độ offline (bots) khi mất kết nối server.
- Multiplayer real-time 16 người/phòng, chat, giao dịch thả đồ.
- Vòng ngày/đêm 3 phút, boss ngày 30, HUD máu/đói/sức.

### Hạn chế lớn nhất (cần nâng cấp cấp trước)
1. **Server đơn file** (`server.js` ~309 dòng) — khó bảo trì, không chia module.
2. **Không có cơ sở dữ liệu** — toàn bộ dữ liệu trong bộ nhớ, restart lại mất hết (tài khoản, tiến độ, xếp hạng).
3. **Chưa có xác thực** — bất kỳ ai vào đặt tên gì cũng chơi, không lưu tiến trình dài hạn.
4. **Client gộp thô** — Three.js r128 (cũ), chưa có bundler, không có âm thanh, UI programmer art.
5. **Gameplay mỏng** — chỉ 4 công thức chế tạo, 7 loại vật phẩm, 2 loại quái + boss, không có hệ thống kỹ năng, không có trang bị, không có xây dựng cơ sở thực tế (chỉ là cờ `has_leu`/`has_tuong`).
6. **Giao dịch nguyên sơ** — thả đồ lên đất để đổi, dễ bị trộm, không có giao diện giao dịch bảo mật.
7. **DevOps thủ công** — chưa có CI/CD, kiểm tra sức khỏe, log, nginx config trong repo.

---

## 2. MÙC TIÊU NÂNG CẢ

| Mục tiêu | Chi tiết |
|---|---|
| **Khả năng mở rộng** | Chia module server, thêm CSDL, xác thực, nhiều phòng (sharding sau này). |
| **Trải nghiệm gameplay** | Hệ thống kỹ năng, trang bị, xây dựng cơ sở, giao dịch bảo mật, sự kiện boss. |
| **Nội dung** | Nhiều loại vật phẩm (hà quý), nhiều loại quái, boss sự kiện, sương đen, nhiệm vụ. |
| **Chất lượng kỹ thuật** | Three.js hiện đại, bundler, âm thanh, hậu xử lý, tối ưu di động, CI/CD. |
| **Vận hành** | Tài khoản, bảng xếp hạng, lưu tiến trình, deploy tự động, giám sát. |

---

## 3. CHI TIẾT CÁC GÓI VIỆC (NV-01 → NV-16)

### Giai đoạn 1: Nền tảng & chất lượng mã (Tuần 1–2)

#### NV-01: Chia module server (refactor `server.js`)
- **Mục tiêu:** Tách `server.js` ra thành các module rõ ràng để dễ bảo trì.
- **Scope:** 
  - Tạo `server/src/` với các module: `gameState.js` (trạng thái trò chơi), `world.js` (sinh vật, thùng, đồ rơi), `network.js` (WebSocket), `gameLoop.js` (vòng lặp ticks), `handlers.js` (xử lý tin nhắn client).
  - Giữ nguyên giao thức WebSocket hiện tại để không vỡ client.
  - Cập nhật `server.js` chỉ làm điểm khởi tạo.
- **Files:** `server/server.js`, tạo `server/src/*.js`, `server/package.json` (nếu cần).
- **Done khi:** `npm start` vẫn chạy, joining/move/chat/loot/hit/craft dùng được như cũ, có thể đọc mã dễ dàng hơn.

#### NV-02: Thêm cơ sở dữ liệu & xác thực đơn giản
- **Mục tiêu:** Lưu tài khoản người chơi, mật khẩu (hash), và tiến độ (hàng tồn kho, kỹ năng, ngày đạt được) để chơi lại không bị mất dữ liệu.
- **Scope:** 
  - Chọn SQLite (`better-sqlite3`) nhẹ, không cần cài DB riêng, phù hợp Oracle VM free tier.
  - Bảng `users` (id, username, password_hash, created_at), bảng `player_data` (user_id, inventory, skills, crafted, last_day, last_pos).
  - Middleware xác thực: client gửi `login`/`register` trước khi vào game; server cấp `token` (JWT đơn giản hoặc session), gắn vào mỗi kết nối WebSocket.
  - Không bắt buộc đăng nhập ngay — giữ chế độ chơi đơn (không cần server) như cũ.
- **Files:** `server/src/db.js`, `server/src/auth.js`, cập nhật `server/server.js` + `client/game.js`.
- **Done khi:** Có thể đăng ký/đăng nhập, thoát game vào lại vẫn giữ túi đồ và ngày; người không đăng nhập vẫn chơi được dưới tên khách.

#### NV-03: Hiện đại hóa client (Three.js + bundler)
- **Mục tiêu:** Nâng Three.js từ r128 lên phiên bản hiện đại, thêm công cụ xây dựng để dễ mở rộng.
- **Scope:** 
  - Thêm Vite (hoặc Parcel) làm bundler cho `client/`.
  - Nâng Three.js lên r165+ (hoặc bản ổn định mới nhất).
  - Tách `game.js` ra thành các module: `core.js`, `input.js`, `world.js`, `ui.js`, `network.js`.
  - Giữ nguyên giao diện hologram hiện tại (không đổi đột ngột style).
- **Files:** `client/package.json`, `vite.config.js`, `client/src/*.js`, `client/index.html`, `client/Dockerfile` (cập nhật build).
- **Done khi:** `npm run dev` chạy được client, build ra static phục vụ qua nginx, Three.js cảnh báo ít hơn, mã dễ thêm tính năng mới.

---

### Giai đoạn 2: Hệ thống chơi cốt lõi (Tuần 3–5)

#### NV-04: Hệ thống kỹ năng (Skill)
- **Mục tiêu:** Triển khai mô-típ "làm gì cũng lên cấp" trong THIET-KE-GAME.md.
- **Scope:** 
  - Kỹ năng: Đốn củi, Chiến đấu, Lục soát, Sống tồn. Mỗi kỹ năng cấp 1–10.
  - Khi chặt cây, đánh quái, nhặt đồ → cộng kinh nghiệm, lên cấp, mở khóa công thức / hiệu ứng (ví dụ chặt nhanh hơn, đánh mạnh hơn).
  - Lưu cấp kỹ năng vào CSDL (liên kết NV-02).
- **Files:** `server/src/skills.js`, `client/src/skills.js`, UI hiển thị cấp kỹ năng.
- **Done khi:** Có giao diện xem cấp kỹ năng, kinh nghiệm tăng khi hành động, công thức chế tạo mở khóa theo cấp.

#### NV-05: Hệ thống trang bị & vũ khí
- **Mục tiêu:** Thay thế weapon đơn giản bằng hệ thống trang bị thực thụ.
- **Scope:** 
  - Ô trang bị: Vũ khí, Áo, Ngón tay, Giày (hoặc ít nhất Vũ khí + Áo).
  - Vũ khí có chỉ số sát thương, tốc độ, độ bền. Áo tăng máu tối đa.
  - Cơ chế sản xuất trang bị qua chế tạo; trang bị hiển thị trên mô hình nhân vật (slots đơn giản).
- **Files:** `server/src/items.js` (mở rộng), `client/src/equipment.js`, UI trang bị.
- **Done khi:** Có trang bị, personaggio mặc/show trang bị, stat máu/sát thương thay đổi theo trang bị.

#### NV-06: Xây dựng cơ sở thực tế trong thế giới
- **Mục tiêu:** Cho phép người chơi đặt lều, tường vào thế giới 3D, không chỉ cờ `has_`.
- **Scope:** 
  - Chế độ xây dựng: nhấn phím (ví dụ `T`) chọn công trình (lều, tường, tháp canh), đặt vào mặt đất bằng click chuột.
  - Công trình là mesh Three.js riêng, có máu, có thể bị quái tấn công phá hủy.
  - Lưu vị trí công trình vào CSDL (liên kết NV-02), nạp lại khi vào lại phòng.
- **Files:** `server/src/buildings.js`, `client/src/building.js`, công thức chế tạo liên kết với công trình.
- **Done khi:** Người chơi đặt được ít nhất lều và tường vào thế giới, công trình tồn tại sau khi khởi động lại server.

---

### Giai đoạn 3: Nội dung & thế giới (Tuần 6–8)

#### NV-07: Giao dịch bảo mật (Trade window)
- **Mục tiêu:** Thay thế thả đồ trên đất bằng giao diện giao dịch 2 bên đồng ý.
- **Scope:** 
  - Mở giao diện giao dịch nhắm vào người chơi khác (phím `T` hoặc click phải).
  - Hai bên đặt vật phẩm, nhấn "Xác nhận", hai bên cùng xác nhận → hoán đổi.
  - Ngăn Cheat: không cho giao dịch khi đang trong khoảng tấn công, kiểm tra tồn kho trên server.
- **Files:** `client/src/trade.js`, `server/src/trade.js`, giao thức WebSocket mới `trade_offer`, `trade_accept`.
- **Done khi:** Hai người chơi có thể trao đổi vật phẩm an toàn, không bị mất đồ khi ngắt kết nối giữa chừng.

#### NV-08: Nội dung thế giới (vật phẩm, quái, sự kiện)
- **Scope:** 
  - Vật phẩm: thêm loại hà quý (thường, hiếm, huyền thoại), thêm thuốc tăngStats tạm thời.
  - Quái: Sói Đen (cấp 1–2), Bầy Sói + Gấu Đột Biến (cấp 3–5), quái boss riêng biệt.
  - Sự kiện: Sương Đen xuất hiện bất chợt (giảm tầm nhìn), Boss Hắc Thú Vương ngày 30 (đã có) + boss trung gian ngày 15, 20.
  - Bảng lấy vật phẩm (loot table) theo cấp quái.
- **Files:** `server/src/world.js` (mở rộng spawn), `client/src/monster.js`, `client/src/item.js`.
- **Done khi:** Có ít nhất 3 loại quái khác nhau, 2 sự kiện thế giới, vật phẩm hà quý rơi từ quái.

#### NV-09: Nhiệm vụ & cốt truyện trong game
- **Scope:** 
  - Hệ thống nhiệm vụ đơn giản (NPC/System): "Thu thập 5 mì gói", "Chết không được trong 3 ngày", "Đánh bại boss".
  - Phần thưởng: kinh nghiệm kỹ năng, vật phẩm hiếm.
  - Hiển thị nhiệm vụ trong HUD hologram.
- **Files:** `server/src/quests.js`, `client/src/questUI.js`.
- **Done khi:** Có ít nhất 5 nhiệm vụ, phần thưởng được cấp khi hoàn thành.

---

### Giai đoạn 4: Đa người chơi & vận hành (Tuần 9–12)

#### NV-10: Hệ thống phòng (Rooms) & nhiều máy chủ
- **Scope:** 
  - Tạo phòng (code phòng 4–6 ký tự), tham gia phòng, phòng riêng tư/công khai.
  - Tối đa 16 người/phòng (MVP), phòng mới tạo server process mới hoặc sharding.
  - Danh sách phòng công khai hiển thị trong màn hình chào.
- **Files:** `server/src/rooms.js`, `client/src/roomLobby.js`.
- **Done khi:** Có thể tạo/tham gia phòng, người chơi khác phòng không thấy nhau.

#### NV-11: Bảng xếp hạng & thành tích
- **Scope:** 
  - Lưu thành tích: ngày sống sót cao nhất, boss đã đánh, quái đã hạ.
  - Bảng xếp hạng toàn máy chủ (top 10) hiển thị trong lobby.
  - "Quốc vận": thành tích cá nhân cộng điểm cho máy chủ (gợi ý từ COT-TRUYEN.md).
- **Files:** `server/src/leaderboard.js`, `client/src/leaderboardUI.js`.
- **Done khi:** Có bảng xếp hạng xem được trong lobby/game.

#### NV-12: Âm thanh & hiệu ứng hình ảnh
- **Scope:** 
  - Âm thanh nền (ambient), âm thanh bước chân, đánh trúng, chuông ngày/đêm, tiếng boss.
  - Hậu xử lý Three.js (bloom, vignette) cho phong cách điện khảo đậm hơn.
  - Tối ưu cho di động (joystick, nút bấm, giảm chất lượng particles trên máy yếu).
- **Files:** `client/src/audio.js`, `client/src/postprocess.js`, `client/src/mobile.js`.
- **Done khi:** Có âm thanh, hiệu ứng hình ảnh đẹp hơn, chạy mượt trên trình duyệt di động.

#### NV-13: DevOps & vận hành (CI/CD, deploy, giám sát)
- **Scope:** 
  - GitHub Actions: build & test client + server khi push.
  - Docker Compose production-ready (healthcheck, restart policy, giới hạn tài nguyên).
  - Nginx config (reverse proxy, WSS, SSL Let's Encrypt) đưa vào repo.
  - Log server (winston hoặc pino), endpoint `/health`.
  - Hướng dẫn deploy lên Oracle Cloud VM & Render cập nhật.
- **Files:** `.github/workflows/*.yml`, `nginx.conf`, `docker-compose.prod.yml`, `README.md` cập nhật.
- **Done khi:** `git push` tự động build, deploy lên VM được ghi rõ, server có healthcheck.

#### NV-14: Bản dịch đa ngôn ngữ (Vi/En)
- **Scope:** Tách chuỗi hiển thị ra file ngôn ngữ, mặc định Tiếng Việt, hỗ trợ Tiếng Anh.
- **Files:** `client/src/locales/vi.json`, `client/src/locales/en.js`, `client/src/i18n.js`.
- **Done khi:** Có thể chuyển đổi ngôn ngữ trong cài đặt.

---

## 4. ROADMAP TÓM TẮT

| Giai đoạn | Thời gian | Gói việc | Mục tiêu chính |
|---|---|---|---|
| 1. Nền tảng | Tuần 1–2 | NV-01, NV-02, NV-03 | Server module, CSDL, xác thực, client hiện đại |
| 2. Cốt lõi | Tuần 3–5 | NV-04, NV-05, NV-06 | Kỹ năng, trang bị, xây dựng cơ sở |
| 3. Nội dung | Tuần 6–8 | NV-07, NV-08, NV-09 | Giao dịch, quái/boss/sự kiện, nhiệm vụ |
| 4. Vận hành | Tuần 9–12 | NV-10 → NV-14 | Phòng, xếp hạng, âm thanh, CI/CD, đa ngôn ngữ |

> Ưu tiên làm trước: **NV-01, NV-02, NV-03** (nền tảng). Sau đó tuỳ ý chọn NV-04...NV-06.

---

## 5. RỦI RO & PHƯƠNG ÁN PHỢ

| Rủi ro | Mức độ | Phương án |
|---|---|---|
| Làm nhiều tính năng cùng lúc → mã rối | Cao | Làm theo gói việc, từng gói xong mới sang gói mới, commit thường xuyên. |
| Client Three.js phiên bản mới đổi API | Trung bình | Nâng dần, dùng CDN bản cố định trước khi chuyển bundler. |
| CSDL SQLite bị khóa khi nhiều ghi đồng thời | Thấp | SQLite đủ cho <100 người chơi cùng lúc; sau này chuyển PostgreSQL. |
| Render free tier ngủ sau 15 phút | Trung bình | Khuyên dùng Oracle Cloud VM free tier (đã có hướng dẫn trong README). |

---

## 6. CÁCH MUSE NHẬN VIỆC

1. **Mã nguồn đã lên repo:** https://github.com/sonsmartsoft/TDCS.git (branch `master`). Muse có thể clone/đọc toàn bộ source.
2. **File plan này** (`PLAN-NANG-CAP.md`) sẽ được commit cùng repo để Muse tham khảo.
3. **Giao việc chi tiết:** Tôi sẽ tạo các file `viec-nvXX.txt` và upload vào **Drop Server** của Muse tại `https://muse.vhtatn.io.vn` (hộp `inbox`, header `X-Token`). Theo chuẩn trong `huong-dan-nhan-nv-va-phan-hoi_1.md`.
4. **Kết quả:** Muse báo cáo vào `outbox` (`nvXX-bao-cao.md`, `nvXX.patch`). Tôi sẽ xem xét và phản hồi bằng `phan-hoi-nvXX.txt`.

---

> **Yêu cầu từ anh:** Để tôi có thể gửi việc cho Muse ngay, anh vui lòng cung cấp **X-Token** của Drop Server (`https://muse.vhtatn.io.vn`). Tôi sẽ tạo file `viec-nv01.txt`… và upload vào `inbox` cho Muse bắt đầu làm NV-01 (chia module server) đầu tiên.
