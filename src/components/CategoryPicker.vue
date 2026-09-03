<script setup lang="ts">
import BottomSheet from './BottomSheet.vue'
import type { Category } from '@/types/models'

/**
 * 切換紀錄所屬的觀看類別。
 * 選中即關閉——這裡只有「挑一個」一種操作，再讓使用者按一次「確定」是多餘的。
 */
const open = defineModel<boolean>('open', { required: true })
const model = defineModel<string>({ required: true })

defineProps<{ categories: Category[] }>()

function pick(id: string) {
  model.value = id
  open.value = false
}
</script>

<template>
  <BottomSheet v-model="open" title="選擇觀看類別">
    <ul class="list">
      <li v-for="category in categories" :key="category.id">
        <button
          class="item"
          :class="{ 'is-active': category.id === model }"
          :style="{ '--c': category.color }"
          type="button"
          :aria-pressed="category.id === model"
          @click="pick(category.id)"
        >
          <span class="item__icon" aria-hidden="true">{{ category.icon }}</span>
          <span class="item__name">{{ category.name }}</span>
          <span v-if="category.id === model" class="item__check" aria-hidden="true">✓</span>
        </button>
      </li>
    </ul>
  </BottomSheet>
</template>

<style scoped>
.list { display: flex; flex-direction: column; gap: var(--sp-2); }

.item {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  min-height: 56px;
  padding: 0 var(--sp-4);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-dim);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-lg);
  text-align: left;
}

.item.is-active {
  color: var(--c);
  border-color: color-mix(in srgb, var(--c) 55%, transparent);
  background: color-mix(in srgb, var(--c) 14%, transparent);
}

.item__icon {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  font-size: 17px;
  border-radius: var(--r-sm);
  background: color-mix(in srgb, var(--c) 20%, transparent);
}

.item__name { flex: 1; min-width: 0; }
.item__check { flex: 0 0 auto; color: var(--c); }
</style>
