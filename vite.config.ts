import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// GitHub Pages: https://ccwangilinux.github.io/watch-tracker/
const BASE = '/watch-tracker/'

// 建置時間戳，用於在設定頁確認裝置上跑的是哪一版——
// PWA 會提供 Service Worker 的快取版本，光看畫面分辨不出新舊
const BUILD_TIME = new Date().toISOString()

export default defineConfig({
  base: BASE,
  define: {
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  plugins: [
    vue(),
    VitePWA({
      // prompt 而非 autoUpdate：使用中的資料若在背景被換版，
      // 可能出現畫面與 Service Worker 版本不一致，交由使用者按下更新較安全。
      registerType: 'prompt',
      includeAssets: ['icons/favicon-32.png', 'icons/icon-180.png'],
      manifest: {
        name: '我的觀看紀錄',
        short_name: '觀看紀錄',
        description: '追劇不忘，記錄精彩時刻',
        lang: 'zh-Hant',
        dir: 'ltr',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0b0e1a',
        background_color: '#0b0e1a',
        categories: ['entertainment', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-1024.png', sizes: '1024x1024', type: 'image/png' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // hash 路由下所有導覽都落在 index.html，離線時直接吐快取版本
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
        // 1024 的 icon 單檔近 300KB，預設 2MiB 上限雖夠，仍明確設定避免日後踩到
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: {
        // dev 模式不註冊 SW，避免與 HMR 互相干擾；要測 PWA 請用 build + preview
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: true, // 允許同網段的手機連入
    // 固定埠號並在被占用時直接報錯：Google OAuth 的「已授權的 JavaScript 來源」
    // 是逐字比對的，埠號一跳掉授權就會被拒，寧可起不來也不要靜靜換埠。
    port: 5174,
    strictPort: true,
  },
})
