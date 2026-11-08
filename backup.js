/* ===================================================
   RETRO COLLECTOR - backup.js  v3.0
   バックアップ出力 & データ復元
   ウィッシュリストデータも対象に含む
   =================================================== */

const BACKUP_LAST_KEY = 'rc_last_backup';

/* ============================================================
   初期化
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initBackupUI();
  updateLastBackupLabel();

  document.querySelectorAll('input[name="backupFormat"]').forEach(r => {
    r.addEventListener('change', onFormatChange);
  });
});

function initBackupUI() {
  renderBackupInfoChips();
  updateBackupCsvSlugSelect();
}

function renderBackupInfoChips() {
  const row = document.getElementById('backupInfoRow');
  if (!row) return;
  const consoles = getConsoles();
  const all = calcAllStats();
  const chips = [
    { label: '機種数',     val: consoles.length },
    { label: '総タイトル', val: all.total.toLocaleString() },
    { label: '所持',       val: all.owned.toLocaleString() },
    { label: 'ウィッシュ', val: all.wished.toLocaleString() },
    { label: '推定資産',   val: formatYen(all.value) },
  ];
  row.innerHTML = chips.map(c =>
    `<span class="backup-info-chip">${c.label} <strong>${c.val}</strong></span>`
  ).join('');
}

function updateBackupCsvSlugSelect() {
  const sel = document.getElementById('backupCsvSlug');
  if (!sel) return;
  const consoles = getConsoles();
  sel.innerHTML =
    '<option value="__all__">すべての機種（1機種ずつダウンロード）</option>' +
    consoles.map(c =>
      `<option value="${escAttrBk(c.slug)}">${escHtmlBk(c.name)}（${escHtmlBk(c.slug)}）</option>`
    ).join('');
}

function onFormatChange() {
  const fmt    = document.querySelector('input[name="backupFormat"]:checked')?.value;
  const csvSel = document.getElementById('backupCsvSelect');
  if (csvSel) csvSel.style.display = (fmt === 'csv') ? 'block' : 'none';
}


/* ============================================================
   バックアップ出力
   ============================================================ */
function doBackup() {
  const fmt = document.querySelector('input[name="backupFormat"]:checked')?.value || 'json';
  if (fmt === 'json') {
    exportJSON();
  } else {
    const slug = document.getElementById('backupCsvSlug')?.value;
    if (slug === '__all__') exportAllCSV();
    else exportOneCSV(slug);
  }
}

/* ── JSON 完全バックアップ（ウィッシュ含む） ── */
function exportJSON() {
  const consoles = getConsoles();
  if (consoles.length === 0) { showToast('バックアップするデータがありません', 'error'); return; }

  const payload = {
    app:      'RETRO COLLECTOR',
    version:  '3.0',
    exported: new Date().toISOString(),
    consoles,
    data:     {}
  };

  consoles.forEach(c => {
    payload.data[c.slug] = {
      games: getGames(c.slug),
      owned: getOwnedData(c.slug),
      stars: getStarData(c.slug),
      wish:  getWishData(c.slug),        // v3
    };
  });

  const json     = JSON.stringify(payload, null, 2);
  const filename = `retro-collector-backup-${dateStamp()}.json`;
  downloadText(json, filename, 'application/json');
  recordLastBackup(filename);
  showToast('バックアップを保存しました', 'success');
}

/* ── CSV 単体出力（1機種）
   列: Serial Number, タイトル, 発売元, レア, 発売日,
       所持, 金額, 購入日, レア度(★上書き), ウィッシュ, メモ
*/
function exportOneCSV(slug) {
  const c = getConsoles().find(x => x.slug === slug);
  if (!c) { showToast('機種が見つかりません', 'error'); return; }
  const csv      = buildConsoleCSV(c);
  const filename = `retro-collector-${slug}-${dateStamp()}.csv`;
  downloadText(csv, filename, 'text/csv;charset=utf-8');
  recordLastBackup(filename);
  showToast(`${c.name} のCSVを保存しました`, 'success');
}

/* ── CSV 全機種出力 ── */
function exportAllCSV() {
  const consoles = getConsoles();
  if (consoles.length === 0) { showToast('バックアップするデータがありません', 'error'); return; }
  consoles.forEach((c, i) => {
    setTimeout(() => {
      const csv      = buildConsoleCSV(c);
      const filename = `retro-collector-${c.slug}-${dateStamp()}.csv`;
      downloadText(csv, filename, 'text/csv;charset=utf-8');
    }, i * 600);
  });
  recordLastBackup(`全${consoles.length}機種CSVファイル`);
  showToast(`${consoles.length}機種分のCSVを保存します`, 'success');
}

