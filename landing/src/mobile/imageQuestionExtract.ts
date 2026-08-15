import type { AppSettings } from './profileTypes'

export function isVisionCapableModel(model: string): boolean {
  return /vl|vision|nemotron-nano-vl|nemotron-3-nano-omni|llama-4|gemini|gpt-4o|claude-3|scout/i.test(
    String(model || ''),
  )
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.readAsDataURL(file)
  })
}

/** Shrink camera photos so NIM vision requests stay under timeout. */
export async function compressImageDataUrl(dataUrl: string, maxEdge = 1024, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      const width = Math.max(1, Math.round(img.width * scale))
      const height = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('Could not compress image'))
    img.src = dataUrl
  })
}

export function visionQuestionLabel(): string {
  return 'Photo question'
}

export function providerSupportsMobileVision(settings: AppSettings): boolean {
  return settings.provider !== 'anthropic' && settings.provider !== 'deepseek'
}
