/* ===================================================
   RETRO COLLECTOR - portal.js  v3.0
   =================================================== */

document.addEventListener('DOMContentLoaded', () => {
  renderPortal();
});

function renderPortal() {
  renderStats();
  renderConsoleCards();
  renderWishSection();
}

/* ── Overall Stats ── */
function renderStats() {
  const s = calcAllStats();
  document.getElementById('headerTotal').textContent = s.total.toLocaleString();
  document.getElementById('headerOwned').textContent = s.owned.toLocaleString();
  document.getElementById('headerWish').textContent  = s.wished.toLocaleString();
  document.getElementById('statTotal').textContent   = s.total.toLocaleString();
  document.getElementById('statOwned').textContent   = s.owned.toLocaleString();
  document.getElementById('statValue').textContent   = formatYen(s.value);
  document.getElementById('statRate').textContent    = s.rate + '%';
  document.getElementById('statWish').textContent    = s.wished.toLocaleString();
  document.getElementById('overallPct').textContent  = s.rate + '%';
  document.getElementById('overallBar').style.width  = s.rate + '%';
}

/* ── Console Cards ── */
function renderConsoleCards() {
  const grid     = document.getElementById('consolesGrid');
  const consoles = getConsoles();

  if (consoles.length === 0) {
    grid.innerHTML = `
      <div class="no-consoles">
        <div class="no-consoles-icon">👾</div>
        <p>機種が登録されていません</p>
        <p>下のフォームからCSVをインポートして追加してください</p>
      </div>`;
    return;
  }
  grid.innerHTML = consoles.map(buildConsoleCard).join('');
}

function buildConsoleCard(c) {
  const s       = calcConsoleStats(c.slug);
  const bg      = hexToRgb(c.color);
  const bgStyle = bg
    ? `background: linear-gradient(135deg, rgb(${bg.r},${bg.g},${bg.b}) 0%, #1a0a2e 100%);`
    : `background: linear-gradient(135deg, #3d2a7a 0%, #1a0a2e 100%);`;
  const lighter = lightenHex(c.color, 40);

  return `
  <div class="console-card-wrapper" style="border-color:${c.color}44;">
    <a href="console.html?slug=${encodeURIComponent(c.slug)}" class="console-card">
      <div class="console-card-header" style="${bgStyle}">
        <span class="console-card-badge">${escHtml(c.slug)}</span>
        <span class="console-card-title">${escHtml(c.name)}</span>
      </div>
      <div class="console-card-body">
        <div class="console-mini-stats">
          <div class="mini-stat">
            <span class="mini-stat-val">${s.total.toLocaleString()}</span>
            <span class="mini-stat-lbl">タイトル</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-val text-green">${s.owned.toLocaleString()}</span>
            <span class="mini-stat-lbl">所持</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-val text-accent">${s.missing.toLocaleString()}</span>
            <span class="mini-stat-lbl">未所持</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-val" style="color:var(--wish-color)">${s.wished.toLocaleString()}</span>
            <span class="mini-stat-lbl">WISH</span>
          </div>
        </div>
        <div class="console-card-value">${formatYen(s.value)}</div>
        <div class="console-card-rate">${s.rate}% COLLECTED</div>
        <div class="progress-track">
          <div class="progress-fill"
               style="width:${s.rate}%;background:linear-gradient(90deg,${c.color},${lighter});">
          </div>
        </div>
      </div>
    </a>
    <div class="card-mgmt-bar">
      <button class="mgmt-btn edit-btn"   onclick="openEditConsole('${escAttr(c.slug)}')">✏️ 編集</button>
      <button class="mgmt-btn delete-btn" onclick="confirmDeleteConsole('${escAttr(c.slug)}','${escAttr(c.name)}')">🗑 削除</button>
    </div>
  </div>`;
}

/* ── Wish List Section (v3) ── */
function renderWishSection() {
  const container = document.getElementById('wishListContainer');
  const consoles  = getConsoles();

  // 全機種のウィッシュリストをまとめる
  let totalWish = 0;
  const sections = consoles.map(c => {
    const list = getWishList(c.slug);
    totalWish += list.length;
    return { c, list };
  }).filter(x => x.list.length > 0);

  if (sections.length === 0) {
    container.innerHTML = `
      <div class="wish-empty">
        <span class="wish-empty-icon">♡</span>
        <p>ウィッシュ登録されているタイトルはありません</p>
        <p>各機種ページのゲームリストで ♡ ボタンを押して登録できます</p>
      </div>`;
    return;
  }

  container.innerHTML = sections.map(({ c, list }) =>
    buildWishBlock(c, list)
  ).join('');
}

