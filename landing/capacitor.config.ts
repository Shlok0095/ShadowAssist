import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.veilassist.interview',
  appName: 'VeilAssist Interview',
  webDir: 'dist-mobile',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
  // Patch fetch/XHR to native HTTP — required for NVIDIA NIM (no browser CORS headers).
    CapacitorHttp: {
      enabled: true,
    },
  },
}

export default config
