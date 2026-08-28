<script setup lang="ts">
import { computed } from 'vue'
import { formatWatchTime } from '@/utils/time'
import { formatSeason } from '@/utils/season'
import { useClipboard } from '@/composables/useClipboard'
import type { WatchRecord } from '@/types/models'

/**
 * 一筆紀錄一張卡片（規格第 11 節），不使用桌面型表格。
 * 刻意不放任何圖片：列表與內容都不顯示劇照或海報。
 * 版面走緊湊路線，讓手機一屏能看到較多筆。
 */
const props = defineProps<{
  record: WatchRecord
  /** 跨類別搜尋結果中才需要顯示所屬類別 */
  categoryName?: string
  categoryIcon?: string
  categoryColor?: string
}>()

const { copied, copy } = useClipboard()

const meta = computed(() => {
  const parts: string[] = []
  if (props.record.season > 1) parts.push(formatSeason(props.record.season))
  if (props.record.episode > 0) parts.push(`第 ${props.record.episode} 集`)
  return parts.join(' · ')
})

const hasTime = computed(() => props.record.watchTime > 0)

function onCopy(event: Event) {
  // 卡片本身是進入編輯的按鈕，複製不該連帶觸發
  event.stopPropagation()
  void copy(props.record.title)
}
</script>

<template>
  <div class="card" :class="{ 'is-done': record.completed }">
    <button class="card__main" type="button">
      <span class="card__row">
        <span v-if="categoryIcon" class="card__cat" :style="{ '--c': categoryColor }">
          {{ categoryIcon }}
        </span>
        <span class="card__title">{{ record.title }}</span>
        <span v-if="record.completed" class="card__done" aria-label="已完結">✓</span>
      </span>

      <span v-if="meta || hasTime" class="card__row card__row--meta">
        <span v-if="meta" class="card__meta">{{ meta }}</span>
        <span v-if="hasTime" class="card__time">{{ formatWatchTime(record.watchTime) }}</span>
      </span>
    </button>

    <button
      class="card__copy"
      :class="{ 'is-copied': copied }"
      type="button"
      :aria-label="`複製片名「${record.title}」`"
      @click="onCopy"
    >{{ copied ? '✓' : '⧉' }}</button>
  </div>
</template>

<style scoped>
.card {
  display: flex;
  align-items: stretch;
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-md);
  transition: border-color 0.15s var(--ease), background 0.15s var(--ease);
}

.card:active { background: var(--surface-2); }

/* 已完結要有醒目標記（規格第 14 節） */
.card.is-done { border-color: color-mix(in srgb, var(--success) 42%, transparent); }

.card__main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--sp-2) var(--sp-1) var(--sp-2) var(--sp-3);
  text-align: left;
}

.card__row {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  min-width: 0;
}

.card__cat { flex: 0 0 auto; font-size: 12px; line-height: 1.6; }

.card__title {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  /* 片名完整顯示不截斷：資料裡有超過 50 字的片名，截掉就認不出是哪一部 */
  overflow-wrap: anywhere;
}

.card__done {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.6;
  color: var(--success);
}

.card__row--meta { gap: var(--sp-3); align-items: baseline; }

.card__meta {
  font-size: 12px;
  color: var(--text-dim);
  white-space: nowrap;
}

.card__time {
  font-size: 12px;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* 觸控區維持 44px 寬，但視覺上不搶版面 */
.card__copy {
  flex: 0 0 auto;
  width: var(--touch);
  align-self: stretch;
  display: grid;
  place-items: start center;
  padding-top: 10px;
  font-size: 15px;
  color: var(--text-faint);
  border-radius: 0 var(--r-md) var(--r-md) 0;
}

.card__copy:active { background: var(--surface-3); }
.card__copy.is-copied { color: var(--success); font-size: 16px; }
</style>
