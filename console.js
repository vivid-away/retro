/* ===================================================
   RETRO COLLECTOR - console.js  v3.0
   =================================================== */

let currentSlug         = '';
let allGames            = [];
let ownedData           = {};
let starData            = {};
let wishData            = {};          // v3
let consoleInfo         = {};
let currentFilter       = 'all';
let currentSort         = 'serial';
let searchQuery         = '';
let editingSerial       = null;
let pendingStarOverride = undefined;   // undefined=未変更 null=リセット 0-5=新値
let pendingWish         = undefined;   // v3: undefined=未変更 true/false=新値

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  currentSlug = params.get('slug') || '';
  if (!currentSlug) { location.href = 'index.html'; return; }

  const consoles = getConsoles();
  consoleInfo = consoles.find(c => c.slug === currentSlug);
  if (!consoleInfo) { location.href = 'index.html'; return; }

  loadData();
  setupHeader();
  renderStats();
  renderList();
  setupSearch();
});

/* ── Load ── */
function loadData() {
  allGames  = getGames(currentSlug);
  ownedData = getOwnedData(currentSlug);
  starData  = getStarData(currentSlug);
  wishData  = getWishData(currentSlug);
}

/* ── Header ── */
function setupHeader() {
  const color = consoleInfo.color;
  document.getElementById('consoleBadge').textContent       = consoleInfo.slug;
  document.getElementById('consoleBadge').style.borderColor = color;
  document.getElementById('consoleName').textContent        = consoleInfo.name;
  document.getElementById('consoleName').style.color        = color;
  document.getElementById('consoleName').style.textShadow   = `0 0 12px ${color}80`;
  document.getElementById('consoleHeader').style.borderBottomColor = color;
  document.title = 'RETRO COLLECTOR - ' + consoleInfo.name;
}

/* ── Stats ── */
function renderStats() {
  const s = calcConsoleStats(currentSlug);
  document.getElementById('cstatTotal').textContent   = s.total.toLocaleString();
  document.getElementById('cstatOwned').textContent   = s.owned.toLocaleString();
  document.getElementById('cstatMissing').textContent = s.missing.toLocaleString();
  document.getElementById('cstatValue').textContent   = formatYen(s.value);
  document.getElementById('cstatWish').textContent    = s.wished.toLocaleString();
  document.getElementById('headerRate').textContent   = s.rate + '%';
  document.getElementById('consoleSub').textContent   = `${s.owned} / ${s.total} タイトル`;
  const fill = document.getElementById('consoleProgressFill');
  fill.style.width      = s.rate + '%';
  fill.style.background = `linear-gradient(90deg, ${consoleInfo.color}, #00f5ff)`;
}

/* ── Search ── */
function setupSearch() {
  const input    = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearch');
  input.addEventListener('input', () => {
    searchQuery = input.value.trim();
    clearBtn.classList.toggle('visible', searchQuery.length > 0);
    renderList();
  });
}
function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('clearSearch').classList.remove('visible');
  searchQuery = '';
  renderList();
}

/* ── Filter & Sort ── */
function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === f)
  );
  renderList();
}
function applySort() {
  currentSort = document.getElementById('sortSelect').value;
  renderList();
}

/* ── Filtered + Sorted list ── */
function getFilteredGames() {
  let list = allGames.map(g => {
    const ud      = ownedData[g.serial] || {};
    const effStar = getEffectiveStars(currentSlug, g);
    const wished  = !!wishData[g.serial];
    return { ...g, _ud: ud, _stars: effStar, _wished: wished };
  });

  if (currentFilter === 'owned')   list = list.filter(g => g._ud.owned);
  if (currentFilter === 'missing') list = list.filter(g => !g._ud.owned);
  if (currentFilter === 'wish')    list = list.filter(g => g._wished);       // v3

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(g =>
      g.title.toLowerCase().includes(q) ||
      (g.publisher || '').toLowerCase().includes(q) ||
      String(g.serial).toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => {
    switch (currentSort) {
      case 'title':      return a.title.localeCompare(b.title, 'ja');
      case 'rarity':     return (b._stars || 0) - (a._stars || 0);
      case 'date':       return (a.releaseDate || '').localeCompare(b.releaseDate || '');
      case 'price_desc': return (parseInt(b._ud.price,10)||0) - (parseInt(a._ud.price,10)||0);
      case 'price_asc':  return (parseInt(a._ud.price,10)||0) - (parseInt(b._ud.price,10)||0);
      default: {
        const na = parseInt(a.serial,10), nb = parseInt(b.serial,10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a.serial).localeCompare(String(b.serial));
      }
    }
  });
  return list;
}

