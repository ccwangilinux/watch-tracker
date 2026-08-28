import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 採 hash 模式：GitHub Pages 沒有 server rewrite，
 * history 模式下直接開啟或重新整理子路徑會 404（需 404.html hack）。
 * hash 模式讓伺服器永遠只看到 /watch-tracker/，重新整理絕不出錯。
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: '我的觀看紀錄' },
    },
    {
      path: '/c/:categoryId',
      name: 'record-list',
      component: () => import('@/views/RecordListView.vue'),
      props: true,
    },
    {
      path: '/r/new',
      name: 'record-new',
      component: () => import('@/views/RecordEditView.vue'),
      props: (route) => ({ categoryId: route.query.c }),
    },
    {
      path: '/r/:recordId',
      name: 'record-edit',
      component: () => import('@/views/RecordEditView.vue'),
      props: true,
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { title: '設定' },
    },
    {
      path: '/settings/categories',
      name: 'category-manage',
      component: () => import('@/views/CategoryManageView.vue'),
      meta: { title: '類別管理' },
    },
    {
      path: '/settings/cloud',
      name: 'cloud',
      component: () => import('@/views/CloudView.vue'),
      meta: { title: '雲端同步' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
})

export default router
