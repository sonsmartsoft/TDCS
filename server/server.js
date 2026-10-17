/**
 * TOÀN DÂN CẦU SINH — Server multiplayer
 * Node.js + WebSocket (ws). Chạy: npm install && npm start
 * Mặc định port 3001 (hoặc process.env.PORT cho Render).
 */
const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3001;
const TICK = 50;                 // game loop 20 tick/s
const DAY_LENGTH = 180;          // 1 ngày = 180 giây (2p ngày + 1p đêm)
const NIGHT_START = DAY_LENGTH * (2 / 3);
const MAX_PLAYERS = 16;
const WORLD = 120;               // thế giới 120x120

// ---------- Trạng thái game ----------
let players = new Map();   // id -> player
let monsters = new Map();  // id -> monster
let crates = [];           // thùng vật phẩm
let drops = [];            // đồ người chơi đánh rơi
let day = 1, dayTime = 0;
let seq = 1, bossSpawned = false;

const nextId = () => 'e' + (seq++);
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const isNight = () => dayTime >= NIGHT_START;

const ITEM_NAMES = {
  thuoc: 'Thuốc hạ sốt', mi: 'Mì gói', dohop: 'Đồ hộp',
  phelieu: 'Phế liệu', go: 'Ván gỗ', gach: 'Gạch vụn', vai: 'Vải'
};

// ---------- Trang bị theo độ hiếm ----------
const EQUIPMENT = {
  kiem_sat:  { name: 'Kiếm Sắt',        icon: '🗡️', type: 'weapon', rarity: 'hiem',       dmg: 20 },
  cung_go:   { name: 'Cung Gỗ',         icon: '🏹', type: 'weapon', rarity: 'hiem',       dmg: 18 },
  kiem_thep: { name: 'Kiếm Thép',        icon: '⚔️', type: 'weapon', rarity: 'suthi',      dmg: 35 },
  bua_chien: { name: 'Búa Hắc Ám',      icon: '🔨', type: 'weapon', rarity: 'huyenthoai', dmg: 55 },
  giap_da:   { name: 'Giáp Da Cứng',    icon: '🦺', type: 'armor',  rarity: 'hiem',       maxHp: 30 },
  giap_sat:  { name: 'Giáp Sắt',        icon: '🛡️', type: 'armor',  rarity: 'suthi',      maxHp: 60, dmgRed: 0.10 },
  giap_vang: { name: 'Giáp Hoàng Kim',  icon: '👑', type: 'armor',  rarity: 'huyenthoai', maxHp: 100, dmgRed: 0.20 },
};
const RARITY_NAME = { hiem: 'HIẾM', suthi: 'SỬ THI', huyenthoai: 'HUYỀN THOẠI' };
function rollEquipment() {
  const r = Math.random();
  const rarity = r < 0.18 ? 'huyenthoai' : r < 0.50 ? 'suthi' : 'hiem';
  const pool = Object.keys(EQUIPMENT).filter(id => EQUIPMENT[id].rarity === rarity);
  const id = pool[Math.floor(Math.random() * pool.length)];
  return { uid: nextId(), id };
}
function gearStats(p) {
  let dmg = 0, maxHp = 100, dmgRed = 0;
  for (const t in p.equipped) {
    const g = p.equipped[t];
    if (!g) continue;
    const e = EQUIPMENT[g.id];
    if (e.dmg) dmg += e.dmg;
    if (e.maxHp) maxHp += e.maxHp;
    if (e.dmgRed) dmgRed = Math.max(dmgRed, e.dmgRed);
  }
  return { dmg, maxHp, dmgRed };
}

// ---------- Vật phẩm / thùng loot ----------
function spawnCrate() {
  const lootTable = ['thuoc', 'mi', 'dohop', 'phelieu', 'phelieu', 'go', 'gach', 'mi'];
  const items = {};
  const n = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const it = lootTable[Math.floor(Math.random() * lootTable.length)];
    items[it] = (items[it] || 0) + 1;
  }
  crates.push({ id: nextId(), x: rand(-WORLD/2, WORLD/2), z: rand(-WORLD/2, WORLD/2), items });
}
for (let i = 0; i < 25; i++) spawnCrate();

// ---------- Rương trang bị (mỗi ngày rơi thêm, tối đa 5) ----------
function spawnEquipCrate() {
  if (crates.filter(c => c.kind === 'equip').length >= 5) return;
  crates.push({ id: nextId(), kind: 'equip', x: rand(-WORLD/2, WORLD/2), z: rand(-WORLD/2, WORLD/2) });
}
for (let i = 0; i < 3; i++) spawnEquipCrate();

