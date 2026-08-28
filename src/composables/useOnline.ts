import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 連線狀態。
 * navigator.onLine 只能保證「沒有網路介面」時為 false，
 * 連上 Wi-Fi 但無法對外時仍會是 true——因此它只用於提示，
 * 不能拿來當作「可以同步」的判斷依據，真正的判斷交給 API 呼叫的結果。
 */
export function useOnline() {
  const online = ref(navigator.onLine)

  const goOnline = () => { online.value = true }
  const goOffline = () => { online.value = false }

  onMounted(() => {
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
  })

  onUnmounted(() => {
    window.removeEventListener('online', goOnline)
    window.removeEventListener('offline', goOffline)
  })

  return { online }
}
