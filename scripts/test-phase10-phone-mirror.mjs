// Phase 10 smoke test — adb device parse + phone mirror manager (no device required).
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')
const require = createRequire(import.meta.url)

const storeSchema = require(path.join(appRoot, 'lib/store.js')).schema
const { parseDevicesList } = require(path.join(appRoot, 'lib/phoneMirror/adbClient.js'))
const { createPhoneMirrorManager } = require(path.join(appRoot, 'lib/phoneMirror/phoneMirrorManager.js'))

for (const key of [
  'phoneMirrorDeviceId',
  'phoneMirrorMaxSize',
  'phoneMirrorBitRate',
  'phoneMirrorIncludeInAsk',
]) {
  if (!storeSchema[key]) throw new Error(`store missing ${key}`)
}

const sample = parseDevicesList(
  'List of devices attached\n' +
    'ABC123\tdevice usb:1-2 product:sdk model:Pixel_7 device:panther\n' +
    'offline1\toffline\n',
)
if (sample.length !== 1 || sample[0].id !== 'ABC123') {
  throw new Error('parseDevicesList failed')
}

const mockStore = {
  phoneMirrorDeviceId: 'ABC123',
  phoneMirrorMaxSize: 720,
  phoneMirrorBitRate: 4000000,
  phoneMirrorIncludeInAsk: false,
}
const mgr = createPhoneMirrorManager({
  storeGet: (k) => mockStore[k],
})

const st = mgr.getStatus()
if (st.maxSize !== 720 || st.bitRate !== 4000000) throw new Error('status defaults wrong')

console.log('OK phase10 phone-mirror', { devices: sample[0].model, maxSize: st.maxSize })
