// Copyright (c) 2026 VeilAssist. All rights reserved.
// Self-contained mobile companion page — Natively-style teleprompter (Phase 10 Phone Link).

function buildCompanionHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
  <meta name="theme-color" content="#0a0a0b" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <title>VeilAssist</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html {
      height: 100%;
      -webkit-text-size-adjust: 100%;
    }
    body {
      margin: 0;
      height: 100%;
      overflow: hidden;
      font-family: 'Outfit', system-ui, -apple-system, sans-serif;
      background: #0a0a0b;
      color: rgba(255, 255, 255, 0.97);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* ── Teleprompter shell (Natively companion: answer-first, minimal chrome) ── */
    .app {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      max-height: 100dvh;
    }
    .topbar {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: max(10px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 8px max(16px, env(safe-area-inset-left));
    }
    .live-dot {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.5);
    }
    .live-dot .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #52525b;
      flex-shrink: 0;
    }
    .live-dot.live .dot {
      background: #22c55e;
      box-shadow: 0 0 10px rgba(34, 197, 94, 0.55);
    }
    .live-dot.thinking .dot {
      background: #60a5fa;
      animation: blink 1s ease-in-out infinite;
    }
    .live-dot.wait .dot { background: #eab308; }
    .live-dot.off .dot { background: #52525b; }
    @keyframes blink {
      0%, 100% { opacity: 0.35; }
      50% { opacity: 1; }
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: rgba(255, 255, 255, 0.35);
    }
    .brand-logo {
      height: 22px;
      width: auto;
      display: block;
      object-fit: contain;
    }

    .pair-err {
      margin: 0 16px 8px;
      padding: 14px 16px;
      border-radius: 12px;
      background: rgba(127, 29, 29, 0.35);
      border: 1px solid rgba(248, 113, 113, 0.25);
      color: #fecaca;
      font-size: 0.92rem;
      line-height: 1.5;
    }

    /* Full-screen answer — matches overlay teleprompter (pin-to-top, large type) */
    .teleprompter {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      padding: 8px max(18px, env(safe-area-inset-right)) 120px max(18px, env(safe-area-inset-left));
    }
    .teleprompter.streaming .answer-body {
      white-space: pre-wrap;
      word-break: break-word;
    }
    .answer-empty {
      color: rgba(255, 255, 255, 0.32);
      font-size: 17px;
      line-height: 1.65;
      font-style: italic;
      padding-top: 12vh;
      text-align: center;
    }
    .takeaway {
      margin-bottom: 20px;
      padding: 16px 18px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-top-color: rgba(255, 255, 255, 0.16);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }
    .takeaway-label {
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.42);
      margin-bottom: 10px;
    }
    .takeaway p {
      margin: 0;
      font-size: 19px;
      font-weight: 600;
      line-height: 1.72;
      color: rgba(255, 255, 255, 0.99);
      letter-spacing: -0.02em;
    }
    .answer-body {
      color: rgba(255, 255, 255, 0.98);
      font-size: 18px;
      line-height: 1.82;
      letter-spacing: -0.015em;
      word-break: break-word;
    }
    .answer-body p { margin: 0 0 0.9em; }
    .answer-body p:last-child { margin-bottom: 0; }
    .answer-body ul, .answer-body ol {
      margin: 0.55em 0 0.9em;
      padding-left: 1.4em;
    }
    .answer-body li { margin: 0.4em 0; }
    .answer-body strong { font-weight: 600; color: #fff; }
    .answer-body em { font-style: italic; opacity: 0.9; }
    .answer-body code {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 0.86em;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 0.1em 0.38em;
    }
    .answer-body pre {
      margin: 0.9em 0;
      padding: 14px 16px;
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.08);
      overflow-x: auto;
    }
    .answer-body pre code {
      display: block;
      background: none;
      border: none;
      padding: 0;
      font-size: 0.8em;
      line-height: 1.55;
      white-space: pre;
    }

    /* Fixed bottom controls — transcript sheet + mic */
    .bottom-ui {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 20;
      padding: 0 max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
      pointer-events: none;
    }
    .bottom-ui > * { pointer-events: auto; }

    .transcript-sheet {
      border-radius: 16px 16px 0 0;
      background: rgba(16, 16, 20, 0.96);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-bottom: none;
      overflow: hidden;
      margin-bottom: 8px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .transcript-sheet.collapsed { max-height: 44px; }
    .transcript-sheet.expanded { max-height: min(38vh, 300px); }
    .sheet-handle {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      border: none;
      background: transparent;
      color: rgba(255, 255, 255, 0.5);
      font-family: inherit;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    .sheet-handle:active { background: rgba(255, 255, 255, 0.04); }
    .sheet-preview {
      flex: 1;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.78rem;
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
      color: rgba(255, 255, 255, 0.38);
    }
    .sheet-chevron {
      color: rgba(255, 255, 255, 0.35);
      transition: transform 0.2s ease;
    }
    .transcript-sheet.expanded .sheet-chevron { transform: rotate(180deg); }
    .transcript-body {
      padding: 0 14px 14px;
      max-height: calc(min(38vh, 300px) - 44px);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      font-size: 14px;
      line-height: 1.55;
      color: rgba(255, 255, 255, 0.68);
      white-space: pre-wrap;
      word-break: break-word;
    }
    .transcript-sheet.collapsed .transcript-body { display: none; }
    .transcript-body.empty {
      color: rgba(255, 255, 255, 0.28);
      font-style: italic;
    }

    .mic-btn {
      width: 100%;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(20, 20, 25, 0.96);
      color: #fafafa;
      border-radius: 14px;
      padding: 14px 16px;
      font-family: inherit;
      font-size: 0.92rem;
      font-weight: 600;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    .mic-btn:active, .mic-btn.active {
      background: #1d4ed8;
      border-color: #2563eb;
    }
    .mic-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .mic-bar[hidden] { display: none !important; }
  </style>
</head>
<body>
  <div class="app">
    <header class="topbar">
      <div id="liveDot" class="live-dot wait">
        <span class="dot"></span>
        <span id="liveLabel">Connecting</span>
      </div>
      <div class="brand"><img class="brand-logo" src="/logo.png" alt="" />VeilAssist</div>
    </header>

    <div id="pairErr" class="pair-err" hidden></div>

    <main id="teleprompter" class="teleprompter" aria-label="AI answer">
      <div id="answer" class="answer-empty">Start Listen on your PC — answers appear here in real time.</div>
    </main>
  </div>

  <div class="bottom-ui">
    <section id="transcriptSheet" class="transcript-sheet collapsed" aria-label="Live transcript">
      <button id="sheetToggle" type="button" class="sheet-handle" aria-expanded="false">
        <span>Transcript</span>
        <span id="transcriptPreview" class="sheet-preview">Waiting…</span>
        <span class="sheet-chevron">▾</span>
      </button>
      <div id="transcript" class="transcript-body empty">Waiting for session…</div>
    </section>
    <footer id="micBar" class="mic-bar" hidden>
      <button id="micBtn" type="button" class="mic-btn" disabled>Send voice to PC</button>
    </footer>
  </div>

  <script>
    (function () {
      var params = new URLSearchParams(location.search)
      var token = (params.get('t') || params.get('token') || '').trim()
      var liveDot = document.getElementById('liveDot')
      var liveLabel = document.getElementById('liveLabel')
      var pairErr = document.getElementById('pairErr')
      var teleprompter = document.getElementById('teleprompter')
      var answerEl = document.getElementById('answer')
      var micBar = document.getElementById('micBar')
      var micBtn = document.getElementById('micBtn')
      var transcriptSheet = document.getElementById('transcriptSheet')
      var sheetToggle = document.getElementById('sheetToggle')
      var transcriptPreview = document.getElementById('transcriptPreview')
      var transcriptEl = document.getElementById('transcript')

      var latestState = {}
      var lastRev = 0
      var lastAiText = ''
      var lastFinalRendered = ''
      var userExpandedTranscript = false
      var pollTimer = null
      var micActive = false
      var audioCtx = null
      var micStream = null
      var processor = null
      var silenceMs = 0
      var lastSpeechAt = 0

      function setLive(mode, label) {
        liveDot.className = 'live-dot ' + mode
        liveLabel.textContent = label
      }

      function pinAnswerTop() {
        requestAnimationFrame(function () {
          teleprompter.scrollTop = 0
        })
      }

      function escapeHtml(s) {
        return String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
      }

      function renderInline(t) {
        var e = escapeHtml(t)
        e = e.replace(/\`([^\`\\n]+)\`/g, '<code>$1</code>')
        e = e.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
        e = e.replace(/\\*([^*\\n]+)\\*/g, '<em>$1</em>')
        return e
      }

      function renderMarkdownBlock(text) {
        var src = String(text || '')
        var blocks = []
        var re = /\`\`\`([\\w+-]*)\\n?([\\s\\S]*?)\`\`\`/g
        var last = 0
        var m
        while ((m = re.exec(src)) !== null) {
          if (m.index > last) blocks.push({ type: 'text', v: src.slice(last, m.index) })
          blocks.push({ type: 'code', v: m[2] })
          last = re.lastIndex
        }
        if (last < src.length) blocks.push({ type: 'text', v: src.slice(last) })

        function textBlock(t) {
          var lines = t.split('\\n')
          var html = ''
          var inList = false
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i]
            var bullet = /^[\\-*•]\\s+(.+)$/.exec(line)
            var num = /^\\d+\\.\\s+(.+)$/.exec(line)
            if (bullet) {
              if (!inList) { html += '<ul>'; inList = 'ul' }
              html += '<li>' + renderInline(bullet[1]) + '</li>'
            } else if (num) {
              if (!inList) { html += '<ol>'; inList = 'ol' }
              html += '<li>' + renderInline(num[1]) + '</li>'
            } else {
              if (inList) { html += inList === 'ul' ? '</ul>' : '</ol>'; inList = false }
              if (line.trim()) html += '<p>' + renderInline(line) + '</p>'
            }
          }
          if (inList) html += inList === 'ul' ? '</ul>' : '</ol>'
          return html
        }

        var out = ''
        for (var j = 0; j < blocks.length; j++) {
          if (blocks[j].type === 'code') {
            out += '<pre><code>' + escapeHtml(blocks[j].v.replace(/\\n$/, '')) + '</code></pre>'
          } else {
            out += textBlock(blocks[j].v)
          }
        }
        return out || '<p>' + renderInline(src) + '</p>'
      }

      /** BriefAnswer-style: first paragraph as takeaway, rest as body (overlay teleprompter). */
      function renderFinalAnswer(text) {
        var src = String(text || '').trim()
        if (!src) return ''
        var lines = src.split('\\n')
        var i = 0
        while (i < lines.length && !lines[i].trim()) i++
        var first = []
        while (i < lines.length && lines[i].trim()) {
          first.push(lines[i].trim())
          i++
        }
        while (i < lines.length && !lines[i].trim()) i++
        var rest = lines.slice(i).join('\\n').trim()
        var takeaway = first.join(' ').replace(/^#+\\s*/, '').replace(/^\\*\\*|\\*\\*$/g, '').trim()
        if (takeaway && rest.length > 24) {
          return (
            '<div class="takeaway"><div class="takeaway-label">Key point</div><p>' +
            renderInline(takeaway) +
            '</p></div><div class="answer-body">' +
            renderMarkdownBlock(rest) +
            '</div>'
          )
        }
        return '<div class="answer-body">' + renderMarkdownBlock(src) + '</div>'
      }

      function setStreamingAnswer(text) {
        teleprompter.classList.add('streaming')
        answerEl.className = 'answer-body'
        if (answerEl.textContent !== text) {
          answerEl.textContent = text
          pinAnswerTop()
        }
      }

      function setFinalAnswer(text) {
        teleprompter.classList.remove('streaming')
        if (text === lastFinalRendered) {
          pinAnswerTop()
          return
        }
        lastFinalRendered = text
        answerEl.className = ''
        answerEl.innerHTML = renderFinalAnswer(text)
        pinAnswerTop()
      }

      function setAnswerEmpty() {
        teleprompter.classList.remove('streaming')
        lastFinalRendered = ''
        answerEl.className = 'answer-empty'
        answerEl.textContent = 'Start Listen on your PC — answers appear here in real time.'
      }

      function transcriptTail(text, max) {
        if (!text) return 'Waiting…'
        var t = String(text).replace(/\\s+/g, ' ').trim()
        if (t.length <= max) return t
        return '…' + t.slice(-max)
      }

      sheetToggle.addEventListener('click', function () {
        userExpandedTranscript = !userExpandedTranscript
        transcriptSheet.classList.toggle('collapsed', !userExpandedTranscript)
        transcriptSheet.classList.toggle('expanded', userExpandedTranscript)
        sheetToggle.setAttribute('aria-expanded', userExpandedTranscript ? 'true' : 'false')
      })

      function mergeState(s) {
        if (!s) return latestState
        if (typeof s.rev === 'number' && s.rev <= lastRev && s.aiText === latestState.aiText) return latestState
        if (typeof s.rev === 'number') lastRev = s.rev
        latestState = Object.assign({}, latestState, s)
        return latestState
      }

      function syncLiveStatus(s) {
        if (s.aiThinking) setLive('thinking', 'Generating')
        else if (s.sessionActive) setLive('live', 'Live')
        else setLive('live', 'Idle')
      }

      function applyState(raw) {
        var s = mergeState(raw)
        syncLiveStatus(s)

        if (s.transcript) {
          transcriptEl.classList.remove('empty')
          transcriptEl.textContent = s.transcript
          transcriptPreview.textContent = transcriptTail(s.transcript, 48)
        } else if (s.sessionActive === false && s.transcript === '') {
          transcriptEl.classList.add('empty')
          transcriptEl.textContent = 'Waiting for session…'
          transcriptPreview.textContent = 'Waiting…'
        }

        var micAllowed = !!(s.remoteMicEnabled && s.sessionActive)
        micBar.hidden = !s.remoteMicEnabled
        micBtn.disabled = !micAllowed

        if (s.aiText) {
          if (s.aiThinking) {
            if (s.aiText !== lastAiText) {
              lastAiText = s.aiText
              setStreamingAnswer(s.aiText)
            }
          } else if (s.aiText !== lastAiText || s.aiText !== lastFinalRendered) {
            lastAiText = s.aiText
            setFinalAnswer(s.aiText)
          }
        } else if (s.aiThinking) {
          if (lastAiText) {
            lastAiText = ''
            lastFinalRendered = ''
            teleprompter.classList.add('streaming')
            answerEl.className = 'answer-body'
            answerEl.textContent = ''
          }
        } else if (!s.sessionActive) {
          lastAiText = ''
          setAnswerEmpty()
        }

        if (s.sessionActive || s.aiThinking) startPoll()
        else stopPoll()
      }

      function startPoll() {
        if (pollTimer) return
        pollTimer = setInterval(function () {
          fetch('/api/state?t=' + encodeURIComponent(token), { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null })
            .then(function (j) { if (j) applyState(j) })
            .catch(function () {})
        }, 300)
      }

      function stopPoll() {
        if (!pollTimer) return
        clearInterval(pollTimer)
        pollTimer = null
      }

      function b64FromBuffer(buf) {
        var bytes = new Uint8Array(buf)
        var bin = ''
        for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
        return btoa(bin)
      }

      function floatToPcm16(input, inRate, outRate) {
        var ratio = inRate / outRate
        var outLen = Math.floor(input.length / ratio)
        var out = new Int16Array(outLen)
        for (var i = 0; i < outLen; i++) {
          var idx = Math.floor(i * ratio)
          var v = Math.max(-1, Math.min(1, input[idx] || 0))
          out[i] = v < 0 ? v * 0x8000 : v * 0x7fff
        }
        return out.buffer
      }

      function chunkRms(floats) {
        var sum = 0
        for (var i = 0; i < floats.length; i++) sum += floats[i] * floats[i]
        return Math.sqrt(sum / (floats.length || 1))
      }

      function postMic(path, body) {
        return fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign({ token: token }, body || {})),
        })
      }

      function stopMic() {
        micActive = false
        micBtn.classList.remove('active')
        micBtn.textContent = 'Send voice to PC'
        if (processor) {
          try { processor.disconnect() } catch (_) {}
          processor.onaudioprocess = null
          processor = null
        }
        if (audioCtx) {
          try { audioCtx.close() } catch (_) {}
          audioCtx = null
        }
        if (micStream) {
          micStream.getTracks().forEach(function (t) { try { t.stop() } catch (_) {} })
          micStream = null
        }
      }

      async function startMic() {
        if (micActive || !latestState.remoteMicEnabled || !latestState.sessionActive) return
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
            video: false,
          })
          audioCtx = new (window.AudioContext || window.webkitAudioContext)()
          var src = audioCtx.createMediaStreamSource(micStream)
          processor = audioCtx.createScriptProcessor(4096, 1, 1)
          processor.onaudioprocess = function (e) {
            if (!micActive) return
            var input = e.inputBuffer.getChannelData(0)
            var rms = chunkRms(input)
            var now = Date.now()
            if (rms > 0.012) {
              lastSpeechAt = now
              silenceMs = 0
            } else {
              silenceMs += (4096 / audioCtx.sampleRate) * 1000
            }
            postMic('/api/mic-chunk', {
              pcm: b64FromBuffer(floatToPcm16(input, audioCtx.sampleRate, 16000)),
            }).catch(function () {})
            if (silenceMs > 700 && lastSpeechAt && now - lastSpeechAt > 700) {
              lastSpeechAt = 0
              postMic('/api/mic-speech-ended', {}).catch(function () {})
            }
          }
          src.connect(processor)
          processor.connect(audioCtx.destination)
          micActive = true
          micBtn.classList.add('active')
          micBtn.textContent = 'Sending voice… (tap to stop)'
        } catch (_) {
          micBtn.textContent = 'Mic unavailable'
        }
      }

      micBtn.addEventListener('click', function () {
        if (micActive) stopMic()
        else startMic()
      })

      if (!token) {
        setLive('off', 'Scan QR')
        pairErr.hidden = false
        pairErr.textContent = 'Scan the QR code in VeilAssist Settings → Phone Link on your PC.'
        return
      }

      fetch('/api/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token }),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j } }) })
        .then(function (res) {
          if (!res.ok) throw new Error((res.j && res.j.error) || 'Pair failed')
          setLive('live', 'Connected')
          if (res.j && res.j.state) applyState(res.j.state)
          startEvents()
        })
        .catch(function (e) {
          setLive('off', 'Pair failed')
          pairErr.hidden = false
          pairErr.textContent = e.message || 'Could not pair. Scan a fresh QR code from your PC.'
        })

      function startEvents() {
        var es = new EventSource('/api/events?t=' + encodeURIComponent(token))
        es.onmessage = function (ev) {
          try { applyState(JSON.parse(ev.data)) } catch (_) {}
        }
        es.onerror = function () {
          if (liveLabel.textContent !== 'Pair failed') setLive('wait', 'Reconnecting')
          startPoll()
        }
        es.onopen = function () {
          fetch('/api/state?t=' + encodeURIComponent(token), { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null })
            .then(function (j) { if (j) applyState(j) })
            .catch(function () {})
        }
      }

      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && token) {
          fetch('/api/state?t=' + encodeURIComponent(token), { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null })
            .then(function (j) { if (j) applyState(j) })
            .catch(function () {})
        }
      })
    })()
  </script>
</body>
</html>`
}

module.exports = { buildCompanionHtml }
