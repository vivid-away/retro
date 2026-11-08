/* ===================================================
   RETRO COLLECTOR - db.js  v3.0
   LocalStorage data layer
   =================================================== */

const DB_KEY_CONSOLES = 'rc_consoles';
const DB_KEY_GAMES    = 'rc_games_';   // + slug
const DB_KEY_OWNED    = 'rc_owned_';   // + slug
const DB_KEY_STARS    = 'rc_stars_';   // + slug
const DB_KEY_WISH     = 'rc_wish_';    // + slug  ← v3 NEW

/* ============ Console Registry ============ */

function getConsoles() {
  try { return JSON.parse(localStorage.getItem(DB_KEY_CONSOLES)) || []; }
  catch { return []; }
}
function saveConsoles(list) {
  localStorage.setItem(DB_KEY_CONSOLES, JSON.stringify(list));
}
function addConsole(name, slug, color) {
  const list = getConsoles();
  if (list.find(c => c.slug === slug)) throw new Error('機種 "' + slug + '" はすでに存在します');
  list.push({ name, slug, color });
  saveConsoles(list);
}
function deleteConsole(slug) {
  saveConsoles(getConsoles().filter(c => c.slug !== slug));
  localStorage.removeItem(DB_KEY_GAMES + slug);
  localStorage.removeItem(DB_KEY_OWNED + slug);
  localStorage.removeItem(DB_KEY_STARS + slug);
  localStorage.removeItem(DB_KEY_WISH  + slug);
}
function updateConsole(slug, name, color) {
  const list = getConsoles();
  const idx  = list.findIndex(c => c.slug === slug);
  if (idx === -1) throw new Error('機種が見つかりません');
  list[idx].name  = name;
  list[idx].color = color;
  saveConsoles(list);
}

/* ============ Game List ============ */

function getGames(slug) {
  try { return JSON.parse(localStorage.getItem(DB_KEY_GAMES + slug)) || []; }
  catch { return []; }
}
function saveGames(slug, games) {
  localStorage.setItem(DB_KEY_GAMES + slug, JSON.stringify(games));
}

/* ============ Owned / User Data ============ */

function getOwnedData(slug) {
  try { return JSON.parse(localStorage.getItem(DB_KEY_OWNED + slug)) || {}; }
  catch { return {}; }
}
function saveOwnedData(slug, data) {
  localStorage.setItem(DB_KEY_OWNED + slug, JSON.stringify(data));
}
function setGameUserData(slug, serial, userData) {
  const data = getOwnedData(slug);
  data[serial] = userData;
  saveOwnedData(slug, data);
}
function getGameUserData(slug, serial) {
  const data = getOwnedData(slug);
  return data[serial] || { owned: false, price: 0, purchaseDate: '', memo: '' };
}

/* ============ Star Override ============ */

function getStarData(slug) {
  try { return JSON.parse(localStorage.getItem(DB_KEY_STARS + slug)) || {}; }
  catch { return {}; }
}
function saveStarData(slug, data) {
  localStorage.setItem(DB_KEY_STARS + slug, JSON.stringify(data));
}
function setGameStarOverride(slug, serial, stars) {
  const data = getStarData(slug);
  if (stars === null) { delete data[serial]; }
  else { data[serial] = Math.min(5, Math.max(0, parseInt(stars, 10) || 0)); }
  saveStarData(slug, data);
}
function getGameStarOverride(slug, serial) {
  const data = getStarData(slug);
  return (serial in data) ? data[serial] : null;
}
function getEffectiveStars(slug, game) {
  const ov = getGameStarOverride(slug, game.serial);
  return (ov !== null) ? ov : game.stars;
}

/* ============ Wish List  (v3 NEW) ============
   rc_wish_{slug} = { [serial]: true }
   シリアルキーが存在＆値が true = ウィッシュ登録済み
*/
function getWishData(slug) {
  try { return JSON.parse(localStorage.getItem(DB_KEY_WISH + slug)) || {}; }
  catch { return {}; }
}
function saveWishData(slug, data) {
  localStorage.setItem(DB_KEY_WISH + slug, JSON.stringify(data));
}
function isWished(slug, serial) {
  return !!getWishData(slug)[serial];
}
function setWish(slug, serial, wished) {
  const data = getWishData(slug);
  if (wished) { data[serial] = true; }
  else         { delete data[serial]; }
  saveWishData(slug, data);
}
function toggleWish(slug, serial) {
  const next = !isWished(slug, serial);
  setWish(slug, serial, next);
  return next;
}
/* ウィッシュ登録ゲームの詳細リストを返す（ポータル表示用） */
function getWishList(slug) {
  const games   = getGames(slug);
  const wishMap = getWishData(slug);
  return games.filter(g => wishMap[g.serial]);
}
/* 全機種のウィッシュ件数合計 */
function calcTotalWish() {
  return getConsoles().reduce((sum, c) => {
    return sum + Object.keys(getWishData(c.slug)).length;
  }, 0);
}

