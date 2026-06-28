// Copyright (c) 2026 VeilAssist. All rights reserved.

import React from 'react'
import ProfileModesPanel from './ProfileModesPanel'
import PersonalBackgroundSection from './PersonalBackgroundSection'
import AiProviderPanel from './AiProviderPanel'
import SpeechSettingsPanel from './SpeechSettingsPanel'
import DisplaySettingsPanel from './DisplaySettingsPanel'
import MeetingsSettingsPanel from './MeetingsSettingsPanel'
import PrivacySettingsPanel from './PrivacySettingsPanel'
import AboutSettingsPanel from './AboutSettingsPanel'
import KeybindsSettingsPanel from './KeybindsSettingsPanel'
import HelpSettingsPanel from './HelpSettingsPanel'
import IntelligenceSettingsPanel from './IntelligenceSettingsPanel'
import SkillsSettingsPanel from './SkillsSettingsPanel'
import PhoneLinkSettingsPanel from './PhoneLinkSettingsPanel'

export default function SettingsTabContent(props) {
  const { activeTab } = props

  if (activeTab === 'profile') {
    const panel = props.profilePanel || {}
    return (
      <div className="animate-fade-in space-y-5">
        <ProfileModesPanel {...panel} />
        <PersonalBackgroundSection
          resumeContext={panel.resumeContext}
          jdContext={panel.jdContext}
          resumeSourceName={panel.resumeSourceName}
          profileDocBusy={panel.profileDocBusy}
          onResumeChange={panel.onResumeChange}
          onResumeBlur={panel.onResumeBlur}
          onJdChange={panel.onJdChange}
          onJdBlur={panel.onJdBlur}
          onUploadResume={panel.onUploadResume}
          onUploadJd={panel.onUploadJd}
          onClearResume={panel.onClearResume}
          onClearJd={panel.onClearJd}
        />
      </div>
    )
  }

  if (activeTab === 'skills') {
    return <SkillsSettingsPanel />
  }

  if (activeTab === 'ai') {
    return (
      <AiProviderPanel
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
        answerStyleUi={props.answerStyleUi}
        onAnswerStyleChange={props.onAnswerStyleChange}
        aiResponseLanguageUi={props.aiResponseLanguageUi}
        onAiResponseLanguageChange={props.onAiResponseLanguageChange}
        showSetupBanner={props.showSetupBanner}
        onLaunchFromSetup={props.onLaunchFromSetup}
      />
    )
  }

  if (activeTab === 'speech') {
    return (
      <SpeechSettingsPanel
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
      />
    )
  }

  if (activeTab === 'display') {
    return (
      <DisplaySettingsPanel
        overlayOpacityUi={props.overlayOpacityUi}
        onOverlayOpacityChange={props.onOverlayOpacityChange}
        onOpacityPreset={props.onOpacityPreset}
        overlayFontUi={props.overlayFontUi}
        onOverlayFontChange={props.onOverlayFontChange}
        overlayTeleprompterUi={props.overlayTeleprompterUi}
        onTeleprompterChange={props.onTeleprompterChange}
        overlayFocusModeUi={props.overlayFocusModeUi}
        onFocusModeChange={props.onFocusModeChange}
        overlayAnswerViewUi={props.overlayAnswerViewUi}
        onAnswerViewChange={props.onAnswerViewChange}
        overlayLiveTranscriptUi={props.overlayLiveTranscriptUi}
        onLiveTranscriptChange={props.onLiveTranscriptChange}
        overlayTranscriptAutoScrollUi={props.overlayTranscriptAutoScrollUi}
        onTranscriptAutoScrollChange={props.onTranscriptAutoScrollChange}
        overlayAnswerPinToTopUi={props.overlayAnswerPinToTopUi}
        onAnswerPinToTopChange={props.onAnswerPinToTopChange}
        openAtLoginUi={props.openAtLoginUi}
        onOpenAtLoginChange={props.onOpenAtLoginChange}
        overlayMousePassthroughUi={props.overlayMousePassthroughUi}
        onOverlayMousePassthroughChange={props.onOverlayMousePassthroughChange}
        hideFromTaskbarUi={props.hideFromTaskbarUi}
        onHideFromTaskbarChange={props.onHideFromTaskbarChange}
        uiAccentThemeUi={props.uiAccentThemeUi}
        onUiAccentThemeChange={props.onUiAccentThemeChange}
        doNotSaveMeetingsEnabled={props.doNotSaveMeetingsEnabled}
        onDoNotSaveMeetingsChange={props.onDoNotSaveMeetingsChange}
        verboseDebugLogging={props.verboseDebugLogging}
        onVerboseDebugLoggingChange={props.onVerboseDebugLoggingChange}
        onOpenLogFile={props.onOpenLogFile}
        stealthModeUi={props.stealthModeUi}
        onStealthModeChange={props.onStealthModeChange}
        overlayW={props.overlayW}
        overlayH={props.overlayH}
        onOverlayWChange={props.onOverlayWChange}
        onOverlayHChange={props.onOverlayHChange}
        onApplyOverlaySize={props.onApplyOverlaySize}
        onSnapOverlayPreset={props.onSnapOverlayPreset}
      />
    )
  }

  if (activeTab === 'keybinds') {
    return (
      <KeybindsSettingsPanel
        hotkeysMap={props.hotkeysMap}
        onHotkeyChange={props.onHotkeyChange}
        onHotkeyCommit={props.onHotkeyCommit}
        onResetOneHotkey={props.onResetOneHotkey}
        onResetAllHotkeys={props.onResetAllHotkeys}
      />
    )
  }

  if (activeTab === 'meetings') {
    return (
      <MeetingsSettingsPanel
        googleCalendarConnectedEmail={props.googleCalendarConnectedEmail}
        googleCalendarOAuthReady={props.googleCalendarOAuthReady}
        googleCalendarUsingEmbeddedOAuth={props.googleCalendarUsingEmbeddedOAuth}
        googleCalendarClientId={props.googleCalendarClientId}
        googleCalendarClientSecret={props.googleCalendarClientSecret}
        onGoogleCalendarClientIdChange={props.onGoogleCalendarClientIdChange}
        onGoogleCalendarClientSecretChange={props.onGoogleCalendarClientSecretChange}
        onSaveGoogleCalendarOAuth={props.onSaveGoogleCalendarOAuth}
        calendarConnectBusy={props.calendarConnectBusy}
        calendarErr={props.calendarErr}
        onConnectGoogleCalendar={props.onConnectGoogleCalendar}
        onCancelGoogleCalendarConnect={props.onCancelGoogleCalendarConnect}
        onDisconnectGoogleCalendar={props.onDisconnectGoogleCalendar}
        onRefreshCalendarMeetings={props.onRefreshCalendarMeetings}
        calendarEventsLoading={props.calendarEventsLoading}
        calendarRemindersEnabled={props.calendarRemindersEnabled}
        onCalendarRemindersEnabledChange={props.onCalendarRemindersEnabledChange}
        calendarReminderMinutes={props.calendarReminderMinutes}
        onCalendarReminderMinutesChange={props.onCalendarReminderMinutesChange}
        meetingForegroundDetectionEnabled={props.meetingForegroundDetectionEnabled}
        onMeetingForegroundDetectionChange={props.onMeetingForegroundDetectionChange}
        calendarMeetings={props.calendarMeetings}
        availableDateKeys={props.availableDateKeys}
        effectiveDateKey={props.effectiveDateKey}
        selectedCalendarDate={props.selectedCalendarDate}
        onSelectedCalendarDateChange={props.onSelectedCalendarDateChange}
        meetingsForSelectedDate={props.meetingsForSelectedDate}
        meetingSessions={props.meetingSessions}
        expandedMeetingId={props.expandedMeetingId}
        onExpandedMeetingIdChange={props.onExpandedMeetingIdChange}
        onMeetingSessionsChange={props.onMeetingSessionsChange}
        followUpDraftEnabled={props.followUpDraftEnabled}
      />
    )
  }

  if (activeTab === 'phone') {
    return (
      <PhoneLinkSettingsPanel
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
    )
  }

  if (activeTab === 'intelligence') {
    return (
      <IntelligenceSettingsPanel
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
    )
  }

  if (activeTab === 'privacy') {
    return (
      <PrivacySettingsPanel onSelectIntelligenceTab={() => props.onSelectTab?.('intelligence')} />
    )
  }

  if (activeTab === 'about') {
    return <AboutSettingsPanel logoSrc={props.logoSrc} appVersion={props.appVersion} />
  }

  if (activeTab === 'help') {
    return (
      <HelpSettingsPanel appVersion={props.appVersion} onSelectTab={props.onSelectTab} />
    )
  }

  return null
}