/* ── CSV ビルダー（1機種） ── */
function buildConsoleCSV(c) {
  const games = getGames(c.slug);
  const owned = getOwnedData(c.slug);
  const stars = getStarData(c.slug);
  const wish  = getWishData(c.slug);

  const header = [
    'Serial Number', 'タイトル', '発売元', 'レア', '発売日',
    '所持', '金額', '購入日', 'レア度(★上書き)', 'ウィッシュ', 'メモ'
  ];

  const rows = games.map(g => {
    const ud          = owned[g.serial] || {};
    const starOverride= (g.serial in stars) ? String(stars[g.serial]) : '';
    const wished      = wish[g.serial] ? '1' : '0';
    return [
      g.serial,
      g.title,
      g.publisher    || '',
      g.rarity       || '',
      g.releaseDate  || '',
      ud.owned ? '1' : '0',
      ud.price       || '',
      ud.purchaseDate|| '',
      starOverride,
      wished,
      ud.memo        || '',
    ].map(csvCell).join(',');
  });

  return '\uFEFF' + [header.map(csvCell).join(','), ...rows].join('\r\n');
}

function csvCell(v) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}


/* ============================================================
   復元（Restore）
   ============================================================ */
let _restorePayload = null;

function onRestoreFileSelected() {
  const file = document.getElementById('restoreFileInput')?.files?.[0];
  const btn  = document.getElementById('restoreBtn');
  const prev = document.getElementById('restorePreview');
  const msg  = document.getElementById('restoreMsg');

  _restorePayload = null;
  if (btn)  btn.disabled = true;
  if (prev) prev.style.display = 'none';
  if (msg)  { msg.className = 'import-message'; msg.textContent = ''; }
  if (!file) return;

  const ext    = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();

  reader.onload = e => {
    try {
      _restorePayload = (ext === 'json')
        ? parseRestoreJSON(e.target.result)
        : parseRestoreCSV(e.target.result, file.name);
      renderRestorePreview(_restorePayload);
      if (btn) btn.disabled = false;
    } catch(err) {
      showRestoreMsg('⚠ ' + err.message, 'error');
    }
  };
  reader.onerror = () => showRestoreMsg('ファイルの読み込みに失敗しました', 'error');
  reader.readAsText(file, 'UTF-8');
}

/* ── JSON パース ── */
function parseRestoreJSON(text) {
  const obj = JSON.parse(text);
  if (obj.app !== 'RETRO COLLECTOR') throw new Error('このアプリのバックアップファイルではありません');
  if (!obj.consoles || !obj.data)    throw new Error('ファイル形式が正しくありません');
  return { type: 'json', raw: obj };
}

/* ── CSV パース（バックアップCSV形式） ── */
function parseRestoreCSV(text, filename) {
  const clean  = text.replace(/^\uFEFF/, '');
  const lines  = clean.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('データが見つかりません');

  const rawH   = parseCSVLine(lines[0]);
  const headers= rawH.map(h => h.trim().toLowerCase());

  const colSerial   = findColBk(headers, ['serial number','serialnumber','serial','通し番号']);
  const colTitle    = findColBk(headers, ['タイトル','title']);
  const colPublisher= findColBk(headers, ['発売元','publisher','メーカー']);
  const colRarity   = findColBk(headers, ['レア','レア度','rarity','rare']);
  const colDate     = findColBk(headers, ['発売日','date','releasedate']);
  const colOwned    = findColBk(headers, ['所持','owned']);
  const colPrice    = findColBk(headers, ['金額','price']);
  const colPurchase = findColBk(headers, ['購入日','purchasedate','purchase']);
  const colStarOv   = findColBk(headers, ['レア度(★上書き)','star','star_override','レア度上書き']);
  const colWish     = findColBk(headers, ['ウィッシュ','wish','wishlist']);
  const colMemo     = findColBk(headers, ['メモ','memo','note']);

  if (colTitle === -1) throw new Error('「タイトル」列が見つかりません');

  const slugMatch = filename.match(/retro-collector-([^-]+)-/);
  const guessSlug = slugMatch ? slugMatch[1].toUpperCase() : 'IMPORT';

  const games = [], ownedMap = {}, starsMap = {}, wishMap = {};

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i]);
    const get  = idx => (idx >= 0 ? (cols[idx] || '').trim() : '');

    const serial    = get(colSerial) || String(i);
    const title     = get(colTitle);
    if (!title) continue;

    const rarityRaw = get(colRarity);
    games.push({
      serial, title,
      publisher:   get(colPublisher),
      rarity:      rarityRaw,
      stars:       calcStarsFromRarity(rarityRaw),
      releaseDate: normalizeDate(get(colDate)),
    });

    const ownedVal = get(colOwned);
    ownedMap[serial] = {
      owned:        ownedVal === '1' || ownedVal === 'true' || ownedVal === '○',
      price:        parseInt(get(colPrice), 10) || 0,
      purchaseDate: get(colPurchase),
      memo:         get(colMemo),
    };

    const starOvRaw = get(colStarOv);
    if (starOvRaw !== '') {
      const sv = parseInt(starOvRaw, 10);
      if (!isNaN(sv)) starsMap[serial] = Math.min(5, Math.max(0, sv));
    }

    const wishVal = get(colWish);
    if (wishVal === '1' || wishVal === 'true') wishMap[serial] = true;
  }

  return {
    type: 'csv', guessSlug, games, ownedMap, starsMap, wishMap,
    totalGames: games.length,
    ownedCount: Object.values(ownedMap).filter(x => x.owned).length,
    wishCount:  Object.keys(wishMap).length,
  };
}

