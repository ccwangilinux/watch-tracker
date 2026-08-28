# 架構分析 — 我的觀看紀錄 Watch Tracker

> 依規格第 33 節提出，**待確認後才開始建立專案**。

---

## 1. 技術選型（含比較）

| 需求 | 選定 | 替代方案與不選的理由 |
|---|---|---|
| 框架 | **Vue 3 + Vite + TypeScript**（`<script setup>`） | 規格指定 |
| 狀態 | **Pinia**（MIT） | Vuex 已停止主線開發；本專案狀態不複雜，但同步/設定/UI 狀態需跨頁共享，Pinia 最輕 |
| 路由 | **Vue Router，hash 模式** | 見第 6 節，這是為 GitHub Pages 選的 |
| IndexedDB | **Dexie.js**（Apache-2.0，~25KB gzip） | `idb` 只有 1KB 但只包一層 Promise，索引查詢、bulkPut、版本遷移都要自己寫；同步演算法需要大量按 `updatedAt`／`deletedAt` 查詢，Dexie 的索引 API 省下的程式碼遠超它的體積。原生 IndexedDB API 冗長易錯，不考慮 |
| PWA | **vite-plugin-pwa**（MIT，內含 Workbox） | 手寫 Service Worker 要自己處理預快取清單與更新流程，維護成本高 |
| Google 登入 | **Google Identity Services (GIS)** token model | 舊版 `gapi.auth2` 已停止支援 |
| Sheets 存取 | **直接 `fetch` REST API** | `gapi.client` 要多載入一包 JS 且 iOS Safari 上初始化較慢；Sheets REST API 只用到 3 個端點，手寫比較可控 |
| UI | **手寫 CSS**（CSS variables + `@layer`） | 規格明令不要不必要的大型框架。Vuetify/Naive 等會帶進整套設計語言，與「深色娛樂感」的自訂視覺衝突，且體積大 |
| 圖示 | **Emoji（類別）＋內嵌 SVG（系統圖示）** | 類別圖示要能讓使用者自選，emoji 免下載、跨平台、iOS 顯示佳 |
| Wheel Picker | **自己寫**（CSS `scroll-snap-type: y mandatory`） | 見第 7 節，這是 iOS 相容性的關鍵決定 |

**不引入**：UI 框架、圖表庫、moment/dayjs（時間處理需求極單純）、任何後端。

---

## 2. 資料模型與 IndexedDB Schema

### 兩個關鍵決定

**觀看時間存「總秒數」（number）。** 比較 `hours/minutes/seconds` 三欄的方案：總秒數排序只需一次數值比較、Sheets 存成單一數字欄不會有格式歧義、未來要做「總觀看時數統計」直接加總即可。UI 層用 `formatDuration()` / `parseDuration()` 轉換 `H:MM:SS`。上限 999:59:59 = 3599999 秒。

**時間戳存 ISO 8601 UTC 字串**（`2026-08-28T06:15:33.000Z`）。相對於 Unix timestamp：固定長度的 ISO UTC 字串可直接用字典序比較大小，效果等同數值比較；寫進 Google Sheets 時人眼可讀，除錯時看得懂；IndexedDB 也能正常建索引。全專案統一用這個格式，禁止混用。

### Schema

```ts
// db.ts — Dexie
db.version(1).stores({
  categories:   'id, sortOrder, updatedAt, deletedAt',
  watchRecords: 'id, categoryId, title, updatedAt, deletedAt, [categoryId+sortOrder]',
  meta:         'key',
})
```

```ts
interface Category {
  id: string          // UUID v4
  name: string
  icon: string        // emoji
  color: string       // #RRGGBB
  sortOrder: number
  createdAt: string   // ISO 8601 UTC
  updatedAt: string
  deletedAt: string | null
}

interface WatchRecord {
  id: string
  categoryId: string
  title: string
  season: number      // 1–99
  episode: number     // >= 0
  watchTime: number   // 總秒數
  completed: boolean
  sortOrder: number
  note: string        // 規格預留欄位
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}
```

`meta` 表是 key-value，存規格第 7 節的「最後狀態」與同步狀態：
`lastCategoryId`、`lastSearchText`、`lastSortKey`、`lastViewMode`、`sheetId`、`lastSyncedAt`、`schemaVersion`。

