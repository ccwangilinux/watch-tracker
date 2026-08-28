/**
 * Web Speech API 封裝。
 *
 * iOS Safari 至今未實作 SpeechRecognition（僅 Chrome/Edge 以 webkit 前綴支援）。
 * 規格第 10 節要求：偵測不支援時隱藏語音鍵，且絕不影響一般文字搜尋。
 * 因此這裡不提供任何 polyfill，只誠實回報能力。
 */

interface SpeechRecognitionAlternative {
  transcript: string
}
interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative
}
interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult
  length: number
}
export interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}
export interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: unknown) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getCtor(): SpeechRecognitionCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function isSpeechSupported(): boolean {
  return getCtor() !== undefined
}

export function createRecognition(lang = 'zh-TW'): SpeechRecognitionLike | null {
  const Ctor = getCtor()
  if (!Ctor) return null

  const recognition = new Ctor()
  recognition.lang = lang
  recognition.continuous = false
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  return recognition
}
