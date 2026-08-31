<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCategoryStore } from '@/stores/categories'
import { useDragSort, moveItem } from '@/composables/useDragSort'
import CategoryEditSheet from '@/components/CategoryEditSheet.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { Category } from '@/types/models'
import type { CategoryInput } from '@/services/categories'

const router = useRouter()
const store = useCategoryStore()

const listEl = ref<HTMLElement | null>(null)
const editing = ref<Category | null>(null)
const sheetOpen = ref(false)
const confirmOpen = ref(false)
const pendingDelete = ref<Category | null>(null)

const { draggingIndex, isDragging, start, move, end, translateFor } = useDragSort(
  listEl,
  (from, to) => store.reorder(moveItem(store.items, from, to).map((c) => c.id)),
)

const deleteMessage = computed(() => {
  const target = pendingDelete.value
  if (!target) return ''
  const count = store.countOf(target.id)
  return count > 0
    ? `「${target.name}」底下的 ${count} 筆觀看紀錄會一併刪除。`
    : `確定要刪除「${target.name}」嗎？`
})

function openCreate() {
  editing.value = null
  sheetOpen.value = true
}

function openEdit(category: Category) {
  editing.value = category
  sheetOpen.value = true
}

function onSave(input: CategoryInput) {
  if (editing.value) store.update(editing.value.id, input)
  else store.create(input)
}

function askDelete(category: Category) {
  pendingDelete.value = category
  confirmOpen.value = true
}

function doDelete() {
  if (pendingDelete.value) store.remove(pendingDelete.value.id)
  pendingDelete.value = null
}
</script>

<template>
  <header class="head">
    <button class="back" type="button" @click="router.back()">‹ 返回</button>
    <h1 class="head__title">類別管理</h1>
  </header>

  <p class="hint">長按右側把手可拖曳調整順序</p>

  <ul ref="listEl" class="list" :class="{ 'is-dragging': isDragging }">
    <li
      v-for="(cat, index) in store.items"
      :key="cat.id"
      class="row"
      :class="{ 'is-active': draggingIndex === index }"
      :style="{ transform: `translateY(${translateFor(index)}px)` }"
    >
      <button class="row__main" type="button" @click="openEdit(cat)">
        <span class="row__icon" :style="{ '--c': cat.color }">{{ cat.icon }}</span>
        <span class="row__body">
          <span class="row__name">{{ cat.name }}</span>
          <span class="row__count">{{ store.countOf(cat.id) }} 部</span>
        </span>
      </button>

      <button class="row__del" type="button" :aria-label="`刪除 ${cat.name}`" @click="askDelete(cat)">
        🗑
      </button>

      <button
        class="row__grip"
        type="button"
        aria-label="拖曳排序"
        @pointerdown="start($event, index)"
        @pointermove="move"
        @pointerup="end"
        @pointercancel="end"
      >⣿</button>
    </li>
  </ul>

  <button class="add" type="button" @click="openCreate">＋ 新增類別</button>

  <CategoryEditSheet v-model="sheetOpen" :category="editing" @save="onSave" />

  <ConfirmDialog
    v-model="confirmOpen"
    title="刪除類別"
    :message="deleteMessage"
    confirm-text="刪除"
    danger
    @confirm="doDelete"
  />
</template>

<style scoped>
.head { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-2); }
.back { min-height: var(--touch); padding-right: var(--sp-2); color: var(--text-dim); font-weight: 600; }
.head__title { font-size: 20px; font-weight: 700; }

.hint { font-size: 13px; color: var(--text-faint); margin-bottom: var(--sp-4); }

.list { display: flex; flex-direction: column; gap: var(--sp-2); }

.row {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding-right: var(--sp-2);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-lg);
  transition: transform 0.18s var(--ease);
}

/* 拖曳中的項目不套用過場，否則會跟著手指延遲 */
.row.is-active {
  transition: none;
  z-index: 10;
  position: relative;
  border-color: var(--accent);
  box-shadow: var(--shadow-card);
}

.row__main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-height: 64px;
  padding: var(--sp-2) var(--sp-3);
  text-align: left;
}

.row__icon {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  font-size: 20px;
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--c) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 35%, transparent);
}

.row__body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.row__name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row__count { font-size: 12px; color: var(--text-faint); }

.row__del,
.row__grip {
  flex: 0 0 auto;
  width: var(--touch);
  height: var(--touch);
  display: grid;
  place-items: center;
  border-radius: var(--r-md);
  color: var(--text-faint);
}

.row__del { font-size: 16px; }

.row__grip {
  font-size: 18px;
  cursor: grab;
  /* 必要：否則瀏覽器把垂直拖曳判定為捲動並取消 pointer 事件 */
  touch-action: none;
}

.add {
  width: 100%;
  min-height: 52px;
  margin-top: var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--gradient);
  color: var(--on-accent);
  font-weight: 700;
}
</style>
