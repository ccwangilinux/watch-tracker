# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案

**我的觀看紀錄 / Watch Tracker** — 個人觀看紀錄 PWA，手機優先、Offline First。
線上版：https://ccwangilinux.github.io/watch-tracker/

規格權威來源是 `docs/我的觀看紀錄 PWA 專案開發規格.pdf`（22 頁，繁體中文）。`docs/` **不進版控**（設計稿含個人信箱），只存在本機。設計稿與 PDF 衝突時以 PDF 為準；已知差異：設計稿的紀錄列表有劇照縮圖，**實作不採用**——列表與內容都不放任何圖片。

`ARCHITECTURE.md` 是開工前的架構分析，實作後有多處調整，以本文件與程式碼為準。

## 指令

```bash
npm run dev        # dev server，埠號固定 5174（strictPort）
npm test           # vitest，87 項
npm run build      # vue-tsc -b && vite build
npm run preview    # 測 PWA 必須用這個，dev 模式不註冊 Service Worker
npx vitest run src/services/sync   # 只跑同步相關測試
python3 scripts/generate-icons.py <母圖路徑>   # 重新產生全尺寸 icon
python3 scripts/import-wt.py wt.txt > out.json # 文字紀錄轉備份 JSON
```

**推送前一定要先跑 `npm test` 與 `npm run build`。** 推送即部署，CI 會擋下失敗，但那是浪費一次來回。

## Git 工作流程（硬性要求）

**改完就自動 commit 並 push，不必再問。** 使用者已明確授權，完成一項工作後直接依序執行：

1. `npm test` 與 `npm run build` **都要過**——沒過就不 commit，先修好
2. `git config user.email` 確認生效的是專案層級的值（見下方「Git 身份」）
3. 依主題拆 commit，一個 commit 一件事；訊息用繁體中文的 Conventional Commits
4. `git push`

只有這幾種情況要先問過再動手：

- 改寫已推上去的歷史：`rebase`、`amend`、`push --force`
- 刪檔案、或超出使用者原本要求範圍的大幅重構
- 測試或建置失敗且修不掉——**如實回報卡在哪**，不要用 `--no-verify`、`skip` 或註解掉測試來繞過

**push 就是部署到線上版**，所以第 1 點沒有商量空間。

## 進度

功能面已完整：專案骨架、IndexedDB 資料層、紀錄 CRUD/搜尋/排序、觀看狀態標籤、8 種主題（4 深 4 淺）、PWA、Google 雲端雙向同步與單向覆蓋、JSON 備份、CI/CD、設定說明頁。

未做：紀錄列表的拖曳排序（排序邏輯與 `sortOrder` 已就緒，只差 UI；長列表在手機上拖曳體驗不佳，刻意暫緩）。

## 架構

```
src/
  db/          Dexie schema（含版本遷移）與首次啟動的預設類別
  services/    純資料層，不 import Vue/Pinia
    sync/      merge.ts（合併演算法）· serialize.ts（Sheets 列轉換）· index.ts（協調）
    google/    auth.ts（GIS token）· sheets.ts（REST API）
    backup.ts  JSON 匯出匯入
    theme.ts   套用主題與開機快取
  stores/      Pinia：categories · records · ui（含 theme）· cloud
  composables/ useDragSort · useOnline · useClipboard · usePwaUpdate
  constants/   defaultCategories · palette · status · themes
  views/       9 個路由對應的頁面
  assets/styles/  tokens.css（預設主題與所有結構 token）· themes.css（8 種主題）· base.css
```

**分層規則**：`services/` 是純函式或純資料存取，不得 import 任何 Vue/Pinia——同步演算法尤其必須保持可獨立測試。UI 狀態走 `stores/`，元件不直接碰 `db`。

`services/theme.ts` 是唯一會碰 DOM 的 service（`documentElement` 的 data 屬性、`<meta>`、localStorage）。它仍然不 import Vue/Pinia，由 `stores/ui` 呼叫。

