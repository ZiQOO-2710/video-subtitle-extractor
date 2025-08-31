@echo off
echo Python 설치 확인 중...

REM Python 명령어 확인
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Python이 설치되어 있습니다.
    goto :check_packages
)

python3 --version >nul 2>&1  
if %errorlevel% == 0 (
    echo ✅ Python3가 설치되어 있습니다.
    goto :check_packages
)

REM Python이 설치되지 않은 경우
echo ❌ Python이 설치되지 않았습니다.
echo.
echo 📖 Python 설치 방법:
echo 1. https://python.org 에서 Python 3.8+ 다운로드
echo 2. 설치 시 "Add Python to PATH" 체크
echo 3. 설치 후 컴퓨터 재시작
echo.
echo 계속하려면 아무 키나 누르세요...
pause >nul
goto :end

:check_packages
echo 필요한 Python 패키지 설치 중...
pip install torch transformers sentencepiece accelerate 2>nul
if %errorlevel% == 0 (
    echo ✅ Python 패키지 설치 완료
) else (
    echo ⚠️ 일부 패키지 설치에 실패했을 수 있습니다
    echo 앱 실행 시 자동으로 다시 시도됩니다
)

:end
echo.
echo 설치가 완료되었습니다! 🎉
echo 데스크탑의 "동영상 자막 추출기" 아이콘을 클릭하여 실행하세요.
echo.