/* ============ Statistics ============ */

function calcConsoleStats(slug) {
  const games = getGames(slug);
  const own   = getOwnedData(slug);
  const wish  = getWishData(slug);
  let owned = 0, value = 0, wished = 0;
  games.forEach(g => {
    const ud = own[g.serial] || {};
    if (ud.owned)     { owned++; value += parseInt(ud.price, 10) || 0; }
    if (wish[g.serial]) wished++;
  });
  const total = games.length;
  return {
    total, owned, missing: total - owned, value, wished,
    rate: total > 0 ? Math.round(owned / total * 100) : 0,
  };
}
function calcAllStats() {
  let total = 0, owned = 0, value = 0, wished = 0;
  getConsoles().forEach(c => {
    const s = calcConsoleStats(c.slug);
    total += s.total; owned += s.owned; value += s.value; wished += s.wished;
  });
  return { total, owned, value, wished,
           rate: total > 0 ? Math.round(owned / total * 100) : 0 };
}

/* ============ CSV Parser ============ */

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('データが見つかりません');

  const rawHeaders = parseCSVLine(lines[0]);
  const headers    = rawHeaders.map(h => h.trim().toLowerCase());

  const colSerial    = findCol(headers, ['serial number','serialnumber','serial','通し番号']);
  const colTitle     = findCol(headers, ['タイトル','title']);
  const colPublisher = findCol(headers, ['発売元','publisher','メーカー']);
  const colRarity    = findCol(headers, ['レア','レア度','rarity','rare']);
  const colDate      = findCol(headers, ['発売日','date','releasedate']);

  if (colTitle === -1) throw new Error('「タイトル」列が見つかりません');

  const games = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    const serial    = colSerial    >= 0 ? (cols[colSerial]    || '').trim() : String(i);
    const title     = colTitle     >= 0 ? (cols[colTitle]     || '').trim() : '';
    const publisher = colPublisher >= 0 ? (cols[colPublisher] || '').trim() : '';
    const rarityRaw = colRarity    >= 0 ? (cols[colRarity]    || '').trim() : '';
    const dateRaw   = colDate      >= 0 ? (cols[colDate]      || '').trim() : '';
    if (!title) continue;
    games.push({
      serial, title, publisher,
      rarity:      rarityRaw,
      stars:       calcStarsFromRarity(rarityRaw),
      releaseDate: normalizeDate(dateRaw),
    });
  }
  return games;
}

function findCol(headers, candidates) {
  for (const c of candidates) {
    const idx = headers.findIndex(h => h === c || h.includes(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

function normalizeDate(s) {
  if (!s) return '';
  const m = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/);
  if (m) return m[1] + '-' + m[2].padStart(2,'0') + '-' + m[3].padStart(2,'0');
  const m2 = s.match(/(\d{4})年(\d{1,2})月/);
  if (m2) return m2[1] + '-' + m2[2].padStart(2,'0');
  return s;
}

function calcStarsFromRarity(raw) {
  if (!raw || raw.trim() === '') return 0;
  const s = raw.trim().toUpperCase();
  const topMatch = s.match(/TOP\s*(\d+)/);
  if (topMatch) {
    const n = parseInt(topMatch[1], 10);
    if (n <= 2) return 5;
    if (n <= 5) return 4;
    return 3;
  }
  if (s.includes('EX')) return 5;
  const srMatch = s.match(/^(S*)R/);
  if (srMatch) return Math.min(srMatch[1].length + 1, 5);
  return 1;
}

function parseCSVLine(line) {
  const result = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

/* ============ Helpers ============ */

function formatYen(n) {
  if (!n && n !== 0) return '-';
  return '¥' + Number(n).toLocaleString('ja-JP');
}

function rarityTagHtml(stars, rawLabel) {
  const labels = ['なし','★','★★','★★★','★★★★','★★★★★'];
  const cls    = 'r' + Math.min(5, Math.max(0, stars));
  const text   = labels[stars] || '★★★★★';
  const title  = rawLabel ? ` title="${escHtml(rawLabel)}"` : '';
  return `<span class="rarity-tag ${cls}"${title}>${text}</span>`;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, type = '') {
  let el = document.getElementById('_toast');
  if (!el) {
    el = document.createElement('div');
    el.id = '_toast'; el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast ' + type;
  requestAnimationFrame(() => {
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2500);
  });
}

function initSampleData() {}
