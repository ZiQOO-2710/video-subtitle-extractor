@echo off
chcp 65001 > nul
title 동영상 자막 추출기 - 시작

echo.
echo ██████╗ ██╗   ██╗██████╗ ████████╗██╗████████╗██╗     ███████╗
echo ██╔═══██╗██║   ██║██╔══██╗╚══██╔══╝██║╚══██╔══╝██║     ██╔════╝ 
echo ██║   ██║██║   ██║██████╔╝   ██║   ██║   ██║   ██║     █████╗   
echo ██║   ██║██║   ██║██╔══██╗   ██║   ██║   ██║   ██║     ██╔══╝   
echo ╚██████╔╝╚██████╔╝██████╔╝   ██║   ██║   ██║   ███████╗███████╗ 
echo  ╚═════╝  ╚═════╝ ╚═════╝    ╚═╝   ╚═╝   ╚═╝   ╚══════╝╚══════╝ 
echo.
echo 🎬 동영상 자막 추출기 - 100%% 무료 오프라인
echo.

REM 관리자 권한 확인
net session >nul 2>&1
if %errorlevel% == 0 (
    echo ⚠️ 관리자 권한으로 실행 중입니다.
    echo 일반 사용자 권한으로 실행하는 것을 권장합니다.
    echo.
)

REM Node.js 설치 확인
echo 🔍 시스템 요구사항 확인 중...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js가 설치되지 않았습니다.
    echo 📖 https://nodejs.org 에서 LTS 버전을 다운로드하여 설치하세요.
    echo.
    echo 설치 후 컴퓨터를 재시작하고 다시 실행해주세요.
    echo 아무 키나 누르면 종료됩니다...
    pause >nul
    exit /b 1
)

REM Python 설치 확인  
python --version >nul 2>&1 || python3 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python이 설치되지 않았습니다.
    echo 📖 https://python.org 에서 Python 3.8+ 버전을 다운로드하여 설치하세요.
    echo 설치 시 "Add Python to PATH" 옵션을 체크해주세요.
    echo.
    echo 설치 후 컴퓨터를 재시작하고 다시 실행해주세요.
    echo 아무 키나 누르면 종료됩니다...
    pause >nul
    exit /b 1
)

echo ✅ Node.js와 Python이 설치되어 있습니다.
echo.

REM 의존성 설치 확인
if not exist "node_modules" (
    echo 📦 필요한 패키지들을 설치합니다... (최초 1회)
    echo 잠시만 기다려주세요...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ 패키지 설치에 실패했습니다.
        echo 인터넷 연결을 확인하고 다시 시도해주세요.
        pause
        exit /b 1
    )
    echo ✅ 패키지 설치 완료
    echo.
)

REM Python 패키지 설치
echo 🐍 Python 패키지 확인 중...
python -c "import torch, transformers, sentencepiece" >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Python 패키지를 설치합니다...
    pip install torch transformers sentencepiece accelerate
    if %errorlevel% neq 0 (
        echo ⚠️ 일부 Python 패키지 설치에 실패했을 수 있습니다.
        echo 앱 실행 중에 자동으로 다시 시도됩니다.
    ) else (
        echo ✅ Python 패키지 설치 완료
    )
    echo.
)

REM 모델 폴더 생성
if not exist "models" mkdir models

REM 앱 빌드 (개발 모드)
echo 🔨 앱을 시작합니다...
echo.
echo 💡 처음 실행 시 AI 모델 다운로드로 인해 시간이 걸릴 수 있습니다.
echo 💡 모델은 한 번만 다운로드되며, 이후 오프라인으로 사용 가능합니다.
echo.

REM 개발 모드로 실행
start "Webpack Dev Server" cmd /c "npm run dev:renderer"
timeout /t 5 /nobreak >nul

REM 메인 앱 실행
echo 🚀 동영상 자막 추출기를 시작합니다!
npm run dev:main
if %errorlevel% neq 0 (
    echo.
    echo ❌ 앱 시작에 실패했습니다.
    echo 오류가 지속되면 다음을 시도해보세요:
    echo 1. 컴퓨터 재시작
    echo 2. 바이러스 백신 소프트웨어 일시 중지  
    echo 3. 관리자 권한으로 실행
    echo.
    pause
)

echo.
echo 👋 동영상 자막 추출기를 이용해 주셔서 감사합니다!
echo 문의사항이 있으시면 GitHub Issues에 남겨주세요.
pause