/* ── プレビュー描画 ── */
function renderRestorePreview(payload) {
  const prev = document.getElementById('restorePreview');
  if (!prev) return;

  let html = '<div class="preview-title">📋 ファイル内容プレビュー</div>';

  if (payload.type === 'json') {
    const obj      = payload.raw;
    const exported = obj.exported ? new Date(obj.exported).toLocaleString('ja-JP') : '不明';
    html += row('バックアップ日時', escHtmlBk(exported));
    html += row('バージョン', escHtmlBk(obj.version || '不明'));
    html += row('機種数', obj.consoles.length + '機種');
    obj.consoles.forEach(c => {
      const d = obj.data[c.slug] || {};
      const g = (d.games || []).length;
      const o = Object.values(d.owned || {}).filter(x => x.owned).length;
      const w = Object.keys(d.wish  || {}).length;
      html += row(
        `${escHtmlBk(c.name)}（${escHtmlBk(c.slug)}）`,
        `${g}件 / 所持${o} / WISH${w}`
      );
    });
  } else {
    html += row('機種(推定)', escHtmlBk(payload.guessSlug));
    html += row('タイトル数', payload.totalGames + '件');
    html += row('所持チェック済', payload.ownedCount + '件');
    html += row('ウィッシュ', payload.wishCount + '件');
  }

  const mode = document.querySelector('input[name="restoreMode"]:checked')?.value;
  if (mode === 'overwrite') {
    html += `<div class="preview-warn">⚠ 完全上書きモード：現在のすべてのデータが削除されます</div>`;
  }

  prev.innerHTML = html;
  prev.style.display = 'block';
}

function row(k, v) {
  return `<div class="preview-row"><span class="preview-key">${k}</span><span class="preview-value">${v}</span></div>`;
}

/* 復元モード変更時にプレビュー再描画 */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[name="restoreMode"]').forEach(r => {
    r.addEventListener('change', () => { if (_restorePayload) renderRestorePreview(_restorePayload); });
  });
});

/* ── 復元確認モーダル ── */
function confirmRestore() {
  if (!_restorePayload) return;
  const mode = document.querySelector('input[name="restoreMode"]:checked')?.value || 'merge';
  document.getElementById('restoreConfirmBody').innerHTML = (mode === 'overwrite')
    ? `<p class="delete-msg"><span class="text-accent">⚠ すべての現在のデータを削除して復元します。</span><br><br>この操作は元に戻せません。本当に続けますか？</p>`
    : `<p class="delete-msg">バックアップデータをマージします。<br>同じ機種・同じゲームのデータは上書きされます。<br><br>続けますか？</p>`;
  document.getElementById('restoreOverlay').classList.add('open');
}

function closeRestoreModal(e) {
  if (e && e.target !== document.getElementById('restoreOverlay')) return;
  document.getElementById('restoreOverlay').classList.remove('open');
}

