/* ============================================================
   TOÀN DÂN CẦU SINH — Client 3D (Three.js) — BẢN ĐIỆN ẢNH rev5
   ============================================================ */

// ---------- 1. CẤU HÌNH ----------
const CFG = {
  world: 120,
  dayLength: 180,
  playerSpeed: 6,
  sprintMul: 1.6,
  attackRange: 4.2,
};
const ITEM_ICON = { thuoc: '💊', mi: '🍜', dohop: '🥫', phelieu: '⚙️', go: '🪵', gach: '🧱', vai: '🧵' };
const ITEM_NAME = { thuoc: 'Thuốc hạ sốt', mi: 'Mì gói', dohop: 'Đồ hộp', phelieu: 'Phế liệu', go: 'Ván gỗ', gach: 'Gạch vụn', vai: 'Vải' };
const WEAPONS = {
  tay: { name: 'Tay không', dmg: 5, icon: '👊' },
  gay: { name: 'Gậy Sắt', dmg: 15, icon: '🏏' },
  dao: { name: 'Dao Phế Liệu', dmg: 25, icon: '🔪' },
};
const RECIPES = [
  { id: 'gay', name: 'Gậy Sắt', desc: 'Sát thương 15', need: { phelieu: 3 } },
  { id: 'dao', name: 'Dao Phế Liệu', desc: 'Sát thương 25', need: { phelieu: 2, go: 1 } },
  { id: 'leu', name: 'Lều Bạt', desc: 'Hồi máu khi đứng gần', need: { go: 4 } },
  { id: 'tuong', name: 'Tường Chắn', desc: 'Chặn quái một lúc', need: { go: 4, gach: 2 } },
];
// ---------- TRANG BỊ (mirror server) ----------
const EQUIPMENT = {
  kiem_sat:  { name: 'Kiếm Sắt',       icon: '🗡️', type: 'weapon', rarity: 'hiem',       dmg: 20, desc: '+20 sát thương' },
  cung_go:   { name: 'Cung Gỗ',        icon: '🏹', type: 'weapon', rarity: 'hiem',       dmg: 18, desc: '+18 sát thương' },
  kiem_thep: { name: 'Kiếm Thép',       icon: '⚔️', type: 'weapon', rarity: 'suthi',      dmg: 35, desc: '+35 sát thương' },
  bua_chien: { name: 'Búa Hắc Ám',     icon: '🔨', type: 'weapon', rarity: 'huyenthoai', dmg: 55, desc: '+55 sát thương' },
  giap_da:   { name: 'Giáp Da Cứng',   icon: '🦺', type: 'armor',  rarity: 'hiem',       maxHp: 30, desc: '+30 máu tối đa' },
  giap_sat:  { name: 'Giáp Sắt',       icon: '🛡️', type: 'armor',  rarity: 'suthi',      maxHp: 60, dmgRed: 0.10, desc: '+60 máu tối đa, -10% sát thương nhận' },
  giap_vang: { name: 'Giáp Hoàng Kim', icon: '👑', type: 'armor',  rarity: 'huyenthoai', maxHp: 100, dmgRed: 0.20, desc: '+100 máu tối đa, -20% sát thương nhận' },
};
const RARITY_NAME = { hiem: 'HIẾM', suthi: 'SỬ THI', huyenthoai: 'HUYỀN THOẠI' };
const RARITY_COLOR = { hiem: '#4fc3f7', suthi: '#ce93d8', huyenthoai: '#ffd54f' };
const ETYPE_NAME = { weapon: 'Vũ khí', armor: 'Giáp' };
function myDmgBonus() {
  let b = 0;
  for (const t in G.equipped) { const g = G.equipped[t]; if (g && EQUIPMENT[g.id].dmg) b += EQUIPMENT[g.id].dmg; }
  return b;
}

// ---------- 2. TRẠNG THÁI ----------
const G = {
  name: 'Người sống sót', myId: null, online: false,
  hp: 100, maxHp: 100, doi: 100, theluc: 100,
  inv: { mi: 2 }, weapon: 'tay', crafted: {},
  gear: [], equipped: {},
  day: 1, dayTime: 0, night: false,
  players: new Map(), monsters: new Map(), crates: [], drops: [],
  dead: false, chatting: false,
  pos: { x: 0, z: 8 }, ry: 0, camYaw: 0, camPitch: 0.35,
  keys: {}, attackCd: 0, shake: 0,
};
let ws = null;

// ---------- 3. KẾT NỐI ----------
function connect(url, onReady) {
  if (!url) { G.online = false; initOffline(); onReady(); return; }
  try {
    ws = new WebSocket(url);
    ws.onopen = () => { G.online = true; ws.send(JSON.stringify({ t: 'join', name: G.name })); };
    ws.onmessage = (e) => handleMsg(JSON.parse(e.data));
    ws.onclose = () => { if (G.myId) { sysMsg('Mất kết nối server — chuyển sang chơi đơn.'); G.online = false; initOffline(); } };
    ws.onerror = () => { try { ws.close(); } catch {} };
    let started = false;
    const go = () => { if (!started) { started = true; onReady(); } };
    setTimeout(() => { if (!G.myId && ws && ws.readyState !== 1) { try { ws.close(); } catch {}; G.online = false; initOffline(); go(); } }, 5000);
    const readyCheck = setInterval(() => { if (G.myId) { clearInterval(readyCheck); go(); } }, 200);
  } catch { G.online = false; initOffline(); onReady(); }
}
function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }

function handleMsg(m) {
  switch (m.t) {
    case 'welcome':
      G.myId = m.id; G.day = m.day; G.dayTime = m.dayTime;
      m.players.forEach(p => upsertPlayer(p));
      m.monsters.forEach(mo => upsertMonster(mo));
      G.crates = m.crates; G.drops = m.drops;
      G.gear = m.gear || []; G.equipped = m.equipped || {};
      rebuildCrates(); rebuildDrops(); renderGear();
      break;
    case 'join': upsertPlayer(m.p); break;
    case 'left': removePlayer(m.id); break;
    case 'players': m.list.forEach(p => upsertPlayer(p)); break;
    case 'monsters': m.monsters.forEach(mo => upsertMonster(mo)); syncMonsterMeshes(m.monsters.map(x => x.id)); break;
    case 'day': G.day = m.day; G.dayTime = m.dayTime; G.night = m.night; break;
    case 'chat': chatMsg(m.from, m.msg); break;
    case 'sys': sysMsg(m.msg); break;
    case 'inv': G.inv = m.inv; renderInv(); renderHotbar(); break;
    case 'gear':
      G.gear = m.gear || []; G.equipped = m.equipped || {};
      if (m.maxHp) { G.maxHp = m.maxHp; if (G.hp > G.maxHp) G.hp = G.maxHp; }
      renderGear(); renderInv(); renderHotbar();
      break;
    case 'lootEquip': {
      const e = EQUIPMENT[m.id];
      if (e) showLootPopup(e);
      break;
    }
    case 'hp': if (m.hp < G.hp) damageFlash(); G.hp = m.hp; break;
    case 'doi': G.doi = m.doi; break;
    case 'crates': G.crates = m.crates; rebuildCrates(); break;
    case 'drops': G.drops = m.drops; rebuildDrops(); break;
    case 'dead': onDeath(); break;
    case 'playerDead': markDead(m.id); break;
    case 'respawnOk': G.dead = false; G.pos.x = m.x; G.pos.z = m.z; hideEnd(); break;
    case 'craftOk': G.crafted[m.item] = true; if (WEAPONS[m.item]) G.weapon = m.item; sysMsg(m.msg); renderHotbar(); break;
    case 'win': showEnd('CHIẾN THẮNG!', 'Cả phòng đã tiêu diệt Hắc Thú Vương. Bạn đã đi đến cuối con đường!'); break;
  }
}

// ---------- 4. CHẾ ĐỘ OFFLINE ----------
let offMonsters = [];
function initOffline() {
  sysMsg('Chế độ chơi đơn — quái do máy điều khiển.');
  if (!G.crates.length) for (let i = 0; i < 25; i++) G.crates.push({
    id: 'c' + i, x: (Math.random() - .5) * 100, z: (Math.random() - .5) * 100,
    items: { [['mi', 'dohop', 'thuoc', 'phelieu'][Math.floor(Math.random() * 4)]]: 1 + Math.floor(Math.random() * 2) }
  });
  // 3 rương trang bị lúc đầu
  if (!G.crates.some(c => c.kind === 'equip')) for (let i = 0; i < 3; i++)
    G.crates.push({ id: 'ec' + i, kind: 'equip', x: (Math.random() - .5) * 80, z: (Math.random() - .5) * 80 });
  rebuildCrates();
  // 2 con quái yếu ngay từ đầu để luyện đánh
  if (!offMonsters.length) for (let i = 0; i < 2; i++)
    offMonsters.push({ id: 'prac' + i, x: 5 + i * 5, z: -8, hp: 30, maxHp: 30, speed: 1.7, dmg: 4, atkCd: 0 });
}
function offlineTick(dt) {
  if (G.online) return;
  G.dayTime += dt;
  if (G.dayTime >= CFG.dayLength) { G.dayTime = 0; G.day++; sysMsg('—— Ngày ' + G.day + ' ——'); }
  G.night = G.dayTime >= CFG.dayLength * 2 / 3;
  if (G.night && offMonsters.length < Math.min(3 + G.day, 10) && Math.random() < dt * 0.4) {
    const a = Math.random() * Math.PI * 2, r = 50;
    offMonsters.push({ id: 'm' + Date.now() + Math.random(), x: Math.cos(a) * r, z: Math.sin(a) * r, hp: 40 + G.day * 6, maxHp: 40 + G.day * 6, speed: 2.4, dmg: 6 + G.day, atkCd: 0 });
  }
  // boss ngày 30
  if (G.day >= 30 && G.night && !offMonsters.some(m => m.boss)) {
    offMonsters.push({ id: 'boss' + Date.now(), boss: true, x: 40, z: 0, hp: 1500, maxHp: 1500, speed: 3.2, dmg: 35, atkCd: 0 });
    sysMsg('CẢNH BÁO: HẮC THÚ VƯƠNG đã xuất hiện!');
  }
  for (const mo of offMonsters) {
    mo.atkCd -= dt;
    const dx = G.pos.x - mo.x, dz = G.pos.z - mo.z, d = Math.hypot(dx, dz);
    if (d < 25 && d > 1.6 && !G.dead) { mo.x += dx / d * mo.speed * dt; mo.z += dz / d * mo.speed * dt; }
    else if (d <= 1.6 && mo.atkCd <= 0 && !G.dead) { mo.atkCd = 1.2; hurtPlayer(mo.dmg); }
  }
  if (!G.dead) { G.doi = Math.max(0, G.doi - dt * 0.55); if (G.doi <= 0) hurtPlayer(dt * 2); }
  offMonsters.forEach(mo => upsertMonster(mo));
  syncMonsterMeshes(offMonsters.map(m => m.id));
  G.monsters.clear();
  offMonsters.forEach(mo => G.monsters.set(mo.id, mo));
}
function hurtPlayer(dmg) {
  if (G.dead) return;
  G.hp -= dmg; damageFlash(); G.shake = Math.min(0.5, G.shake + 0.18);
  if (G.hp <= 0) { G.hp = 0; onDeath(); }
}
function damageFlash() {
  const f = document.getElementById('dmg-flash');
  if (f) { f.style.opacity = '0.55'; }
}