// ---------- Quái ----------
function spawnMonster(boss = false) {
  const a = Math.random() * Math.PI * 2;
  const r = WORLD / 2 - 5;
  const m = {
    id: nextId(), boss,
    x: Math.cos(a) * r, z: Math.sin(a) * r,
    hp: boss ? 1500 : 40 + day * 6,
    maxHp: boss ? 1500 : 40 + day * 6,
    speed: boss ? 3.2 : 2.2 + day * 0.06,
    dmg: boss ? 35 : 6 + day,
    atkCd: 0
  };
  monsters.set(m.id, m);
  return m;
}

// ---------- Gửi tin ----------
function send(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}
function broadcast(obj, exceptId) {
  const s = JSON.stringify(obj);
  for (const [id, p] of players) {
    if (id !== exceptId && p.ws.readyState === WebSocket.OPEN) p.ws.send(s);
  }
}

// ---------- HTTP + WebSocket ----------
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Toàn Dân Cầu Sinh — server đang chạy. Người chơi: ' + players.size);
});
const wss = new WebSocket.Server({ server: httpServer });

wss.on('connection', (ws) => {
  let pid = null;

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }

    // --- Vào game ---
    if (m.t === 'join') {
      if (players.size >= MAX_PLAYERS) return send(ws, { t: 'sys', msg: 'Phòng đã đầy (16 người)!' });
      pid = nextId();
      const p = {
        id: pid, ws,
        name: String(m.name || 'Người sống sót').slice(0, 16),
        x: rand(-10, 10), z: rand(-10, 10), ry: 0, anim: 'idle',
        hp: 100, maxHp: 100, doi: 100, theluc: 100,
        inv: { mi: 2 }, gear: [], equipped: {}, dead: false, lastHit: 0
      };
      players.set(pid, p);
      send(ws, {
        t: 'welcome', id: pid, day, dayTime,
        players: [...players.values()].map(pub),
        monsters: [...monsters.values()],
        crates, drops, gear: p.gear, equipped: p.equipped
      });
      broadcast({ t: 'join', p: pub(p) }, pid);
      broadcast({ t: 'sys', msg: p.name + ' đã vào game.' }, pid);
      return;
    }
    if (!pid || !players.has(pid)) return;
    const p = players.get(pid);

    // --- Di chuyển ---
    if (m.t === 'move') {
      p.x = Math.max(-WORLD/2, Math.min(WORLD/2, +m.x || 0));
      p.z = Math.max(-WORLD/2, Math.min(WORLD/2, +m.z || 0));
      p.ry = +m.ry || 0;
      p.anim = m.anim === 'walk' ? 'walk' : (m.anim === 'atk' ? 'atk' : 'idle');
      return;
    }
    // --- Chat ---
    if (m.t === 'chat') {
      const msg = String(m.msg || '').slice(0, 120);
      if (msg) broadcast({ t: 'chat', from: p.name, msg });
      return;
    }
    // --- Loot thùng ---
    if (m.t === 'loot') {
      const i = crates.findIndex(c => c.id === m.crateId);
      if (i >= 0 && dist(p, crates[i]) < 4) {
        const c = crates.splice(i, 1)[0];
        if (c.kind === 'equip') {
          // Rương trang bị: rơi 1 món theo độ hiếm
          const g = rollEquipment();
          p.gear.push(g);
          const e = EQUIPMENT[g.id];
          const st = gearStats(p);
          p.maxHp = st.maxHp;
          send(ws, { t: 'gear', gear: p.gear, equipped: p.equipped, maxHp: p.maxHp });
          send(ws, { t: 'lootEquip', uid: g.uid, id: g.id });
          send(ws, { t: 'sys', msg: 'Mở rương trang bị: nhận ' + e.name + ' [' + RARITY_NAME[e.rarity] + ']' });
        } else {
          for (const k in c.items) p.inv[k] = (p.inv[k] || 0) + c.items[k];
          send(ws, { t: 'inv', inv: p.inv });
          send(ws, { t: 'sys', msg: 'Nhặt được: ' + Object.entries(c.items).map(([k, v]) => (ITEM_NAMES[k] || k) + ' x' + v).join(', ') });
        }
        broadcast({ t: 'crates', crates });
        setTimeout(() => { spawnCrate(); broadcast({ t: 'crates', crates }); }, 45000);
      }
      return;
    }
    // --- Mặc trang bị ---
    if (m.t === 'equip') {
      const gi = p.gear.findIndex(g => g.uid === m.uid);
      if (gi >= 0) {
        const g = p.gear.splice(gi, 1)[0];
        const e = EQUIPMENT[g.id];
        const old = p.equipped[e.type];
        if (old) p.gear.push(old); // tháo cái cũ trả về túi
        p.equipped[e.type] = g;
        const st = gearStats(p);
        p.maxHp = st.maxHp;
        if (p.hp > p.maxHp) p.hp = p.maxHp;
        send(ws, { t: 'gear', gear: p.gear, equipped: p.equipped, maxHp: p.maxHp });
        send(ws, { t: 'hp', hp: p.hp });
        send(ws, { t: 'sys', msg: 'Đã mặc ' + e.name + ' [' + RARITY_NAME[e.rarity] + ']' });
      }
      return;
    }
    // --- Tháo trang bị ---
    if (m.t === 'unequip') {
      const old = p.equipped[m.etype];
      if (old) {
        delete p.equipped[m.etype];
        p.gear.push(old);
        const st = gearStats(p);
        p.maxHp = st.maxHp;
        if (p.hp > p.maxHp) p.hp = p.maxHp;
        send(ws, { t: 'gear', gear: p.gear, equipped: p.equipped, maxHp: p.maxHp });
        send(ws, { t: 'hp', hp: p.hp });
      }
      return;
    }
    // --- Đánh quái ---
    if (m.t === 'hit') {
      const mo = monsters.get(m.monsterId);
      if (mo && dist(p, mo) < 4.5) {
        mo.hp -= Math.max(1, +m.dmg || 5);
        if (mo.hp <= 0) {
          monsters.delete(mo.id);
          // Rơi đồ
          const dropItems = mo.boss ? { thuoc: 3, mi: 3, phelieu: 5 } : { phelieu: 1 + (Math.random() < 0.4 ? 1 : 0) };
          drops.push({ id: nextId(), x: mo.x, z: mo.z, items: dropItems });
          broadcast({ t: 'sys', msg: mo.boss ? 'HẮC THÚ VƯƠNG ĐÃ BỊ TIÊU DIỆT! CẢ PHÒNG THẮNG!' : p.name + ' đã hạ một Hắc Thú.' });
          if (mo.boss) broadcast({ t: 'win' });
        }
        broadcast({ t: 'monsters', monsters: [...monsters.values()] });
      }
      return;
    }
    // --- Nhặt đồ rơi ---
    if (m.t === 'pickup') {
      const i = drops.findIndex(d => d.id === m.dropId);
      if (i >= 0 && dist(p, drops[i]) < 4) {
        const d = drops.splice(i, 1)[0];
        for (const k in d.items) p.inv[k] = (p.inv[k] || 0) + d.items[k];
        send(ws, { t: 'inv', inv: p.inv });
        broadcast({ t: 'drops', drops });
      }
      return;
    }
    // --- Đánh rơi đồ (để giao dịch) ---
    if (m.t === 'drop') {
      const item = m.item, qty = Math.min(+m.qty || 1, p.inv[item] || 0);
      if (qty > 0) {
        p.inv[item] -= qty;
        if (p.inv[item] <= 0) delete p.inv[item];
        drops.push({ id: nextId(), x: p.x + rand(-1, 1), z: p.z + rand(-1, 1), items: { [item]: qty } });
        send(ws, { t: 'inv', inv: p.inv });
        broadcast({ t: 'drops', drops });
      }
      return;
    }
    // --- Dùng vật phẩm ---
    if (m.t === 'use') {
      if (m.item === 'thuoc' && (p.inv.thuoc || 0) > 0 && p.hp < p.maxHp) {
        p.inv.thuoc--; if (!p.inv.thuoc) delete p.inv.thuoc;
        p.hp = Math.min(p.maxHp, p.hp + 40);
        send(ws, { t: 'inv', inv: p.inv }); send(ws, { t: 'hp', hp: p.hp });
      }
      if ((m.item === 'mi' || m.item === 'dohop') && (p.inv[m.item] || 0) > 0 && p.doi < 100) {
        p.inv[m.item]--; if (!p.inv[m.item]) delete p.inv[m.item];
        p.doi = Math.min(100, p.doi + (m.item === 'mi' ? 35 : 50));
        send(ws, { t: 'inv', inv: p.inv }); send(ws, { t: 'doi', doi: p.doi });
      }
      return;
    }
    // --- Chế tạo ---
    if (m.t === 'craft') {
      const RECIPES = {
        gay:   { need: { phelieu: 3 }, give: {}, msg: 'Đã chế tạo Gậy Sắt (sát thương 15)' },
        dao:   { need: { phelieu: 2, go: 1 }, give: {}, msg: 'Đã chế tạo Dao Phế Liệu (sát thương 25)' },
        leu:   { need: { go: 4 }, give: {}, msg: 'Đã dựng Lều Bạt (hồi máu khi đứng gần)' },
        tuong: { need: { go: 4, gach: 2 }, give: {}, msg: 'Đã dựng Tường Chắn' }
      };
      const r = RECIPES[m.item];
      if (r && Object.entries(r.need).every(([k, v]) => (p.inv[k] || 0) >= v)) {
        for (const k in r.need) { p.inv[k] -= r.need[k]; if (!p.inv[k]) delete p.inv[k]; }
        p['has_' + m.item] = true;
        send(ws, { t: 'inv', inv: p.inv });
        send(ws, { t: 'craftOk', item: m.item, msg: r.msg });
      } else send(ws, { t: 'sys', msg: 'Không đủ nguyên liệu!' });
      return;
    }
    // --- Hồi sinh ---
    if (m.t === 'respawn' && p.dead) {
      p.dead = false; p.hp = 60; p.doi = 60;
      p.x = rand(-10, 10); p.z = rand(-10, 10);
      send(ws, { t: 'hp', hp: p.hp }); send(ws, { t: 'respawnOk', x: p.x, z: p.z });
      broadcast({ t: 'sys', msg: p.name + ' đã hồi sinh.' }, pid);
    }
  });

  ws.on('close', () => {
    if (pid && players.has(pid)) {
      const p = players.get(pid);
      players.delete(pid);
      broadcast({ t: 'left', id: pid });
      broadcast({ t: 'sys', msg: p.name + ' đã rời game.' });
    }
  });
});

