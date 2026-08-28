<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import RecordCard from '@/components/RecordCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useCategoryStore } from '@/stores/categories'
import { useUiStore } from '@/stores/ui'
import { listByStatus, sortRecords } from '@/services/records'
import { STATUS_MAP, UNSET_LABEL } from '@/constants/status'
import type { WatchRecord, WatchStatus } from '@/types/models'

/** 路由參數用 'unset' 表示尚未標記，其餘對應 WatchStatus */
const props = defineProps<{ status: string }>()

const router = useRouter()
const categoryStore = useCategoryStore()
const { sortKey, sortDirection } = storeToRefs(useUiStore())

const records = ref<WatchRecord[]>([])
const loading = ref(true)

const meta = computed(() =>
  props.status === 'unset' ? null : STATUS_MAP[props.status as WatchStatus],
)
const title = computed(() => meta.value?.label ?? UNSET_LABEL)

const sorted = computed(() => sortRecords(records.value, sortKey.value, sortDirection.value))

async function load() {
  loading.value = true
  records.value = await listByStatus(props.status === 'unset' ? null : (props.status as WatchStatus))
  loading.value = false
}

function categoryOf(id: string) {
  return categoryStore.items.find((c) => c.id === id)
}

onMounted(load)
watch(() => props.status, load)
</script>

<template>
  <header class="head">
    <button class="back" type="button" @click="router.push('/')">‹ 首頁</button>
    <h1 class="head__title">
      <span v-if="meta" class="head__icon" :style="{ '--c': meta.color }">{{ meta.icon }}</span>
      {{ title }}
      <span class="head__count">{{ sorted.length }}</span>
    </h1>
  </header>

  <p v-if="loading" class="loading">載入中…</p>

  <EmptyState
    v-else-if="sorted.length === 0"
    icon="🏷"
    :title="`沒有標記為「${title}」的紀錄`"
    message="在編輯紀錄時可以標記觀看狀態"
  />

  <ul v-else class="list">
    <li v-for="record in sorted" :key="record.id">
      <RecordCard
        :record="record"
        :category-name="categoryOf(record.categoryId)?.name"
        :category-icon="categoryOf(record.categoryId)?.icon"
        :category-color="categoryOf(record.categoryId)?.color"
        @click="router.push(`/r/${record.id}`)"
      />
    </li>
  </ul>
</template>

<style scoped>
.head { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-4); }
.back { min-height: var(--touch); padding-right: var(--sp-1); color: var(--text-dim); font-weight: 600; }

.head__title { display: flex; align-items: center; gap: var(--sp-2); font-size: 20px; font-weight: 700; }

.head__icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  font-size: 14px;
  color: var(--c);
  border-radius: var(--r-sm);
  background: color-mix(in srgb, var(--c) 18%, transparent);
}

.head__count {
  padding: 1px var(--sp-2);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-faint);
  background: var(--surface-2);
  border-radius: var(--r-full);
}

.loading { color: var(--text-faint); font-size: 14px; }
.list { display: flex; flex-direction: column; gap: var(--sp-2); }
</style>
