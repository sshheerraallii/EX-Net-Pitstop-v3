; electron-builder already creates the main "Extreme Agent One" shortcuts
; (desktop + start menu) that open the game. This adds a second pair that
; open the same executable straight to the spectator leaderboard, for the
; second screen at the booth.

!macro customInstall
  CreateShortCut "$DESKTOP\${PRODUCT_NAME} - Leaderboard.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--view=leaderboard" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME} - Leaderboard.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--view=leaderboard" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
!macroend

!macro customUnInstall
  Delete "$DESKTOP\${PRODUCT_NAME} - Leaderboard.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME} - Leaderboard.lnk"
!macroend
