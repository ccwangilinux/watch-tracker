<script setup lang="ts">
import { computed, watch, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import RecordCard from '@/components/RecordCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import SortSheet from '@/components/SortSheet.vue'
import { useRecordStore } from '@/stores/records'
import { useCategoryStore } from '@/stores/categories'
import { useUiStore } from '@/stores/ui'
import { sortRecords, SORT_OPTIONS } from '@/services/records'
import { STATUS_LIST, UNSET_LABEL } from '@/constants/status'

const props = defineProps<{ categoryId: string }>()

const router = useRouter()
const recordStore = useRecordStore()
const categoryStore = useCategoryStore()
const { searchText, sortKey, sortDirection, lastCategoryId, statusFilter } =
  storeToRefs(useUiStore())

const sortOpen = ref(false)

const category = computed(() => categoryStore.items.find((c) => c.id === props.categoryId))

const visible = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  let filtered = keyword
    ? recordStore.items.filter((r) => r.title.toLowerCase().includes(keyword))
    : recordStore.items

  if (statusFilter.value) {
    const wanted = statusFilter.value === 'unset' ? null : statusFilter.value
    filtered = filtered.filter((r) => (r.status ?? null) === wanted)
  }

  return sortRecords(filtered, sortKey.value, sortDirection.value)
})

/** 篩選列上各狀態的筆數，只算這個類別的 */
const statusCounts = computed(() => {
  const counts: Record<string, number> = { unset: 0 }
  for (const record of recordStore.items) {
    const key = record.status ?? 'unset'
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
})

/*
 * 目前選中的狀態即使筆數是 0 也要留著。
 * 只憑 count > 0 過濾，篩選開著卻沒有符合的紀錄時整個 chip 會消失，
 * 使用者看到空列表也找不到地方取消篩選。
 */
const filterChips = computed(() => [
  ...STATUS_LIST.map((s) => ({
    key: s.key as string, label: s.label, color: s.color, count: statusCounts.value[s.key] ?? 0,
  })),
  { key: 'unset', label: UNSET_LABEL, color: 'var(--text-faint)', count: statusCounts.value.unset },
].filter((chip) => chip.count > 0 || chip.key === statusFilter.value))

const activeChip = computed(
  () => filterChips.value.find((chip) => chip.key === statusFilter.value) ?? null,
)

function toggleFilter(key: string) {
  statusFilter.value = statusFilter.value === key ? null : (key as typeof statusFilter.value)
}

const sortLabel = computed(
  () => SORT_OPTIONS.find((o) => o.key === sortKey.value)?.label ?? '排序',
)

/**
 * 進入某個類別的列表。
 *
 * 狀態篩選屬於「當下這個類別」的暫時狀態，換到別的類別就清掉：
 * 沿用上一個類別選的狀態，只要新類別沒有該狀態的紀錄就是一片空白，
 * 看起來像資料不見了。回到同一個類別（編輯完返回、重開 App 還原）才保留。
 */
function enterCategory(id: string, restoring: boolean) {
  if (!restoring || lastCategoryId.value !== id) statusFilter.value = null
  lastCategoryId.value = id
  recordStore.loadCategory(id)
}

onMounted(() => enterCategory(props.categoryId, true))
watch(() => props.categoryId, (id) => enterCategory(id, false))
</script>

<template>
  <header class="head">
    <button class="back" type="button" @click="router.push('/')">‹ 首頁</button>
    <h1 class="head__title">
      <span v-if="category" class="head__icon" :style="{ '--c': category.color }">
        {{ category.icon }}
      </span>
      {{ category?.name ?? '觀看紀錄' }}
      <span class="head__count">{{ visible.length }}</span>
    </h1>
  </header>

  <div v-if="filterChips.length > 1 || statusFilter" class="filters">
    <button
      class="chip"
      :class="{ 'is-active': statusFilter === null }"
      type="button"
      @click="statusFilter = null"
    >全部 {{ recordStore.items.length }}</button>

    <button
      v-for="chip in filterChips"
      :key="chip.key"
      class="chip"
      :class="{ 'is-active': statusFilter === chip.key }"
      :style="{ '--c': chip.color }"
      type="button"
      @click="toggleFilter(chip.key)"
    >{{ chip.label }} {{ chip.count }}</button>
  </div>

  <button class="sort" type="button" @click="sortOpen = true">
    <span aria-hidden="true">⇅</span>
    {{ sortLabel }}
    <span class="sort__dir">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
  </button>

  <p v-if="recordStore.loading" class="loading">載入中…</p>

  <EmptyState
    v-else-if="visible.length === 0 && searchText"
    icon="🔍"
    title="找不到符合的紀錄"
    :message="`這個類別裡沒有片名包含「${searchText}」的紀錄`"
  />

  <EmptyState
    v-else-if="visible.length === 0 && activeChip"
    icon="🏷"
    :title="`這個類別沒有「${activeChip.label}」的紀錄`"
    message="點上方的「全部」可以看這個類別的所有紀錄"
  />

  <EmptyState
    v-else-if="visible.length === 0"
    icon="🎬"
    title="還沒有觀看紀錄"
    message="點右下角的按鈕新增第一筆"
  />

  <ul v-else class="list">
    <li v-for="record in visible" :key="record.id">
      <RecordCard :record="record" @click="router.push(`/r/${record.id}`)" />
    </li>
  </ul>

  <button
    class="fab"
    type="button"
    aria-label="新增觀看紀錄"
    @click="router.push({ name: 'record-new', query: { c: categoryId } })"
  >＋</button>

  <SortSheet v-model="sortOpen" v-model:sort-key="sortKey" v-model:sort-direction="sortDirection" />
</template>

<style scoped>
.head { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); }
.back { min-height: var(--touch); padding-right: var(--sp-1); color: var(--text-dim); font-weight: 600; }

