<script setup lang="ts">
/** 規格第 14 節：完結狀態要用明確的切換控制，不能只用 checkbox */
const model = defineModel<boolean>({ required: true })

defineProps<{ onLabel: string; offLabel: string }>()
</script>

<template>
  <button
    class="toggle"
    :class="{ 'is-on': model }"
    type="button"
    role="switch"
    :aria-checked="model"
    @click="model = !model"
  >
    <span class="toggle__label">{{ model ? onLabel : offLabel }}</span>
    <span class="toggle__track"><span class="toggle__thumb" /></span>
  </button>
</template>

<style scoped>
.toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  width: 100%;
  min-height: 56px;
  padding: 0 var(--sp-4);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-lg);
  transition: border-color 0.2s var(--ease), background 0.2s var(--ease);
}

.toggle.is-on {
  border-color: color-mix(in srgb, var(--success) 55%, transparent);
  background: color-mix(in srgb, var(--success) 12%, var(--surface));
}

.toggle__label { font-weight: 600; }
.toggle.is-on .toggle__label { color: var(--success); }

.toggle__track {
  flex: 0 0 auto;
  width: 52px;
  height: 32px;
  padding: 3px;
  border-radius: var(--r-full);
  background: var(--surface-3);
  transition: background 0.2s var(--ease);
}

.toggle.is-on .toggle__track { background: var(--success); }

.toggle__thumb {
  display: block;
  width: 26px;
  height: 26px;
  border-radius: var(--r-full);
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s var(--ease);
}

.toggle.is-on .toggle__thumb { transform: translateX(20px); }
</style>
