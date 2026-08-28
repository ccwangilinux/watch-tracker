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

const props = defineProps<{ categoryId: string }>()

const router = useRouter()
const recordStore = useRecordStore()
const categoryStore = useCategoryStore()
const { searchText, sortKey, sortDirection, lastCategoryId } = storeToRefs(useUiStore())

const sortOpen = ref(false)

const category = computed(() => categoryStore.items.find((c) => c.id === props.categoryId))

const visible = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  const filtered = keyword
    ? recordStore.items.filter((r) => r.title.toLowerCase().includes(keyword))
    : recordStore.items
  return sortRecords(filtered, sortKey.value, sortDirection.value)
})

const sortLabel = computed(
  () => SORT_OPTIONS.find((o) => o.key === sortKey.value)?.label ?? '排序',
)

onMounted(() => {
  lastCategoryId.value = props.categoryId
  recordStore.loadCategory(props.categoryId)
})

watch(() => props.categoryId, (id) => {
  lastCategoryId.value = id
  recordStore.loadCategory(id)
})
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
  color: #fff;
  border-radius: var(--r-full);
  background: var(--gradient);
  box-shadow: var(--shadow-fab);
  transition: transform 0.15s var(--ease);
}

.fab:active { transform: scale(0.92); }
</style>
