// Copyright (c) 2026 VeilAssist. Advanced settings.

import React from 'react'
import { Bot, Brain, Mic, Monitor, Smartphone } from 'lucide-react'
import OverlayAdvancePanel from './OverlayAdvancePanel'
import { SettingsCollapsible, SettingsPage } from './SettingsComponents'
import AiProviderPanel from './AiProviderPanel'
import SpeechSettingsPanel from './SpeechSettingsPanel'
import PhoneLinkSettingsPanel from './PhoneLinkSettingsPanel'
import IntelligenceSettingsPanel from './IntelligenceSettingsPanel'

function sectionOpen(id, props) {
  const target = String(props.advanceOpenSection || '').toLowerCase()
  if (!target) return false
  if (target === 'audio' && id === 'speech') return true
  return target === id
}

export default function AdvanceSettingsPanel(props) {
  return (
    <SettingsPage title="Advance" description="AI providers, audio, phone link, and intelligence." wide>
      <div className="settings-advance-stack">
        <SettingsCollapsible
          title="AI Providers"
          description="Chat models and API keys."
          icon={Bot}
          defaultOpen={!!props.showSetupBanner}
          forceOpen={sectionOpen('ai', props)}
          className="settings-advance-section"
        >
          <div className="px-1 pb-1">
            <AiProviderPanel
              embedded
              snap={props.snap}
              providerMeta={props.providerMeta}
              provider={props.provider}
              onSelectProvider={props.onSelectProvider}
              keySetMap={props.keySetMap}
              secretByProvider={props.secretByProvider}
              setSecretByProvider={props.setSecretByProvider}
              onSaveKey={props.onSaveKey}
              chatVendor={props.chatVendor}
              chatKf={props.chatKf}
              chatKeySaved={props.chatKeySaved}
              chatMf={props.chatMf}
              chatModel={props.chatModel}
              onPatchSnap={props.onPatchSnap}
              onSave={props.onSave}
              chatOpts={props.chatOpts}
              onSyncModels={props.onSyncModels}
              chatListLoading={props.chatListLoading}
              chatListErr={props.chatListErr}
              modelCatalog={props.modelCatalog}
              chatTest={props.chatTest}
              chatTesting={props.chatTesting}
              onTestConnection={props.onTestConnection}
              showSetupBanner={props.showSetupBanner}
              onLaunchFromSetup={props.onLaunchFromSetup}
            />
          </div>
        </SettingsCollapsible>

        <SettingsCollapsible
          title="Audio"
          description="Speech-to-text, mic, and listen language."
          icon={Mic}
          forceOpen={sectionOpen('speech', props)}
          className="settings-advance-section"
        >
          <div className="px-1 pb-1">
            <SpeechSettingsPanel
              embedded
              snap={props.snap}
              audioEnabled={props.audioEnabled}
              onAudioEnabledChange={props.onAudioEnabledChange}
              micSensitivity={props.micSensitivity}
              onMicSensitivityChange={props.onMicSensitivityChange}
              sttModeUi={props.sttModeUi}
              onSttModeChange={props.onSttModeChange}
              sttCapableMeta={props.sttCapableMeta}
              sttProvider={props.sttProvider}
              onSttProviderChange={props.onSttProviderChange}
              currentSttMeta={props.currentSttMeta}
              sttKeyField={props.sttKeyField}
              sttKeySaved={props.sttKeySaved}
              sttSecretInput={props.sttSecretInput}
              onSttSecretInputChange={props.onSttSecretInputChange}
              onSaveSttKey={props.onSaveSttKey}
              keySetMap={props.keySetMap}
              onSaveKey={props.onSaveKey}
              onPatchSnap={props.onPatchSnap}
              onSave={props.onSave}
              meetingListenLanguageUi={props.meetingListenLanguageUi}
              onMeetingListenLanguageChange={props.onMeetingListenLanguageChange}
            />
          </div>
        </SettingsCollapsible>

        <SettingsCollapsible
          title="Phone"
          description="Phone Link companion and Android USB mirror."
          icon={Smartphone}
          forceOpen={sectionOpen('phone', props)}
          className="settings-advance-section"
        >
          <div className="px-1 pb-1">
            <PhoneLinkSettingsPanel
              embedded
              phoneLinkEnabled={props.phoneLinkEnabled}
              onPhoneLinkEnabledChange={props.onPhoneLinkEnabledChange}
              phoneLinkRemoteMicEnabled={props.phoneLinkRemoteMicEnabled}
              onPhoneLinkRemoteMicChange={props.onPhoneLinkRemoteMicChange}
              phoneMirrorDeviceId={props.phoneMirrorDeviceId}
              onPhoneMirrorDeviceIdChange={props.onPhoneMirrorDeviceIdChange}
              phoneMirrorMaxSize={props.phoneMirrorMaxSize}
              onPhoneMirrorMaxSizeChange={props.onPhoneMirrorMaxSizeChange}
              phoneMirrorIncludeInAsk={props.phoneMirrorIncludeInAsk}
              onPhoneMirrorIncludeInAskChange={props.onPhoneMirrorIncludeInAskChange}
            />
          </div>
        </SettingsCollapsible>

        <SettingsCollapsible
          title="Intelligence"
          description="Smart routing, memory, and meeting-aware features."
          icon={Brain}
          forceOpen={sectionOpen('intelligence', props)}
          className="settings-advance-section"
        >
          <div className="px-1 pb-1">
            <IntelligenceSettingsPanel
              embedded
              snap={props.snap}
              onPatchSnap={props.onPatchSnap}
              onSave={props.onSave}
              intelligenceFlags={props.intelligenceFlags}
              advancedGroupOrder={props.advancedGroupOrder}
              hindsightApiUrl={props.hindsightApiUrl}
              onHindsightApiUrlChange={props.onHindsightApiUrlChange}
              onHindsightApiUrlBlur={props.onHindsightApiUrlBlur}
              hindsightApiKey={props.hindsightApiKey}
              onHindsightApiKeyChange={props.onHindsightApiKeyChange}
              onSaveHindsightApiKey={props.onSaveHindsightApiKey}
              hindsightKeySaved={props.hindsightKeySaved}
              onHindsightAutoStartChange={props.onHindsightAutoStartChange}
            />
          </div>
        </SettingsCollapsible>

        <SettingsCollapsible
          title="Overlay"
          description="Reading modes and custom panel dimensions."
          icon={Monitor}
          forceOpen={sectionOpen('overlay', props)}
          className="settings-advance-section"
        >
          <div className="px-1 pb-1">
            <OverlayAdvancePanel
              overlayTeleprompterUi={props.overlayTeleprompterUi}
              onTeleprompterChange={props.onTeleprompterChange}
              overlayFocusModeUi={props.overlayFocusModeUi}
              onFocusModeChange={props.onFocusModeChange}
              overlayW={props.overlayW}
              overlayH={props.overlayH}
              onOverlayWChange={props.onOverlayWChange}
              onOverlayHChange={props.onOverlayHChange}
              onApplyOverlaySize={props.onApplyOverlaySize}
            />
          </div>
        </SettingsCollapsible>
      </div>
    </SettingsPage>
  )
}
