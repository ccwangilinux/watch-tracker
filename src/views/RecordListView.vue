<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <section class="placeholder">
    <button class="back" type="button" @click="router.back()">‹ 返回</button>
    <h1>紀錄列表</h1>
    <p>此頁面將在後續里程碑實作。</p>
  </section>
</template>

<style scoped>
.placeholder { display: flex; flex-direction: column; gap: var(--sp-4); align-items: flex-start; }
.back { min-height: var(--touch); color: var(--text-dim); font-weight: 600; }
h1 { font-size: 20px; font-weight: 700; }
p { color: var(--text-faint); font-size: 14px; }
</style>