/* ── 復元実行 ── */
function executeRestore() {
  document.getElementById('restoreOverlay').classList.remove('open');
  if (!_restorePayload) return;

  const mode = document.querySelector('input[name="restoreMode"]:checked')?.value || 'merge';

  try {
    if (_restorePayload.type === 'json') restoreFromJSON(_restorePayload.raw, mode);
    else                                 restoreFromCSV(_restorePayload, mode);

    _restorePayload = null;
    document.getElementById('restoreFileInput').value  = '';
    document.getElementById('restorePreview').style.display = 'none';
    document.getElementById('restoreBtn').disabled = true;

    renderPortal();
    initBackupUI();
    showToast('復元が完了しました', 'success');
    showRestoreMsg('✓ 復元が完了しました', 'success');
  } catch(err) {
    showToast('復元エラー: ' + err.message, 'error');
    showRestoreMsg('⚠ ' + err.message, 'error');
  }
}

/* ── JSON から復元（ウィッシュ含む） ── */
function restoreFromJSON(obj, mode) {
  if (mode === 'overwrite') {
    getConsoles().forEach(c => {
      localStorage.removeItem(DB_KEY_GAMES + c.slug);
      localStorage.removeItem(DB_KEY_OWNED + c.slug);
      localStorage.removeItem(DB_KEY_STARS + c.slug);
      localStorage.removeItem(DB_KEY_WISH  + c.slug);
    });
    localStorage.removeItem(DB_KEY_CONSOLES);
  }

  const current = getConsoles();
  const merged  = [...current];
  obj.consoles.forEach(c => {
    const idx = merged.findIndex(x => x.slug === c.slug);
    if (idx === -1) merged.push(c);
    else merged[idx] = c;
  });
  saveConsoles(merged);

  obj.consoles.forEach(c => {
    const d = obj.data[c.slug];
    if (!d) return;
    if (mode === 'overwrite') {
      saveGames(c.slug,     d.games || []);
      saveOwnedData(c.slug, d.owned || {});
      saveStarData(c.slug,  d.stars || {});
      saveWishData(c.slug,  d.wish  || {});
    } else {
      saveGames(c.slug, d.games || []);
      saveOwnedData(c.slug, { ...getOwnedData(c.slug), ...(d.owned || {}) });
      saveStarData(c.slug,  { ...getStarData(c.slug),  ...(d.stars || {}) });
      saveWishData(c.slug,  { ...getWishData(c.slug),  ...(d.wish  || {}) });
    }
  });
}

/* ── CSV から復元（ウィッシュ含む） ── */
function restoreFromCSV(payload, mode) {
  const slug     = payload.guessSlug;
  const consoles = getConsoles();
  if (!consoles.find(c => c.slug === slug)) {
    consoles.push({ name: slug, slug, color: '#6a0dad' });
    saveConsoles(consoles);
  }
  if (mode === 'overwrite') {
    saveGames(slug,     payload.games);
    saveOwnedData(slug, payload.ownedMap);
    saveStarData(slug,  payload.starsMap);
    saveWishData(slug,  payload.wishMap);
  } else {
    saveGames(slug, payload.games);
    saveOwnedData(slug, { ...getOwnedData(slug), ...payload.ownedMap });
    saveStarData(slug,  { ...getStarData(slug),  ...payload.starsMap });
    saveWishData(slug,  { ...getWishData(slug),  ...payload.wishMap  });
  }
}


/* ============================================================
   ユーティリティ
   ============================================================ */
function dateStamp() {
  const d = new Date();
  return d.getFullYear()
    + String(d.getMonth()+1).padStart(2,'0')
    + String(d.getDate()).padStart(2,'0')
    + '-'
    + String(d.getHours()).padStart(2,'0')
    + String(d.getMinutes()).padStart(2,'0');
}

function downloadText(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function recordLastBackup(filename) {
  localStorage.setItem(BACKUP_LAST_KEY, JSON.stringify({ date: new Date().toISOString(), filename }));
  updateLastBackupLabel();
}

function updateLastBackupLabel() {
  const el = document.getElementById('lastBackupLabel');
  if (!el) return;
  try {
    const info = JSON.parse(localStorage.getItem(BACKUP_LAST_KEY));
    el.textContent = info?.date
      ? `最終バックアップ: ${new Date(info.date).toLocaleString('ja-JP')}`
      : '最終バックアップ: なし';
  } catch { el.textContent = ''; }
}

function showRestoreMsg(text, type) {
  const el = document.getElementById('restoreMsg');
  if (!el) return;
  el.textContent = text; el.className = 'import-message ' + type;
}

function findColBk(headers, candidates) {
  for (const c of candidates) {
    const idx = headers.findIndex(h => h === c || h.includes(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

function escHtmlBk(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttrBk(str) { return String(str || '').replace(/'/g,"\\'"); }
