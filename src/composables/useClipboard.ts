import { ref } from 'vue'

/**
 * 複製到剪貼簿。
 *
 * navigator.clipboard 需要安全來源（https 或 localhost）且必須在使用者手勢中呼叫，
 * iOS Safari 對此特別嚴格。失敗時退回 execCommand，
 * 雖然已被標為過時，但仍是舊環境唯一可用的方式。
 */
export function useClipboard(resetAfter = 1500) {
  const copied = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  async function copy(text: string): Promise<boolean> {
    const ok = (await tryAsync(text)) || fallback(text)

    if (ok) {
      copied.value = true
      clearTimeout(timer)
      timer = setTimeout(() => { copied.value = false }, resetAfter)
    }
    return ok
  }

  return { copied, copy }
}

async function tryAsync(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function fallback(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  // 放在畫面外但仍可被選取；display:none 會讓 select() 失效
  textarea.style.cssText = 'position:fixed;top:-9999px;opacity:0'
  textarea.setAttribute('readonly', '')
  document.body.appendChild(textarea)

  textarea.select()
  textarea.setSelectionRange(0, text.length) // iOS 需要明確指定範圍

  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  textarea.remove()
  return ok
}
