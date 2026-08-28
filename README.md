# watch-tracker

**我的觀看紀錄 — Watch Tracker**

追劇不忘，記錄精彩時刻

一個以手機為主的個人觀看紀錄 PWA。資料存在裝置本機的 IndexedDB，離線完全可用，可選擇連結自己的 Google Sheets 作為備份與跨裝置同步。

👉 **https://ccwangilinux.github.io/watch-tracker/**

## 功能

**紀錄**
- 自訂觀看類別（名稱、圖示、顏色、拖曳排序）
- 片名、季數、集數、觀看時間、完結狀態、備註
- 觀看狀態標籤：正在看 / 等更新 / 待看，可留空不標記
- 卡片式列表，片名完整顯示、可一鍵複製
- 跨類別搜尋片名，支援語音輸入（瀏覽器支援時）
- 七種排序依據，設定會被記住

**離線與安裝**
- Offline First：開啟即讀本機資料，不等網路
- 可加入 iPhone / Android 主畫面，以獨立 App 形式啟動
- 完全離線也能新增與修改
- 設定頁可手動檢查更新

**備份與同步**
- 連結自己的 Google 帳號，資料備份到你自己的私人試算表
- 雙向合併同步，另提供「以本機覆蓋雲端」「以雲端覆蓋本機」兩種單向操作
- 多台裝置可連到同一份試算表
- JSON 匯出匯入，不依賴任何服務也能完整備份

## 開發

```bash
npm install
npm run dev        # 開發伺服器（埠號固定 5174）
npm test           # 執行測試
npm run build      # 型別檢查 + 建置
npm run preview    # 預覽建置結果（測 PWA 需用這個，dev 模式不註冊 Service Worker）
```

推送到 `main` 會自動部署至 GitHub Pages。

### 技術

Vue 3 · Vite · TypeScript · Pinia · Vue Router（hash 模式）· Dexie (IndexedDB) · vite-plugin-pwa · Google Identity Services · Google Sheets API

不使用任何 UI 框架，樣式全手寫；沒有後端，沒有帳號系統。

### 自行部署

1. Fork 本專案，到 repo 的 Settings → Pages 把 Source 設為 **GitHub Actions**
2. 修改 `vite.config.ts` 的 `base` 為你的 repo 路徑
3. 雲端功能需要自己的 Google OAuth Client ID，設定步驟見 App 內的
   **設定 → Google 綁定與同步說明**，該頁會直接顯示你要填入的網域
4. 把 Client ID 設為 repository variable `VITE_GOOGLE_CLIENT_ID`

不設定 Client ID 也能運作，只是雲端同步會停用，本機功能與 JSON 備份不受影響。

## 資料與隱私

本 repository 不含任何觀看紀錄、token 或密鑰。

- 所有資料存在使用者自己的裝置與自己的 Google 帳號中
- OAuth 只申請 `drive.file` 權限——只能存取本 App 建立的檔案，看不到雲端硬碟的其他內容
- 存取權杖只放在記憶體，不寫入任何儲存空間，關閉頁面即失效
- 授權過程完全在 Google 自己的頁面完成，本 App 拿不到使用者密碼
