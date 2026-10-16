# PLAN NÂNG CẢ TOÀN DIỆN — TOÀN DÂN CẦU SINH (Phiên bản tập trung đồ họa cực kỳ giống thật)

> Dự án: game sinh tồn 3D multiplayer trên trình duyệt (Three.js + Node.js + ws).  
> Repo: https://github.com/sonsmartsoft/TDCS.git (branch `master`)  
> Bản hiện tại: MVP rev8 (đã commit: `25494c8` + `a94745a`)  
> Ngôn ngữ: Tiếng Việt. Mục tiêu: từ MVP đơn giản → game 3D **cực kỳ giống thật (photorealistic / cinematic)** lấy cảm hứng từ video "Toàn Dân Mạc Lộ Cầu Sinh".  
> Tham khảo video: `video/Toàn Dân Mạc Lộ Cầu Sinh Lần Này Ta Sẽ Đi Đến Cuối Con Đường | Kas Vietsub.mp4` (2h10m, VP9 1080p)  
> Các khung hình trích xuất: `video/extracted-frames/` (13 ảnh đại diện)

---

## 1. PHÂN TÍCH PHÒNG CÁCH TỪ VIDEO (đã xem 13 khung hình)

| Thành phần | Mô tả từ video |
|---|---|
| **Độ chân thực** | Nhân vật da thịt, tóc, áo tay, vết thương, mồ hôi — cực kỳ real, không phải anime/low-poly |
| **Bối cảnh** | Đô thị tận thế ban đêm: xe hơi cũ, đường phố đổ nát, trăng lớn, sương mù, tối tăm |
| **Quái vật** | Thú đột biến khổng lồ, thân giáp rắn/vảy, gai nhọn, mắt phát sáng, hung dữ |
| **Giao diện Hologram** | Màn hình holo trong suốt, viền kim loại, ánh sáng xanh neon; mô hình 3D quái (xương xanh), danh sách người sống sót, chữ Trung (私聊, 梵合小王子) |
| **Hologram trong xe** | Nhìn vào tay → xuất hiện màn hình holo danh sách người sống sót, ánh sáng xanh/vàng |
| **Ánh sáng** | Trăng lớn, đèn neon xanh/xanh dương, bóng bokeh, sương mù, sáng/tối xen kẽ |

---

## 2. MÙC TIÊU NÂNG CẢ (độ ưu tiên theo thứ tự)

| Mục tiêu | Chi tiết |
|---|---|
| **Đồ họa cực kỳ giống thật** | Photorealistic, cinematic, PBR materials, volumetric fog, bloom, HDR, ánh sáng động |
| **Nhân vật & quái real** | Mô hình nhân vật da thịt tóc thật, quái vật chi tiết (giáp rắn, gai, mắt phát sáng) |
| **Giao diện Hologram "Hệ Thống"** | Màn hình holo trong suốt, viền kim loại, ánh sáng neon, hiển thị mô hình 3D, danh sách người sống sót |
| **Nền tảng kỹ thuật** | Chia module server, CSDL, xác thực, client hiện đại (Vite + Three.js r165+) |
| **Gameplay cốt lõi** | Kỹ năng, trang bị, xây dựng cơ sở, giao dịch bảo mật, sự kiện boss |
| **Vận hành** | Phòng, xếp hạng, âm thanh, CI/CD, đa ngôn ngữ |

> **Ưu tiên số 1:** NV-GFX (đồ họa cực kỳ giống thật) — đây là yêu cầu cốt lõi của anh.

---

## 3. CHI TIẾT CÁC GÓI VIỆC

### Giai đoạn 1: Đồ họa cực kỳ giống thật (Ưu tiên cao nhất)

