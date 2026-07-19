// Copyright (c) 2026 ShadowAssist. All rights reserved.
// Vision/multimodal chat models only — ShadowAssist Ask AI sends screen captures.

const catalog = require('./chatModelCatalog.json')

/** @type {Record<string, RegExp[]>} */
const EXTRA_PATTERNS = {
  groq: [/qwen3\.6-27b/i, /qwen\/qwen3\.6/i],
  nvidia: [
    /nemotron-nano-12b-v2-vl/i,
    /nemotron-nano-vl/i,
    /llama-3\.1-nemotron-nano-vl/i,
    /cosmos-nemotron/i,
    /llama-4-(scout|maverick)/i,
    /llama-3\.2-.*vision/i,
    /phi-3\.5-vision/i,
    /kimi-k2\.5/i,
    /nemotron-3-nano-omni/i,
  ],
}

function staticAllowlist(provider) {
  return (catalog[provider] || []).map((id) => String(id).trim()).filter(Boolean)
}

function isMultimodalChatModel(provider, modelId) {
  const id = String(modelId || '').trim()
  if (!id) return false
  if (provider !== 'groq' && provider !== 'nvidia') return true
  const allow = staticAllowlist(provider)
  if (allow.some((m) => m.toLowerCase() === id.toLowerCase())) return true
  return (EXTRA_PATTERNS[provider] || []).some((re) => re.test(id))
}

/** @param {string} provider @param {string[]} ids */
function filterMultimodalChatModels(provider, ids) {
  if (provider !== 'groq' && provider !== 'nvidia') return ids || []
  const filtered = (ids || []).filter((id) => isMultimodalChatModel(provider, id))
  if (filtered.length) return filtered
  return staticAllowlist(provider)
}

module.exports = {
  filterMultimodalChatModels,
  isMultimodalChatModel,
  staticAllowlist,
}
