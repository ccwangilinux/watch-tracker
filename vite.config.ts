import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// GitHub Pages: https://ccwangilinux.github.io/watch-tracker/
export default defineConfig({
  base: '/watch-tracker/',
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: true, // 允許同網段手機連入實測
  },
})
