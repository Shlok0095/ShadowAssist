// Post-build check: ONNX OCR assets and native deps must exist in app.asar.unpacked.
const fs = require('fs')
const path = require('path')

const distRoot = path.join(__dirname, '..', 'dist', 'win-unpacked', 'resources')
const unpacked = path.join(distRoot, 'app.asar.unpacked', 'node_modules')

function mustExist(label, p, minBytes = 1) {
  if (!fs.existsSync(p)) {
    console.error(`[verify-packaged-ocr] MISSING ${label}: ${p}`)
    process.exit(1)
  }
  const size = fs.statSync(p).size
  if (size < minBytes) {
    console.error(`[verify-packaged-ocr] TOO SMALL ${label}: ${p} (${size} bytes)`)
    process.exit(1)
  }
  console.log(`[verify-packaged-ocr] ok ${label} (${size} bytes)`)
}

const assets = path.join(unpacked, '@repeato', 'ocr', 'build', 'node', 'assets')
mustExist('det model', path.join(assets, 'ch_PP-OCRv4_det_infer.onnx'), 1_000_000)
mustExist('rec model', path.join(assets, 'ch_PP-OCRv4_rec_infer.onnx'), 1_000_000)
mustExist('dict', path.join(assets, 'ppocr_keys_v1.txt'), 100)
mustExist('ocr index.cjs', path.join(unpacked, '@repeato', 'ocr', 'build', 'node', 'index.cjs'), 1000)
mustExist('onnxruntime binding', path.join(
  unpacked,
  'onnxruntime-node',
  'bin',
  'napi-v6',
  'win32',
  'x64',
  'onnxruntime_binding.node',
), 1000)

console.log('[verify-packaged-ocr] all checks passed')
