import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const appPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'renderer', 'settings', 'App.jsx')
let lines = fs.readFileSync(appPath, 'utf8').split(/\r?\n/)

const profileStart = lines.findIndex((l) => l.includes("{activeTab === 'profile'"))
const mainEnd = lines.findIndex((l) => l.includes('</main>'))
if (profileStart < 0 || mainEnd < 0) {
  console.error('markers not found', profileStart, mainEnd)
  process.exit(1)
}

const insert = `          <SettingsTabContent
            activeTab={activeTab}
            snap={snap}
            providerMeta={providerMeta}
            provider={provider}
            onSelectProvider={selectChatProvider}
            keySetMap={keySetMap}
            secretByProvider={secretByProvider}
            setSecretByProvider={setSecretByProvider}
            onSaveKey={saveKey}
            chatVendor={chatVendor}
            chatKf={chatKf}
            chatKeySaved={chatKeySaved}
            chatMf={chatMf}
            chatModel={chatModel}
            onPatchSnap={patchSnap}
            onSave={save}
            chatOpts={chatOpts}
            onSyncModels={syncRemoteModelsFor}
            chatListLoading={chatListLoading}
            chatListErr={chatListErr}
            modelCatalog={modelCatalog}
            chatTest={chatTest}
            chatTesting={chatTesting}
            onTestConnection={testApiFor}
            answerStyleUi={answerStyleUi}
            onAnswerStyleChange={applyAnswerStyle}
            showSetupBanner={showSetupBanner}
            onLaunchFromSetup={launchFromSetup}
            audioEnabled={audioEnabled}
            onAudioEnabledChange={(v) => { setAudioEnabled(v); save('audioEnabled', v) }}
            micSensitivity={micSensitivity}
            onMicSensitivityChange={(v) => { setMicSensitivity(v); save('micSensitivity', v) }}
            sttModeUi={sttModeUi}
            onSttModeChange={(id) => { setSttModeUi(id); save('sttMode', id) }}
            sttCapableMeta={sttCapableMeta}
            sttProvider={sttProvider}
            onSttProviderChange={(id) => { setSttProvider(id); save('sttProvider', id) }}
            currentSttMeta={currentSttMeta}
            sttKeyField={sttKeyField}
            sttKeySaved={sttKeySaved}
            sttSecretInput={sttSecretInput}
            onSttSecretInputChange={setSttSecretInput}
            onSaveSttKey={() => { if (sttKeyField && sttSecretInput.trim()) { saveKey(sttKeyField, sttSecretInput); setSttSecretInput('') } }}
            overlayOpacityUi={overlayOpacityUi}
            onOverlayOpacityChange={applyOverlayOpacity}
            onOpacityPreset={applyOpacityPreset}
            overlayFontUi={overlayFontUi}
            onOverlayFontChange={applyOverlayFont}
            overlayTeleprompterUi={overlayTeleprompterUi}
            onTeleprompterChange={applyOverlayTeleprompter}
            overlayFocusModeUi={overlayFocusModeUi}
            onFocusModeChange={applyOverlayFocusMode}
            overlayAnswerViewUi={overlayAnswerViewUi}
            onAnswerViewChange={applyOverlayAnswerView}
            stealthModeUi={stealthModeUi}
            onStealthModeChange={applyStealthMode}
            overlayW={overlayW}
            overlayH={overlayH}
            onOverlayWChange={setOverlayW}
            onOverlayHChange={setOverlayH}
            onApplyOverlaySize={applyOverlaySize}
            onSnapOverlayPreset={snapOverlayToPreset}
            uiAccentId={uiAccentId}
            onAccentChange={applyUiAccent}
            hotkeysMap={hotkeysMap}
            onHotkeyChange={(action, v) => setHotkeysMap((m) => ({ ...m, [action]: v }))}
            onHotkeyCommit={commitHotkey}
            onResetOneHotkey={resetOneHotkey}
            onResetAllHotkeys={resetAllHotkeys}
            googleCalendarConnectedEmail={googleCalendarConnectedEmail}
            googleCalendarOAuthReady={googleCalendarOAuthReady}
            googleCalendarUsingEmbeddedOAuth={googleCalendarUsingEmbeddedOAuth}
            googleCalendarClientId={googleCalendarClientId}
            googleCalendarClientSecret={googleCalendarClientSecret}
            onGoogleCalendarClientIdChange={setGoogleCalendarClientId}
            onGoogleCalendarClientSecretChange={setGoogleCalendarClientSecret}
            onSaveGoogleCalendarOAuth={saveGoogleCalendarOAuth}
            calendarConnectBusy={calendarConnectBusy}
            calendarErr={calendarErr}
            onConnectGoogleCalendar={connectGoogleCalendar}
            onCancelGoogleCalendarConnect={cancelGoogleCalendarConnect}
            onDisconnectGoogleCalendar={disconnectGoogleCalendar}
            onRefreshCalendarMeetings={refreshCalendarMeetings}
            calendarEventsLoading={calendarEventsLoading}
            calendarRemindersEnabled={calendarRemindersEnabled}
            onCalendarRemindersEnabledChange={(v) => { setCalendarRemindersEnabled(v); save('calendarRemindersEnabled', v) }}
            calendarReminderMinutes={calendarReminderMinutes}
            onCalendarReminderMinutesChange={(v) => { setCalendarReminderMinutes(v); save('calendarReminderMinutes', v) }}
            meetingForegroundDetectionEnabled={meetingForegroundDetectionEnabled}
            onMeetingForegroundDetectionChange={(v) => { setMeetingForegroundDetectionEnabled(v); save('meetingForegroundDetectionEnabled', v) }}
            calendarMeetings={calendarMeetings}
            availableDateKeys={availableDateKeys}
            effectiveDateKey={effectiveDateKey}
            selectedCalendarDate={selectedCalendarDate}
            onSelectedCalendarDateChange={setSelectedCalendarDate}
            meetingsForSelectedDate={meetingsForSelectedDate}
            meetingSessions={meetingSessions}
            expandedMeetingId={expandedMeetingId}
            onExpandedMeetingIdChange={setExpandedMeetingId}
            onMeetingSessionsChange={setMeetingSessions}
            logoSrc={logoSrc}
            appVersion={appVersion}
            profilePanel={{
              contextPrompts,
              activeContextPromptId,
              activePrompt,
              draftName,
              draftContent,
              draftNotesSections,
              onDraftNotesSectionsChange: setDraftNotesSections,
              contextIndexing,
              uploadBusy,
              showTemplates: showModeTemplates,
              resumeContext,
              jdContext,
              resumeSourceName,
              profileDocBusy,
              onDraftNameChange: setDraftName,
              onDraftContentChange: setDraftContent,
              onSelectPrompt: selectContextPrompt,
              onAddEmptyMode: addContextPrompt,
              onAddFromTemplate: addModeFromTemplate,
              onDeletePrompt: deletePromptById,
              onSavePrompt: saveActivePrompt,
              onUploadFile: uploadReferenceFile,
              onRemoveFile: removeReferenceFile,
              onToggleTemplates: () => setShowModeTemplates((v) => !v),
              onResumeChange: setResumeContext,
              onResumeBlur: () => void saveResumeContext(resumeContext, resumeSourceName),
              onJdChange: setJdContext,
              onJdBlur: () => void saveJdContext(jdContext),
              onUploadResume: () => void uploadProfileDoc('resume'),
              onUploadJd: () => void uploadProfileDoc('jd'),
              onClearResume: () => void saveResumeContext('', ''),
              onClearJd: () => void saveJdContext(''),
            }}
          />`

const newLines = [...lines.slice(0, profileStart), insert, ...lines.slice(mainEnd)]
fs.writeFileSync(appPath, newLines.join('\n'))
console.log('patched App.jsx tab content')