function buildWishBlock(c, wishList) {
  const items = wishList.map(g => `
    <div class="wish-item" id="wish-${escAttr(c.slug)}-${escAttr(g.serial)}">
      <div class="wish-item-main">
        <span class="wish-item-serial">${escHtml(g.serial)}</span>
        <span class="wish-item-title">${escHtml(g.title)}</span>
        ${g.publisher ? `<span class="wish-item-pub">${escHtml(g.publisher)}</span>` : ''}
      </div>
      <button class="wish-remove-btn"
              title="ウィッシュ解除"
              onclick="removeWishFromPortal('${escAttr(c.slug)}','${escAttr(g.serial)}')">✕</button>
    </div>`
  ).join('');

  return `
  <div class="wish-block" style="border-color:${c.color}55;">
    <div class="wish-block-header" style="background:linear-gradient(90deg,${c.color}22,transparent);">
      <span class="wish-block-badge" style="border-color:${c.color};color:${c.color};">${escHtml(c.slug)}</span>
      <span class="wish-block-name">${escHtml(c.name)}</span>
      <span class="wish-block-count">${wishList.length}件</span>
      <a class="wish-block-link" href="console.html?slug=${encodeURIComponent(c.slug)}">リストへ →</a>
    </div>
    <div class="wish-items">${items}</div>
  </div>`;
}

/* ポータルからウィッシュ解除 */
function removeWishFromPortal(slug, serial) {
  setWish(slug, serial, false);
  renderStats();
  renderWishSection();
  showToast('ウィッシュを解除しました', '');
}

/* ── Import Console ── */
function importConsole() {
  const name     = document.getElementById('newConsoleName').value.trim();
  const slug     = document.getElementById('newConsoleSlug').value.trim().toUpperCase();
  const color    = document.getElementById('newConsoleColor').value;
  const file     = document.getElementById('csvFileInput').files[0];
  const encoding = document.getElementById('csvEncoding').value;

  if (!name) { showImportMsg('機種名を入力してください', 'error'); return; }
  if (!slug) { showImportMsg('機種略称を入力してください', 'error'); return; }
  if (!file) { showImportMsg('CSVファイルを選択してください', 'error'); return; }

  const btn = document.getElementById('importBtn');
  btn.disabled = true; btn.innerHTML = '<span>処理中...</span>';

  const reader = new FileReader();
  reader.onload = e => {
    try {
      let text = e.target.result;
      if (text instanceof ArrayBuffer) {
        text = new TextDecoder(encoding).decode(text);
      }
      const games = parseCSV(text);
      if (games.length === 0) {
        showImportMsg('ゲームデータが見つかりませんでした', 'error');
        resetImportBtn(); return;
      }
      addConsole(name, slug, color);
      saveGames(slug, games);
      showImportMsg(`✓ ${name} を追加しました（${games.length}件）`, 'success');
      showToast(`${name} を追加しました！`, 'success');
      document.getElementById('newConsoleName').value = '';
      document.getElementById('newConsoleSlug').value = '';
      document.getElementById('csvFileInput').value   = '';
      renderPortal();
    } catch(err) {
      showImportMsg('エラー: ' + err.message, 'error');
    }
    resetImportBtn();
  };
  reader.onerror = () => { showImportMsg('ファイルの読み込みに失敗しました', 'error'); resetImportBtn(); };
  if (encoding === 'Shift-JIS') reader.readAsArrayBuffer(file);
  else reader.readAsText(file, 'UTF-8');
}
function resetImportBtn() {
  const btn = document.getElementById('importBtn');
  btn.disabled = false; btn.innerHTML = '<span>▶ IMPORT</span>';
}
function showImportMsg(text, type) {
  const el = document.getElementById('importMsg');
  el.textContent = text; el.className = 'import-message ' + type;
}