### 資料格式（全專案統一，不可混用）

- `watchTime` 存**總秒數**（number），上限 999:59:59 = 3599999
- `season` 的 **0 代表未設定**（不是第零季），1–99 才是實際季數。新紀錄預設 0；`episode` 新紀錄預設 0。用 0 而不是 null 是因為 Sheets 的空白儲存格讀回來轉數字本來就是 0，兩端不需要額外分支
- 列表上 `season <= 1` 與 `episode === 0` 都不顯示標籤。**第一季刻意也不顯示**：第一季是預設情況，標出來只是每張卡片多一個講廢話的標籤；而且舊資料與 `import-wt.py` 的舊預設都是 1，一旦顯示會讓幾乎每筆都長出「第一季」
- 時間戳存 **ISO 8601 UTC 字串**，固定長度可直接字典序比較
- id 一律 UUID v4
- 刪除一律**軟刪除**（`deletedAt`），30 天後才實體清除
- `status`（觀看狀態）為 `'planned' | 'watching' | 'waiting' | null`，**null 代表未標記**。與 `completed` 是**兩個獨立維度**——一部劇可以同時是「等更新」且尚未完結，混成同一欄位會失去這個區別

### 同步

三種操作，語意不同，UI 上分開提供：

- `runSync` — 雙向合併，`updatedAt` 較新者勝
- `pushAll` — 以本機覆蓋雲端，不合併
- `pullAll` — 以雲端覆蓋本機，不合併

合併是「先算出結果、再把完整結果整表覆寫回雲端」，不做逐列更新（列號位移算錯就會寫錯行）。

啟動時的背景同步**預設關閉**，由設定開關控制。同步會同時改動兩邊，預設交由使用者按下才執行。

## 已踩過的坑

以下都是修過的實際問題，改動相關程式碼前先讀：

**IndexedDB 不能用 `null` 或 boolean 當索引 key。** `deletedAt: null` 的資料不會出現在該索引裡，`where('deletedAt').equals(null)` 回傳空陣列。一律用 `filter` 查未刪除的資料。`completed`、`status` 同理不建索引。

**`title` 不建索引。** IndexedDB 索引只能前綴比對，規格要的是子字串搜尋（「進擊」配「進擊的巨人」）。記憶體 filter 足夠。

**預設類別用旗標判斷，不能用「資料表是否為空」。** 用表是否為空來判斷，會讓「清除全部資料」之後預設類別又長回來，接著從雲端同步時預設類別會與使用者自己的類別並存。改用 `meta.seeded`，清除資料後標記為已初始化。

**取代式匯入必須留下軟刪除墓碑，不能 `clear()`。** 直接清空的資料在雲端仍然存在，下次同步會被判定為「只有雲端有」而重新拉回本機，取代的效果就被同步還原了。

**連結雲端前必須先列出既有試算表。** `sheetId` 只存在各裝置自己的 IndexedDB、不會跨裝置傳遞，無條件 `createSpreadsheet` 會讓每台裝置各建一份、各自為政。

**`updatedAt` 相同但內容不同時，合併刻意兩邊都不覆寫。** 這是防止無聲丟資料的保護，但表現出來就是「同步了卻沒生效」，所以必須把 `ambiguousItems` 的明細顯示給使用者，並提供 `pushAll` / `pullAll` 讓他們明確指定以哪一邊為準。

**Sheets 寫入必須 `valueInputOption=RAW`。** 否則 ISO 8601 字串會被當日期解析成序列值，時間戳直接毀掉、版本比較全面失準。讀取用 `UNFORMATTED_VALUE`，否則大數字會帶千分位變成 `"3,599,999"`。

**整表覆寫要「先寫入、後清除多餘列」。** 反過來中途失敗會清空雲端資料。

**Sheets 欄位以表頭名稱定位，不用欄索引。** 使用者可能在試算表裡插欄或調順序。新增欄位（如 `status`）時，舊試算表沒有該欄要能容錯，跨版本同步才不會壞。

