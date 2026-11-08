# RETRO COLLECTOR v2.1
レトロゲーム収集管理 PWA アプリ

---

## 📁 ファイル構成

```
retro-game-collector/
│
├── index.html              ポータルページ（メイン）
├── console.html            機種別ゲームリストページ（共通）
│
├── style.css               グローバルスタイル（PWAバナー含む）
├── portal.css              ポータルページ専用スタイル
├── console.css             機種ページ専用スタイル
│
├── db.js                   LocalStorageデータ管理・CSVパーサー
├── portal.js               ポータルのロジック＋PWAインストール促進
├── console.js              機種ページのロジック
│
├── manifest.json           PWAマニフェスト（全サイズアイコン定義）
├── sw.js                   Service Worker（オフライン・キャッシュ・更新通知）
│
├── icons/                  ★アイコン画像フォルダ（要作成・要配置）
│   ├── icon-48.png
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png         Windows タイル用
│   ├── icon-152.png         iOS ホーム画面用
│   ├── icon-192.png         Android / Chrome 標準
│   ├── icon-256.png
│   ├── icon-384.png
│   ├── icon-512.png         ストア表示・スプラッシュ用
│   ├── icon-maskable-192.png  マスカブルアイコン（Android 丸アイコン対応）
│   └── icon-maskable-512.png  マスカブルアイコン（大）
│
└── screenshots/            ★スクリーンショット・スプラッシュ（任意・要作成）
    ├── screen-portal.png   390×844px  ストア掲載用スクリーンショット
    ├── screen-list.png     390×844px  ストア掲載用スクリーンショット
    ├── splash-750x1334.png    iPhone SE/8
    ├── splash-1125x2436.png   iPhone X/XS/11 Pro
    ├── splash-1170x2532.png   iPhone 12/13/14
    └── splash-1179x2556.png   iPhone 14 Pro/15
```

---

## 🖼️ アイコン制作ガイド

### 必要なPNGファイル（icons/ フォルダに配置）

| ファイル名 | サイズ | 用途 |
|---|---|---|
| icon-48.png | 48×48 | Android 小アイコン |
| icon-72.png | 72×72 | Android |
| icon-96.png | 96×96 | Favicon・ショートカット |
| icon-128.png | 128×128 | Chrome Web Store |
| icon-144.png | 144×144 | Windows タイル |
| icon-152.png | 152×152 | iOS ホーム画面 |
| icon-192.png | 192×192 | Android 標準・Favicon |
| icon-256.png | 256×256 | 高解像度環境 |
| icon-384.png | 384×384 | 高解像度環境 |
| icon-512.png | 512×512 | スプラッシュ・ストア |
| icon-maskable-192.png | 192×192 | Android 丸アイコン（セーフゾーン注意）|
| icon-maskable-512.png | 512×512 | Android 丸アイコン（セーフゾーン注意）|

### マスカブルアイコンのセーフゾーン
```
┌─────────────────────┐
│   ░░░░░░░░░░░░░░░   │ ← 余白ゾーン（約 10%）
│   ░┌─────────┐░   │
│   ░│         │░   │
│   ░│  ロゴ  │░   │ ← セーフゾーン（中央 80%以内に収める）
│   ░│         │░   │
│   ░└─────────┘░   │
│   ░░░░░░░░░░░░░░░   │
└─────────────────────┘
```
マスカブルアイコンは Android で円形にトリミングされます。
重要なデザイン要素は **中央 80%** に収めてください。

### 推奨制作手順
1. 512×512px のマスターアイコンを作成
2. `icon-maskable-512.png`（余白あり版）を別途作成
3. 各サイズにリサイズして書き出し
4. `icons/` フォルダに配置

---

## 🚀 デプロイ手順

### ローカルで確認する場合
PWA の Service Worker は **HTTPSまたはlocalhost** でのみ動作します。

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code の場合
# 「Live Server」拡張機能でそのまま起動可能
```
ブラウザで `http://localhost:8080` を開いてください。

### 本番デプロイ（HTTPS必須）

