// Vercel serverless — proxies NVIDIA NIM chat (key stays server-side).
// Set NVIDIA_API_KEY in Vercel project env (never in client code).

const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1'
const DEFAULT_MODEL = 'nvidia/nemotron-nano-12b-v2-vl'

function buildSystemPrompt(resume, jobDescription) {
  const resumeBlock = String(resume || '').trim()
  const jdBlock = String(jobDescription || '').trim()
  let profile = ''
  if (resumeBlock) profile += `\n## RESUME / BACKGROUND\n${resumeBlock.slice(0, 6000)}`
  if (jdBlock) profile += `\n\n## JOB DESCRIPTION\n${jdBlock.slice(0, 4000)}`

  return `You are VeilAssist, a private interview copilot on the user's phone.
The user is in a live job interview. They heard a question (transcribed from speech).
Give the DIRECT ANSWER they should speak — first person, natural, confident.
Do NOT introduce yourself as an AI. Do NOT coach from outside ("the interviewer asked...").
Use STAR briefly for behavioral questions (max 4 short sentences).
Keep answers under 180 words unless technical depth is required.
Ground personal experience ONLY in the resume below — never invent employers or dates.
${profile}

If the question is general knowledge (definitions, architecture), answer clearly from expertise while staying in candidate voice when appropriate.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) {
    res.status(503).json({
      error: 'NVIDIA_API_KEY is not configured on the server. Add it in Vercel → Settings → Environment Variables.',
    })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const question = String(body.question || '').trim()
    if (!question) {
      res.status(400).json({ error: 'Missing question text' })
      return
    }

    const resume = body.resume || ''
    const jobDescription = body.jobDescription || ''
    const think = body.think === true
    const model = String(process.env.NVIDIA_CHAT_MODEL || DEFAULT_MODEL).trim()

    const messages = [
      { role: 'system', content: buildSystemPrompt(resume, jobDescription) },
      {
        role: 'user',
        content: think
          ? `Interview question (think briefly, then answer):\n\n${question}`
          : `Interview question:\n\n${question}`,
      },
    ]

    const payload = {
      model,
      messages,
      max_tokens: think ? 2200 : 1400,
      temperature: 0,
      top_p: 0.7,
      stream: false,
    }

    if (/nemotron/i.test(model)) {
      payload.chat_template_kwargs = { enable_thinking: false }
    }

    const upstream = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const text = await upstream.text()
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: `NVIDIA API error (${upstream.status})`,
        detail: text.slice(0, 500),
      })
      return
    }

    const data = JSON.parse(text)
    const answer = data?.choices?.[0]?.message?.content?.trim() || ''
    if (!answer) {
      res.status(502).json({ error: 'Empty response from model' })
      return
    }

    res.status(200).json({ answer, model })
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Chat request failed' })
  }
}