.head__title {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: 20px;
  font-weight: 700;
  min-width: 0;
}

.head__icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  font-size: 17px;
  border-radius: var(--r-sm);
  background: color-mix(in srgb, var(--c) 20%, transparent);
}

.head__count {
  padding: 1px var(--sp-2);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-faint);
  background: var(--surface-2);
  border-radius: var(--r-full);
}

.filters {
  display: flex;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
  /* 橫向捲動而不換行：篩選列固定一行，不會把列表擠下去 */
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  padding-bottom: 2px;
}

.filters::-webkit-scrollbar { display: none; }

.chip {
  flex: 0 0 auto;
  min-height: 34px;
  padding: 0 var(--sp-3);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-dim);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-full);
  white-space: nowrap;
}

.chip.is-active {
  color: var(--c, var(--accent));
  border-color: color-mix(in srgb, var(--c, var(--accent)) 55%, transparent);
  background: color-mix(in srgb, var(--c, var(--accent)) 16%, transparent);
}

.sort {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  min-height: 40px;
  padding: 0 var(--sp-3);
  margin-bottom: var(--sp-4);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-dim);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-full);
}

.sort__dir { color: var(--accent); }

.loading { color: var(--text-faint); font-size: 14px; }

.list { display: flex; flex-direction: column; gap: var(--sp-2); }

/*
 * FAB 放右下角：手機單手操作時拇指最容易搆到的位置。
 * 底部留出 safe-area，避免被 iPhone 的 Home Indicator 蓋住。
 */
.fab {
  position: fixed;
  right: calc(var(--sp-5) + var(--safe-right));
  bottom: calc(var(--sp-5) + var(--safe-bottom));
  z-index: 90;
  width: 60px;
  height: 60px;
  display: grid;
  place-items: center;
  font-size: 30px;
  font-weight: 300;
  color: var(--on-accent);
  border-radius: var(--r-full);
  background: var(--gradient);
  box-shadow: var(--shadow-fab);
  transition: transform 0.15s var(--ease);
}

.fab:active { transform: scale(0.92); }
</style>
