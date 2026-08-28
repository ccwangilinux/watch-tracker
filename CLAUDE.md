# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案現況

**目前尚未有任何程式碼。** 本目錄只有 `docs/`，內含：

- `docs/我的觀看紀錄 PWA 專案開發規格.pdf` — 22 頁完整規格（唯一的權威來源，開工前務必先讀）
- `docs/ChatGPT Image *.png` — 一張總覽設計稿（icon 尺寸表、各頁面 mockup、資料結構、專案結構）
- `docs/*.jpeg` — App Icon 提案圖 ×3（1024/1024/2048）與 OG 橫幅 ×2（1200×630）

**PDF 是唯一權威來源，圖片僅供參考。** 兩者衝突時以 PDF 為準。目前已知的差異：設計稿的紀錄列表左側有劇照縮圖，**實作不採用**——列表與詳細內容都不放任何圖片（劇照、海報、封面），純文字卡片。設定頁 mockup 上出現的 Google 信箱只是示意，不是設定值。

尚未 `git init`、尚未建立 Vite 專案。規格第 33 節明確要求：**先做需求與架構分析並經使用者確認，再開始建立專案**，不要一次產生大量程式碼。

專案名稱：我的觀看紀錄 / Watch Tracker，副標「追劇不忘，記錄精彩時刻」。

## 指定技術棧

Vue 3（Composition API）+ Vite + TypeScript + Pinia，IndexedDB 為主資料庫，PWA（manifest + Service Worker），Google Identity Services (OAuth) + Google Sheets API，部署到 GitHub Pages。

套件選擇規則：優先維護活躍、免費、MIT/Apache 授權、Vue 3 相容、**且必須在 iOS Safari 上驗證過**。不要引入不必要的大型框架或自建後端（明確排除 Laravel、MySQL、AWS、VPS、註冊系統）。

尚無 `package.json`，建立後常用指令預期為 `npm run dev` / `build` / `preview`，實際以屆時 scaffold 出來的為準。

## 架構要點

### Offline First 是核心，不是選項

```
使用者 → Vue 3 → IndexedDB          （日常操作，完全不碰網路）
IndexedDB → OAuth → Sheets API → Google Sheets  （明確要同步時才走）
```

開啟 App 的流程必須是：讀 IndexedDB → 立即顯示最後狀態 → **背景**檢查雲端 → 有更新才同步並更新畫面。任何情況下都不能讓使用者等 Google API 才看到畫面；無網路時功能照常。

Google Sheets 的定位是「雲端備份 / 匯入匯出 / 跨裝置來源」，**不是唯一資料庫**。

### 資料模型（先設計 schema 再寫畫面）

- `Category`: id, name, icon, color, sortOrder, createdAt, updatedAt
- `WatchRecord`: id, categoryId, title, episode, season, watchTime, completed, sortOrder, note（預留）, createdAt, updatedAt, deletedAt

id 一律 UUID；時間格式（ISO 8601 或 Unix timestamp）擇一並全專案統一。`watchTime` 為 HH:MM:SS（時 0–999、分秒 0–59），存成總秒數或 hours/minutes/seconds 需先評估哪種對搜尋/排序/擴充最有利。season 內部存數字 1–99，UI 顯示「第一季」。

除了資料，還要持久化 UI 狀態：最後選的類別、搜尋字串、排序方式、瀏覽模式等，下次開啟要能還原。

### 同步策略

必須是雙向合併，禁止任一邊整包覆蓋。以 UUID 比對同一筆、以 `updatedAt` 判斷版本、刪除一律 soft delete（`deletedAt`）、同步完成後再清理。第一版衝突處理用「updatedAt 較新者勝」。

**同步邏輯獨立成 service，不可寫在 Vue component 裡。**

Google Sheets 端結構：Sheet `Categories` 與 Sheet `WatchRecords`，欄位與資料模型一致（含 deletedAt），設計成程式可穩定同步的格式而非給人看的表格。

## Git 身份（硬性要求）

本專案是**個人**專案，與公司帳號完全分離。`git init` 後的**第一件事**就是設定專案層級身份，設完才能 commit：

```bash
git config --local user.name  ccwangilinux
git config --local user.email 158008096+ccwangilinux@users.noreply.github.com
git remote add origin git@github.com-new:ccwangilinux/watch-tracker.git
```

- 本機**全域** git config 是另一組工作用身份，**絕不可用於本專案任何 commit**——所以 local config 必須明確設定，不能繼承
- 用 GitHub noreply 信箱而非真實 gmail：repo 是 Public，作者信箱會被爬蟲抄走且無法事後移除
- remote 走 SSH alias `github.com-new`（`~/.ssh/config` 已設好，對應 `id_ed25519_ccwangilinux`），不要用 HTTPS
- 每次 commit 前以 `git config user.email` 確認生效的是專案層級的值