/* ── Edit Console ── */
function openEditConsole(slug) {
  const c = getConsoles().find(x => x.slug === slug);
  if (!c) return;
  document.getElementById('editSlug').value        = slug;
  document.getElementById('editSlugDisplay').value = slug;
  document.getElementById('editName').value        = c.name;
  document.getElementById('editColor').value       = c.color;
  document.getElementById('editOverlay').classList.add('open');
}
function saveEditConsole() {
  const slug  = document.getElementById('editSlug').value;
  const name  = document.getElementById('editName').value.trim();
  const color = document.getElementById('editColor').value;
  if (!name) { showToast('機種名を入力してください', 'error'); return; }
  try {
    updateConsole(slug, name, color);
    document.getElementById('editOverlay').classList.remove('open');
    renderPortal();
    showToast('更新しました', 'success');
  } catch(e) { showToast(e.message, 'error'); }
}
function closeEditModal(e) {
  if (e && e.target !== document.getElementById('editOverlay')) return;
  document.getElementById('editOverlay').classList.remove('open');
}

/* ── Delete Console ── */
function confirmDeleteConsole(slug, name) {
  document.getElementById('deleteSlugTarget').value      = slug;
  document.getElementById('deleteNameLabel').textContent = name;
  document.getElementById('deleteOverlay').classList.add('open');
}
function executeDeleteConsole() {
  const slug = document.getElementById('deleteSlugTarget').value;
  deleteConsole(slug);
  document.getElementById('deleteOverlay').classList.remove('open');
  renderPortal();
  showToast('削除しました', 'success');
}
function closeDeleteModal(e) {
  if (e && e.target !== document.getElementById('deleteOverlay')) return;
  document.getElementById('deleteOverlay').classList.remove('open');
}

/* ESC */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  ['editOverlay','deleteOverlay','restoreOverlay'].forEach(id => {
    document.getElementById(id)?.classList.remove('open');
  });
});

/* ── Utils ── */
function escAttr(str) { return String(str||'').replace(/'/g,"\\'"); }
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r:parseInt(m[1],16), g:parseInt(m[2],16), b:parseInt(m[3],16) } : null;
}
function lightenHex(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return '#'
    + Math.min(255,rgb.r+amount).toString(16).padStart(2,'0')
    + Math.min(255,rgb.g+amount).toString(16).padStart(2,'0')
    + Math.min(255,rgb.b+amount).toString(16).padStart(2,'0');
}

/* ── PWA インストール促進 ── */
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstallPrompt = e; showInstallPrompt();
});
window.addEventListener('appinstalled', () => {
  removeInstallPrompt(); deferredInstallPrompt = null;
  showToast('インストールしました！', 'success');
});
function showInstallPrompt() {
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (document.getElementById('_installPrompt')) return;
  const el = document.createElement('div');
  el.id = '_installPrompt'; el.className = 'install-prompt';
  el.innerHTML = `
    <div class="install-prompt-text">
      <strong>📲 アプリをインストール</strong>
      ホーム画面に追加してオフラインでも使えます
    </div>
    <button class="install-prompt-btn" onclick="triggerInstall()">追加</button>
    <button class="install-prompt-close" onclick="removeInstallPrompt()" title="閉じる">✕</button>`;
  document.body.appendChild(el);
}
function removeInstallPrompt() {
  document.getElementById('_installPrompt')?.remove();
}
async function triggerInstall() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') { deferredInstallPrompt = null; removeInstallPrompt(); }
}
(function checkIOSInstall() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS && !window.navigator.standalone) {
    if (sessionStorage.getItem('rc_ios_hint')) return;
    sessionStorage.setItem('rc_ios_hint', '1');
    setTimeout(() => {
      const el = document.createElement('div');
      el.id = '_installPrompt'; el.className = 'install-prompt';
      el.innerHTML = `
        <div class="install-prompt-text">
          <strong>📲 ホーム画面に追加</strong>
          Safari の <b>共有ボタン</b> →「ホーム画面に追加」でインストールできます
        </div>
        <button class="install-prompt-close" onclick="removeInstallPrompt()" title="閉じる">✕</button>`;
      document.body.appendChild(el);
      setTimeout(removeInstallPrompt, 8000);
    }, 3000);
  }
})();
