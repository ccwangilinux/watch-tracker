import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as service from '@/services/records'
import { useCategoryStore } from './categories'
import type { WatchRecord } from '@/types/models'
import type { RecordInput } from '@/services/records'

export const useRecordStore = defineStore('records', () => {
  const items = ref<WatchRecord[]>([])
  const loading = ref(false)
  const loadedCategoryId = ref<string | null>(null)

  async function loadCategory(categoryId: string) {
    loading.value = true
    items.value = await service.listByCategory(categoryId)
    loadedCategoryId.value = categoryId
    loading.value = false
  }

  async function reload() {
    if (loadedCategoryId.value) await loadCategory(loadedCategoryId.value)
  }

  /** 首頁的類別紀錄數也要跟著變，否則新增後仍顯示舊數字 */
  async function refreshCounts() {
    await useCategoryStore().load()
  }

  async function create(input: RecordInput) {
    await service.createRecord(input)
    await Promise.all([reload(), refreshCounts()])
  }

  async function update(id: string, patch: Partial<RecordInput>) {
    await service.updateRecord(id, patch)
    await reload()
  }

  async function remove(id: string) {
    await service.deleteRecord(id)
    await Promise.all([reload(), refreshCounts()])
  }

  async function get(id: string): Promise<WatchRecord | undefined> {
    const cached = items.value.find((r) => r.id === id)
    return cached ?? (await service.getRecord(id))
  }

  return { items, loading, loadedCategoryId, loadCategory, reload, create, update, remove, get }
})
