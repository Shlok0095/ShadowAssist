/** Static chat model fallbacks — mirrors desktop lib/chatModelCatalog.json (trimmed). */
export const CHAT_MODEL_CATALOG: Record<string, string[]> = {
  groq: ['llama-3.3-70b-versatile', 'qwen/qwen3.6-27b', 'meta-llama/llama-4-scout-17b-16e-instruct'],
  nvidia: [
    'nvidia/nemotron-nano-12b-v2-vl',
    'nvidia/llama-3.1-nemotron-nano-vl-8b-v1',
    'meta/llama-3.2-11b-vision-instruct',
    'meta/llama-4-scout-17b-16e-instruct',
  ],
  openrouter: [
    'nvidia/nemotron-nano-12b-v2-vl:free',
    'meta-llama/llama-4-scout',
    'google/gemma-3-27b-it:free',
  ],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'],
  anthropic: [
    'claude-sonnet-4-20250514',
    'claude-3-5-haiku-20241022',
    'claude-sonnet-4-6',
  ],
  google: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  custom: ['gpt-4o', 'gpt-4o-mini'],
}

export const DEEPGRAM_MODELS = ['nova-2', 'nova-3', 'enhanced', 'base']
export const GROQ_WHISPER_MODELS = ['whisper-large-v3', 'whisper-large-v3-turbo']
export const NVIDIA_PARAKEET_MODELS = [
  'nvidia/parakeet-1.1b-rnnt-multilingual-asr',
  'nvidia/parakeet-0.6b-ctc-en-us',
]