// ---------- 5. DỰNG THẾ GIỚI 3D (BẢN ĐIỆN ẢNH) ----------
let scene, camera, renderer, sunLight, moonLight, hemi, skyDome, lightningLight;
let playerMesh;
let crateMeshes = new Map(), dropMeshes = new Map(), otherMeshes = new Map(), monsterMeshes = new Map();
let fires = [], ashPts = null, ashVel = [];
let lightningT = 0, boltTimer = 6;
const particles = [];

// texture vệt sáng tròn (dùng cho lửa, glow, tia lửa)
function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
let TEX_GLOW, TEX_FIRE;

function initThree() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07070d, 0.028);
  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 600);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game-container').appendChild(renderer.domElement);

  TEX_GLOW = glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  TEX_FIRE = glowTexture('rgba(255,200,80,1)', 'rgba(255,60,0,0)');

  // --- Bầu trời bão: mây xoáy ---
  const sCanvas = document.createElement('canvas'); sCanvas.width = 1024; sCanvas.height = 512;
  const sx = sCanvas.getContext('2d');
  const skyGrad = sx.createLinearGradient(0, 0, 0, 512);
  skyGrad.addColorStop(0, '#020208'); skyGrad.addColorStop(0.55, '#0b0e1c'); skyGrad.addColorStop(1, '#1c1626');
  sx.fillStyle = skyGrad; sx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 90; i++) { // mây đen cuộn
    const cx = Math.random() * 1024, cy = Math.random() * 300, r = 40 + Math.random() * 130;
    const cg = sx.createRadialGradient(cx, cy, 4, cx, cy, r);
    const dark = Math.random() < 0.7;
    cg.addColorStop(0, dark ? 'rgba(8,8,16,0.55)' : 'rgba(52,48,72,0.4)');
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    sx.fillStyle = cg;
    sx.save(); sx.translate(cx, cy); sx.scale(1.8, 0.7); sx.translate(-cx, -cy);
    sx.beginPath(); sx.arc(cx, cy, r, 0, 7); sx.fill(); sx.restore();
  }
  const skyTex = new THREE.CanvasTexture(sCanvas);
  skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(450, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
  );
  scene.add(skyDome);
  lightningLight = new THREE.DirectionalLight(0xcfd8ff, 0);
  lightningLight.position.set(0, 100, 0);
  scene.add(lightningLight);

  // --- Mặt đất: nhựa đường nứt + mảnh vụn (chi tiết cao) ---
  const gCanvas = document.createElement('canvas'); gCanvas.width = gCanvas.height = 1024;
  const g = gCanvas.getContext('2d');
  g.fillStyle = '#1d1c22'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { // mảnh vụn
    g.fillStyle = 'rgba(' + (30 + Math.random() * 40) + ',' + (30 + Math.random() * 38) + ',' + (34 + Math.random() * 40) + ',0.8)';
    g.fillRect(Math.random() * 1024, Math.random() * 1024, 1 + Math.random() * 5, 1 + Math.random() * 4);
  }
  for (let i = 0; i < 26; i++) { // vệt cháy đen
    const bx = Math.random() * 1024, by = Math.random() * 1024, br = 30 + Math.random() * 90;
    const bg = g.createRadialGradient(bx, by, 2, bx, by, br);
    bg.addColorStop(0, 'rgba(5,5,8,0.7)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = bg; g.beginPath(); g.arc(bx, by, br, 0, 7); g.fill();
  }
  g.strokeStyle = '#0c0c10'; g.lineWidth = 3;
  for (let i = 0; i < 60; i++) { // vết nứt lớn
    g.beginPath(); let x = Math.random() * 512, y = Math.random() * 512; g.moveTo(x, y);
    for (let j = 0; j < 8; j++) { x += (Math.random() - .5) * 130; y += (Math.random() - .5) * 130; g.lineTo(x, y); }
    g.stroke();
  }
  g.strokeStyle = 'rgba(60,50,40,0.5)'; g.lineWidth = 2; // nứt nhỏ
  for (let i = 0; i < 110; i++) {
    g.beginPath(); let x = Math.random() * 1024, y = Math.random() * 1024; g.moveTo(x, y);
    x += (Math.random() - .5) * 80; y += (Math.random() - .5) * 80; g.lineTo(x, y); g.stroke();
  }
  const gTex = new THREE.CanvasTexture(gCanvas);
  gTex.wrapS = gTex.wrapT = THREE.RepeatWrapping; gTex.repeat.set(16, 16);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.world + 60, CFG.world + 60),
    new THREE.MeshStandardMaterial({ map: gTex, roughness: 0.95, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  buildRuins();
  buildSkyline();
  buildFires();
  buildAsh();

  // --- Ánh sáng ---
  hemi = new THREE.HemisphereLight(0x5a6a94, 0x141216, 0.55);
  scene.add(hemi);
  sunLight = new THREE.DirectionalLight(0xff9a5c, 0.75);
  sunLight.position.set(50, 42, 25); sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -70; sunLight.shadow.camera.right = 70;
  sunLight.shadow.camera.top = 70; sunLight.shadow.camera.bottom = -70;
  scene.add(sunLight);
  moonLight = new THREE.DirectionalLight(0x8fa8ff, 0.0);
  moonLight.position.set(-35, 55, -25);
  scene.add(moonLight);

  buildPlayer();
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

// --- Tàn tích thành phố chi tiết ---
function buildRuins() {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x35343e, roughness: 0.9 });
  const wallMat2 = new THREE.MeshStandardMaterial({ color: 0x2a2933, roughness: 0.9 });
  const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x232228, roughness: 1 });
  const rebarMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.7, metalness: 0.5 });
  for (let i = 0; i < 26; i++) {
    const w = 6 + Math.random() * 8, d = 6 + Math.random() * 8, h = 8 + Math.random() * 24;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Math.random() < .5 ? wallMat : wallMat2);
    const a = Math.random() * Math.PI * 2, r = 24 + Math.random() * 34;
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
    b.position.set(bx, h / 2 - Math.random() * 3, bz);
    b.rotation.y = Math.random() * Math.PI;
    if (Math.random() < 0.45) { b.rotation.z = (Math.random() - .5) * 0.28; b.position.y -= 2.5; }
    b.castShadow = true; b.receiveShadow = true;
    scene.add(b);
    // cửa sổ: vài ô còn le lói ánh đèn / lửa
    const floors = Math.floor(h / 3);
    for (let f = 0; f < floors; f++) {
      for (let ww = 0; ww < Math.floor(w / 2.4); ww++) {
        if (Math.random() < 0.16) {
          const lit = Math.random() < 0.4;
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2),
            new THREE.MeshBasicMaterial({ color: lit ? 0xff9a3c : 0x0a0c14 }));
          const side = Math.random() < 0.5 ? 1 : -1;
          win.position.set(bx + (Math.random() - .5) * w * 0.7, 2 + f * 3, bz + side * (d / 2 + 0.06));
          scene.add(win);
        }
      }
    }
    // đống đổ nát quanh chân
    for (let k = 0; k < 3; k++) {
      const rb = new THREE.Mesh(new THREE.ConeGeometry(1 + Math.random() * 1.6, 1 + Math.random() * 2, 7), rubbleMat);
      rb.position.set(bx + (Math.random() - .5) * (w + 6), 0.5, bz + (Math.random() - .5) * (d + 6));
      rb.castShadow = true;
      scene.add(rb);
    }
    // cốt thép chĩa lên
    if (Math.random() < 0.6) {
      for (let k = 0; k < 4; k++) {
        const rb2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2 + Math.random() * 2), rebarMat);
        rb2.position.set(bx + (Math.random() - .5) * w * 0.8, h - 1 + Math.random(), bz + (Math.random() - .5) * d * 0.8);
        rb2.rotation.set((Math.random() - .5) * 0.7, 0, (Math.random() - .5) * 0.7);
        scene.add(rb2);
      }
    }
  }
  // đèn đường gãy
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x16161c, roughness: 0.8 });
  for (let i = 0; i < 14; i++) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7), poleMat);
    const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 40;
    pole.position.set(Math.cos(a) * r, 3.2, Math.sin(a) * r);
    if (Math.random() < 0.55) { pole.rotation.z = 0.6 + Math.random() * 0.6; pole.position.y = 2.2; }
    pole.castShadow = true;
    scene.add(pole);
  }
  // xe hơi cháy rụi
  const carMat = new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.85, metalness: 0.3 });
  for (let i = 0; i < 7; i++) {
    const car = new THREE.Group();
    const cab = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 1.9), carMat); cab.position.y = 0.8; cab.castShadow = true; car.add(cab);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.7), carMat); top.position.set(-0.2, 1.6, 0); top.castShadow = true; car.add(top);
    const wg = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
    const wm = new THREE.MeshStandardMaterial({ color: 0x0a0a0c });
    [[-1.4, 0.95], [1.4, 0.95], [-1.4, -0.95], [1.4, -0.95]].forEach(([wx, wz]) => {
      const wh = new THREE.Mesh(wg, wm); wh.rotation.x = Math.PI / 2; wh.position.set(wx, 0.42, wz); car.add(wh);
    });
    const a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 36;
    car.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    car.rotation.y = Math.random() * Math.PI * 2;
    if (Math.random() < 0.4) car.rotation.z = Math.PI; // lật ngửa
    scene.add(car);
  }
}

