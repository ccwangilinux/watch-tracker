import { ref, computed, type Ref } from 'vue'

/**
 * 觸控拖曳排序。
 *
 * 不用 HTML5 Drag and Drop：iOS Safari 完全不支援觸控裝置上的 dragstart。
 * 改用 Pointer Events，這是唯一在 iOS Safari、Android Chrome、桌面滑鼠上
 * 行為一致的方案。拖曳把手必須設 `touch-action: none`，
 * 否則瀏覽器會把垂直移動判定成頁面捲動並取消 pointer 事件。
 */
export function useDragSort(
  listRef: Ref<HTMLElement | null>,
  onReorder: (fromIndex: number, toIndex: number) => void,
) {
  const draggingIndex = ref<number | null>(null)
  const targetIndex = ref<number | null>(null)
  const offsetY = ref(0)

  let startY = 0
  let itemHeight = 0
  let itemCount = 0

  function start(event: PointerEvent, index: number) {
    const list = listRef.value
    if (!list) return

    const items = list.children
    itemCount = items.length
    if (itemCount < 2) return

    // 以實際渲染高度換算移動了幾格，含項目間距
    const first = items[0] as HTMLElement
    const second = items[1] as HTMLElement | undefined
    itemHeight = second
      ? second.getBoundingClientRect().top - first.getBoundingClientRect().top
      : first.getBoundingClientRect().height

    startY = event.clientY
    draggingIndex.value = index
    targetIndex.value = index
    offsetY.value = 0
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function move(event: PointerEvent) {
    if (draggingIndex.value === null || itemHeight === 0) return

    offsetY.value = event.clientY - startY
    const shift = Math.round(offsetY.value / itemHeight)
    targetIndex.value = Math.max(0, Math.min(itemCount - 1, draggingIndex.value + shift))
  }

  function end() {
    const from = draggingIndex.value
    const to = targetIndex.value

    draggingIndex.value = null
    targetIndex.value = null
    offsetY.value = 0

    if (from !== null && to !== null && from !== to) {
      onReorder(from, to)
    }
  }

  const isDragging = computed(() => draggingIndex.value !== null)

  /** 拖曳過程中，非拖曳項目要讓位的位移量 */
  function translateFor(index: number): number {
    const from = draggingIndex.value
    const to = targetIndex.value
    if (from === null || to === null) return 0

    if (index === from) return offsetY.value
    if (from < to && index > from && index <= to) return -itemHeight
    if (from > to && index < from && index >= to) return itemHeight
    return 0
  }

  return { draggingIndex, targetIndex, isDragging, start, move, end, translateFor }
}

/** 把陣列中的元素從 from 移到 to，回傳新陣列 */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [item] = next.splice(from, 1)
  if (item !== undefined) next.splice(to, 0, item)
  return next
}
