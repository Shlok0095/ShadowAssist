// Copyright (c) 2026 VeilAssist. Advanced settings — AI, audio, phone, intelligence.

import React from 'react'
import { Bot, Brain, Mic, Smartphone } from 'lucide-react'
import { SettingsCollapsible, SettingsPage } from './SettingsComponents'
import AiProviderPanel from './AiProviderPanel'
import SpeechSettingsPanel from './SpeechSettingsPanel'
import PhoneLinkSettingsPanel from './PhoneLinkSettingsPanel'
import IntelligenceSettingsPanel from './IntelligenceSettingsPanel'

/** @type {{ id: string, label: string }[]} */
export const ADVANCE_SECTIONS = [
  { id: 'ai', label: 'AI Providers' },
  { id: 'speech', label: 'Audio' },
  { id: 'phone', label: 'Phone' },
  { id: 'intelligence', label: 'Intelligence' },
]

export default function AdvanceSettingsPanel(props) {
  return (
    <SettingsPage
      title="Advance"
      description="AI providers, audio, phone link, and intelligence — expand each section as needed."
      wide
    >
      <div className="space-y-3">
        <SettingsCollapsible
          title="AI Providers"
          description="Chat models and API keys."
          icon={Bot}
          defaultOpen={!!props.showSetupBanner}
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

        <SettingsCollapsible title="Audio" description="Speech-to-text, mic, and listen language." icon={Mic}>
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

        <SettingsCollapsible title="Phone" description="Phone Link companion and Android USB mirror." icon={Smartphone}>
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
        >
          <div className="px-1 pb-1">
            <IntelligenceSettingsPanel
              embedded
              snap={props.snap}
              onPatchSnap={props.onPatchSnap}
              onSave={props.onSave}
              intelligenceFlags={props.intelligenceFlags}
              coreFlagKeys={props.coreFlagKeys}
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
      </div>
    </SettingsPage>
  )
}
