<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <AppHeader />
  <main class="app-main">
    <RouterView v-slot="{ Component }">
      <component :is="Component" />
    </RouterView>
  </main>
</template>

<style scoped>
.app-main {
  /* 左右安全區給瀏海機橫置時用 */
  padding: var(--sp-4) calc(var(--sp-4) + var(--safe-left)) 
           calc(var(--sp-8) + var(--safe-bottom)) calc(var(--sp-4) + var(--safe-right));
  max-width: 720px;
  margin: 0 auto;
}
</style>