// --- Đường chân trời: bóng thành phố xa trong sương ---
function buildSkyline() {
  const mat = new THREE.MeshBasicMaterial({ color: 0x0a0a14 });
  for (let i = 0; i < 30; i++) {
    const w = 10 + Math.random() * 18, h = 25 + Math.random() * 55, d = 10 + Math.random() * 14;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    const a = (i / 30) * Math.PI * 2 + Math.random() * 0.15;
    const r = 105 + Math.random() * 45;
    b.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r);
    scene.add(b);
    // vài ô cửa sổ le lói phía xa
    if (Math.random() < 0.5) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.6, h * 0.4),
        new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.1 }));
      win.position.set(b.position.x, b.position.y, b.position.z);
      win.lookAt(0, b.position.y, 0);
      win.translateZ(d / 2 + 0.1);
      scene.add(win);
    }
  }
}

// --- Đám lửa cháy + đèn nhấp nháy ---
function buildFires() {
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2, r = 16 + Math.random() * 34;
    const fx = Math.cos(a) * r, fz = Math.sin(a) * r;
    const light = new THREE.PointLight(0xff7a2a, 1.6, 26, 2);
    light.position.set(fx, 2.2, fz);
    scene.add(light);
    // đống củi cháy
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x140f0a });
    for (let k = 0; k < 4; k++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6), woodMat);
      log.position.set(fx + (Math.random() - .5), 0.25, fz + (Math.random() - .5));
      log.rotation.set(Math.PI / 2.3, 0, Math.random() * 3);
      scene.add(log);
    }
    fires.push({ x: fx, z: fz, light, seed: Math.random() * 10, parts: [] });
    for (let k = 0; k < 10; k++) fires[i].parts.push(makeFlame(fx, fz, true));
  }
}
function makeFlame(x, z, init) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_FIRE, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  resetFlame(sp, x, z, init);
  scene.add(sp);
  return sp;
}
function resetFlame(sp, x, z, init) {
  sp.position.set(x + (Math.random() - .5) * 0.9, init ? Math.random() * 2.2 : 0.3, z + (Math.random() - .5) * 0.9);
  sp.userData.life = init ? Math.random() : 0;
  sp.userData.max = 0.9 + Math.random() * 0.7;
  const s = 0.7 + Math.random() * 0.9;
  sp.scale.set(s, s * 1.5, 1);
}

// --- Tro / tàn lửa bay trong gió ---
function buildAsh() {
  const N = 500;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - .5) * 130;
    pos[i * 3 + 1] = Math.random() * 26;
    pos[i * 3 + 2] = (Math.random() - .5) * 130;
    ashVel.push(0.3 + Math.random() * 0.9);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  ashPts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x8a8578, size: 0.14, transparent: true, opacity: 0.75, depthWrite: false }));
  scene.add(ashPts);
}

// --- Người sống sót: mô hình chi tiết có khớp xương ---
function makeFallbackHumanoid(shirtColor, name) {
  const grp = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.85 });
  const jeans = new THREE.MeshStandardMaterial({ color: 0x2e3646, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a077, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x121218, roughness: 0.8 });
  const bootM = new THREE.MeshStandardMaterial({ color: 0x201510, roughness: 0.65 });
  const packM = new THREE.MeshStandardMaterial({ color: 0x2e4030, roughness: 0.9 });

  function mesh(geo, mat, parent, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = true;
    parent.add(m); return m;
  }

  // Chân: khớp hông -> đùi -> khớp gối -> cẳng chân -> ủng
  function leg(side) {
    const hip = new THREE.Group(); hip.position.set(0.16 * side, 0.98, 0); grp.add(hip);
    mesh(new THREE.CylinderGeometry(0.105, 0.09, 0.44, 10), jeans, hip, 0, -0.22, 0);
    const knee = new THREE.Group(); knee.position.set(0, -0.44, 0); hip.add(knee);
    mesh(new THREE.CylinderGeometry(0.088, 0.1, 0.42, 10), jeans, knee, 0, -0.21, 0);
    mesh(new THREE.BoxGeometry(0.2, 0.16, 0.38), bootM, knee, 0, -0.44, 0.05);
    return { hip, knee };
  }
  const legL = leg(-1), legR = leg(1);

  // Thân: áo khoác, balo sinh tồn, lõi Hệ Thống
  const torso = mesh(new THREE.BoxGeometry(0.6, 0.62, 0.36), cloth, grp, 0, 1.3, 0);
  mesh(new THREE.BoxGeometry(0.66, 0.2, 0.4), cloth, grp, 0, 1.56, 0);
  mesh(new THREE.BoxGeometry(0.08, 0.5, 0.02), dark, grp, 0, 1.3, 0.19);
  mesh(new THREE.BoxGeometry(0.42, 0.52, 0.24), packM, grp, 0, 1.32, -0.3);
  const roll = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.46, 8), dark, grp, 0, 1.66, -0.3);
  roll.rotation.z = Math.PI / 2;
  mesh(new THREE.BoxGeometry(0.15, 0.15, 0.05), new THREE.MeshBasicMaterial({ color: 0x00e5ff }), grp, -0.16, 1.42, 0.19);
  const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_GLOW, color: 0x00e5ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.65 }));
  coreGlow.scale.set(0.5, 0.5, 1); coreGlow.position.set(-0.16, 1.42, 0.22); grp.add(coreGlow);

  // Tay: khớp vai -> cánh tay -> khớp khuỷu -> cẳng tay -> bàn tay
  function arm(side) {
    const sh = new THREE.Group(); sh.position.set(0.4 * side, 1.54, 0); grp.add(sh);
    mesh(new THREE.SphereGeometry(0.12, 10, 8), cloth, sh, 0, 0, 0);
    mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.36, 10), cloth, sh, 0, -0.2, 0);
    const elb = new THREE.Group(); elb.position.set(0, -0.38, 0); sh.add(elb);
    mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.34, 10), skin, elb, 0, -0.17, 0);
    mesh(new THREE.BoxGeometry(0.11, 0.12, 0.06), skin, elb, 0, -0.38, 0.01); // lòng bàn tay
    mesh(new THREE.BoxGeometry(0.1, 0.09, 0.05), skin, elb, 0, -0.47, 0.015); // ngón tay
    mesh(new THREE.BoxGeometry(0.03, 0.08, 0.03), skin, elb, 0.06 * side, -0.4, 0.03); // ngón cái
    return { sh, elb };
  }
  const armL = arm(-1), armR = arm(1);

  // Đầu: giống nam chính trong video — tóc đen rối, mặt người thật
  mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 8), skin, grp, 0, 1.66, 0);
  const headG = new THREE.Group(); headG.position.set(0, 1.82, 0); grp.add(headG);
  const face = mesh(new THREE.SphereGeometry(0.21, 18, 14), skin, headG, 0, 0.1, 0);
  face.scale.set(0.92, 1.08, 0.98); // mặt thon dài
  // tai
  mesh(new THREE.SphereGeometry(0.045, 8, 8), skin, headG, -0.2, 0.1, 0);
  mesh(new THREE.SphereGeometry(0.045, 8, 8), skin, headG, 0.2, 0.1, 0);
  // mắt: tròng trắng + con ngươi, ánh nhìn sắc
  const eyeW = new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.35 });
  const pupilM = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.3 });
  [-1, 1].forEach(s => {
    mesh(new THREE.SphereGeometry(0.038, 10, 8), eyeW, headG, 0.075 * s, 0.12, 0.175);
    mesh(new THREE.SphereGeometry(0.018, 8, 8), pupilM, headG, 0.075 * s, 0.12, 0.205);
    const brow = mesh(new THREE.BoxGeometry(0.09, 0.018, 0.02), dark, headG, 0.08 * s, 0.2, 0.185);
    brow.rotation.z = -0.18 * s; // lông mày rậm xếch
  });
  // mũi + miệng
  mesh(new THREE.BoxGeometry(0.03, 0.05, 0.03), skin, headG, 0, 0.05, 0.2);
  mesh(new THREE.BoxGeometry(0.09, 0.016, 0.015),
    new THREE.MeshStandardMaterial({ color: 0x8a4a42, roughness: 0.6 }), headG, 0, -0.03, 0.19);
  // tóc đen rối phủ trán (đặc trưng nam chính)
  const hairM = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.9 });
  mesh(new THREE.SphereGeometry(0.215, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), hairM, headG, 0, 0.14, -0.03);
  const bangGeo = new THREE.ConeGeometry(0.045, 0.22, 6);
  [[-0.12, 0.05], [-0.06, -0.02], [0, 0.08], [0.06, -0.01], [0.12, 0.06]].forEach(([bx, bz]) => {
    const b = mesh(bangGeo, hairM, headG, bx, 0.24, 0.16 + bz * 0.3);
    b.rotation.x = Math.PI * 0.94; // chĩa xuống trán
    b.rotation.z = (Math.random() - 0.5) * 0.3;
  });
  // tóc mai 2 bên
  mesh(new THREE.BoxGeometry(0.05, 0.18, 0.08), hairM, headG, -0.2, 0.02, 0.02);
  mesh(new THREE.BoxGeometry(0.05, 0.18, 0.08), hairM, headG, 0.2, 0.02, 0.02);
  // cổ áo hoodie
  mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.16, 10, 1, true), cloth, grp, 0, 1.62, 0);

  if (name) grp.add(makeNameSprite(name));
  grp.userData = {
    hipL: legL.hip, kneeL: legL.knee, hipR: legR.hip, kneeR: legR.knee,
    shL: armL.sh, elbL: armL.elb, shR: armR.sh, elbR: armR.elb,
    coreGlow, headG, torso
  };
  return grp;
}

// animation đi bộ cho khớp xương
function animSurvivor(u, moving, t, dt, punch) {
  const s = Math.sin(t * 9.5);
  const dz = Math.min(1, dt * 12);
  const L = (cur, target) => cur + (target - cur) * dz;
  const k = moving ? 1 : 0;
  u.hipL.rotation.x = L(u.hipL.rotation.x, s * 0.55 * k);
  u.hipR.rotation.x = L(u.hipR.rotation.x, -s * 0.55 * k);
  u.kneeL.rotation.x = L(u.kneeL.rotation.x, Math.max(0, -s) * 0.85 * k);
  u.kneeR.rotation.x = L(u.kneeR.rotation.x, Math.max(0, s) * 0.85 * k);
  u.shL.rotation.x = L(u.shL.rotation.x, -s * 0.45 * k);
  u.shR.rotation.x = L(u.shR.rotation.x, punch ? -2.3 : s * 0.45 * k);
  u.elbL.rotation.x = L(u.elbL.rotation.x, -0.25 * k - Math.max(0, s) * 0.3 * k);
  u.elbR.rotation.x = L(u.elbR.rotation.x, punch ? -0.4 : -0.25 * k - Math.max(0, -s) * 0.3 * k);
  // thở + đầu khẽ động khi đứng yên cho giống người thật
  if (u.torso) u.torso.scale.y = 1 + Math.sin(t * 2.1) * 0.012;
  if (!moving && u.headG) u.headG.rotation.y = Math.sin(t * 0.6) * 0.08;
  return moving ? Math.abs(Math.cos(t * 9.5)) * 0.055 : 0;
}
// bảng tên hologram
function makeNameSprite(name) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 48;
  const x = c.getContext('2d'); x.font = 'bold 26px Arial'; x.textAlign = 'center';
  x.fillStyle = 'rgba(2,10,16,.6)'; x.fillRect(0, 0, 256, 48);
  x.strokeStyle = 'rgba(0,229,255,.7)'; x.strokeRect(1, 1, 254, 46);
  x.fillStyle = '#bdf3ff'; x.fillText(name.slice(0, 12), 128, 33);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  sp.scale.set(2.4, 0.45, 1); sp.position.y = 2.35;
  return sp;
}