#### NV-GFX: Nâng cấp đồ họa client lên mức cực kỳ giống thật (Photorealistic / Cinematic)
- **Mục tiêu:** Thay đổi client từ game đơn giản (Three.js r128, low-poly, programmer art) lên mức **photorealistic / cinematic** giống video tham khảo.
- **Scope chi tiết:**
  1. **Three.js hiện đại:** Nâng từ r128 lên r165+ (hoặc mới nhất ổn định), dùng bundler (Vite).
  2. **PBR Materials:** Vật liệu vật lý thực tế cho mặt đất (đường nứt, nhựa, bê tông), tường đổ nát, xe hơi, người sống sót (da, tóc, áo).
  3. **Volumetric Fog & Sương mù:** Sương mù dày đặc, thể tích, ánh sáng xuyên qua sương (god rays), độ mờ khoảng cách (fog) thay đổi theo ngày/đêm.
  4. **Bloom & HDR:** Hiệu ứng phát sáng (bloom) cho ánh đèn neon, tia lửa, mắt quái, màn hình hologram.
  5. **Ánh sáng động:** Trăng lớn trên trời (moon light), đèn neon xanh/xanh dương, ánh sáng xe, sấm sét, 효과 nt Léonard.
  6. **Post-processing:** Vignette, bokeh, màu grading u ám (ton màu đen-xám-xanh đêm), contrast cao.
  7. **Mô hình nhân vật real:** Thay mô hình khớp xương đơn giản bằng nhân vật da thịt, tóc, áo tay chi tiết (có thể dùng mô hình đã có hoặc tạo mới).
  8. **Mô hình quái real:** Thú đột biến khổng lồ, thân giáp rắn/vảy, gai nhọn, mắt phát sáng đỏ, aura đỏ xung quanh.
  9. **Giao diện Hologram "Hệ Thống":** Màn hình holo trong suốt, viền kim loại, ánh sáng xanh neon, hiển thị mô hình 3D quái vật (xương xanh như trong video), danh sách người sống sót, bảng điều khiển, chữ Trung/viết theo phong cách video.
  10. **Tối ưu hiệu năng:** LOD (Level of Detail), culling, giảm chất lượng particles trên máy yếu, hỗ trợ di động (joystick, nút bấm).
- **Files:** `client/src/gfx/*`, `client/src/postprocess.js`, `client/src/lighting.js`, `client/src/hologram.js`, `client/src/character.js`, `client/src/monsterReal.js`, `client/package.json`, `vite.config.js`, `client/Dockerfile`.
- **Done khi:** Client render được màn hình giống video: sương mù đêm, trăng lớn, nhân vật real, quái vật chi tiết, giao diện holo Neon, bloom/hdr bật.

---

### Giai đoạn 2: Nền tảng & chất lượng mã

#### NV-01: Chia module server (refactor `server.js`)
- **Mục tiêu:** Tách `server/server.js` thành các module trong `server/src/` (gameState, network, handlers, gameLoop), giữ nguyên giao thức WebSocket.
- **Files:** `server/src/*.js`, `server/server.js`.

#### NV-02: Thêm cơ sở dữ liệu & xác thực đơn giản
- **Mục tiêu:** SQLite (`better-sqlite3`), bảng `users` + `player_data`, đăng ký/đăng nhập, token, lưu tiến độ (túi đồ, kỹ năng, ngày, vị trí). Giữ chế độ khách.
- **Files:** `server/src/db.js`, `server/src/auth.js`, `server/package.json`, `client/game.js` (thêm UI đăng nhập).

#### NV-03: Hiện đại hóa client (Three.js + bundler)
- **Mục tiêu:** Vite bundler, Three.js r165+, tách `game.js` thành module (core, world, input, ui, network).
- **Files:** `client/package.json`, `vite.config.js`, `client/src/*.js`, `client/Dockerfile`.

---

### Giai đoạn 3: Hệ thống chơi cốt lõi

#### NV-04: Hệ thống kỹ năng (Skill)
- Đốn củi, Chiến đấu, Lục soát, Sống tồn; cấp 1–10; kinh nghiệm; mở khóa công thức; lưu vào CSDL.

#### NV-05: Hệ thống trang bị & vũ khí
- Ô trang bị: Vũ khí, Áo, Ngón tay, Giày. Stat sát thương, máu tối đa, độ bền. Hiển thị trên nhân vật.

#### NV-06: Xây dựng cơ sở thực tế
- Đặt lều, tường vào thế giới 3D (click chuột), công trình là mesh riêng, có máu, bị quái phá hủy, lưu vào CSDL.

---

### Giai đoạn 4: Nội dung & thế giới

#### NV-07: Giao dịch bảo mật (Trade window)
- Giao diện giao dịch 2 bên đồng ý, không thả đồ trên đất, kiểm tra tồn kho server-side.

#### NV-08: Nội dung thế giới (vật phẩm, quái, sự kiện)
- Vật phẩm hà quý (thường/hiếm/huyền thoại), 3 loại quái khác nhau, sự kiện Sương Đen, boss ngày 15/20/30.