**iOS Safari 不支援 HTML5 Drag and Drop。** 觸控裝置上完全不觸發 `dragstart`。拖曳排序用 Pointer Events（`useDragSort`），把手必須 `touch-action: none`。

**iOS Safari 到 18.2 才支援 `scrollend`。** WheelPicker 用 100ms debounce 判斷捲動停止，並用旗標區隔程式捲動與使用者捲動，否則 v-model 與 scroll 事件會互相觸發成迴圈。

**還原捲動位置要等頁面長高。** 列表資料是非同步從 IndexedDB 載入的，直接回傳 `savedPosition` 會被瀏覽器夾成「當前能捲到的最大值」。另外編輯後要用 `history.back()` 而非 `push`，否則根本沒有 `savedPosition`。

**Service Worker 只在頁面載入時比對 `sw.js`。** PWA 從主畫面啟動常常直接沿用既有 SW，使用者會一直停在舊版。設定頁提供手動 `registration.update()`。

**`useRegisterSW` 必須做成模組層單例。** 多個元件各自呼叫會註冊多份狀態，一邊按了更新另一邊不會反應。

**CSS 變數裡的 `var()` 是在「宣告它的元素」上展開，不是使用端。** `--gradient: linear-gradient(…, var(--accent), …)` 只寫在 `:root`，就永遠用 `:root` 的 accent；把 `data-theme` 掛在 `:root` 以外的元素（設定頁的色票預覽）拿到的會是預設主題的漸層，8 種色票長得一模一樣。衍生色（`--gradient` / `--accent-soft` / `--shadow-fab`）必須在 `[data-scheme]` 那層再宣告一次，才與 `[data-theme]` 同層展開。

**主題必須在 Vue 掛載前就套用。** 權威值在 IndexedDB，是非同步的，等它讀完再套用，每次從主畫面啟動 PWA 都會先閃一下預設的深藍底。`index.html` 的內聯腳本讀 localStorage 的 `wt.boot` 先塗好底色，`services/theme.ts` 每次切換時同步更新那份快取與 `#boot-paint`（打包後內聯樣式與 base.css 的先後順序不該由程式去賭）。切換主題也要一併改 `<meta name="theme-color">`，否則 iOS standalone 的狀態列會留一條異色。

**中文排序必須用 `localeCompare('zh-Hant')`。** UTF-16 碼位順序與筆劃、注音無關。

**TypeScript 7 與 vue-tsc 不相容。** TS 7 是原生 Go 版本，移除了 `./lib/tsc` 子路徑。`typescript` 鎖在 `~5.9`，不要升。

**Vite 埠號固定 5174 且 `strictPort`。** Google OAuth 的 JavaScript 來源是逐字比對，埠號一跳掉授權就被拒。

**Header 與編輯頁的儲存列都用 `sticky` 不用 `fixed`；所有 input 字級 ≥ 16px。** fixed 在 iOS 鍵盤彈出時會抖動錯位；字級低於 16px 聚焦時會自動放大整頁。儲存列另有一個好處：sticky 仍在版面流程裡，捲到最底時它停在自己原本的位置，不會蓋住備註與時間戳——fixed 則會一直壓在內容上。

**類別列表的狀態篩選不跨類別保留，也不寫進 `meta`。** `statusFilter` 曾是持久化的全域值：在陸劇選了「正在看」，切到韓劇仍然套用，該類別沒有這個狀態的紀錄就整頁空白，看起來像資料不見了。更糟的是筆數 0 的 chip 被過濾掉，篩選開著卻找不到地方取消。現在每次進入類別列表都重置成「全部」，且選中的 chip 即使筆數是 0 也一定顯示。

## UI 慣例

