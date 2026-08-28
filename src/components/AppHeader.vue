<script setup lang="ts">
import { ref } from 'vue'
import SearchBar from './SearchBar.vue'

const keyword = ref('')
</script>

<template>
  <header class="header">
    <div class="header__inner">
      <SearchBar v-model="keyword" />
      <button class="header__status" type="button" aria-label="雲端同步狀態">
        <span class="header__dot" />
        <span class="header__cloud">☁</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
/*
 * 用 sticky 而非 fixed：iOS Safari 上 fixed 元素在鍵盤彈出、
 * 網址列收合時會抖動或錯位，sticky 交給瀏覽器原生處理較穩。
 */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding-top: var(--safe-top);
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-soft);
}

.header__inner {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-height: var(--header-h);
  padding: var(--sp-2) calc(var(--sp-4) + var(--safe-right)) var(--sp-2)
           calc(var(--sp-4) + var(--safe-left));
  max-width: 720px;
  margin: 0 auto;
}

.header__status {
  position: relative;
  flex: 0 0 auto;
  width: var(--touch);
  height: var(--touch);
  display: grid;
  place-items: center;
  border-radius: var(--r-full);
  background: var(--surface);
  font-size: 18px;
}

.header__dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: var(--r-full);
  background: var(--text-faint);
  border: 2px solid var(--bg);
}
</style>