#### NV-09: Nhiệm vụ & cốt chuyện trong game
- Hệ thống nhiệm vụ đơn giản, phần thưởng kỹ năng/vật phẩm, hiển thị trong HUD hologram.

---

### Giai đoạn 5: Đa người chơi & vận hành

#### NV-10: Hệ thống phòng (Rooms)
- Tạo/tham gia phòng (code 4–6 ký tự), phòng riêng tư/công khai, tối đa 16 người/phòng.

#### NV-11: Bảng xếp hạng & thành tích
- Ngày sống sót cao nhất, boss đã đánh, quái đã hạ, bảng xếp hạng toàn máy chủ, "quốc vận".

#### NV-12: Âm thanh & hiệu ứng hình ảnh
- Âm thanh nền, bước chân, đánh trúng, chuông ngày/đêm, tiếng boss; post-processing bloom/vignette; tối ưu di động.

#### NV-13: DevOps & vận hành (CI/CD, deploy, giám sát)
- GitHub Actions, Docker Compose production-ready, Nginx + WSS + SSL, log, endpoint `/health`, hướng dẫn deploy Oracle VM & Render.

#### NV-14: Bản dịch đa ngôn ngữ (Vi/En)
- Tách chuỗi hiển thị ra file ngôn ngữ, mặc định Tiếng Việt, hỗ trợ Tiếng Anh.

---

## 4. ROADMAP TÓM TẮT

| Giai đoạn | Thời gian | Gói việc | Mục tiêu chính |
|---|---|---|---|
| 1. Đồ họa cực kỳ giống thật | Tuần 1–2 | **NV-GFX** | Photorealistic, cinematic, PBR, fog, bloom, holo UI |
| 2. Nền tảng | Tuần 3–4 | NV-01, NV-02, NV-03 | Module server, CSDL, xác thực, client hiện đại |
| 3. Cốt lõi gameplay | Tuần 5–7 | NV-04, NV-05, NV-06 | Kỹ năng, trang bị, xây dựng cơ sở |
| 4. Nội dung thế giới | Tuần 8–10 | NV-07, NV-08, NV-09 | Giao dịch, quái/boss/sự kiện, nhiệm vụ |
| 5. Vận hành | Tuần 11–14 | NV-10 → NV-14 | Phòng, xếp hạng, âm thanh, CI/CD, đa ngôn ngữ |

---

## 5. RỦI RO & PHƯƠNG ÁN PHỢ

| Rủi ro | Mức độ | Phương án |
|---|---|---|
| Three.js r165+ đổi API so với r128 | Trung bình | Nâng dần, dùng CDN bản cố định trước khi chuyển bundler. |
| Hiệu năng đồ họa real trên trình duyệt | Cao | LOD, culling, giảm particles trên máy yếu, tùy chọn chất lượng. |
| CSDL SQLite khóa khi nhiều ghi | Thấp | Đủ cho <100 người chơi cùng lúc; sau này chuyển PostgreSQL. |
| Render free tier ngủ sau 15 phút | Trung bình | Khuyên dùng Oracle Cloud VM free tier (đã có trong README). |

---

## 6. CÁCH MUSE NHẬN VIỆC

1. **Mã nguồn đã lên repo:** https://github.com/sonsmartsoft/TDCS.git (nhánh `master`). Muse có thể clone/đọc toàn bộ source.
2. **File plan này** (`PLAN-NANG-CAP.md`) nằm trong repo để Muse tham khảo.
3. **Giao việc chi tiết:** Tôi tạo các file `viec-nvXX.txt` và upload vào **Drop Server** của Muse tại `https://muse.vhtatn.io.vn` (hộp `inbox`, header `X-Token`). Chuẩn theo `huong-dan-nhan-nv-va-phan-hoi_1.md`.
4. **Kết quả:** Muse báo cáo vào `outbox` (`nvXX-bao-cao.md`, `nvXX.patch`). Tôi xem xét và phản hồi bằng `phan-hoi-nvXX.txt`.

---

> **Yêu cầu:** Anh vui lòng cung cấp **X-Token** của Drop Server (`https://muse.vhtatn.io.vn`). Tôi sẽ upload `viec-nv-gfx.txt` (gói ưu tiên cao nhất — đồ họa cực kỳ giống thật) vào `inbox` cho Muse bắt đầu làm đầu tiên.
