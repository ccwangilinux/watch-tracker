import { ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

/**
 * Service Worker 更新狀態。
 *
 * 在模組層註冊一次並共用，讓提示條與設定頁看到的是同一份狀態——
 * 各自呼叫 useRegisterSW 會註冊多份，其中一邊按了更新另一邊不會反應。
 *
 * 手動檢查是必要的：瀏覽器只在頁面載入時比對 sw.js，
 * 而 PWA 從主畫面啟動常常直接沿用既有的 Service Worker，
 * 不會去問伺服器有沒有新版，使用者就一直停在舊版本上。
 */
let registration: ServiceWorkerRegistration | undefined

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, r) {
    registration = r
  },
})

export type UpdateCheckResult = 'found' | 'latest' | 'unavailable' | 'failed'

const checking = ref(false)
const lastChecked = ref<string | null>(null)

export function usePwaUpdate() {
  async function checkForUpdate(): Promise<UpdateCheckResult> {
    if (!registration) return 'unavailable'

    checking.value = true
    try {
      // 這一步才會真的向伺服器要 sw.js 比對
      await registration.update()

      // 有新版時瀏覽器要先安裝完才會觸發 needRefresh，給它一點時間
      for (let i = 0; i < 12 && !needRefresh.value; i += 1) {
        if (registration.installing || registration.waiting) {
          await wait(250)
          continue
        }
        await wait(150)
      }

      lastChecked.value = new Date().toISOString()
      return needRefresh.value ? 'found' : 'latest'
    } catch {
      return 'failed'
    } finally {
      checking.value = false
    }
  }

  function applyUpdate() {
    updateServiceWorker(true)
  }

  return { needRefresh, checking, lastChecked, checkForUpdate, applyUpdate }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