/* ── Render list ── */
function renderList() {
  const list  = getFilteredGames();
  const el    = document.getElementById('gameList');
  const empty = document.getElementById('emptyState');
  document.getElementById('resultInfo').textContent =
    `${list.length.toLocaleString()}件表示 / 全${allGames.length.toLocaleString()}件`;

  if (list.length === 0) {
    el.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  el.innerHTML = list.map((g, i) => buildGameRow(g, i)).join('');
}

function buildGameRow(g, i) {
  const ud     = g._ud;
  const owned  = !!ud.owned;
  const wished = !!g._wished;
  const price  = parseInt(ud.price, 10) || 0;
  const stars  = g._stars;
  const tagHtml = rarityTagHtml(stars, g.rarity);

  const priceStr = price > 0 ? formatYen(price) : '未設定';
  const priceCls = price > 0 ? '' : 'empty';

  // ウィッシュボタン: クリックで即保存（モーダルを開かずに切り替え）
  const wishCls  = wished ? 'wish-btn wished' : 'wish-btn';
  const wishTip  = wished ? 'ウィッシュ解除' : 'ウィッシュ登録';

  return `
  <div class="game-row ${owned ? 'owned' : ''} ${wished && !owned ? 'wished' : ''}"
       style="animation-delay:${Math.min(i*15,300)}ms"
       onclick="openModal('${escAttr(g.serial)}')">
    <div class="row-serial">${escHtml(g.serial)}</div>
    <div class="row-main">
      <div class="row-title">
        ${escHtml(g.title)}
        ${owned  ? '<span class="owned-badge">所持</span>' : ''}
        ${wished && !owned ? '<span class="wish-badge">♡ WISH</span>' : ''}
      </div>
      <div class="row-meta">
        ${g.publisher  ? `<span class="row-publisher">${escHtml(g.publisher)}</span>` : ''}
        ${g.releaseDate? `<span class="row-date">${formatDate(g.releaseDate)}</span>` : ''}
      </div>
    </div>
    <div class="row-rarity">${tagHtml}</div>
    <div class="row-right">
      <button class="${wishCls}" title="${wishTip}"
              onclick="quickToggleWish(event,'${escAttr(g.serial)}')">♡</button>
      <span class="row-price ${priceCls}">${priceStr}</span>
      ${ud.purchaseDate ? `<span class="row-purchase-date">${escHtml(ud.purchaseDate)}</span>` : ''}
    </div>
  </div>`;
}

/* ── ウィッシュ即時トグル（行ボタン用） ── */
function quickToggleWish(event, serial) {
  event.stopPropagation();   // 行クリック(モーダル)を止める
  const next = toggleWish(currentSlug, serial);
  wishData = getWishData(currentSlug);
  renderStats();
  renderList();
  showToast(next ? '♡ ウィッシュ登録しました' : 'ウィッシュを解除しました', next ? 'wish' : '');
}

/* ── Modal ── */
function openModal(serial) {
  editingSerial       = serial;
  pendingStarOverride = undefined;
  pendingWish         = undefined;

  const game = allGames.find(g => String(g.serial) === String(serial));
  if (!game) return;

  const ud         = ownedData[serial] || {};
  const effStar    = getEffectiveStars(currentSlug, game);
  const hasOverride= getGameStarOverride(currentSlug, serial) !== null;
  const wished     = !!wishData[serial];

  // Game info
  document.getElementById('modalGameInfo').innerHTML = `
    <div class="modal-game-title">${escHtml(game.title)}</div>
    <div class="modal-game-meta">
      <div class="meta-item">
        <div class="meta-label">SERIAL</div>
        <div class="meta-value">${escHtml(game.serial)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">PUBLISHER</div>
        <div class="meta-value">${escHtml(game.publisher || '-')}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">RARITY (CSV)</div>
        <div class="meta-value">${game.rarity ? escHtml(game.rarity) : 'なし'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">RELEASE</div>
        <div class="meta-value">${game.releaseDate ? formatDate(game.releaseDate) : '-'}</div>
      </div>
    </div>`;

  // Star editor
  const origLabel = game.rarity ? `CSV: ${game.rarity} → ★${game.stars}` : 'CSV: なし';
  document.getElementById('rarityOrigLabel').textContent = origLabel;
  updateStarButtons(effStar, hasOverride);

  // ウィッシュトグル
  updateWishToggle(wished);

  // Form fields
  document.getElementById('ownedCheck').checked      = !!ud.owned;
  document.getElementById('priceInput').value        = ud.price || '';
  document.getElementById('purchaseDateInput').value = ud.purchaseDate || '';
  document.getElementById('memoInput').value         = ud.memo || '';

  document.getElementById('modalOverlay').classList.add('open');
}

/* ウィッシュトグル表示更新 */
function updateWishToggle(wished) {
  const btn = document.getElementById('modalWishBtn');
  if (!btn) return;
  const current = (pendingWish !== undefined) ? pendingWish : wished;
  btn.textContent = current ? '♡ ウィッシュ登録中（タップで解除）' : '♡ ウィッシュに追加';
  btn.className   = current ? 'wish-toggle-btn wished' : 'wish-toggle-btn';
}

function clickModalWish() {
  const game  = allGames.find(g => String(g.serial) === String(editingSerial));
  if (!game) return;
  const base  = !!wishData[editingSerial];
  // pending が未設定なら base を反転、設定済みならそれを反転
  pendingWish = (pendingWish !== undefined) ? !pendingWish : !base;
  updateWishToggle(base);
}

/* Star buttons */
function updateStarButtons(effStar, hasOverride) {
  document.querySelectorAll('.star-btn').forEach(btn => btn.classList.remove('active'));
  if (pendingStarOverride === undefined) {
    document.querySelectorAll('.star-btn[data-v]').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.v,10) === effStar);
    });
  } else if (pendingStarOverride === null) {
    document.querySelector('.star-btn.reset-star')?.classList.add('active');
  } else {
    document.querySelectorAll('.star-btn[data-v]').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.v,10) === pendingStarOverride);
    });
  }
}
function setStarEdit(val) {
  pendingStarOverride = val;
  const game    = allGames.find(g => String(g.serial) === String(editingSerial));
  const effStar = (val === null) ? (game ? game.stars : 0) : val;
  updateStarButtons(effStar, val !== null);
}

