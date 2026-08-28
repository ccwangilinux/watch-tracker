import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as service from '@/services/categories'
import { seedIfNeeded } from '@/db/seed'
import type { Category } from '@/types/models'
import type { CategoryInput } from '@/services/categories'

export const useCategoryStore = defineStore('categories', () => {
  const items = ref<Category[]>([])
  const counts = ref<Record<string, number>>({})
  const loading = ref(true)
  const ready = ref(false)

  async function load() {
    const [list, recordCounts] = await Promise.all([
      service.listCategories(),
      service.countRecordsByCategory(),
    ])
    items.value = list
    counts.value = recordCounts
    loading.value = false
  }

  /** App 啟動時呼叫一次：建 DB、必要時寫入預設類別、載入列表 */
  async function init() {
    if (ready.value) return
    await seedIfNeeded()
    await load()
    ready.value = true
  }

  async function create(input: CategoryInput) {
    await service.createCategory(input)
    await load()
  }

  async function update(id: string, patch: Partial<CategoryInput>) {
    await service.updateCategory(id, patch)
    await load()
  }

  async function remove(id: string) {
    await service.deleteCategory(id)
    await load()
  }

  /**
   * 先更新畫面再寫入 DB：拖曳排序時若等 DB 回來才重繪，
   * 手指放開到卡片歸位之間會有可見的延遲。
   */
  async function reorder(orderedIds: string[]) {
    const byId = new Map(items.value.map((c) => [c.id, c]))
    items.value = orderedIds
      .map((id) => byId.get(id))
      .filter((c): c is Category => c !== undefined)
      .map((c, index) => ({ ...c, sortOrder: index }))

    await service.reorderCategories(orderedIds)
  }

  function countOf(categoryId: string): number {
    return counts.value[categoryId] ?? 0
  }

  return { items, counts, loading, ready, init, load, create, update, remove, reorder, countOf }
})
