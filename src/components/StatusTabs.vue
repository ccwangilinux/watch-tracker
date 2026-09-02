<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { STATUS_LIST, UNSET_LABEL } from '@/constants/status'

/**
 * 快速檢視的切換列。
 * 用 replace 而不是 push：連續切幾個狀態後按返回應該回到首頁，
 * 而不是倒著把剛剛看過的狀態一頁頁退回去。
 */
const props = defineProps<{
  /** 目前所在的狀態；'unset' 代表未標記 */
  current: string
  counts: Record<string, number>
}>()

const router = useRouter()

const tabs = computed(() => [
  ...STATUS_LIST.map((s) => ({
    key: s.key as string,
    label: s.label,
    icon: s.icon,
    color: s.color,
    count: props.counts[s.key] ?? 0,
  })),
  {
    key: 'unset',
    label: UNSET_LABEL,
    icon: '–',
    color: 'var(--text-faint)',
    count: props.counts.unset ?? 0,
  },
])
</script>

<template>
  <nav class="tabs" aria-label="快速檢視">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="tab"
      :class="{ 'is-active': tab.key === current }"
      :style="{ '--c': tab.color }"
      type="button"
      :aria-current="tab.key === current ? 'page' : undefined"
      @click="tab.key === current || router.replace(`/s/${tab.key}`)"
    >
      <span class="tab__icon" aria-hidden="true">{{ tab.icon }}</span>
      {{ tab.label }}
      <span class="tab__count">{{ tab.count }}</span>
    </button>
  </nav>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
  /* 橫向捲動而不換行，四個標籤在窄螢幕上仍固定一行 */
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  padding-bottom: 2px;
}

.tabs::-webkit-scrollbar { display: none; }

.tab {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  min-height: 36px;
  padding: 0 var(--sp-3);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-dim);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-full);
  white-space: nowrap;
}

.tab.is-active {
  color: var(--c);
  border-color: color-mix(in srgb, var(--c) 55%, transparent);
  background: color-mix(in srgb, var(--c) 16%, transparent);
}

.tab__icon { font-size: 10px; color: var(--c); }

.tab__count {
  padding: 0 var(--sp-1);
  font-size: 12px;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

.tab.is-active .tab__count { color: var(--c); }
</style>