/* Close */
function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('open');
  editingSerial = null;
  pendingStarOverride = undefined;
  pendingWish         = undefined;
}

/* Save */
function saveGame() {
  if (!editingSerial) return;

  // Star override
  if (pendingStarOverride !== undefined) {
    setGameStarOverride(currentSlug, editingSerial, pendingStarOverride);
    starData = getStarData(currentSlug);
  }

  // Wish
  if (pendingWish !== undefined) {
    setWish(currentSlug, editingSerial, pendingWish);
    wishData = getWishData(currentSlug);
  }

  // User data
  const userData = {
    owned:        document.getElementById('ownedCheck').checked,
    price:        parseInt(document.getElementById('priceInput').value, 10) || 0,
    purchaseDate: document.getElementById('purchaseDateInput').value,
    memo:         document.getElementById('memoInput').value,
  };
  setGameUserData(currentSlug, editingSerial, userData);
  ownedData = getOwnedData(currentSlug);

  document.getElementById('modalOverlay').classList.remove('open');
  editingSerial       = null;
  pendingStarOverride = undefined;
  pendingWish         = undefined;

  renderStats();
  renderList();
  showToast('保存しました', 'success');
}

/* ESC */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  document.getElementById('modalOverlay').classList.remove('open');
  editingSerial = null;
  pendingStarOverride = undefined;
  pendingWish         = undefined;
});

/* ── Helpers ── */
function formatDate(s) {
  if (!s) return '';
  const m = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (!m) return s;
  return m[1] + '年' + m[2] + '月' + (m[3] ? m[3] + '日' : '');
}
function escAttr(str) { return String(str||'').replace(/'/g,"\\'"); }
