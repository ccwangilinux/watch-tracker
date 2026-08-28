<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import CategoryCard from '@/components/CategoryCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useCategoryStore } from '@/stores/categories'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const store = useCategoryStore()
const { searchText, lastCategoryId } = storeToRefs(useUiStore())

// Header 的搜尋框在首頁用來篩選類別；進入類別後才是搜尋紀錄
const visible = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword) return store.items
  return store.items.filter((c) => c.name.toLowerCase().includes(keyword))
})

function openCategory(id: string) {
  lastCategoryId.value = id
  router.push(`/c/${id}`)
}
</script>

<template>
  <section class="section">
    <h1 class="brand">
      我的觀看紀錄
      <small class="brand__sub">追劇不忘，記錄精彩時刻</small>
    </h1>
  </section>

  <section class="section">
    <h2 class="section__title">觀看類別</h2>

    <p v-if="store.loading" class="loading">載入中…</p>

    <EmptyState
      v-else-if="visible.length === 0 && searchText"
      icon="🔍"
      title="找不到符合的類別"
      :message="`沒有名稱包含「${searchText}」的類別`"
    />

    <EmptyState
      v-else-if="visible.length === 0"
      icon="📂"
      title="還沒有任何類別"
      message="新增第一個類別，開始記錄你的觀看進度"
    />

    <ul v-else class="cats">
      <li v-for="cat in visible" :key="cat.id">
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

  <section class="section">
    <button class="action action--primary" type="button" @click="router.push('/settings/categories')">
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
