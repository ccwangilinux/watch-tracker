<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import CategoryCard from '@/components/CategoryCard.vue'
import RecordCard from '@/components/RecordCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useCategoryStore } from '@/stores/categories'
import { useUiStore } from '@/stores/ui'
import { searchAll, sortRecords } from '@/services/records'
import type { WatchRecord } from '@/types/models'

const router = useRouter()
const store = useCategoryStore()
const { searchText, lastCategoryId, sortKey, sortDirection } = storeToRefs(useUiStore())

const keyword = computed(() => searchText.value.trim())
const searching = computed(() => keyword.value.length > 0)

/** 搜尋時同時篩類別名稱，讓「找分類」和「找片名」兩種意圖都能命中 */
const matchedCategories = computed(() => {
  if (!searching.value) return store.items
  const lower = keyword.value.toLowerCase()
  return store.items.filter((c) => c.name.toLowerCase().includes(lower))
})

// Header 搜尋的主要用途是查觀看紀錄（規格第 10 節），跨類別比對片名
const matchedRecords = ref<WatchRecord[]>([])
const searchingRecords = ref(false)

watch(keyword, async (value) => {
  if (!value) {
    matchedRecords.value = []
    return
  }
  searchingRecords.value = true
  const hits = await searchAll(value)
  matchedRecords.value = sortRecords(hits, sortKey.value, sortDirection.value)
  searchingRecords.value = false
}, { immediate: true })

// 資料變動（同步、匯入）後要重跑搜尋，否則結果會停在舊資料
watch(() => store.items, async () => {
  if (keyword.value) matchedRecords.value = await searchAll(keyword.value)
})

const nothingFound = computed(
  () => searching.value && matchedRecords.value.length === 0 && matchedCategories.value.length === 0,
)

function categoryOf(id: string) {
  return store.items.find((c) => c.id === id)
}

function openCategory(id: string) {
  lastCategoryId.value = id
  router.push(`/c/${id}`)
}
</script>

<template>
  <section v-if="!searching" class="section">
    <h1 class="brand">
      我的觀看紀錄
      <small class="brand__sub">追劇不忘，記錄精彩時刻</small>
    </h1>
  </section>

  <p v-if="store.loading" class="loading">載入中…</p>

  <template v-else>
    <EmptyState
      v-if="nothingFound && !searchingRecords"
      icon="🔍"
      title="找不到符合的內容"
      :message="`沒有片名或類別包含「${keyword}」的項目`"
    />

    <!-- 搜尋結果：紀錄優先，因為 Header 搜尋的主要用途是查片名 -->
    <section v-if="searching && matchedRecords.length > 0" class="section">
      <h2 class="section__title">觀看紀錄 · {{ matchedRecords.length }}</h2>
      <ul class="records">
        <li v-for="record in matchedRecords" :key="record.id">
          <RecordCard
            :record="record"
            :category-name="categoryOf(record.categoryId)?.name"
            :category-icon="categoryOf(record.categoryId)?.icon"
            :category-color="categoryOf(record.categoryId)?.color"
            @click="router.push(`/r/${record.id}`)"
          />
        </li>
      </ul>
    </section>

    <section v-if="matchedCategories.length > 0" class="section">
      <h2 class="section__title">
        {{ searching ? `觀看類別 · ${matchedCategories.length}` : '觀看類別' }}
      </h2>
      <ul class="cats">
        <li v-for="cat in matchedCategories" :key="cat.id">
          <CategoryCard
            :name="cat.name"
            :icon="cat.icon"
            :color="cat.color"
            :count="store.countOf(cat.id)"
            @click="openCategory(cat.id)"
          />
        </li>
      </ul>
    </section>

    <EmptyState
      v-else-if="!searching"
      icon="📂"
      title="還沒有任何類別"
      message="新增第一個類別，開始記錄你的觀看進度"
    />

    <template v-if="!searching">
      <section class="section">
        <button
          class="action action--primary"
          type="button"
          @click="router.push('/settings/categories')"
        >
          <span aria-hidden="true">＋</span> 新增 / 管理類別
        </button>
      </section>

      <section class="section actions">
        <button class="action" type="button" @click="router.push('/settings')">
          <span aria-hidden="true">⚙</span> 設定
        </button>
        <button class="action" type="button" @click="router.push('/settings/cloud')">
          <span aria-hidden="true">☁</span> 雲端同步
        </button>
      </section>
    </template>
  </template>
</template>

<style scoped>
.section { margin-bottom: var(--sp-6); }

.brand {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.3;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.brand__sub { font-size: 13px; font-weight: 400; color: var(--text-faint); }

.section__title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  margin-bottom: var(--sp-3);
}

.loading { color: var(--text-faint); font-size: 14px; }

.cats { display: flex; flex-direction: column; gap: var(--sp-2); }
.records { display: flex; flex-direction: column; gap: var(--sp-2); }

.actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }

.action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  width: 100%;
  min-height: 52px;
  padding: 0 var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  font-weight: 600;
  transition: transform 0.15s var(--ease);
}

.action:active { transform: scale(0.98); }

.action--primary {
  background: var(--gradient);
  border: none;
  color: #fff;
  box-shadow: var(--shadow-fab);
}
</style>