**索引說明**：`[categoryId+sortOrder]` 複合索引讓「某類別的紀錄依排序取出」不需全表掃描。`title` 建索引是為了前綴搜尋；但規格要的是關鍵字模糊比對（「進擊」要能配到「進擊的巨人」），IndexedDB 索引做不到子字串搜尋——個人資料量（估計數百至數千筆）用記憶體內 `filter` 完全足夠，不做額外的全文索引。

**軟刪除**：所有查詢一律過濾 `deletedAt === null`。`deletedAt` 的清理時機見第 4 節。

---

## 3. Google OAuth 安全架構

### 流程（GIS token model，非 implicit redirect）

```
使用者點「連結 Google」
  → google.accounts.oauth2.initTokenClient({ client_id, scope, callback })
  → requestAccessToken()  ← 開 popup，使用者在 Google 網域登入
  → callback 收到 access_token（有效期約 1 小時）
  → 存在「記憶體」的 Pinia store，絕不寫入 IndexedDB / localStorage
```

**選 token model 而非 redirect flow 的理由**：redirect 會離開 App 再導回，在 iOS standalone PWA 下有機率跳出 App 開 Safari、回不到 standalone 情境；popup token flow 全程留在原頁面。且 redirect flow 需要在 Console 設定 redirect URI，token flow 只需設 JavaScript origin。

### Scope（最小權限）

只申請 `https://www.googleapis.com/auth/drive.file`。

這個 scope 的語意是「只能存取本 App 建立或使用者主動選擇的檔案」——它**看不到**你雲端硬碟的其他任何東西。用它就足以建立試算表並透過 Sheets API 讀寫，不需要 `spreadsheets`（那會拿到所有試算表的權限）也不需要 `drive`（整個雲端硬碟）。附帶好處：`drive.file` 屬於 non-sensitive scope，將來要把 OAuth 應用從 Testing 轉為 Production 不需經過 Google 審核。

### Token 生命週期

前端 token flow **拿不到 refresh token**（這是設計上的安全限制，不是缺陷）。因此：
- access token 只存記憶體，重新整理頁面就沒了 → 符合「不落地」原則
- 過期後 API 回 401 → 同步服務攔截，先嘗試 `requestAccessToken({ prompt: '' })` 靜默續發；失敗才提示使用者重新授權
- **關鍵**：token 失效**不能影響 App 使用**。所有同步都是背景行為，失敗只在 UI 顯示「未同步」狀態

### 進 Repository 的與不進的

| 可進 repo | 不可進 repo |
|---|---|
| OAuth **Client ID**（設計上就是公開值） | Client **Secret**（前端流程根本不該有） |
| `.env.example`（只有 key 名稱） | `.env`（已在 `.gitignore`） |
| 所有前端程式碼 | 任何 access token、Sheet ID、觀看資料 |

Sheet ID 存在 IndexedDB 的 `meta` 表，不進 repo、不進 `.env`。

---

## 4. 同步策略

### Sheet 結構

兩個工作表 `Categories` / `WatchRecords`，第 1 列為欄位名（程式以欄位名定位，不寫死欄索引，日後加欄不會壞）。欄位與資料模型一對一，含 `deletedAt`。

額外在 `WatchRecords` 之外開一個隱藏的 `_meta` 工作表存 `schemaVersion`，供未來遷移判斷。

### 演算法（three-way merge，逐筆）

```
1. 讀 Sheet 全表 → remote Map<id, row>
2. 讀 IndexedDB 全表（含已軟刪除）→ local Map<id, record>
3. 對 union(localIds, remoteIds) 的每個 id：
     只有 local        → 推送到 remote
     只有 remote       → 寫入 local
     兩邊都有且相等     → 略過
     兩邊都有且不同     → 比較 updatedAt，較新者勝（Last-Write-Wins）
4. 批次套用：local 用 Dexie bulkPut；remote 用 values.batchUpdate 一次寫回
5. 記錄 lastSyncedAt
```

**為什麼是 LWW**：規格第 18 節明確允許第一版採此策略。真正的 CRDT 或欄位級合併對單人多裝置的使用情境是過度設計——同一筆紀錄被兩台裝置在離線期間同時改的機率極低，且衝突後果只是少一次集數更新。

