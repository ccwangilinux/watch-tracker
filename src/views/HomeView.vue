<script setup lang="ts">
import { useRouter } from 'vue-router'
import CategoryCard from '@/components/CategoryCard.vue'
import { DEFAULT_CATEGORIES } from '@/constants/defaultCategories'

// M1 階段直接顯示預設類別；M2 接上 IndexedDB 後改讀 store。
const categories = DEFAULT_CATEGORIES
const router = useRouter()
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
    <ul class="cats">
      <li v-for="cat in categories" :key="cat.name">
        <CategoryCard :name="cat.name" :icon="cat.icon" :color="cat.color" />
      </li>
    </ul>
  </section>

  <section class="section">
    <button class="action action--primary" type="button">
      <span aria-hidden="true">＋</span> 新增類別
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

.brand__sub {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-faint);
}

.section__title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  margin-bottom: var(--sp-3);
}

.cats {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
}

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
