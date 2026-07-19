// Copyright (c) 2026 VeilAssist. All rights reserved.

function resolveAskContextPriority({
  hasTypedQuestion = false,
  noScreen = false,
  isVisionAsk = false,
  isScreenRead = false,
  hasSpeech = false,
  fallbackAssistSource = 'speech',
} = {}) {
  const speechLedVisionAsk = Boolean(isVisionAsk && hasSpeech)
  const promptMode = hasTypedQuestion
    ? 'typed'
    : noScreen || speechLedVisionAsk
      ? 'audio'
      : isVisionAsk || isScreenRead
        ? 'screen'
        : 'audio'
  const assistTrigger =
    (isVisionAsk && !speechLedVisionAsk) || isScreenRead
      ? 'screen'
      : fallbackAssistSource

  return { promptMode, assistTrigger, speechLedVisionAsk }
}

module.exports = { resolveAskContextPriority }
