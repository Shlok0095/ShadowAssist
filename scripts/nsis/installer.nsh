; Custom NSIS: desktop shortcut only if the user checks the box on the finish page.
; Requires nsis.createDesktopShortcut = false so the install section does not create it early.
; customUnInstall removes the shortcut because DO_NOT_CREATE_DESKTOP_SHORTCUT disables the stock uninstall cleanup.

!macro customFinishPage
  ; Finish-page checkbox: optional desktop shortcut with SA icon (not created unless user ticks this).
  !define MUI_FINISHPAGE_SHOWREADME ""
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Create a desktop icon (shortcut)"
  !define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION ShadowAssist_FinishPage_CreateDesktopShortcut

  Function ShadowAssist_FinishPage_CreateDesktopShortcut
    IfFileExists "$INSTDIR\${APP_EXECUTABLE_FILENAME}" +1 done
    ; Prefer packaged app.ico so the shortcut shows SA branding even if the exe still has the default Electron icon.
    IfFileExists "$INSTDIR\resources\app.ico" use_ico
    CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 "" "" "${APP_DESCRIPTION}"
    Goto sa_shortcut_done
  use_ico:
    CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\resources\app.ico" 0 "" "" "${APP_DESCRIPTION}"
  sa_shortcut_done:
    WinShell::SetLnkAUMI "$DESKTOP\${SHORTCUT_NAME}.lnk" "${APP_ID}"
  done:
  FunctionEnd

  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customUnInstall
  IfFileExists "$DESKTOP\${SHORTCUT_NAME}.lnk" +1 desktop_shortcut_done
  WinShell::UninstShortcut "$DESKTOP\${SHORTCUT_NAME}.lnk"
  Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
desktop_shortcut_done:
!macroend
