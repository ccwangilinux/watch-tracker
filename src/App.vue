<script setup lang="ts">
import { onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import PwaBanner from '@/components/PwaBanner.vue'
import { useCategoryStore } from '@/stores/categories'
import { useUiStore } from '@/stores/ui'

const categoryStore = useCategoryStore()
const uiStore = useUiStore()

// Offline First：啟動只讀 IndexedDB，不等任何網路請求
onMounted(async () => {
  await Promise.all([categoryStore.init(), uiStore.restore()])
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
