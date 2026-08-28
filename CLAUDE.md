# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案

**我的觀看紀錄 / Watch Tracker** — 個人觀看紀錄 PWA，手機優先、Offline First。
線上版：https://ccwangilinux.github.io/watch-tracker/

規格權威來源是 `docs/我的觀看紀錄 PWA 專案開發規格.pdf`（22 頁，繁體中文）。`docs/` **不進版控**（設計稿含個人信箱），只存在本機。設計稿與 PDF 衝突時以 PDF 為準；已知差異：設計稿的紀錄列表有劇照縮圖，**實作不採用**——列表與內容都不放任何圖片。

`ARCHITECTURE.md` 是開工前的架構分析，實作後有幾處調整，以本文件與程式碼為準。

## 指令

```bash
npm run dev        # dev server，埠號固定 5174（strictPort）
npm test           # vitest，67 項
npm run test:watch
npm run build      # vue-tsc -b && vite build
npm run preview    # 測 PWA 必須用這個，dev 模式不註冊 Service Worker
npx vitest run src/services/sync   # 只跑同步相關測試
python3 scripts/generate-icons.py <母圖路徑>   # 重新產生全尺寸 icon
```

推送 `main` 會自動部署至 GitHub Pages。

## 進度

已完成 M1–M5 與部署：專案骨架、IndexedDB 資料層、紀錄 CRUD/搜尋/排序、PWA、Google 雲端同步、JSON 備份、CI/CD。

尚未做：紀錄列表的拖曳排序（排序邏輯與 `sortOrder` 已就緒，只差 UI；刻意暫緩，長列表在手機上拖曳體驗不佳）。

## 架構

```
src/
  db/          Dexie schema 與首次啟動的預設類別
  services/    純資料層，不 import Vue/Pinia
    sync/      merge.ts（合併演算法）· serialize.ts（Sheets 列轉換）· index.ts（協調）
    google/    auth.ts（GIS token）· sheets.ts（REST API）
  stores/      Pinia：categories · records · ui · cloud
  composables/ useDragSort · useOnline
  components/  UI 元件
  views/       7 個路由對應的頁面
```

**分層規則**：`services/` 是純函式或純資料存取，不得 import 任何 Vue/Pinia——同步演算法尤其必須保持可獨立測試。UI 狀態走 `stores/`，元件不直接碰 `db`。

### 資料格式（全專案統一，不可混用）

- `watchTime` 存**總秒數**（number），上限 999:59:59 = 3599999
- 時間戳存 **ISO 8601 UTC 字串**，固定長度可直接字典序比較，等同數值比較
- id 一律 UUID v4
- 刪除一律**軟刪除**（`deletedAt`），30 天後才實體清除

### 同步

`services/sync/merge.ts` 是雙向合併：只有一邊有就補到另一邊，兩邊都有則 `updatedAt` 較新者勝。軟刪除讓「刪除」變成一般更新，不需特殊處理。`updatedAt` 相同但內容不同時**兩邊都不覆寫**，只回報 `ambiguous`——那代表某邊的時間戳沒推進，猜錯會無聲丟資料。

同步是「合併後把完整結果整表覆寫回雲端」，不做逐列更新（列號位移算錯就會寫錯行）。

## 已踩過的坑

以下都是修過的實際問題，改動相關程式碼前先讀：

**IndexedDB 不能用 `null` 或 boolean 當索引 key。** `deletedAt: null` 的資料不會出現在該索引裡，`where('deletedAt').equals(null)` 回傳空陣列。一律用 `filter` 查未刪除的資料；`deletedAt` 索引只給反向查詢「已刪除待清理」用。`completed` 同理不建索引。

**`title` 不建索引。** IndexedDB 索引只能前綴比對，規格要的是子字串搜尋（「進擊」配「進擊的巨人」）。記憶體 filter 足夠。

**iOS Safari 不支援 HTML5 Drag and Drop。** 觸控裝置上完全不觸發 `dragstart`。拖曳排序用 Pointer Events（`useDragSort`），把手必須 `touch-action: none`，否則垂直拖曳被判定成頁面捲動。

**iOS Safari 到 18.2 才支援 `scrollend`。** WheelPicker 用 100ms debounce 判斷捲動停止，並用 `programmatic` 旗標區隔程式捲動與使用者捲動，否則 v-model 與 scroll 事件會互相觸發成迴圈。

**Sheets 寫入必須 `valueInputOption=RAW`。** 否則 ISO 8601 字串會被當日期解析成序列值，時間戳直接毀掉、版本比較全面失準。讀取用 `UNFORMATTED_VALUE`，否則大數字會帶千分位變成 `"3,599,999"`。

**整表覆寫要「先寫入、後清除多餘列」。** 反過來中途失敗會清空雲端資料。這個順序最壞只留下殘留列，而沒有 id 的列會在解析時被略過。

**中文排序必須用 `localeCompare('zh-Hant')`。** UTF-16 碼位順序與筆劃、注音無關，直接比會得到看似隨機的結果。

**TypeScript 7 與 vue-tsc 不相容。** TS 7 是原生 Go 版本，移除了 `./lib/tsc` 子路徑，vue-tsc 3.x 仍依賴它。`typescript` 鎖在 `~5.9`，不要升。

**Vite 埠號固定 5174 且 `strictPort`。** Google OAuth 的 JavaScript 來源是逐字比對，埠號一跳掉授權就被拒。

**Header 用 `sticky` 不用 `fixed`。** fixed 在 iOS 鍵盤彈出、網址列收合時會抖動錯位。

**所有 input 字級必須 ≥ 16px**，否則 iOS 聚焦時自動放大整頁。

## iOS 相容要求

safe-area 內距（`env(safe-area-inset-*)`）、`100dvh`、`overscroll-behavior` 防橡皮筋、觸控目標最小 44px。語音搜尋用 Web Speech API 但必須偵測支援度，iOS Safari 不支援時**隱藏**按鈕而非留下無作用的控制項。

PWA 相關驗證必須在真實 HTTPS 網域（線上版）進行——Service Worker 只在 https 或 localhost 註冊，手機連本機 IP 是純 http，測不出 PWA 行為。

## Git 身份（硬性要求）

個人專案，與工作身份完全分離。`git init` 後第一件事就是設定專案層級身份：

```bash
git config --local user.name  ccwangilinux
git config --local user.email 158008096+ccwangilinux@users.noreply.github.com
```

remote 走 SSH alias `github.com-new`（對應 `id_ed25519_ccwangilinux`），不要用 HTTPS——全域 credential helper 會帶上另一組工作憑證。本機**全域** git config 是工作用身份，**絕不可用於本專案任何 commit**。commit 前以 `git config user.email` 確認生效的是專案層級的值。

repo 是 Public，作者資訊寫錯就永久留在公開歷史裡。

## 安全限制

repo 是 Public，以下**絕對禁止**進入版控：任何觀看紀錄或個人資料、Google Client **Secret**、Access/Refresh Token、`.env`。

可公開：OAuth **Client ID**（設計上就是公開值，會出現在前端 bundle 中，已寫在 `.env.example` 與部署 workflow）、所有前端程式碼。

OAuth 只申請 `drive.file` scope——只能存取本 App 建立的檔案，看不到雲端硬碟其他內容。Access token **只存記憶體**，不寫入 IndexedDB 或 localStorage，重整頁面即失效；前端 token flow 拿不到 refresh token 是設計上的安全限制，不是缺陷。Sheet ID 存在 IndexedDB 的 `meta` 表，不進 repo。

同步失敗、授權過期**絕不能影響 App 使用**——所有雲端行為都在背景，失敗只更新狀態指示。
