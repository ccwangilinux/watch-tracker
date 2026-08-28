<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useOnline } from '@/composables/useOnline'

/**
 * 兩種狀態共用一條底部提示：
 *   離線   — 告知資料仍可正常讀寫，避免使用者以為壞了
 *   有新版 — 由使用者按下才套用，不在使用中偷偷換版
 */
const { online } = useOnline()
const { needRefresh, updateServiceWorker } = useRegisterSW()

function applyUpdate() {
  updateServiceWorker(true)
}
</script>

<template>
  <Transition name="slide">
    <div v-if="needRefresh" class="banner banner--update">
      <span class="banner__text">有新版本可用</span>
      <button class="banner__btn" type="button" @click="applyUpdate">立即更新</button>
      <button class="banner__close" type="button" aria-label="稍後再說" @click="needRefresh = false">
        ✕
      </button>
    </div>

    <div v-else-if="!online" class="banner banner--offline">
      <span class="banner__text">目前離線 — 資料仍可正常新增與修改</span>
    </div>
  </Transition>
</template>

<style scoped>
.banner {
  position: fixed;
  left: calc(var(--sp-4) + var(--safe-left));
  right: calc(var(--sp-4) + var(--safe-right));
  bottom: calc(var(--sp-4) + var(--safe-bottom));
  z-index: 150;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-height: 52px;
  padding: var(--sp-2) var(--sp-3) var(--sp-2) var(--sp-4);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-card);
  font-size: 14px;
  max-width: 688px;
  margin: 0 auto;
}

.banner--update {
  background: var(--gradient);
  color: #fff;
}

.banner--offline {
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-dim);
}

.banner__text { flex: 1 1 auto; font-weight: 600; }

.banner__btn {
  flex: 0 0 auto;
  min-height: 36px;
  padding: 0 var(--sp-3);
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-weight: 700;
}

.banner__close {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.85);
}

.slide-enter-active, .slide-leave-active { transition: transform 0.25s var(--ease), opacity 0.25s var(--ease); }
.slide-enter-from, .slide-leave-to { transform: translateY(120%); opacity: 0; }
</style>
