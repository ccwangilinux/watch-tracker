<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import type { WheelOption } from '@/types/ui'

const props = withDefaults(
  defineProps<{
    options: WheelOption[]
    itemHeight?: number
    visibleCount?: number
    unit?: string
  }>(),
  { itemHeight: 40, visibleCount: 5 },
)

const model = defineModel<number>({ required: true })

const scroller = ref<HTMLElement | null>(null)
/** 區分「使用者捲動」與「程式捲動」，避免兩者互相觸發形成迴圈 */
let programmatic = false
let settleTimer: ReturnType<typeof setTimeout> | undefined

function indexOf(value: number): number {
  const found = props.options.findIndex((o) => o.value === value)
  return found >= 0 ? found : 0
}

function scrollToValue(value: number, smooth = false) {
  const el = scroller.value
  if (!el) return

  programmatic = true
  el.scrollTo({ top: indexOf(value) * props.itemHeight, behavior: smooth ? 'smooth' : 'auto' })
  // smooth 捲動不會立刻結束，留一段時間再解除旗標
  setTimeout(() => { programmatic = false }, smooth ? 320 : 60)
}

/**
 * iOS Safari 直到 18.2 才支援 scrollend，因此一律用 debounce 判斷捲動停止。
 * scroll-snap 會把位置吸附到整數格，所以 round 後即為選中項。
 */
function onScroll() {
  if (programmatic) return
  clearTimeout(settleTimer)

  settleTimer = setTimeout(() => {
    const el = scroller.value
    if (!el) return

    const index = Math.round(el.scrollTop / props.itemHeight)
    const clamped = Math.max(0, Math.min(props.options.length - 1, index))
    const option = props.options[clamped]
    if (option && option.value !== model.value) {
      model.value = option.value
    }
  }, 100)
}

// 外部改值（例如按了「現在時間」）時同步捲動位置
watch(model, (value) => {
  const el = scroller.value
  if (!el) return
  if (Math.round(el.scrollTop / props.itemHeight) !== indexOf(value)) {
    scrollToValue(value, true)
  }
})

watch(() => props.options, () => nextTick(() => scrollToValue(model.value)))

onMounted(() => nextTick(() => scrollToValue(model.value)))
</script>

<template>
  <div
    class="wheel"
    :style="{
      '--item-h': `${itemHeight}px`,
      '--visible': visibleCount,
      '--pad': `${((visibleCount - 1) / 2) * itemHeight}px`,
    }"
  >
    <div class="wheel__highlight" aria-hidden="true" />
    <ul ref="scroller" class="wheel__scroller" @scroll.passive="onScroll">
      <li
        v-for="option in options"
        :key="option.value"
        class="wheel__item"
        :class="{ 'is-selected': option.value === model }"
      >
        {{ option.label }}
      </li>
    </ul>
    <span v-if="unit" class="wheel__unit">{{ unit }}</span>
  </div>
</template>

<style scoped>
.wheel {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  height: calc(var(--item-h) * var(--visible));
}

.wheel__scroller {
  height: 100%;
  overflow-y: auto;
  /*
   * 用原生捲動 + scroll-snap，而不是自己接管 touch 事件：
   * 這樣才保有 iOS 的慣性與回彈手感，也不會與頁面捲動打架。
   */
  scroll-snap-type: y mandatory;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: var(--pad) 0;
  scrollbar-width: none;
}

.wheel__scroller::-webkit-scrollbar { display: none; }

.wheel__item {
  height: var(--item-h);
  display: grid;
  place-items: center;
  scroll-snap-align: center;
  scroll-snap-stop: always;
  font-size: 17px;
  color: var(--text-faint);
  transition: color 0.15s var(--ease), transform 0.15s var(--ease);
  white-space: nowrap;
}

.wheel__item.is-selected {
  color: var(--text);
  font-weight: 700;
  transform: scale(1.06);
}

.wheel__highlight {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: var(--item-h);
  transform: translateY(-50%);
  border-radius: var(--r-md);
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
  pointer-events: none;
}

.wheel__unit {
  position: absolute;
  bottom: calc(var(--item-h) * -0.1);
  left: 0;
  right: 0;
  text-align: center;
  font-size: 11px;
  color: var(--text-faint);
}
</style>