function pub(p) {
  return { id: p.id, name: p.name, x: p.x, z: p.z, ry: p.ry, anim: p.anim, hp: p.hp, dead: p.dead };
}

// ---------- Vòng lặp game ----------
let last = Date.now();
setInterval(() => {
  const now = Date.now(), dt = (now - last) / 1000; last = now;

  // Ngày/đêm
  dayTime += dt;
  if (dayTime >= DAY_LENGTH) {
    dayTime = 0; day++;
    bossSpawned = false;
    broadcast({ t: 'sys', msg: '—— Ngày ' + day + ' ——' });
    // Mỗi ngày rơi thêm rương trang bị
    spawnEquipCrate();
    broadcast({ t: 'crates', crates });
    broadcast({ t: 'sys', msg: '◆ RƯƠNG TRANG BỊ đã xuất hiện đâu đó trong thành phố!' });
  }
  const night = isNight();

  // Spawn quái ban đêm
  if (night && monsters.size < Math.min(4 + day, 14) && Math.random() < dt * 0.5) spawnMonster();
  // Boss ngày 30
  if (day >= 30 && night && !bossSpawned) {
    bossSpawned = true;
    const b = spawnMonster(true);
    broadcast({ t: 'sys', msg: 'CẢNH BÁO: HẮC THÚ VƯƠNG đã xuất hiện!' });
    broadcast({ t: 'monsters', monsters: [...monsters.values()] });
  }
  // Ngày sáng: quái yếu dần biến mất
  if (!night && monsters.size > 0 && Math.random() < dt * 0.1) {
    const k = [...monsters.keys()][0];
    if (!monsters.get(k).boss) monsters.delete(k);
  }

  // AI quái: đuổi theo người gần nhất
  for (const mo of monsters.values()) {
    mo.atkCd -= dt;
    let best = null, bd = 1e9;
    for (const p of players.values()) {
      if (p.dead) continue;
      const d = dist(mo, p);
      if (d < bd) { bd = d; best = p; }
    }
    if (best && bd < 30) {
      const dx = best.x - mo.x, dz = best.z - mo.z, d = Math.hypot(dx, dz) || 1;
      if (bd > 1.6) { mo.x += dx / d * mo.speed * dt; mo.z += dz / d * mo.speed * dt; }
      else if (mo.atkCd <= 0) {
        mo.atkCd = 1.2;
        const red = gearStats(best).dmgRed;
        best.hp -= mo.dmg * (1 - red);
        send(best.ws, { t: 'hp', hp: Math.max(0, best.hp) });
        if (best.hp <= 0 && !best.dead) {
          best.dead = true;
          send(best.ws, { t: 'dead' });
          broadcast({ t: 'playerDead', id: best.id });
          broadcast({ t: 'sys', msg: best.name + ' đã gục ngã...' });
        }
      }
    }
  }

  // Đói giảm dần
  for (const p of players.values()) {
    if (p.dead) continue;
    p.doi = Math.max(0, p.doi - dt * 0.55);
    if (p.doi <= 0) { p.hp -= dt * 2; send(p.ws, { t: 'hp', hp: Math.max(0, p.hp) }); }
  }

  // Broadcast vị trí người chơi (10Hz)
  if (!this._c) this._c = 0;
  if (++this._c % 5 === 0) {
    broadcast({ t: 'players', list: [...players.values()].map(pub) });
    broadcast({ t: 'day', day, dayTime, night });
  }
  // Broadcast quái (5Hz)
  if (this._c % 10 === 0 && monsters.size) {
    broadcast({ t: 'monsters', monsters: [...monsters.values()] });
  }
}, TICK);

httpServer.listen(PORT, () => console.log('Toàn Dân Cầu Sinh server chạy tại port ' + PORT));
