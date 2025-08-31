# Windows NSIS 설치 프로그램 커스텀 스크립트

# 관리자 권한 요청하지 않음
RequestExecutionLevel user

# 설치 시 추가 작업
!macro customInstall
  # Python 설치 확인
  ExecWait '"$INSTDIR\resources\app\scripts\check-python.bat"'
  
  # 데스크탑 바로가기 생성
  CreateShortCut "$DESKTOP\동영상 자막 추출기.lnk" "$INSTDIR\${PRODUCT_FILENAME}.exe"
  
  # 시작 메뉴에 추가
  CreateDirectory "$SMPROGRAMS\동영상 자막 추출기"
  CreateShortCut "$SMPROGRAMS\동영상 자막 추출기\동영상 자막 추출기.lnk" "$INSTDIR\${PRODUCT_FILENAME}.exe"
  CreateShortCut "$SMPROGRAMS\동영상 자막 추출기\제거.lnk" "$INSTDIR\Uninstall ${PRODUCT_FILENAME}.exe"
  
  # 파일 연결 등록 (선택사항)
  WriteRegStr HKCR ".mp4\OpenWithList\${PRODUCT_FILENAME}.exe" "" ""
  WriteRegStr HKCR ".avi\OpenWithList\${PRODUCT_FILENAME}.exe" "" ""
  WriteRegStr HKCR ".mkv\OpenWithList\${PRODUCT_FILENAME}.exe" "" ""
!macroend

# 제거 시 작업
!macro customUnInstall
  # 바로가기 제거
  Delete "$DESKTOP\동영상 자막 추출기.lnk"
  RMDir /r "$SMPROGRAMS\동영상 자막 추출기"
  
  # 레지스트리 정리
  DeleteRegKey HKCR ".mp4\OpenWithList\${PRODUCT_FILENAME}.exe"
  DeleteRegKey HKCR ".avi\OpenWithList\${PRODUCT_FILENAME}.exe"
  DeleteRegKey HKCR ".mkv\OpenWithList\${PRODUCT_FILENAME}.exe"
!macroend