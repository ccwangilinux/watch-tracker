<script setup lang="ts">
import { STATUS_LIST } from '@/constants/status'
import type { WatchStatus } from '@/types/models'

/**
 * 觀看狀態標籤。可以不選——留空代表尚未標記，
 * 點選已選中的項目會取消，不必另外放一顆「清除」按鈕。
 */
const model = defineModel<WatchStatus | null>({ required: true })

function toggle(key: WatchStatus) {
  model.value = model.value === key ? null : key
}
</script>

<template>
  <div class="picker">
    <button
      v-for="item in STATUS_LIST"
      :key="item.key"
      class="chip"
      :class="{ 'is-active': model === item.key }"
      :style="{ '--c': item.color }"
      type="button"
      :aria-pressed="model === item.key"
      @click="toggle(item.key)"
    >
      <span class="chip__icon" aria-hidden="true">{{ item.icon }}</span>
      {{ item.label }}
    </button>
  </div>
</template>

<style scoped>
.picker { display: flex; gap: var(--sp-2); }

.chip {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-1);
  min-height: 48px;
  padding: 0 var(--sp-2);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-dim);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-md);
  transition: all 0.15s var(--ease);
}

.chip.is-active {
  color: var(--c);
  border-color: color-mix(in srgb, var(--c) 55%, transparent);
  background: color-mix(in srgb, var(--c) 15%, transparent);
}

.chip__icon { font-size: 12px; }
</style>
