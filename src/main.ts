import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/styles/base.css'
import { applyTheme, cachedTheme } from './services/theme'

// 掛載前先套用開機快取的主題；權威值稍後由 ui store 從 meta 表讀出後再確認一次
applyTheme(cachedTheme())

createApp(App).use(createPinia()).use(router).mount('#app')
