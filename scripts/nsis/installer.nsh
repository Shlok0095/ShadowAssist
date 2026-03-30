; Custom NSIS: desktop shortcut only if the user checks the box on the finish page.
; Requires nsis.createDesktopShortcut = false so the install section does not create it early.
; customUnInstall removes the shortcut because DO_NOT_CREATE_DESKTOP_SHORTCUT disables the stock uninstall cleanup.

!macro customFinishPage
  !define MUI_FINISHPAGE_SHOWREADME ""
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Create a desktop shortcut"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION ShadowAssist_FinishPage_CreateDesktopShortcut

  Function ShadowAssist_FinishPage_CreateDesktopShortcut
    IfFileExists "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 done
    CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 "" "" "${APP_DESCRIPTION}"
    WinShell::SetLnkAUMI "$DESKTOP\${SHORTCUT_NAME}.lnk" "${APP_ID}"
    done:
  FunctionEnd

  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customUnInstall
  IfFileExists "$DESKTOP\${SHORTCUT_NAME}.lnk" 0 +3
    WinShell::UninstShortcut "$DESKTOP\${SHORTCUT_NAME}.lnk"
    Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
!macroend
