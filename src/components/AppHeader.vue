<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import SearchBar from './SearchBar.vue'
import { useUiStore } from '@/stores/ui'
import { useCloudStore } from '@/stores/cloud'

// 搜尋字串放在 store：規格第 7 節要求下次開啟能還原上次的搜尋內容
const { searchText } = storeToRefs(useUiStore())

const router = useRouter()
const cloud = useCloudStore()

const dotClass = computed(() => {
  if (!cloud.linked) return 'is-off'
  return `is-${cloud.state}`
})

const statusLabel = computed(() => {
  if (!cloud.linked) return '未連結雲端'
  if (cloud.state === 'syncing') return '同步中'
  if (cloud.state === 'error') return '同步失敗'
  if (cloud.state === 'unauthorized') return '需要重新授權'
  return '已同步'
})
</script>

<template>
  <header class="header">
    <div class="header__inner">
      <SearchBar v-model="searchText" />
      <button
        class="header__status"
        type="button"
        :aria-label="`雲端同步狀態：${statusLabel}`"
        :title="statusLabel"
        @click="router.push('/settings/cloud')"
      >
        <span class="header__dot" :class="dotClass" />
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

.header__dot.is-off { background: var(--text-faint); }
.header__dot.is-idle { background: var(--success); }
.header__dot.is-syncing { background: var(--warning); animation: blink 1s ease-in-out infinite; }
.header__dot.is-error { background: var(--danger); }
.header__dot.is-unauthorized { background: var(--warning); }

@keyframes blink { 50% { opacity: 0.25; } }
</style>
