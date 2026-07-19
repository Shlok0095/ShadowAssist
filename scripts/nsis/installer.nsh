; Custom NSIS hooks for one-click install: kill running app + branded Start Menu icon.
; Desktop shortcut is created by electron-builder (createDesktopShortcut: true).

!macro customInit
  ExecWait 'taskkill /F /IM "${APP_EXECUTABLE_FILENAME}" /T' $0
!macroend

!macro resolveSaIconPath UNIQ
  StrCpy $R9 ""
  IfFileExists "$INSTDIR\app.ico" sa_res_root_${UNIQ}
  IfFileExists "$INSTDIR\resources\app.ico" sa_res_res_${UNIQ}
  Goto sa_res_done_${UNIQ}
sa_res_root_${UNIQ}:
  StrCpy $R9 "$INSTDIR\app.ico"
  Goto sa_res_done_${UNIQ}
sa_res_res_${UNIQ}:
  StrCpy $R9 "$INSTDIR\resources\app.ico"
sa_res_done_${UNIQ}:
!macroend

!macro customInstall
  Push $R9
  !insertmacro resolveSaIconPath ci
  StrCmp $R9 "" sa_ci_pop
  IfFileExists "$newStartMenuLink" 0 sa_ci_pop
  CreateShortCut "$newStartMenuLink" "$appExe" "" "$R9" 0 "" "" ""
  WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
sa_ci_pop:
  Pop $R9
!macroend

!macro customUnInstall
  ExecWait 'taskkill /F /IM "${APP_EXECUTABLE_FILENAME}" /T' $0
  IfFileExists "$DESKTOP\${SHORTCUT_NAME}.lnk" +1 desktop_shortcut_done
  WinShell::UninstShortcut "$DESKTOP\${SHORTCUT_NAME}.lnk"
  Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
desktop_shortcut_done:
!macroend
