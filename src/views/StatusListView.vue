<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import RecordCard from '@/components/RecordCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusTabs from '@/components/StatusTabs.vue'
import { useCategoryStore } from '@/stores/categories'
import { useUiStore } from '@/stores/ui'
import { listByStatus, sortRecords, countByStatus } from '@/services/records'
import { STATUS_MAP, UNSET_LABEL } from '@/constants/status'
import type { WatchRecord, WatchStatus } from '@/types/models'

/** 路由參數用 'unset' 表示尚未標記，其餘對應 WatchStatus */
const props = defineProps<{ status: string }>()

const router = useRouter()
const categoryStore = useCategoryStore()
const { sortKey, sortDirection } = storeToRefs(useUiStore())

const records = ref<WatchRecord[]>([])
const counts = ref<Record<string, number>>({})
const loading = ref(true)

const meta = computed(() =>
  props.status === 'unset' ? null : STATUS_MAP[props.status as WatchStatus],
)
const title = computed(() => meta.value?.label ?? UNSET_LABEL)

const sorted = computed(() => sortRecords(records.value, sortKey.value, sortDirection.value))

interface CategoryGroup {
  id: string
  name: string
  icon: string
  color: string
  records: WatchRecord[]
}

/**
 * 依觀看類別分組：類別照使用者排好的順序，組內的片子維持原本的排序設定。
 * 跨類別的清單混在一起時，同一狀態下哪些是陸劇、哪些是韓劇完全看不出來。
 */
const groups = computed<CategoryGroup[]>(() => {
  const byCategory = new Map<string, WatchRecord[]>()
  for (const record of sorted.value) {
    const list = byCategory.get(record.categoryId)
    if (list) list.push(record)
    else byCategory.set(record.categoryId, [record])
  }

  const result: CategoryGroup[] = []
  for (const category of categoryStore.items) {
    const list = byCategory.get(category.id)
    if (!list) continue
    result.push({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      records: list,
    })
    byCategory.delete(category.id)
  }

  // 類別被刪掉、或同步先帶回紀錄而類別還沒到時，這些紀錄不能整組消失
  const orphans = [...byCategory.values()].flat()
  if (orphans.length > 0) {
    result.push({
      id: '__unfiled',
      name: '未分類',
      icon: '?',
      color: 'var(--text-faint)',
      records: orphans,
    })
  }

  return result
})

async function load() {
  loading.value = true
  const status = props.status === 'unset' ? null : (props.status as WatchStatus)
  const [rows, statusCounts] = await Promise.all([listByStatus(status), countByStatus()])
  records.value = rows
  counts.value = statusCounts
  loading.value = false
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

  <StatusTabs :current="status" :counts="counts" />

  <p v-if="loading" class="loading">載入中…</p>

  <EmptyState
    v-else-if="sorted.length === 0"
    icon="🏷"
    :title="`沒有標記為「${title}」的紀錄`"
    message="在編輯紀錄時可以標記觀看狀態"
  />

  <template v-else>
    <section v-for="group in groups" :key="group.id" class="group">
      <h2 class="group__title" :style="{ '--c': group.color }">
        <span class="group__icon">{{ group.icon }}</span>
        {{ group.name }}
        <span class="group__count">{{ group.records.length }}</span>
      </h2>
      <ul class="list">
        <li v-for="record in group.records" :key="record.id">
          <RecordCard :record="record" @click="router.push(`/r/${record.id}`)" />
        </li>
      </ul>
    </section>
  </template>
</template>

<style scoped>
.head { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); }
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

.group + .group { margin-top: var(--sp-5); }

.group__title {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-2);
  font-size: 14px;
  font-weight: 700;
  color: var(--text-dim);
}

.group__icon {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  font-size: 13px;
  border-radius: var(--r-sm);
  background: color-mix(in srgb, var(--c) 20%, transparent);
}

.group__count {
  padding: 0 var(--sp-2);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-faint);
  background: var(--surface-2);
  border-radius: var(--r-full);
}

.list { display: flex; flex-direction: column; gap: var(--sp-2); }
</style>
