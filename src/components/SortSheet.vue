<script setup lang="ts">
import BottomSheet from './BottomSheet.vue'
import { SORT_OPTIONS } from '@/services/records'
import type { SortKey, SortDirection } from '@/types/models'

const open = defineModel<boolean>({ required: true })
const sortKey = defineModel<SortKey>('sortKey', { required: true })
const sortDirection = defineModel<SortDirection>('sortDirection', { required: true })

function choose(key: SortKey) {
  if (sortKey.value === key) {
    // 再點一次同一項就反轉方向，省下額外的方向切換控制
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDirection.value = SORT_OPTIONS.find((o) => o.key === key)?.defaultDirection ?? 'desc'
  }
}
</script>

<template>
  <BottomSheet v-model="open" title="排序方式">
    <ul class="options">
      <li v-for="option in SORT_OPTIONS" :key="option.key">
        <button
          class="option"
          :class="{ 'is-active': sortKey === option.key }"
          type="button"
          @click="choose(option.key)"
        >
          <span>{{ option.label }}</span>
          <span v-if="sortKey === option.key" class="option__dir">
            {{ sortDirection === 'asc' ? '↑ 遞增' : '↓ 遞減' }}
          </span>
        </button>
      </li>
    </ul>
    <p class="hint">點選已選中的項目可切換遞增 / 遞減</p>
  </BottomSheet>
</template>

<style scoped>
.options { display: flex; flex-direction: column; gap: var(--sp-2); }

.option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 52px;
  padding: 0 var(--sp-4);
  background: var(--surface);
  border: 1px solid transparent;
  border-radius: var(--r-md);
  font-weight: 600;
  text-align: left;
}

.option.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.option__dir { font-size: 13px; color: var(--accent); font-weight: 600; }

.hint { margin-top: var(--sp-4); font-size: 12px; color: var(--text-faint); text-align: center; }
</style>
