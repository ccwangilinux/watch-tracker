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
  /**
   * 回到列表時還原捲動位置。
   *
   * 不能直接回傳 savedPosition：列表資料是從 IndexedDB 非同步載入的，
   * 此刻頁面高度還不足以捲到原來的位置，瀏覽器會把它夾成能捲到的最大值。
   * 因此等頁面長到足夠高度再還原，最多等 800ms 以免卡住轉場。
   */
  scrollBehavior: async (_to, _from, saved) => {
    if (!saved) return { top: 0 }
    await waitForScrollHeight(saved.top, 800)
    return saved
  },
})

/** 等到文件高度足以捲到 target，或逾時 */
function waitForScrollHeight(target: number, timeout: number): Promise<void> {
  return new Promise((resolve) => {
    const deadline = performance.now() + timeout

    const check = () => {
      const reachable = document.documentElement.scrollHeight - window.innerHeight
      if (reachable >= target || performance.now() > deadline) {
        resolve()
        return
      }
      requestAnimationFrame(check)
    }

    requestAnimationFrame(check)
  })
}

export default router