**軟刪除清理**：`deletedAt` 超過 30 天且已同步過（`deletedAt < lastSyncedAt`）的紀錄，在同步結束時從兩邊一併實體刪除。保留 30 天是為了讓長期離線的第二台裝置有機會收到刪除指令——若立刻實體刪除，那台裝置會把它當成「本地新增」重新推回雲端（幽靈復活）。

**服務邊界**：`src/services/sync.ts` 是純函式模組，輸入兩份資料、輸出 diff 計畫，不 import 任何 Vue/Pinia。這讓同步邏輯可以單獨測試，也符合規格「不要寫死在 component」的要求。

---

## 5. 頁面與元件結構

規格第 24 節列了 11 個頁面，依 UX 合併為 **7 個路由**：

```
/                     HomeView          類別列表（首頁）
/c/:categoryId        RecordListView    某類別的紀錄列表
/r/new?c=:categoryId  RecordEditView    新增（與修改共用元件）
/r/:recordId          RecordEditView    修改
/settings             SettingsView      設定總覽
/settings/categories  CategoryManageView 類別管理（新增/改/刪/拖曳排序）
/settings/cloud       CloudView         Google 帳號、Sheet、同步、匯入匯出、關於
```

合併的理由：「排序設定」是列表頁上的一個 bottom sheet，不值得獨立成頁；「匯入/匯出」「關於」是設定頁裡的區塊；「啟動畫面」由 PWA 的 splash + 首頁骨架屏處理，不是路由。

### 導航

規格第 25 節要求先評估。**結論：不用底部 Tab。**

理由是四個候選項（首頁/類別/搜尋/設定）裡，「類別」就是首頁、「搜尋」是 Header 上的常駐輸入框，實際只剩「首頁」和「設定」兩項——為兩個項目佔掉螢幕底部 56px 並不划算，尤其 iPhone 還要再加 Home Indicator 的安全區。改採規格提供的替代方案：**固定 Header（含搜尋）＋ 首頁功能卡片 ＋ 各層級返回鍵**。列表頁右下角用 FAB 做「新增紀錄」，這是單手拇指最好按的位置。

### 元件

```
components/
  AppHeader.vue        固定頂部，搜尋框 + 語音鍵 + 同步狀態
  SearchBar.vue        含清除鍵、Web Speech API 整合
  CategoryCard.vue     首頁類別磚
  RecordCard.vue       紀錄卡片（純文字，無縮圖）
  Stepper.vue          [-] 14 [+] 集數
  WheelPicker.vue      通用滾輪，接受多欄設定
  SeasonPicker.vue     包 WheelPicker，數字 1–99 ↔「第一季」
  DurationPicker.vue   包 WheelPicker，三欄 時/分/秒
  ToggleSwitch.vue     完結狀態（非 checkbox）
  BottomSheet.vue      排序選單、確認對話框的容器
  ConfirmDialog.vue    二次確認（清除全部資料用）
  EmptyState.vue       空列表引導
```

**注意**：`RecordCard` 不含任何圖片。設計稿上的劇照縮圖不實作。

---

## 6. GitHub Pages 部署

```
vite.config.ts:  base: '/watch-tracker/'
網址:            https://ccwangilinux.github.io/watch-tracker/
```

### 路由模式：hash 還是 history？

| | history (`/watch-tracker/c/abc`) | **hash (`/watch-tracker/#/c/abc`)** |
|---|---|---|
| 直接開子路徑 | GitHub Pages 回 404，需靠 `404.html` 複製 `index.html` 的 hack | 永遠正常，伺服器只看到 `/watch-tracker/` |
| Service Worker 導航 fallback | 需額外設定 `navigateFallback` 與 denylist | 無此問題 |
| iOS standalone 分享出去的網址 | 可能因 404 hack 閃一下白畫面 | 穩定 |
| 網址美觀 | 較好 | 多一個 `#` |

**選 hash 模式。** 規格第 28 節特別點名「必須確認重新整理子路徑時不會造成問題」，hash 模式讓這個問題從根本上不存在。這是個人工具，網址美觀的價值遠低於「重新整理絕不出錯」。

### GitHub Actions

`.github/workflows/deploy.yml`：push 到 `main` → setup-node 20 → `npm ci` → `npm run build` → `actions/upload-pages-artifact` → `actions/deploy-pages`。使用 OIDC 權限（`pages: write`、`id-token: write`），**不需要任何 secret**。

