<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import WheelPicker from './WheelPicker.vue'
import type { WheelOption } from '@/types/ui'
import { splitSeconds, toSeconds, formatWatchTime } from '@/utils/time'

/** 觀看時間 HH:MM:SS。時 0–999、分秒 0–59（規格第 13 節） */
const model = defineModel<number>({ required: true })

const initial = splitSeconds(model.value)
const hours = ref(initial.hours)
const minutes = ref(initial.minutes)
const seconds = ref(initial.seconds)

function range(count: number, pad: boolean): WheelOption[] {
  return Array.from({ length: count }, (_, i) => ({
    value: i,
    label: pad ? String(i).padStart(2, '0') : String(i),
  }))
}

const hourOptions = range(1000, false)
const minuteOptions = range(60, true)
const secondOptions = range(60, true)

watch([hours, minutes, seconds], ([h, m, s]) => {
  model.value = toSeconds(h, m, s)
})

// 外部換了紀錄（例如切換編輯對象）時同步三個滾輪
watch(model, (value) => {
  const parts = splitSeconds(value)
  if (toSeconds(hours.value, minutes.value, seconds.value) === value) return
  hours.value = parts.hours
  minutes.value = parts.minutes
  seconds.value = parts.seconds
})

const display = computed(() => formatWatchTime(model.value))
</script>

<template>
  <div class="duration">
    <p class="duration__display">{{ display }}</p>
    <div class="duration__wheels">
      <WheelPicker v-model="hours" :options="hourOptions" unit="時" />
      <span class="duration__colon">:</span>
      <WheelPicker v-model="minutes" :options="minuteOptions" unit="分" />
      <span class="duration__colon">:</span>
      <WheelPicker v-model="seconds" :options="secondOptions" unit="秒" />
    </div>
  </div>
</template>

<style scoped>
.duration__display {
  text-align: center;
  font-size: 26px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin-bottom: var(--sp-2);
  background: var(--gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.duration__wheels {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-3) var(--sp-4);
  background: var(--surface);
  border-radius: var(--r-lg);
  border: 1px solid var(--border-soft);
}

.duration__colon {
  flex: 0 0 auto;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-dim);
}
</style>