// --- MODEL NGƯỜI 3D THẬT (GLTF) ---
let soldierTpl = null;   // { scene, clips }
const charMixers = [];   // danh sách { mixer, actions, cur } để update mỗi frame
function loadSoldier(cb) {
  if (!THREE.GLTFLoader || !THREE.SkeletonUtils) { cb(false); return; }
  new THREE.GLTFLoader().load('models/Soldier.glb', (gltf) => {
    const clips = {};
    gltf.animations.forEach(c => { clips[c.name] = c; });
    soldierTpl = { scene: gltf.scene, clips };
    cb(true);
  }, undefined, () => cb(false));
}
function makeHumanoid(shirtColor, name) {
  if (soldierTpl && THREE.SkeletonUtils) {
    const root = new THREE.Group();
    const model = THREE.SkeletonUtils.clone(soldierTpl.scene);
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    root.add(model);
    const mixer = new THREE.AnimationMixer(model);
    const actions = {};
    for (const n in soldierTpl.clips) actions[n] = mixer.clipAction(soldierTpl.clips[n]);
    const ud = { isGLTF: true, mixer, actions, cur: null };
    root.userData = ud;
    if (name) root.add(makeNameSprite(name));
    charMixers.push(ud);
    setCharAnim(ud, 'Idle');
    return root;
  }
  return makeFallbackHumanoid(shirtColor, name); // rớt mạng -> dùng nhân vật cũ
}
function setCharAnim(ud, name) {
  if (!ud.isGLTF || ud.cur === name || !ud.actions[name]) return;
  const prev = ud.cur && ud.actions[ud.cur];
  if (prev) prev.fadeOut(0.18);
  ud.actions[name].reset().fadeIn(0.18).play();
  ud.cur = name;
}
function removeCharMixer(root) {
  const ud = root.userData;
  if (ud && ud.isGLTF) {
    const i = charMixers.indexOf(ud);
    if (i >= 0) charMixers.splice(i, 1);
  }
}
function buildPlayer() {
  playerMesh = makeHumanoid(0x181824, null);
  scene.add(playerMesh);
}

// --- Hắc Thú v2: thú 4 chân, hàm há được, đuôi vẫy, mắt đỏ ---
function makeMonster(boss) {
  const grp = new THREE.Group();
  const s = boss ? 2.4 : 1;
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0d0d14, roughness: 0.55 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e1e2a, roughness: 0.5 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x3a0d12, roughness: 0.7 });

  // thân dài, khom về trước
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.95 * s, 14, 12), bodyMat);
  body.position.set(0, 1.05 * s, -0.1 * s); body.scale.set(1, 0.92, 1.35);
  body.castShadow = true; grp.add(body);
  // đầu + hàm dưới há được
  const headG = new THREE.Group(); headG.position.set(0, 1.35 * s, 1.05 * s); grp.add(headG);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 12, 10), bodyMat);
  skull.scale.set(1, 0.85, 1.1); skull.castShadow = true; headG.add(skull);
  const jawG = new THREE.Group(); jawG.position.set(0, -0.18 * s, 0.15 * s); headG.add(jawG);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.55 * s, 0.16 * s, 0.6 * s), mouthMat);
  jaw.position.set(0, -0.08 * s, 0.25 * s); jawG.add(jaw);
  // răng nanh
  const fangM = new THREE.MeshStandardMaterial({ color: 0xcfc4ae, roughness: 0.4 });
  [-1, 1].forEach(sd => {
    const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.05 * s, 0.22 * s, 6), fangM);
    f1.position.set(0.2 * sd * s, -0.3 * s, 0.45 * s); f1.rotation.x = Math.PI; headG.add(f1);
    const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.04 * s, 0.16 * s, 6), fangM);
    f2.position.set(0.18 * sd * s, 0.02 * s, 0.5 * s); jawG.add(f2);
  });
  // mắt đỏ phát sáng
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  [-1, 1].forEach(sd => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s, 10, 8), eyeMat);
    e.position.set(0.24 * sd * s, 0.12 * s, 0.38 * s); headG.add(e);
  });
  const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_GLOW, color: 0xff2222, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.75 }));
  eyeGlow.scale.set(1.1 * s, 0.7 * s, 1); eyeGlow.position.set(0, 0.12 * s, 0.5 * s); headG.add(eyeGlow);
  // gai dọc sống lưng
  const nSp = boss ? 10 : 7;
  for (let i = 0; i < nSp; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.14 * s, (0.55 + Math.random() * 0.45) * s, 6), darkMat);
    const zz = (0.9 - (i / (nSp - 1))) * 1.5 * s;
    sp.position.set(0, (1.75 - Math.abs(zz) * 0.25) * s, zz);
    sp.rotation.x = -0.25 - (i / nSp) * 0.5;
    sp.castShadow = true; grp.add(sp);
  }
  // 4 chân có khớp
  const legs = [];
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => {
    const hip = new THREE.Group(); hip.position.set(0.55 * sx * s, 0.85 * s, 0.55 * sz * s); grp.add(hip);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.1 * s, 0.6 * s, 8), bodyMat);
    upper.position.y = -0.3 * s; upper.castShadow = true; hip.add(upper);
    const low = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.07 * s, 0.55 * s, 8), darkMat);
    low.position.y = -0.75 * s; hip.add(low);
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.11 * s, 0.28 * s, 6), darkMat);
    claw.position.y = -1.05 * s; claw.rotation.x = Math.PI; hip.add(claw);
    legs.push(hip);
  });
  // đuôi gai vẫy
  const tail = new THREE.Group(); tail.position.set(0, 1.15 * s, -1.35 * s); grp.add(tail);
  let parent = tail;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group(); if (i) seg.position.set(0, 0.05 * s, -0.5 * s); parent.add(seg);
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.12 * s, 0.55 * s, 6), darkMat);
    m.rotation.x = -Math.PI / 2 - 0.15; m.position.z = -0.25 * s; seg.add(m);
    parent = seg;
  }
  // hào quang đỏ
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_GLOW, color: 0xff2222, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
  aura.scale.set(4.2 * s, 4.2 * s, 1); aura.position.y = 1.2 * s; grp.add(aura);
  // thanh máu hologram
  const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(1.7 * s, 0.14 * s), new THREE.MeshBasicMaterial({ color: 0x1a0202, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
  hpBg.position.y = 2.5 * s; grp.add(hpBg);
  const hpFg = new THREE.Mesh(new THREE.PlaneGeometry(1.7 * s, 0.14 * s), new THREE.MeshBasicMaterial({ color: 0xff3838, side: THREE.DoubleSide }));
  hpFg.position.set(0, 2.5 * s, 0.01); grp.add(hpFg);
  grp.userData = { hpFg, hpW: 1.7 * s, aura, jawG, legs, tail, body, jawOpen: 0, px: 0, pz: 0 };
  return grp;
}
// --- Thùng vật phẩm: viền hologram ---
function makeCrate() {
  const grp = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0x5a4128, roughness: 0.85 }));
  box.position.y = 0.45; box.castShadow = true; grp.add(box);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.1, 0.96), new THREE.MeshBasicMaterial({ color: 0xffd54f }));
  frame.position.y = 0.95; grp.add(frame);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_GLOW, color: 0xffd54f, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 }));
  glow.scale.set(2.2, 2.2, 1); glow.position.y = 0.7; grp.add(glow);
  grp.userData.glow = glow;
  return grp;
}
// --- Rương trang bị: vàng rực + cột sáng ---
function makeEquipCrate() {
  const grp = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 1.25),
    new THREE.MeshStandardMaterial({ color: 0x8a6d1f, roughness: 0.35, metalness: 0.85, emissive: 0x332200, emissiveIntensity: 0.5 }));
  box.position.y = 0.62; box.castShadow = true; grp.add(box);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.16, 1.32),
    new THREE.MeshBasicMaterial({ color: 0xffe082 }));
  trim.position.y = 1.28; grp.add(trim);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22),
    new THREE.MeshBasicMaterial({ color: 0xfff176 }));
  gem.position.y = 1.55; grp.add(gem); grp.userData.gem = gem;
  // cột sáng bắn lên trời
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 22, 12, 1, true),
    new THREE.MeshBasicMaterial({ map: TEX_GLOW, color: 0xffd54f, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 11.6; grp.add(beam); grp.userData.beam = beam;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_GLOW, color: 0xffd54f, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.75 }));
  glow.scale.set(3.4, 3.4, 1); glow.position.y = 0.9; grp.add(glow);
  grp.userData.glow = glow;
  return grp;
}
function rebuildCrates() {
  for (const [, m] of crateMeshes) scene.remove(m); crateMeshes.clear();
  for (const c of G.crates) {
    const m = c.kind === 'equip' ? makeEquipCrate() : makeCrate();
    m.userData.crateId = c.id; m.userData.isEquip = c.kind === 'equip';
    m.position.set(c.x, 0, c.z); scene.add(m); crateMeshes.set(c.id, m);
  }
}
function makeDrop() {
  const grp = new THREE.Group();
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.34), new THREE.MeshStandardMaterial({ color: 0x4fc3f7, emissive: 0x0a4a6a, roughness: 0.3 }));
  m.position.y = 0.6; grp.add(m);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_GLOW, color: 0x4fc3f7, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
  glow.scale.set(1.6, 1.6, 1); glow.position.y = 0.6; grp.add(glow);
  grp.userData.core = m;
  return grp;
}
function rebuildDrops() {
  for (const [, m] of dropMeshes) scene.remove(m); dropMeshes.clear();
  for (const d of G.drops) { const m = makeDrop(); m.position.set(d.x, 0, d.z); scene.add(m); dropMeshes.set(d.id, m); }
}

