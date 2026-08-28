<script setup lang="ts">
defineProps<{
  name: string
  icon: string
  color: string
  count?: number
}>()
</script>

<template>
  <button class="cat" type="button" :style="{ '--cat-color': color }">
    <span class="cat__icon" aria-hidden="true">{{ icon }}</span>
    <span class="cat__body">
      <span class="cat__name">{{ name }}</span>
      <span class="cat__count">{{ count ?? 0 }} 部</span>
    </span>
    <span class="cat__chevron" aria-hidden="true">›</span>
  </button>
</template>

<style scoped>
.cat {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  min-height: 68px;
  padding: var(--sp-3) var(--sp-4);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-lg);
  text-align: left;
  transition: transform 0.15s var(--ease), background 0.15s var(--ease);
}

.cat:active {
  transform: scale(0.98);
  background: var(--surface-2);
}

.cat__icon {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  font-size: 22px;
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--cat-color) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--cat-color) 35%, transparent);
}

.cat__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.cat__name {
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat__count {
  font-size: 13px;
  color: var(--text-faint);
}

.cat__chevron {
  flex: 0 0 auto;
  font-size: 22px;
  color: var(--text-faint);
}
</style>
