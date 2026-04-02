; Custom NSIS: desktop shortcut only if the user checks the box on the finish page.
; Requires nsis.createDesktopShortcut = false so the install section does not create it early.
; customUnInstall removes the shortcut because DO_NOT_CREATE_DESKTOP_SHORTCUT disables the stock uninstall cleanup.
;
; Stock electron-builder always sets shortcut icons to the .exe (Electron logo). We repoint to app.ico
; after files are on disk (customInstall + finish page).

; UNIQ suffix avoids duplicate labels when this macro is expanded more than once.
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

!macro customFinishPage
  ; Finish-page checkbox: optional desktop shortcut with SA icon (not created unless user ticks this).
  !define MUI_FINISHPAGE_SHOWREADME ""
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Create a desktop icon (shortcut)"
  !define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION ShadowAssist_FinishPage_CreateDesktopShortcut

  Function ShadowAssist_FinishPage_CreateDesktopShortcut
    Push $R9
    IfFileExists "$INSTDIR\${APP_EXECUTABLE_FILENAME}" sa_fp_have_exe sa_fp_cleanup
  sa_fp_have_exe:
    !insertmacro resolveSaIconPath fp
    StrCmp $R9 "" sa_fp_use_exe
    CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$R9" 0 "" "" ""
    Goto sa_fp_aumi
  sa_fp_use_exe:
    CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 "" "" ""
  sa_fp_aumi:
    WinShell::SetLnkAUMI "$DESKTOP\${SHORTCUT_NAME}.lnk" "${APP_ID}"
  sa_fp_cleanup:
    Pop $R9
  FunctionEnd

  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customUnInstall
  IfFileExists "$DESKTOP\${SHORTCUT_NAME}.lnk" +1 desktop_shortcut_done
  WinShell::UninstShortcut "$DESKTOP\${SHORTCUT_NAME}.lnk"
  Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
desktop_shortcut_done:
!macroend