// --- Đồng bộ ---
function upsertPlayer(p) {
  if (p.id === G.myId) return;
  let e = otherMeshes.get(p.id);
  if (!e) { e = { mesh: makeHumanoid(0x1e3a52, p.name) }; scene.add(e.mesh); otherMeshes.set(p.id, e); }
  e.data = p;
  e.mesh.position.set(p.x, 0, p.z);
  e.mesh.rotation.y = p.ry;
  e.mesh.visible = !p.dead;
}
function removePlayer(id) { const e = otherMeshes.get(id); if (e) { removeCharMixer(e.mesh); scene.remove(e.mesh); otherMeshes.delete(id); } }
function markDead(id) { const e = otherMeshes.get(id); if (e && e.mesh) e.mesh.rotation.x = -Math.PI / 2; }
function upsertMonster(mo) {
  let e = monsterMeshes.get(mo.id);
  if (!e) { e = { mesh: makeMonster(mo.boss) }; scene.add(e.mesh); monsterMeshes.set(mo.id, e); }
  e.data = mo;
  e.mesh.userData.monsterId = mo.id;
  e.mesh.position.set(mo.x, 0, mo.z);
  const ratio = Math.max(0, mo.hp / mo.maxHp);
  e.mesh.userData.hpFg.scale.x = ratio;
  e.mesh.userData.hpFg.position.x = -(1 - ratio) * e.mesh.userData.hpW / 2;
}
function syncMonsterMeshes(ids) {
  for (const [id, e] of monsterMeshes) if (!ids.includes(id)) { scene.remove(e.mesh); monsterMeshes.delete(id); }
}

// --- Số damage bay lên ---
function dmgNumber(x, y, z, dmg, color) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 40px Arial'; g.textAlign = 'center';
  g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 6;
  g.strokeText(dmg, 64, 44); g.fillStyle = color || '#ffd54f'; g.fillText(dmg, 64, 44);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false, transparent: true }));
  sp.position.set(x + (Math.random() - .5) * 0.6, y, z);
  sp.scale.set(1.5, 0.75, 1);
  sp.userData = { life: 0.8, max: 0.8, fx: 'dmgnum' };
  scene.add(sp); particles.push(sp);
}
// --- Tia lửa khi đánh trúng ---
function burstSparks(x, y, z, color) {
  for (let i = 0; i < 10; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_GLOW, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.position.set(x, y, z);
    const a = Math.random() * Math.PI * 2, up = 1 + Math.random() * 3;
    sp.userData = { vx: Math.cos(a) * 3, vy: up, vz: Math.sin(a) * 3, life: 0.5, max: 0.5 };
    const s = 0.3 + Math.random() * 0.3; sp.scale.set(s, s, 1);
    scene.add(sp); particles.push(sp);
  }
}
// --- Vòng chém ---
function slashFX(x, z, ry) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 2.4, 24, 1, 0, Math.PI * 1.2),
    new THREE.MeshBasicMaterial({ color: 0x9df2ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = -ry;
  m.position.set(x, 1.1, z);
  m.userData = { life: 0.22, max: 0.22, fx: 'slash' };
  scene.add(m); particles.push(m);
}

// --- Ngày / đêm + sấm sét ---
function updateSky(dt) {
  const night = G.night;
  const k = night ? 1 : 0;
  skyDome.rotation.y += dt * 0.004;
  sunLight.intensity = 0.75 * (1 - k) + 0.04;
  sunLight.color.setHex(night ? 0x8fa8ff : 0xff9a5c);
  moonLight.intensity = 0.5 * k;
  hemi.intensity = 0.55 * (1 - k) + 0.2;
  scene.fog.density = 0.028 + k * 0.012;
  // sấm sét ngẫu nhiên (dày hơn vào ban đêm)
  boltTimer -= dt;
  if (boltTimer <= 0) {
    lightningLight.intensity = 2.4;
    setTimeout(() => {
      lightningLight.intensity = 0.6;
      setTimeout(() => { lightningLight.intensity = 1.8; setTimeout(() => lightningLight.intensity = 0, 90); }, 110);
    }, 120);
    boltTimer = (night ? 5 : 12) + Math.random() * 10;
  }
}

// ---------- ĐIỀU KHIỂN CẢM ỨNG / NÚT BẤM ----------
const joy = { x: 0, y: 0 };
let lastDragT = 0;
// xoay góc mượt, xử lý vòng tròn 2π
function turnToward(cur, target, maxStep) {
  let d = target - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return cur + Math.max(-maxStep, Math.min(maxStep, d));
}
function initTouchControls() {
  const base = document.getElementById('joystick'), knob = document.getElementById('joy-knob');
  if (!base) return;
  let pid = null;
  const setKnob = (dx, dy) => { knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; };
  function moveKnob(e) {
    const r = base.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 10, d = Math.hypot(dx, dy);
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    joy.x = dx / max; joy.y = dy / max;
    setKnob(dx, dy);
  }
  base.addEventListener('pointerdown', (e) => { pid = e.pointerId; try { base.setPointerCapture(pid); } catch {} moveKnob(e); });
  base.addEventListener('pointermove', (e) => { if (e.pointerId === pid) moveKnob(e); });
  const end = (e) => { if (e.pointerId === pid) { pid = null; joy.x = 0; joy.y = 0; setKnob(0, 0); } };
  base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
  const atk = document.getElementById('btn-atk'), loot = document.getElementById('btn-loot');
  if (atk) atk.addEventListener('pointerdown', (e) => { e.preventDefault(); doAttack(); });
  if (loot) loot.addEventListener('pointerdown', (e) => { e.preventDefault(); tryLoot(); });
}

// ---------- CLICK-TO-MOVE: click đất/quái/thùng để tự đi tới ----------
// Click đất: tự đi tới đó. Click quái: tự đuổi theo và đánh. Click thùng: tự tới nhặt.
let clickTarget = null, clickMarker = null;

function showClickMarker(x, z, color) {
  if (clickMarker) { scene.remove(clickMarker); clickMarker = null; }
  const m = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.55, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.06, z);
  scene.add(m); clickMarker = m;
}
function clearClickTarget() {
  clickTarget = null;
  if (clickMarker) { scene.remove(clickMarker); clickMarker = null; }
}
function findTagged(obj, key) {
  let o = obj;
  while (o) { if (o.userData && o.userData[key]) return o.userData[key]; o = o.parent; }
  return null;
}
function handleGroundClick(cx, cy) {
  if (G.dead || G.chatting) return;
  const r = renderer.domElement.getBoundingClientRect();
  const nx = ((cx - r.left) / r.width) * 2 - 1;
  const ny = -((cy - r.top) / r.height) * 2 + 1;
  const rc = new THREE.Raycaster();
  rc.setFromCamera({ x: nx, y: ny }, camera);
  // 1. Click trúng quái? -> đuổi theo đánh
  const mhits = rc.intersectObjects([...monsterMeshes.values()].map(e => e.mesh), true);
  if (mhits.length) {
    const id = findTagged(mhits[0].object, 'monsterId');
    const mo = id && G.monsters.get(id);
    if (mo) {
      clickTarget = { x: mo.x, z: mo.z, type: 'monster', id };
      showClickMarker(mo.x, mo.z, 0xff5252);
      if (Math.hypot(mo.x - G.pos.x, mo.z - G.pos.z) <= CFG.attackRange) doAttack();
      return;
    }
  }
  // 2. Click trúng thùng hàng? -> tới nhặt
  const chits = rc.intersectObjects([...crateMeshes.values()], true);
  if (chits.length) {
    const cid = findTagged(chits[0].object, 'crateId');
    const c = cid && G.crates.find(x => x.id === cid);
    if (c) {
      clickTarget = { x: c.x, z: c.z, type: 'crate', id: c.id };
      showClickMarker(c.x, c.z, 0xffd54f);
      return;
    }
  }
  // 3. Click đất trống -> đi tới đó
  const o = rc.ray.origin, d = rc.ray.direction;
  if (d.y < -0.001) {
    const tt = -o.y / d.y;
    const px = o.x + d.x * tt, pz = o.z + d.z * tt;
    if (Math.abs(px) < 60 && Math.abs(pz) < 60) {
      clickTarget = { x: px, z: pz, type: 'move' };
      showClickMarker(px, pz, 0x00e5ff);
    }
  }
}

// ---------- 6. ĐIỀU KHIỂN ----------
function initInput() {
  addEventListener('keydown', (e) => {
    if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
    if (G.chatting) { if (e.key === 'Escape') closeChat(); return; }
    G.keys[e.key.toLowerCase()] = true;
    if (e.key === 'Enter') openChat();
    if (e.key === ' ') doAttack();
    if (e.key.toLowerCase() === 'e') tryLoot();
    if (e.key.toLowerCase() === 'b') togglePanel('craft');
    if (e.key.toLowerCase() === 'i') togglePanel('inventory');
    if (e.key.toLowerCase() === 'g') dropSelected();
    if (e.key.toLowerCase() === 'u') togglePanel('equipment');
  });
  addEventListener('keyup', (e) => { G.keys[e.key.toLowerCase()] = false; });

  // Kéo chuột để xoay camera (không cần khóa con trỏ nữa)
  const cv = renderer.domElement;
  let dragging = false, lx = 0, ly = 0, downT = 0, downX = 0, downY = 0;
  cv.addEventListener('mousedown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; downT = performance.now(); downX = e.clientX; downY = e.clientY; });
  addEventListener('mousemove', (e) => {
    if (dragging && !G.chatting) {
      G.camYaw -= (e.clientX - lx) * 0.0052;
      G.camPitch = Math.max(0.08, Math.min(1.1, G.camPitch + (e.clientY - ly) * 0.004));
      lx = e.clientX; ly = e.clientY;
      lastDragT = performance.now();
    }
  });
  addEventListener('mouseup', (e) => {
    if (dragging) {
      dragging = false;
      // click nhanh (không kéo) = đánh
      const quick = performance.now() - downT < 280;
      const still = Math.hypot(e.clientX - downX, e.clientY - downY) < 7;
      if (quick && still && !G.chatting && e.target === cv) handleGroundClick(e.clientX, e.clientY);
    }
  });
  // Cảm ứng: 1 ngón kéo để xoay camera, chạm nhanh = click-to-move
  let touchDrag = null, tsT = 0, tsX = 0, tsY = 0;
  cv.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchDrag = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      tsT = performance.now(); tsX = e.touches[0].clientX; tsY = e.touches[0].clientY;
    }
  }, { passive: true });
  cv.addEventListener('touchmove', (e) => {
    if (touchDrag && e.touches.length === 1) {
      const t0 = e.touches[0];
      G.camYaw -= (t0.clientX - touchDrag.x) * 0.006;
      G.camPitch = Math.max(0.08, Math.min(1.1, G.camPitch + (t0.clientY - touchDrag.y) * 0.005));
      touchDrag = { x: t0.clientX, y: t0.clientY };
      lastDragT = performance.now();
    }
  }, { passive: true });
  cv.addEventListener('touchend', (e) => {
    if (touchDrag && performance.now() - tsT < 280 && e.changedTouches.length) {
      const t0 = e.changedTouches[0];
      if (Math.hypot(t0.clientX - tsX, t0.clientY - tsY) < 10) handleGroundClick(t0.clientX, t0.clientY);
    }
    touchDrag = null;
  });
  // chuột phải = dừng lệnh di chuyển
  cv.addEventListener('contextmenu', (e) => { e.preventDefault(); clearClickTarget(); });

  const ci = document.getElementById('chat-input');
  ci.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && ci.value.trim()) { send({ t: 'chat', msg: ci.value.trim() }); if (!G.online) chatMsg(G.name, ci.value.trim()); ci.value = ''; }
    if (e.key === 'Escape') closeChat();
  });
  ci.addEventListener('focus', () => { G.chatting = true; });
  ci.addEventListener('blur', () => { G.chatting = false; });
  document.querySelectorAll('.close').forEach(el =>
    el.addEventListener('click', () => document.getElementById(el.dataset.close).classList.add('hidden')));
  initTouchControls();
}
function openChat() { document.getElementById('chat-input').focus(); }
function closeChat() { document.getElementById('chat-input').blur(); }

