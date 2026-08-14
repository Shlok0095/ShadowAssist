// One-off connectivity check for the NVIDIA NIM key. Reads NVIDIA_NIM_API_KEY
// from the environment (use: node --env-file=.env.local scripts/nim-check.mjs).
// Prints model ids and a tiny chat completion. Never prints the key.
const base = process.env.NIM_LLM_BASE_URL || 'https://integrate.api.nvidia.com/v1'
const key = process.env.NVIDIA_NIM_API_KEY
if (!key) {
  console.error('NVIDIA_NIM_API_KEY not set')
  process.exit(1)
}

const auth = { Authorization: `Bearer ${key}` }

const models = await fetch(`${base}/models`, { headers: auth })
if (!models.ok) {
  console.error('models list failed', models.status, await models.text())
  process.exit(1)
}
const body = await models.json()
const ids = (body.data || []).map((m) => m.id).sort()
console.log(`MODEL_COUNT=${ids.length}`)
const interesting = ids.filter((id) =>
  /nemotron|llama-3\.[13]|qwen|mistral|deepseek/i.test(id),
)
console.log('SAMPLE_MODELS:')
for (const id of interesting.slice(0, 25)) console.log('  ' + id)

const testModel = process.env.NIM_LLM_MODEL || 'meta/llama-3.1-8b-instruct'
const chat = await fetch(`${base}/chat/completions`, {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: testModel,
    messages: [
      { role: 'system', content: 'You are a terse assistant.' },
      { role: 'user', content: 'Reply with exactly: NIM_OK' },
    ],
    max_tokens: 16,
    temperature: 0,
  }),
})
if (!chat.ok) {
  console.error(`chat failed for ${testModel}`, chat.status, await chat.text())
  process.exit(1)
}
const data = await chat.json()
console.log(`CHAT_MODEL=${testModel}`)
console.log('CHAT_REPLY=' + JSON.stringify(data.choices?.[0]?.message?.content ?? ''))

// Streaming sanity check: confirm the SSE wire format matches our parser.
const stream = await fetch(`${base}/chat/completions`, {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
  body: JSON.stringify({
    model: testModel,
    stream: true,
    max_tokens: 24,
    temperature: 0,
    messages: [{ role: 'user', content: 'Say: streaming works' }],
  }),
})
if (!stream.ok || !stream.body) {
  console.error('stream failed', stream.status, await stream.text())
  process.exit(1)
}
const reader = stream.body.getReader()
const decoder = new TextDecoder()
let buf = ''
let acc = ''
let frames = 0
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  buf += decoder.decode(value, { stream: true })
  const lines = buf.split('\n')
  buf = lines.pop() ?? ''
  for (const line of lines) {
    const t = line.trim()
    if (!t.startsWith('data:')) continue
    const d = t.slice(5).trim()
    if (d === '[DONE]') continue
    try {
      const j = JSON.parse(d)
      const delta = j.choices?.[0]?.delta?.content
      if (delta) {
        acc += delta
        frames++
      }
    } catch {}
  }
}
console.log(`STREAM_FRAMES=${frames}`)
console.log('STREAM_REPLY=' + JSON.stringify(acc))
