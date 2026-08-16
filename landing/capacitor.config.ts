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
    backgroundColor: '#0c0c0d',
  },
  plugins: {
    // Keep disabled: global fetch/XHR patch buffers the full response and breaks SSE streaming.
    // NVIDIA / CORS-blocked calls use explicit CapacitorHttp.post in mobileHttp.ts instead.
    CapacitorHttp: {
      enabled: false,
    },
  },
}

export default config