function updatePlayer(dt) {
  if (G.dead || G.chatting) return;
  const now = performance.now(), t = now / 1000;
  const k = G.keys;
  let mx = 0, mz = 0;
  if (k['w'] || k['arrowup']) mz -= 1;
  if (k['s'] || k['arrowdown']) mz += 1;
  if (k['a'] || k['arrowleft']) mx -= 1;
  if (k['d'] || k['arrowright']) mx += 1;
  mx += joy.x; mz += joy.y;
  let mlen = Math.hypot(mx, mz);
  if (mlen > 1) { mx /= mlen; mz /= mlen; mlen = 1; }
  let moving = mlen > 0.12;
  let wx = 0, wz = 0;
  if (moving) {
    // phím/joystick đè lên lệnh click chuột
    if (clickTarget) clearClickTarget();
    const sin = Math.sin(G.camYaw), cos = Math.cos(G.camYaw);
    wx = mx * cos - mz * sin; wz = mx * sin + mz * cos;
  } else if (clickTarget) {
    // click-to-move: tự đi tới điểm đã click
    let dx = clickTarget.x - G.pos.x, dz = clickTarget.z - G.pos.z;
    let d = Math.hypot(dx, dz);
    if (clickTarget.type === 'monster') {
      const mo = G.monsters.get(clickTarget.id);
      if (!mo) clearClickTarget();
      else { clickTarget.x = mo.x; clickTarget.z = mo.z; dx = mo.x - G.pos.x; dz = mo.z - G.pos.z; d = Math.hypot(dx, dz); }
    } else if (clickTarget.type === 'crate') {
      if (!G.crates.find(x => x.id === clickTarget.id)) clearClickTarget();
    }
    if (clickTarget) {
      const arrive = clickTarget.type === 'move' ? 0.6 : clickTarget.type === 'crate' ? 3.2 : CFG.attackRange;
      if (d <= arrive) {
        if (clickTarget.type === 'monster') doAttack(); // đứng đánh liên tục tới khi quái chết
        else if (clickTarget.type === 'crate') { tryLoot(); clearClickTarget(); }
        else clearClickTarget();
      } else { wx = dx / d; wz = dz / d; moving = true; }
    }
  }
  const sprint = k['shift'] && moving && G.theluc > 5;
  const sp = CFG.playerSpeed * (sprint ? CFG.sprintMul : 1);
  G.atkAnim = Math.max(0, (G.atkAnim || 0) - dt);
  if (moving && (wx || wz)) {
    G.pos.x = Math.max(-60, Math.min(60, G.pos.x + wx * sp * dt));
    G.pos.z = Math.max(-60, Math.min(60, G.pos.z + wz * sp * dt));
    G.ry = turnToward(G.ry, Math.atan2(wx, wz), dt * 11);
    if (sprint) G.theluc = Math.max(0, G.theluc - dt * 14);
    // camera tự bám sau lưng khi di chuyển (trừ khi vừa xoay tay)
    if (now - lastDragT > 1800) G.camYaw = turnToward(G.camYaw, G.ry, dt * 2.4);
  } else if (!moving) G.theluc = Math.min(100, G.theluc + dt * 10);
  G.anim = moving ? 'walk' : 'idle';
  G.attackCd -= dt;

  const u = playerMesh.userData;
  let bob = 0;
  if (u.isGLTF) {
    // nhân vật 3D thật: dùng animation xương
    setCharAnim(u, sprint && moving ? 'Run' : moving ? 'Walk' : 'Idle');
  } else {
    bob = animSurvivor(u, moving, t, dt, G.atkAnim > 0);
    if (u.coreGlow) u.coreGlow.material.opacity = 0.5 + Math.sin(t * 3) * 0.25;
  }

  playerMesh.position.set(G.pos.x, bob, G.pos.z);
  playerMesh.rotation.y = G.ry;

  // camera thứ 3 + rung khi bị đánh
  G.shake = Math.max(0, G.shake - dt * 1.6);
  const shx = (Math.random() - .5) * G.shake, shy = (Math.random() - .5) * G.shake;
  const cd = 7, ch = 3.2;
  const cx = G.pos.x - Math.sin(G.camYaw) * Math.cos(G.camPitch) * cd + shx;
  const cz = G.pos.z - Math.cos(G.camYaw) * Math.cos(G.camPitch) * cd;
  const cy = ch + Math.sin(G.camPitch) * cd + shy;
  camera.position.set(cx, cy, cz);
  camera.lookAt(G.pos.x, 1.6, G.pos.z);

  if (!updatePlayer._a) updatePlayer._a = 0;
  if (G.online && ++updatePlayer._a % 6 === 0) send({ t: 'move', x: +G.pos.x.toFixed(2), z: +G.pos.z.toFixed(2), ry: +G.ry.toFixed(2), anim: G.anim });
}
function doAttack() {
  if (G.dead || G.chatting || G.attackCd > 0) return;
  G.attackCd = 0.45;
  G.anim = 'atk';
  const dmg = WEAPONS[G.weapon].dmg + myDmgBonus();
  slashFX(G.pos.x + Math.sin(G.ry) * 1.4, G.pos.z + Math.cos(G.ry) * 1.4, G.ry);
  G.atkAnim = 0.3;
  let best = null, bd = CFG.attackRange;
  for (const [id, mo] of G.monsters) {
    const d = Math.hypot(mo.x - G.pos.x, mo.z - G.pos.z);
    if (d < bd) { bd = d; best = { id, mo }; }
  }
  if (best) {
    burstSparks(best.mo.x, 1.2, best.mo.z, 0xffd54f);
    dmgNumber(best.mo.x, 2.4, best.mo.z, dmg);
    if (G.online) send({ t: 'hit', monsterId: best.id, dmg });
    else {
      best.mo.hp -= dmg;
      if (best.mo.hp <= 0) {
        offMonsters = offMonsters.filter(m => m.id !== best.id);
        burstSparks(best.mo.x, 1.2, best.mo.z, 0xff4444);
        if (best.mo.boss) { showEnd('CHIẾN THẮNG!', 'Bạn đã tiêu diệt Hắc Thú Vương. Bạn đã đi đến cuối con đường!'); }
        else sysMsg('Đã hạ một Hắc Thú!');
        G.drops.push({ id: 'd' + Date.now(), x: best.mo.x, z: best.mo.z, items: { phelieu: 1 } });
        rebuildDrops();
      }
    }
  }
}

function nearestCrate() {
  let best = null, bd = 4;
  for (const c of G.crates) { const d = Math.hypot(c.x - G.pos.x, c.z - G.pos.z); if (d < bd) { bd = d; best = c; } }
  return best;
}
function nearestDrop() {
  let best = null, bd = 4;
  for (const d of G.drops) { const dd = Math.hypot(d.x - G.pos.x, d.z - G.pos.z); if (dd < bd) { bd = dd; best = d; } }
  return best;
}
function tryLoot() {
  if (G.dead) return;
  const c = nearestCrate();
  if (c) {
    burstSparks(c.x, 1, c.z, 0xffd54f);
    if (G.online) send({ t: 'loot', crateId: c.id });
    else {
      if (c.kind === 'equip') {
        const g = offlineRollEquip();
        G.gear.push(g);
        showLootPopup(EQUIPMENT[g.id]);
        sysMsg('Mở rương trang bị: nhận ' + EQUIPMENT[g.id].name + ' [' + RARITY_NAME[EQUIPMENT[g.id].rarity] + ']');
      } else {
        for (const k in c.items) G.inv[k] = (G.inv[k] || 0) + c.items[k];
        sysMsg('Nhặt được: ' + Object.entries(c.items).map(([k, v]) => ITEM_NAME[k] + ' x' + v).join(', '));
      }
      G.crates = G.crates.filter(x => x.id !== c.id);
      rebuildCrates(); renderInv(); renderHotbar(); renderGear();
      setTimeout(() => { if (!G.online) { G.crates.push({ id: 'c' + Date.now(), x: (Math.random() - .5) * 100, z: (Math.random() - .5) * 100, items: { phelieu: 1 } }); rebuildCrates(); } }, 45000);
    }
    return;
  }
  const d = nearestDrop();
  if (d) {
    if (G.online) send({ t: 'pickup', dropId: d.id });
    else { for (const k in d.items) G.inv[k] = (G.inv[k] || 0) + d.items[k]; G.drops = G.drops.filter(x => x.id !== d.id); rebuildDrops(); renderInv(); renderHotbar(); }
  }
}
let dropSel = 'mi';
function dropSelected() {
  if ((G.inv[dropSel] || 0) > 0) {
    if (G.online) send({ t: 'drop', item: dropSel, qty: 1 });
    else { G.inv[dropSel]--; if (!G.inv[dropSel]) delete G.inv[dropSel]; G.drops.push({ id: 'd' + Date.now(), x: G.pos.x + 1, z: G.pos.z, items: { [dropSel]: 1 } }); rebuildDrops(); renderInv(); renderHotbar(); }
    sysMsg('Đã đánh rơi 1 ' + ITEM_NAME[dropSel] + ' (người khác có thể nhặt).');
  }
}