需你先設定：repo **Settings → Pages → Source 選 GitHub Actions**。

---

## 7. iPhone Safari 相容方案

| 風險點 | 對策 |
|---|---|
| Safe Area / 瀏海 / Home Indicator | `viewport-fit=cover` + `env(safe-area-inset-*)`；Header 加 `padding-top`，FAB 與底部按鈕加 `padding-bottom` |
| 100vh 在 Safari 含網址列高度 | 用 `100dvh`（iOS 15.4+），`100vh` 作為 fallback |
| 輸入框聚焦時自動放大 | 所有 `input`/`select` 字級 ≥ 16px |
| 橡皮筋滾動穿透 | 捲動容器加 `overscroll-behavior: contain` |
| `position: fixed` 與鍵盤打架 | Header 用 `sticky` 而非 `fixed`；必要時用 `visualViewport` API 校正 |
| **Wheel Picker 套件不相容** | 不用套件。用原生捲動 + `scroll-snap-type: y mandatory` + `scroll-snap-align: center` 自己實作，靠 `scrollend`（不支援則用 scroll debounce）取值。原生捲動保有 iOS 慣性手感，也不會被套件的 touch 事件處理搞壞 |
| Web Speech API iOS Safari 不支援 | 啟動時偵測 `window.SpeechRecognition ?? window.webkitSpeechRecognition`，不存在就**隱藏**語音鍵，不留無作用的按鈕 |
| OAuth popup 被封鎖 | `requestAccessToken()` 必須在使用者點擊的同步事件中直接呼叫，不可放在 `await` 之後 |
| 觸控目標過小 | 所有可點元素最小 44×44 CSS px |
| iOS PWA 圖示 | `apple-touch-icon` 需為方形滿版不透明 PNG（iOS 自己套圓角），180×180 |
| iOS 不支援 manifest 的 splash | 用 `apple-touch-startup-image` 或接受預設白屏，首頁改用骨架屏降低感受 |

**測試方式**：Mac 可用 Safari 網頁檢查器連 iPhone；沒有 Mac 的話，先在桌面 Safari／Chrome 響應式模式測版面，PWA 與 OAuth 行為則必須用實機開 `https://ccwangilinux.github.io/watch-tracker/` 驗證（本機 `localhost` 無法從手機直接開，需 `--host` 加同網段 IP，但 GIS 要求 origin 必須在 Console 註冊，所以 Google 相關功能建議直接在 Pages 上測）。

---

## 8. Phase 與測試

依規格第 30 節，14 個 Phase 收斂為 6 個可驗收的里程碑：

| 里程碑 | 涵蓋 Phase | 完成時你能做什麼 |
|---|---|---|
| **M1 骨架** | 1–2 | 手機開網頁，看到深色首頁與固定 Header |
| **M2 資料層** | 3–5 | 類別可增刪改排序，資料重開瀏覽器還在 |
| **M3 核心功能** | 6 | 紀錄完整 CRUD、搜尋、排序、狀態還原——**此時 App 已可日常使用** |
| **M4 PWA + iOS** | 7–8 | 加到 iPhone 主畫面、離線可用、有 App Icon |
| **M5 雲端** | 9–11 | Google 登入、建立 Sheet、雙向同步 |
| **M6 收尾** | 12–14 | JSON 匯出匯入、自動部署、完整測試 |

每個里程碑結束時我會說明改了什麼、如何驗證。M3 之後你就可以開始真的拿它記錄，後續開發不會影響已存在的資料（schema 變更走 Dexie 版本遷移）。

**每個里程碑的固定檢查**：桌面 Chrome + iPhone Safari 實機各測一次；M4 起加測離線與安裝；M5 起加測 token 過期與解除綁定；每次 commit 前確認 repo 內無個人資料、無 token、無 secret。

---

## 需要你拍板的三件事

1. **Dexie.js**（+25KB gzip）換取簡潔的同步程式碼，接受嗎？若你偏好極簡，改用 `idb` 也可行，代價是同步模組會多約 150 行。
2. **hash 路由**（網址帶 `#`）換取子路徑重新整理絕不出錯，接受嗎？
3. **不做底部 Tab**，改用 Header 搜尋 + 首頁卡片 + 返回，接受嗎？

確認後我就開始 M1。
