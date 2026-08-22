import { Capacitor, registerPlugin } from '@capacitor/core'
import type { AppSettings } from './profileTypes'
import { getSttApiKey, nvidiaLanguageCode, NVIDIA_NIM_FUNCTION_ID } from './sttRegistry'

export type NvidiaParakeetPlugin = {
  transcribeWav(options: {
    apiKey: string
    audioBase64: string
    languageCode?: string
    functionId?: string
  }): Promise<{ text: string }>
}

const NvidiaParakeet = registerPlugin<NvidiaParakeetPlugin>('NvidiaParakeet')

export function nvidiaNativeSttAvailable(): boolean {
  return Capacitor.getPlatform() === 'android'
}

export async function transcribeWavNative(
  settings: AppSettings,
  wavBlob: Blob,
): Promise<string> {
  const apiKey = getSttApiKey(settings, 'nvidia')
  if (!apiKey) throw new Error('Add NVIDIA API key in Audio → NVIDIA Parakeet.')

  const arr = new Uint8Array(await wavBlob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < arr.length; i += 1) binary += String.fromCharCode(arr[i])
  const audioBase64 = btoa(binary)

  const result = await NvidiaParakeet.transcribeWav({
    apiKey,
    audioBase64,
    languageCode: nvidiaLanguageCode(settings.micListenLanguage),
    functionId: settings.nvidiaNimFunctionId?.trim() || NVIDIA_NIM_FUNCTION_ID,
  })

  return String(result?.text || '').trim()
}