// ---------- 7. HUD / UI ----------
function sysMsg(msg) {
  const box = document.getElementById('sysmsg');
  const div = document.createElement('div'); div.className = 'sys-line'; div.textContent = msg;
  box.appendChild(div);
  const log = document.getElementById('chat-log');
  const l = document.createElement('div'); l.className = 'sys'; l.textContent = '◆ ' + msg; log.appendChild(l); log.scrollTop = 1e6;
  setTimeout(() => div.remove(), 4200);
  while (box.children.length > 3) box.firstChild.remove();
}
function chatMsg(from, msg) {
  const log = document.getElementById('chat-log');
  const div = document.createElement('div');
  div.innerHTML = '<b>◈ ' + escapeHtml(from) + ':</b> ' + escapeHtml(msg);
  log.appendChild(div); log.scrollTop = 1e6;
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function updateHUD() {
  document.getElementById('bar-hp').style.width = (G.hp / G.maxHp * 100) + '%';
  document.getElementById('bar-doi').style.width = G.doi + '%';
  document.getElementById('bar-theluc').style.width = G.theluc + '%';
  document.getElementById('day-num').textContent = 'NGÀY ' + G.day + ' / 30';
  const ph = document.getElementById('day-phase');
  ph.textContent = G.night ? '🌙 ĐÊM — HẮC THÚ ĐI SĂN' : '☀️ NGÀY — THU THẬP TÀI NGUYÊN';
  ph.style.color = G.night ? '#ff8a80' : '#7df9ff';
  // tracker mục tiêu
  const obj = document.getElementById('obj-text');
  if (obj) {
    if (G.day >= 30) obj.textContent = '◈ MỤC TIÊU: TIÊU DIỆT HẮC THÚ VƯƠNG!';
    else if (G.day >= 28) obj.textContent = '◈ MỤC TIÊU: Chuẩn bị — Hắc Thú Vương sắp giáng lâm!';
    else if (G.night) obj.textContent = '◈ MỤC TIÊU: Sống sót qua đêm nay!';
    else obj.textContent = '◈ MỤC TIÊU: Thu thập & chế tạo — Ngày ' + G.day + '/30';
  }
  // thanh máu boss
  const bb = document.getElementById('boss-bar');
  let boss = null;
  for (const [, mo] of G.monsters) if (mo.boss) { boss = mo; break; }
  if (bb) {
    if (boss) {
      bb.classList.remove('hidden');
      document.getElementById('bar-boss').style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%';
    } else bb.classList.add('hidden');
  }
  const f = document.getElementById('dmg-flash');
  if (f) { const o = parseFloat(f.style.opacity || 0); if (o > 0) f.style.opacity = Math.max(0, o - 0.03); }
}
function renderHotbar() {
  const hb = document.getElementById('hotbar'); hb.innerHTML = '';
  const weapons = Object.keys(WEAPONS).filter(w => w === 'tay' || G.crafted[w]);
  weapons.forEach((w, i) => {
    const d = document.createElement('div');
    d.className = 'slot' + (G.weapon === w ? ' active' : '');
    d.innerHTML = '<span class="ico">' + WEAPONS[w].icon + '</span><span class="key">' + (i + 1) + '</span>';
    const b = myDmgBonus();
    d.title = WEAPONS[w].name + ' (sát thương ' + (WEAPONS[w].dmg + b) + (b ? ', gồm +' + b + ' từ trang bị' : '') + ')';
    d.onclick = () => { G.weapon = w; renderHotbar(); };
    hb.appendChild(d);
  });
  ['thuoc', 'mi'].forEach(it => {
    if ((G.inv[it] || 0) > 0) {
      const d = document.createElement('div'); d.className = 'slot';
      d.innerHTML = '<span class="ico">' + ITEM_ICON[it] + '</span><span class="qty">x' + G.inv[it] + '</span>';
      d.title = ITEM_NAME[it] + ' — click để dùng';
      d.onclick = () => useItem(it);
      hb.appendChild(d);
    }
  });
}
function renderInv() {
  const gr = document.getElementById('inv-grid'); gr.innerHTML = '';
  const keys = Object.keys(G.inv);
  // Trang bị (ưu tiên hiện trước, có viền độ hiếm)
  G.gear.forEach(g => {
    const e = EQUIPMENT[g.id]; if (!e) return;
    const d = document.createElement('div');
    d.className = 'inv-item r-' + e.rarity;
    d.innerHTML = '<span class="ico">' + e.icon + '</span>' + e.name +
      '<br><span class="rarity" style="color:' + RARITY_COLOR[e.rarity] + '">' + RARITY_NAME[e.rarity] + '</span>' +
      '<br><span class="edesc">' + e.desc + '</span>';
    d.title = 'Click để mặc (' + ETYPE_NAME[e.type] + ')';
    d.onclick = () => equipGear(g.uid);
    gr.appendChild(d);
  });
  if (!keys.length && !G.gear.length) gr.innerHTML = '<p style="color:#7df9ff">Túi trống. Đi lục soát các thùng hàng phát sáng (E) đi!</p>';
  keys.forEach(k => {
    const d = document.createElement('div'); d.className = 'inv-item';
    d.innerHTML = '<span class="ico">' + (ITEM_ICON[k] || '📦') + '</span>' + (ITEM_NAME[k] || k) + '<br><span class="qty">x' + G.inv[k] + '</span>';
    d.onclick = (e) => { if (e.shiftKey) { dropSel = k; dropSelected(); } else useItem(k); };
    gr.appendChild(d);
  });
}
// ---------- TRANG BỊ ----------
function offlineRollEquip() {
  const r = Math.random();
  const rarity = r < 0.18 ? 'huyenthoai' : r < 0.50 ? 'suthi' : 'hiem';
  const pool = Object.keys(EQUIPMENT).filter(id => EQUIPMENT[id].rarity === rarity);
  return { uid: 'g' + Date.now() + Math.floor(Math.random() * 999), id: pool[Math.floor(Math.random() * pool.length)] };
}
function equipGear(uid) {
  if (G.online) { send({ t: 'equip', uid }); return; }
  const gi = G.gear.findIndex(g => g.uid === uid);
  if (gi < 0) return;
  const g = G.gear.splice(gi, 1)[0];
  const e = EQUIPMENT[g.id];
  const old = G.equipped[e.type];
  if (old) G.gear.push(old);
  G.equipped[e.type] = g;
  applyGearStats();
  sysMsg('Đã mặc ' + e.name + ' [' + RARITY_NAME[e.rarity] + ']');
  renderGear(); renderInv(); renderHotbar();
}
function unequipGear(etype) {
  if (G.online) { send({ t: 'unequip', etype }); return; }
  const old = G.equipped[etype];
  if (!old) return;
  delete G.equipped[etype];
  G.gear.push(old);
  applyGearStats();
  renderGear(); renderInv(); renderHotbar();
}
function applyGearStats() {
  let maxHp = 100;
  for (const t in G.equipped) {
    const g = G.equipped[t];
    if (g && EQUIPMENT[g.id].maxHp) maxHp += EQUIPMENT[g.id].maxHp;
  }
  G.maxHp = maxHp;
  if (G.hp > G.maxHp) G.hp = G.maxHp;
}
function renderGear() {
  const box = document.getElementById('equip-slots');
  if (!box) return;
  box.innerHTML = '';
  ['weapon', 'armor'].forEach(t => {
    const g = G.equipped[t];
    const d = document.createElement('div');
    if (g) {
      const e = EQUIPMENT[g.id];
      d.className = 'equip-slot r-' + e.rarity;
      d.innerHTML = '<span class="ico">' + e.icon + '</span><div class="ename">' + e.name + '</div>' +
        '<div class="rarity" style="color:' + RARITY_COLOR[e.rarity] + '">' + RARITY_NAME[e.rarity] + '</div>' +
        '<div class="edesc">' + e.desc + '</div>';
      d.title = 'Click để tháo';
      d.onclick = () => unequipGear(t);
    } else {
      d.className = 'equip-slot empty';
      d.innerHTML = '<span class="ico">◌</span><div class="ename">' + ETYPE_NAME[t] + '</div><div class="edesc">chưa có</div>';
    }
    box.appendChild(d);
  });
  // tổng chỉ số
  const sum = document.getElementById('equip-stats');
  if (sum) {
    const b = myDmgBonus();
    let red = 0;
    for (const t in G.equipped) { const g = G.equipped[t]; if (g && EQUIPMENT[g.id].dmgRed) red = Math.max(red, EQUIPMENT[g.id].dmgRed); }
    sum.textContent = 'Sát thương +' + b + ' · Máu tối đa ' + G.maxHp + (red ? ' · Giảm sát thương ' + Math.round(red * 100) + '%' : '');
  }
}
// ---------- Popup nhận đồ hiếm ----------
function showLootPopup(e) {
  let p = document.getElementById('loot-popup');
  if (!p) {
    p = document.createElement('div'); p.id = 'loot-popup'; p.className = 'hidden';
    p.innerHTML = '<div class="lp-tag">◆ HỆ THỐNG — NHẬN TRANG BỊ ◆</div><div class="lp-icon"></div><div class="lp-name"></div><div class="lp-rarity"></div><div class="lp-desc"></div>';
    document.getElementById('hud').appendChild(p);
  }
  p.className = 'r-' + e.rarity;
  p.querySelector('.lp-icon').textContent = e.icon;
  p.querySelector('.lp-name').textContent = e.name;
  const r = p.querySelector('.lp-rarity');
  r.textContent = '✦ ' + RARITY_NAME[e.rarity] + ' ✦'; r.style.color = RARITY_COLOR[e.rarity];
  p.querySelector('.lp-desc').textContent = e.desc + ' — vào Túi đồ (I) để mặc';
  p.classList.remove('hidden', 'lp-anim');
  void p.offsetWidth;
  p.classList.add('lp-anim');
  clearTimeout(p._t);
  // ẩn khi animation kết thúc (đồng bộ với CSS, không phụ thuộc wall-clock)
  p.onanimationend = () => p.classList.add('hidden');
  p._t = setTimeout(() => p.classList.add('hidden'), 7000); // dự phòng
}
function useItem(it) {
  if ((G.inv[it] || 0) <= 0) return;
  if (G.online) send({ t: 'use', item: it });
  else {
    if (it === 'thuoc' && G.hp < G.maxHp) { G.inv.thuoc--; G.hp = Math.min(G.maxHp, G.hp + 40); burstSparks(G.pos.x, 1.5, G.pos.z, 0x00e5ff); }
    if ((it === 'mi' || it === 'dohop') && G.doi < 100) { G.inv[it]--; G.doi = Math.min(100, G.doi + (it === 'mi' ? 35 : 50)); }
    for (const k in G.inv) if (!G.inv[k]) delete G.inv[k];
    renderInv(); renderHotbar();
  }
}
function renderCraft() {
  const list = document.getElementById('craft-list'); list.innerHTML = '';
  RECIPES.forEach(r => {
    const need = Object.entries(r.need).map(([k, v]) => (ITEM_ICON[k] || '') + (ITEM_NAME[k] || k) + ' x' + v + ' (có ' + (G.inv[k] || 0) + ')').join(', ');
    const owned = G.crafted[r.id];
    const row = document.createElement('div'); row.className = 'craft-row';
    row.innerHTML = '<div><b>' + r.name + '</b> ' + (owned ? '<span style="color:#00e5ff">◆ ĐÃ CÓ</span>' : '') + '<br><span class="need">' + r.desc + '<br>Cần: ' + need + '</span></div>';
    const btn = document.createElement('button'); btn.textContent = owned ? 'Đã có' : 'Chế tạo'; btn.disabled = !!owned;
    btn.onclick = () => { send({ t: 'craft', item: r.id }); offlineCraft(r); };
    row.appendChild(btn); list.appendChild(row);
  });
}
function offlineCraft(r) {
  if (G.online || G.crafted[r.id]) return;
  if (Object.entries(r.need).every(([k, v]) => (G.inv[k] || 0) >= v)) {
    for (const k in r.need) { G.inv[k] -= r.need[k]; if (!G.inv[k]) delete G.inv[k]; }
    G.crafted[r.id] = true; if (WEAPONS[r.id]) G.weapon = r.id;
    burstSparks(G.pos.x, 1.5, G.pos.z, 0x00e5ff);
    sysMsg('Đã chế tạo ' + r.name + '!'); renderInv(); renderHotbar(); renderCraft();
  } else sysMsg('Không đủ nguyên liệu!');
}
function togglePanel(id) {
  const el = document.getElementById(id);
  const show = el.classList.contains('hidden');
  document.getElementById('inventory').classList.add('hidden');
  document.getElementById('craft').classList.add('hidden');
  document.getElementById('equipment').classList.add('hidden');
  if (show) {
    el.classList.remove('hidden');
    if (id === 'inventory') renderInv();
    if (id === 'craft') renderCraft();
    if (id === 'equipment') renderGear();
  }
}

function onDeath() {
  G.dead = true;
  showEnd('BẠN ĐÃ GỤC NGÃ', 'Ngày ' + G.day + '. Đừng bỏ cuộc — lần này ta sẽ đi xa hơn!');
  document.getElementById('btn-respawn').style.display = '';
}
function showEnd(title, desc) {
  document.getElementById('end-title').textContent = title;
  document.getElementById('end-desc').textContent = desc;
  document.getElementById('end-screen').classList.remove('hidden');
  if (title.includes('CHIẾN THẮNG')) document.getElementById('btn-respawn').style.display = 'none';
}
function hideEnd() { document.getElementById('end-screen').classList.add('hidden'); }

// ---------- 8. CẬP NHẬT HIỆU ỨNG ----------
function updateFX(dt, t) {
  // lửa cháy
  for (const f of fires) {
    f.light.intensity = 1.4 + Math.sin(t * 13 + f.seed) * 0.35 + Math.random() * 0.25;
    for (const sp of f.parts) {
      sp.userData.life += dt;
      if (sp.userData.life >= sp.userData.max) resetFlame(sp, f.x, f.z, false);
      const k = sp.userData.life / sp.userData.max;
      sp.position.y += dt * (1.6 + k * 1.5);
      sp.position.x += Math.sin(t * 5 + sp.userData.max * 10) * dt * 0.5;
      const s = (0.7 + Math.random() * 0.2) * (1 - k * 0.7);
      sp.scale.set(s, s * 1.6, 1);
      sp.material.opacity = 0.9 * (1 - k);
    }
  }
  // tro bay
  if (ashPts) {
    const pos = ashPts.geometry.attributes.position.array;
    for (let i = 0; i < ashVel.length; i++) {
      pos[i * 3 + 1] -= ashVel[i] * dt;
      pos[i * 3] += Math.sin(t * 0.7 + i) * dt * 0.8;
      if (pos[i * 3 + 1] < 0) { pos[i * 3 + 1] = 26; pos[i * 3] = (Math.random() - .5) * 130; pos[i * 3 + 2] = (Math.random() - .5) * 130; }
    }
    ashPts.geometry.attributes.position.needsUpdate = true;
  }
  // tia lửa / vòng chém
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (p.userData.fx === 'slash') {
      p.userData.life -= dt;
      const k = p.userData.life / p.userData.max;
      p.material.opacity = Math.max(0, k);
      const s = 1 + (1 - k) * 1.6; p.scale.set(s, s, 1);
      if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    } else if (p.userData.fx === 'dmgnum') {
      p.userData.life -= dt;
      p.position.y += dt * 1.8;
      p.material.opacity = Math.max(0, p.userData.life / p.userData.max);
      if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    } else {
      p.userData.life -= dt;
      p.userData.vy -= 9 * dt;
      p.position.x += p.userData.vx * dt; p.position.y += p.userData.vy * dt; p.position.z += p.userData.vz * dt;
      p.material.opacity = Math.max(0, p.userData.life / p.userData.max);
      if (p.userData.life <= 0 || p.position.y < 0) { scene.remove(p); particles.splice(i, 1); }
    }
  }
}

