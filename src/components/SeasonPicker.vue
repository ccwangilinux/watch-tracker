<script setup lang="ts">
import WheelPicker from './WheelPicker.vue'
import type { WheelOption } from '@/types/ui'
import { formatSeason, SEASON_MIN, SEASON_MAX } from '@/utils/season'

/** 內部存數字 1–99，UI 顯示「第一季」（規格第 12 節） */
const model = defineModel<number>({ required: true })

const options: WheelOption[] = Array.from(
  { length: SEASON_MAX - SEASON_MIN + 1 },
  (_, i) => ({ value: i + SEASON_MIN, label: formatSeason(i + SEASON_MIN) }),
)
</script>

<template>
  <div class="season">
    <WheelPicker v-model="model" :options="options" :visible-count="5" />
  </div>
</template>

<style scoped>
.season {
  display: flex;
  padding: var(--sp-2) var(--sp-3);
  background: var(--surface);
  border-radius: var(--r-lg);
  border: 1px solid var(--border-soft);
}
</style>
