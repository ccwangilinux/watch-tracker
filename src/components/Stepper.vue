<script setup lang="ts">
import { computed } from 'vue'

/** [-] 14 [+] 集數輸入（規格第 12 節），兼顧手動輸入與大按鈕加減 */
const model = defineModel<number>({ required: true })

const props = withDefaults(
  defineProps<{ min?: number; max?: number; step?: number }>(),
  { min: 0, max: 9999, step: 1 },
)

const canDecrease = computed(() => model.value > props.min)
const canIncrease = computed(() => model.value < props.max)

function clamp(value: number): number {
  return Math.max(props.min, Math.min(props.max, value))
}

function bump(delta: number) {
  model.value = clamp(model.value + delta)
}

function onInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value
  // 允許暫時清空以便重打，空字串視為最小值
  const parsed = raw === '' ? props.min : Number.parseInt(raw, 10)
  model.value = Number.isNaN(parsed) ? props.min : clamp(parsed)
}
</script>

<template>
  <div class="stepper">
    <button
      class="stepper__btn"
      type="button"
      aria-label="減少"
      :disabled="!canDecrease"
      @click="bump(-step)"
    >−</button>

    <input
      class="stepper__input"
      type="text"
      inputmode="numeric"
      pattern="[0-9]*"
      :value="model"
      aria-label="數值"
      @input="onInput"
    />

    <button
      class="stepper__btn"
      type="button"
      aria-label="增加"
      :disabled="!canIncrease"
      @click="bump(step)"
    >＋</button>
  </div>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-1);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-lg);
}

.stepper__btn {
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  font-size: 24px;
  font-weight: 600;
  border-radius: var(--r-md);
  background: var(--surface-2);
  transition: transform 0.12s var(--ease);
}

.stepper__btn:active:not(:disabled) { transform: scale(0.92); background: var(--accent-soft); }
.stepper__btn:disabled { opacity: 0.3; }

.stepper__input {
  flex: 1 1 auto;
  min-width: 0;
  height: 52px;
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: none;
  border: none;
  color: var(--text);
}

.stepper__input:focus { outline: none; }
</style>
