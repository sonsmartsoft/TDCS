# AGENTS.md — Quy ước làm việc chung (Lisa + opencode)

Repo game **Toàn Dân Cầu Sinh** (TDCS) — game sinh tồn 3D multiplayer (Three.js + Node.js WebSocket).

## Cách chạy

```bash
docker compose up -d --build   # client: http://localhost:8080, server: ws://localhost:3001
```

Chạy server riêng: `cd server && npm install && npm start` (port 3001).

## Quy ước branch

- `main`: luôn chạy được. Không push thẳng lên `main`.
- Branch tính năng: `lisa/<ten-ngan>` hoặc `opencode/<ten-ngan>`.
- Xong việc → merge vào `main` (fast-forward nếu được).

## Quy ước commit

- Tiếng Việt, ngắn gọn, bắt đầu bằng động từ: `Thêm ...`, `Sửa ...`, `Nâng cấp ...`
- Ví dụ: `Thêm click-to-move`, `Sửa lỗi quái không đuổi theo`

## Quy ước code

- Client (`client/`): hiện tại 1 file `game.js` chính (1339 dòng, rev10),
  chạy ổn định với Three.js r128 (không dùng module import).
  - NGOẠI LỆ: gói NV-GFX trong `PLAN-NANG-CAP.md` được phép nâng client lên
    Three.js r165+ và tách thành module dùng bundler Vite — đây là yêu cầu
    cốt lõi đã được anh Sơn phê duyệt. Khi NV-GFX hoàn thành, cập nhật lại
    dòng này theo trạng thái mới.
- Branch làm việc của opencode cho các gói NV-*: `master` (code nâng cấp
  commit thẳng lên `master`; khi ổn định mới merge sang `main` để tag rev).
- Server (`server/`): 1 file `server.js`. Giao thức WebSocket đã định nghĩa trong `THIET-KE-GAME.md` — đổi protocol thì cập nhật cả 2 phía.
- Không commit: `node_modules/`, `video/*.mp4`, file log, `.env`.
- Model 3D thật nằm ở `client/models/` (hiện có `Soldier.glb` cho nhân vật).

## Hệ rev (cho anh Sơn)

Mỗi bản giao cho anh Sơn được đánh số rev tăng dần (`rev10`, `rev11`...).
Khi merge tính năng lớn vào `main`, tag thêm: `git tag rev11 && git push --tags`.

## Cấu trúc thư mục

```
client/          # game 3D chạy trên trình duyệt (Three.js)
  index.html | style.css | game.js | models/
server/          # server multiplayer (Node.js + ws)
docker-compose.yml
COT-TRUYEN.md | THIET-KE-GAME.md | README.md
video/frames/    # tư liệu hình ảnh từ video gốc
```

## Lưu ý

- Anh Sơn muốn mọi thứ đơn giản, nhẹ, có link khi cần tải/cài.
- Đừng hứa hẹn đồ họa AAA hay MMO hàng trăm người — đây là game web phòng 4–16 người.
- Khi làm xong việc khó, cập nhật `README.md` nếu cách chạy/cách chơi thay đổi.
