<script setup lang="ts">
import { onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import PwaBanner from '@/components/PwaBanner.vue'
import { useCategoryStore } from '@/stores/categories'
import { useUiStore } from '@/stores/ui'
import { useCloudStore } from '@/stores/cloud'

const categoryStore = useCategoryStore()
const uiStore = useUiStore()
const cloudStore = useCloudStore()

// Offline First：啟動只讀 IndexedDB，畫面立刻可用，不等任何網路請求
onMounted(async () => {
  await Promise.all([categoryStore.init(), uiStore.restore()])

  // 雲端檢查放在畫面就緒之後，且不 await——
  // 失敗、逾時、沒授權都不該影響 App 的正常使用（規格第 6 節）
  void cloudStore.syncInBackground()
})
</script>

<template>
  <AppHeader />
  <main class="app-main">
    <RouterView v-slot="{ Component }">
      <component :is="Component" />
    </RouterView>
  </main>
  <PwaBanner />
</template>

<style scoped>
.app-main {
  padding: var(--sp-4) calc(var(--sp-4) + var(--safe-left))
           calc(var(--sp-8) + var(--safe-bottom)) calc(var(--sp-4) + var(--safe-right));
  max-width: 720px;
  margin: 0 auto;
}
</style>
