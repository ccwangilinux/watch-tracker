# watch-tracker

**我的觀看紀錄 — Watch Tracker**

追劇不忘，記錄精彩時刻

一個以手機為主的個人觀看紀錄 PWA。資料存在裝置本機的 IndexedDB，離線完全可用，可選擇連結自己的 Google Sheets 作為備份與跨裝置同步。

👉 https://ccwangilinux.github.io/watch-tracker/

## 特色

- **Offline First** — 開啟即讀本機資料，不等任何網路請求；沒有網路也能完整使用
- **PWA** — 可加入 iPhone / Android 主畫面，以獨立 App 形式啟動
- **深色介面** — 卡片式、大觸控目標，為單手操作設計
- **雲端備份（選用）** — 透過 Google 官方 OAuth 連結你自己的私人 Google Sheet
- **JSON 匯出匯入** — 不依賴任何服務也能完整備份

## 開發

```bash
npm install
npm run dev        # 開發伺服器
npm test           # 執行測試
npm run build      # 型別檢查 + 建置
npm run preview    # 預覽建置結果（測 PWA 需用這個，dev 模式不註冊 Service Worker）
```

推送到 `main` 會自動部署至 GitHub Pages。

## 技術

Vue 3 · Vite · TypeScript · Pinia · Vue Router · Dexie (IndexedDB) · vite-plugin-pwa · Google Identity Services · Google Sheets API

## 資料與隱私

本 repository 不含任何觀看紀錄、token 或密鑰。所有個人資料只存在於使用者自己的裝置與自己的 Google 帳號中。
