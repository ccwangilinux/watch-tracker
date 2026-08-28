<script setup lang="ts">
import { computed } from 'vue'
import { formatWatchTime } from '@/utils/time'
import { formatSeason } from '@/utils/season'
import type { WatchRecord } from '@/types/models'

/**
 * 一筆紀錄一張卡片（規格第 11 節），不使用桌面型表格。
 * 刻意不放任何圖片：列表與內容都不顯示劇照或海報。
 */
const props = defineProps<{ record: WatchRecord }>()

const meta = computed(
  () => `${formatSeason(props.record.season)} • 第 ${props.record.episode} 集`,
)
</script>

<template>
  <button class="card" :class="{ 'is-done': record.completed }" type="button">
    <div class="card__head">
      <h3 class="card__title">{{ record.title }}</h3>
      <span v-if="record.completed" class="card__badge">✓ 已完結</span>
    </div>

    <p class="card__meta">{{ meta }}</p>

    <p class="card__time">
      <span aria-hidden="true">⏱</span>
      <span class="card__time-value">{{ formatWatchTime(record.watchTime) }}</span>
    </p>

    <p v-if="record.note" class="card__note">{{ record.note }}</p>
  </button>
</template>

<style scoped>
.card {
  display: block;
  width: 100%;
  padding: var(--sp-4);
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-lg);
  transition: transform 0.15s var(--ease), border-color 0.15s var(--ease);
}

.card:active { transform: scale(0.99); background: var(--surface-2); }

/* 已完結要有醒目標記（規格第 14 節） */
.card.is-done {
  border-color: color-mix(in srgb, var(--success) 40%, transparent);
}

.card__head {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  margin-bottom: var(--sp-1);
}

.card__title {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card__badge {
  flex: 0 0 auto;
  padding: 3px var(--sp-2);
  font-size: 11px;
  font-weight: 700;
  border-radius: var(--r-full);
  color: var(--success);
  background: color-mix(in srgb, var(--success) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--success) 35%, transparent);
}

.card__meta { font-size: 14px; color: var(--text-dim); }

.card__time {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  margin-top: var(--sp-2);
  font-size: 14px;
  color: var(--text-faint);
}

.card__time-value { font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }

.card__note {
  margin-top: var(--sp-2);
  padding-top: var(--sp-2);
  border-top: 1px dashed var(--border-soft);
  font-size: 13px;
  color: var(--text-faint);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