#### GitHub Pages（無料・おすすめ）
```
1. GitHubリポジトリを作成
2. 全ファイルをプッシュ
3. Settings → Pages → Source: main branch
4. https://{username}.github.io/{repo}/ でアクセス
```

#### Netlify（ドラッグ&ドロップで即公開）
```
1. netlify.com にアクセス
2. フォルダごとブラウザにドラッグ&ドロップ
3. 自動でHTTPS付きURLが発行される
```

#### その他
- Firebase Hosting
- Cloudflare Pages
- さくら・ロリポップ等のレンタルサーバー（SSL証明書が必要）

---

## 📱 インストール方法

### Android（Chrome）
1. ブラウザでアプリを開く
2. 画面下部に「ホーム画面に追加」バナーが表示される
3. タップしてインストール

### iOS（Safari）
1. Safari でアプリを開く
2. 画面下部の **共有ボタン（□↑）** をタップ
3. 「ホーム画面に追加」を選択
4. 名前を確認して「追加」

### PC（Chrome / Edge）
1. アドレスバー右端のインストールアイコン（⊕）をクリック
2. または ⋮メニュー → 「アプリをインストール」

---

## 📄 CSVフォーマット

```csv
Serial Number,タイトル,発売元,レア,発売日
1,スーパーマリオブラザーズ,任天堂,,1985年09月13日
2,ドンキーコング,任天堂,R,1983年07月15日
3,ゼルダの伝説,任天堂,SR,1986年02月21日
4,メタルギア,コナミ,SSSR EX,1987年07月13日
```

| 列名 | 内容 | 備考 |
|---|---|---|
| Serial Number | 通し番号 | 文字列OK（HVC-SMなども可）|
| タイトル | ゲームタイトル | 必須 |
| 発売元 | メーカー名 | 省略可 |
| レア | レア度文字列 | 空欄=なし、R/SR/SSR/SSSR/SSSSR/R EX/A TOP1 等 |
| 発売日 | 発売日 | 1983年07月15日 形式 or 1983-07-15 形式 |

### レア度の自動★変換ルール

| CSV値 | ★表示 |
|---|---|
| 空欄 | なし（グレー）|
| R | ★ |
| SR | ★★ |
| SSR | ★★★ |
| SSSR | ★★★★ |
| SSSSR / R EX / ～ EX | ★★★★★ |
| A TOP1〜2 | ★★★★★ |
| A TOP3〜5 | ★★★★ |
| A TOP6〜 | ★★★ |

★の数はゲーム詳細モーダルから個別に変更できます。

---

## 💾 データ管理

### LocalStorageキー構造
| キー | 内容 |
|---|---|
| `rc_consoles` | 登録機種リスト |
| `rc_games_{SLUG}` | 機種別ゲームリスト（CSVデータ）|
| `rc_owned_{SLUG}` | 所持・金額・購入日・メモ |
| `rc_stars_{SLUG}` | ユーザーが手動変更したレア度 |

### データのバックアップ（手動）
ブラウザの開発者ツール → Application → Local Storage から
全データをコピーして保存できます。

---

## 🔄 アプリの更新

`sw.js` の `CACHE_VERSION` を変更すると次回アクセス時に新キャッシュが作成され、
画面上部の「今すぐ更新」バナーが表示されます。

```js
// sw.js 冒頭
const CACHE_VERSION = 'v2.2';  // ← バージョンを上げる
```

---

## PWA チェックリスト

- [x] manifest.json（name / icons / display / theme_color）
- [x] Service Worker（install / activate / fetch）
- [x] HTTPS（または localhost）
- [x] アイコン 192px・512px 以上
- [x] `viewport` メタタグ
- [x] `apple-mobile-web-app-capable` （iOS対応）
- [x] オフライン動作（Cache First）
- [x] 更新通知バナー
- [x] インストール促進プロンプト（Android/iOS）
- [x] iOS Safe Area（ノッチ・ホームバー対応）
- [ ] アイコン画像ファイルの配置 ← **ご自身で用意**
- [ ] HTTPSサーバーへのデプロイ ← **公開時に必要**