// ---------- 9. VÒNG LẶP CHÍNH ----------
let lastT = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  const t = now / 1000;
  offlineTick(dt);
  updatePlayer(dt);
  updateSky(dt);
  updateFX(dt, t);
  for (const [, e] of monsterMeshes) {
    const u = e.mesh.userData, m = e.mesh;
    // vận tốc thực tế để biết đang chạy hay đứng
    const vx = (m.position.x - (u.px || m.position.x)) / Math.max(dt, 0.001);
    const vz = (m.position.z - (u.pz || m.position.z)) / Math.max(dt, 0.001);
    u.px = m.position.x; u.pz = m.position.z;
    const spd = Math.min(1, Math.hypot(vx, vz) / 3);
    // quay mặt về hướng di chuyển
    if (spd > 0.05) m.rotation.y = turnToward(m.rotation.y, Math.atan2(vx, vz), dt * 6);
    // 4 chân chạy so le
    const wt = t * (5 + spd * 7);
    (u.legs || []).forEach((leg, i) => {
      const ph = (i % 2) * Math.PI + (i < 2 ? 0 : Math.PI * 0.55);
      leg.rotation.x = Math.sin(wt + ph) * 0.65 * spd;
    });
    // hàm há ra khi gần người chơi
    const pd = Math.hypot(G.pos.x - m.position.x, G.pos.z - m.position.z);
    const wantOpen = pd < 4 ? 1 : 0;
    u.jawOpen = (u.jawOpen || 0) + (wantOpen - (u.jawOpen || 0)) * Math.min(1, dt * 8);
    if (u.jawG) u.jawG.rotation.x = (u.jawOpen || 0) * 0.55;
    // đuôi vẫy + thân thở
    if (u.tail) u.tail.rotation.y = Math.sin(t * 2.6 + m.position.x) * 0.45;
    if (u.body) { const b = 1 + Math.sin(t * 3.2) * 0.02; u.body.scale.set(b, 0.92 * b, 1.35 * b); }
    if (u.aura) u.aura.material.opacity = 0.28 + Math.sin(t * 4) * 0.12 + spd * 0.1;
  }
  for (const [, m] of crateMeshes) {
    m.userData.glow.material.opacity = 0.35 + Math.sin(t * 4) * 0.2;
    if (m.userData.isEquip) { // rương trang bị: ngọc xoay + cột sáng nhấp nháy
      if (m.userData.gem) { m.userData.gem.rotation.y += dt * 3; m.userData.gem.position.y = 1.55 + Math.sin(t * 3) * 0.12; }
      if (m.userData.beam) m.userData.beam.material.opacity = 0.2 + Math.sin(t * 2.4) * 0.12;
      m.userData.glow.material.opacity = 0.6 + Math.sin(t * 5) * 0.25;
    }
  }
  if (clickMarker) clickMarker.material.opacity = 0.55 + Math.sin(t * 6) * 0.3;
  for (const [, m] of dropMeshes) { m.rotation.y += dt * 2; m.userData.core.position.y = 0.6 + Math.sin(t * 3) * 0.15; }
  for (const [, e] of otherMeshes) {
    if (!e.data) continue;
    const u = e.mesh.userData;
    if (u.isGLTF) setCharAnim(u, e.data.anim === 'walk' ? 'Walk' : 'Idle');
    else e.mesh.position.y = animSurvivor(u, e.data.anim === 'walk', t, dt, false);
  }
  // update animation xương cho tất cả nhân vật model thật
  for (const ud of charMixers) ud.mixer.update(dt);
  updateHUD();
  renderer.render(scene, camera);
}

// ---------- 10. KHỞI ĐỘNG ----------
document.getElementById('btn-start').addEventListener('click', () => {
  const btn = document.getElementById('btn-start');
  btn.textContent = 'ĐANG TẢI NHÂN VẬT...'; btn.disabled = true;
  G.name = document.getElementById('player-name').value.trim() || 'Người sống sót';
  let url = document.getElementById('server-url').value.trim();
  if (url && !url.startsWith('ws')) url = 'wss://' + url.replace(/^https?:\/\//, '');
  // tải model người 3D thật trước (rớt mạng thì dùng nhân vật dự phòng)
  loadSoldier(() => {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    initThree(); initInput(); renderHotbar();
    connect(url, () => {
      loop();
      sysMsg('HỆ THỐNG: Chào ' + G.name + '. Sống sót 30 ngày. Ngày 30, Hắc Thú Vương giáng lâm.');
      if (!soldierTpl) sysMsg('Chế độ nhân vật đơn giản (không tải được model 3D).');
    });
  });
});
document.getElementById('btn-respawn').addEventListener('click', () => {
  if (G.online) send({ t: 'respawn' });
  else { G.dead = false; G.hp = 60; G.doi = 60; G.pos.x = 0; G.pos.z = 8; hideEnd(); }
});