**注意本機既有慣例是錯的**：這台機器上其他專案一律沒設 local `user.email`，即使 remote 走對了 SSH alias，commit author 仍是全域那組工作身份。推送金鑰對了不等於作者身份分乾淨了，不要沿用這個慣例。

repo 是 Public，作者資訊寫錯就永久留在公開歷史裡，只能靠重寫歷史更正。

## 硬性安全限制

Repository 是 Public，以下**絕對禁止**：

1. 任何觀看紀錄 / 個人資料進入 repo（含 JSON 資料檔、寫死在 TS/JS 裡的資料）
2. Google Client **Secret**、Access Token、Refresh Token 進 repo 或寫死在前端
3. Google 密碼存進 IndexedDB（PWA 永遠不該碰到密碼，一律走官方 OAuth）
4. 把 Google Sheet 設為公開、用「知道網址就能讀寫」或秘密 URL 當保護機制

可公開：Google OAuth **Client ID**、前端程式碼、UI、PWA 與 IndexedDB 操作程式。只申請完成功能所需的最小 Google 權限。

不要假設 Google Cloud Console 已設定完成；需要使用者去 Console 操作時，明確說出要做什麼。

## iPhone Safari 是第一優先測試環境

只在 Chrome Desktop 測過不算完成。每個階段都要檢查：viewport / Safe Area / 瀏海與 Dynamic Island / Home Indicator / standalone 模式 / touch / scroll / fixed header / input / select / picker / 鍵盤 / 語音輸入 / IndexedDB / Service Worker / OAuth redirect。

語音搜尋用 Web Speech API，但必須偵測支援度；iOS Safari 不支援時要隱藏或停用按鈕，且不得影響一般文字搜尋。

所有按鈕需足夠大的觸控區域。

## UI 慣例

深色模式為預設（未來預留淺色），深藍/黑底配紫藍、粉紫 accent，卡片式、圓角、大按鈕，避免整體過度發光與「後台系統感」。

- 紀錄列表用一筆一張 Card，**不用桌面式表格**；點整張 Card 進入編輯
- 集數用 `[-] [14] [+]` 步進器；季數用下拉或 iOS 風格 wheel picker；觀看時間用時/分/秒 wheel picker
- 完結狀態用明顯的 toggle（非單純 checkbox），列表上要有醒目標記
- 首頁 = Header（固定搜尋）+ 類別網格 + 新增類別 + 設定 + 雲端同步，一次不要塞太多功能
- 底部 Tab 若造成擁擠就改用 Header 搜尋 + 功能卡片 + 返回
- 「清除全部資料」必須二次確認

## 開發流程

規格第 30 節的 Phase 順序：Vue3+Vite+TS → 深色基礎 UI → Category → WatchRecord → IndexedDB → CRUD/搜尋/排序 → PWA → iPhone 相容 → Google OAuth → Sheets API → 同步/匯入匯出 → JSON 備份 → GitHub Pages → 完整測試。

每個 Phase 完成後：說明改了什麼、主動測試、告訴使用者如何驗證。有多種技術方案時先比較再選，偏好簡單、穩定、免費、好維護。

JSON 匯出/匯入優先度高——即使 Google API 掛掉也要能完整備份。

## 部署注意

GitHub Actions 部署到 GitHub Pages。repo 預定名稱 `watch-tracker`，網址 `https://ccwangilinux.github.io/watch-tracker/`，因此 Vite `base` 需設為 `/watch-tracker/`。需處理 Vite `base` path、Service Worker 與 assets 路徑、以及 Vue Router 在 GitHub Pages 上的 SPA fallback（重新整理子路徑不能 404）。

## App Icon

需產生真正的 PNG（非 CSS 繪製），尺寸至少：1024, 512, 192, 180, 152, 144, 120, 96, 76, 72, 60, 57, 48。iOS 另需正確設定 `apple-touch-icon`。

母圖已存在於 `docs/`（三張 icon 提案，深色底＋霓虹場記板／播放鍵）。本機有 ImageMagick 6（指令是 `convert`，非 `magick`）與 Pillow 10.2，可直接由母圖批次輸出各尺寸 PNG，不需另外找設計工具。注意提案圖本身已帶 squircle 圓角，iOS 會再套一次圓角遮罩，輸出前需把背景補滿至方形滿版避免雙重圓角。

App 內的類別圖示是另一回事——規格要求使用者可自訂圖示，請用 emoji 或內嵌 SVG icon set，不要用點陣圖。