**快速檢視（`/s/:status`）依觀看類別分組**：類別照使用者排好的順序，組內的片子維持目前的排序設定。跨類別混成一長串時，哪些是陸劇、哪些是韓劇完全看不出來。分組標題已經標明類別，卡片上就不再重複顯示類別標籤；類別已被刪除、或同步時紀錄先到而類別還沒到的紀錄集中在最後的「未分類」，不能整組消失。頁面上方有狀態切換列（`StatusTabs`），用 `replace` 導覽——連切幾個狀態後按返回應該回首頁，而不是倒著退回剛看過的每個狀態。

**8 種主題，4 深 4 淺**，深淺都是實作過的一等公民。元件內不得出現字面色值，一律走 `tokens.css` / `themes.css`——包含遮罩、開關鈕、疊在主色上的前景色（`--scrim` / `--knob` / `--on-accent`），淺色主題不能沿用深色那組 `rgba(0,0,0,…)`。

主題分兩層覆寫：`[data-scheme="dark|light"]` 放狀態色、季集時間色、語意色、遮罩與陰影；`[data-theme="…"]` 每個主題只放 13 個值（5 層背景、3 級文字、2 種線條、3 個主色）。兩者都是屬性選擇器、同一 specificity，**scheme 必須寫在 theme 之前**。

主題存 `meta` 表、**不進雲端同步**（換裝置本來就該各自決定），另在 localStorage 留一份開機快取供 `index.html` 的內聯腳本防閃爍。

**觀看時間旁固定有「歸零」**：每季看完就重新計時是常態操作，歸零鍵與時間選擇並排在同一列上，值已是 0 時停用。歸零只改表單上的值，按下儲存才寫入。

**狀態標籤與觀看資訊必須分屬不同色系**：狀態（粉/橘/灰）走外框樣式靠右，季/集/時間（紫/青/琥珀）走填色靠左。曾經狀態的「正在看」與集數用了完全相同的青色，同一張卡片上兩個青色標籤並排無法分辨。

**片名完整顯示不截斷**——資料中有超過 50 字的片名，截掉就認不出是哪一部。編輯用 `AutoTextarea`（隨內容增高，但攔掉 Enter 當單行欄位用）。

## iOS 相容要求

safe-area 內距、`100dvh`、`overscroll-behavior` 防橡皮筋、觸控目標最小 44px。語音搜尋與剪貼簿 API 都必須偵測支援度並提供退路（`execCommand`），iOS Safari 不支援 Web Speech API 時**隱藏**按鈕而非留下無作用的控制項。

PWA 與 OAuth 相關驗證必須在真實 HTTPS 網域（線上版）進行——Service Worker 只在 https 或 localhost 註冊，手機連本機 IP 是純 http，測不出 PWA 行為。

## Git 身份（硬性要求）

個人專案，與工作身份完全分離：

```bash
git config --local user.name  ccwangilinux
git config --local user.email 158008096+ccwangilinux@users.noreply.github.com
```

remote 走 SSH alias `github.com-new`（對應 `id_ed25519_ccwangilinux`），不要用 HTTPS——全域 credential helper 會帶上另一組工作憑證。本機**全域** git config 是工作用身份，**絕不可用於本專案任何 commit**。commit 前以 `git config user.email` 確認生效的是專案層級的值。

repo 是 Public，作者資訊寫錯就永久留在公開歷史裡。

## 安全限制

repo 是 Public，以下**絕對禁止**進入版控：任何觀看紀錄或個人資料、Google Client **Secret**、Access/Refresh Token、`.env`、`wt.txt`、備份 JSON。

可公開：OAuth **Client ID**（設計上就是公開值，會出現在前端 bundle 中）、所有前端程式碼。

OAuth 只申請 `drive.file` scope——只能存取本 App 建立的檔案。Access token **只存記憶體**，不寫入 IndexedDB 或 localStorage；前端 token flow 拿不到 refresh token 是設計上的安全限制，不是缺陷。Sheet ID 存在 IndexedDB 的 `meta` 表。

同步失敗、授權過期**絕不能影響 App 使用**——所有雲端行為都在背景，失敗只更新狀態指示。
