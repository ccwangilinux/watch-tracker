<script setup lang="ts">
import BottomSheet from './BottomSheet.vue'
import { DARK_THEMES, LIGHT_THEMES, type Theme, type ThemeKey } from '@/constants/themes'

const open = defineModel<boolean>({ required: true })
const theme = defineModel<ThemeKey>('theme', { required: true })

/**
 * 點下去就立刻換，不設「確定」才套用——
 * 主題是用眼睛決定的，要能一邊翻一邊看整個 App 變成什麼樣子。
 */
const GROUPS: { title: string; items: Theme[] }[] = [
  { title: '深色', items: DARK_THEMES },
  { title: '淺色', items: LIGHT_THEMES },
]
</script>

<template>
  <BottomSheet v-model="open" title="主題">
    <div v-for="group in GROUPS" :key="group.title" class="group">
      <h3 class="group__title">{{ group.title }}</h3>
      <ul class="options">
        <li v-for="item in group.items" :key="item.key">
          <button
            class="option"
            :class="{ 'is-active': theme === item.key }"
            type="button"
            @click="theme = item.key"
          >
            <!--
              預覽把 data-theme 掛在自己身上，直接吃 themes.css 的變數，
              所以色票永遠等於實際主題，不需要在 JS 裡再抄一份色碼。
            -->
            <span class="swatch" :data-theme="item.key" :data-scheme="item.scheme" aria-hidden="true">
              <span class="swatch__bar" />
              <span class="swatch__dots">
                <i class="dot dot--season" />
                <i class="dot dot--episode" />
                <i class="dot dot--watched" />
              </span>
            </span>

            <span class="option__text">
              <span class="option__label">{{ item.label }}</span>
              <span class="option__hint">{{ item.hint }}</span>
            </span>

            <span v-if="theme === item.key" class="option__check" aria-label="使用中">✓</span>
          </button>
        </li>
      </ul>
    </div>

    <button class="sheet-done" type="button" @click="open = false">完成</button>
  </BottomSheet>
</template>

<style scoped>
.group + .group { margin-top: var(--sp-5); }

.group__title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  margin-bottom: var(--sp-2);
  padding-left: var(--sp-1);
}

.options { display: flex; flex-direction: column; gap: var(--sp-2); }

.option {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  min-height: 56px;
  padding: var(--sp-2) var(--sp-4) var(--sp-2) var(--sp-2);
  background: var(--surface);
  border: 1px solid transparent;
  border-radius: var(--r-md);
  text-align: left;
}

.option.is-active { border-color: var(--accent); background: var(--accent-soft); }

/* 色票是主題的縮圖：底色 + 主色漸層條 + 季/集/時間三個標籤色 */
.swatch {
  flex: 0 0 auto;
  width: 56px;
  height: 42px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding: 7px;
  border-radius: var(--r-sm);
  background: var(--bg);
  border: 1px solid var(--border);
}

.swatch__bar { height: 7px; border-radius: var(--r-full); background: var(--gradient); }
.swatch__dots { display: flex; gap: 4px; }

.dot { width: 8px; height: 8px; border-radius: var(--r-full); }
.dot--season  { background: var(--season); }
.dot--episode { background: var(--episode); }
.dot--watched { background: var(--watched); }

.option__text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.option__label { font-size: 15px; font-weight: 700; }
.option__hint { font-size: 12px; color: var(--text-faint); }

.option__check { flex: 0 0 auto; font-weight: 700; color: var(--accent); }

.sheet-done {
  width: 100%;
  min-height: 52px;
  margin-top: var(--sp-5);
  border-radius: var(--r-lg);
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 700;
}
</style>
