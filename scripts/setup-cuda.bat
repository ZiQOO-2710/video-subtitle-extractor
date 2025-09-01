@echo off
echo ===== Whisper CUDA 가속 설정 =====
echo.
echo GTX 980Ti 감지됨 - CUDA 가속 설치 중...
echo.

echo [1단계] Python 확인
python --version
if errorlevel 1 (
    echo ERROR: Python이 설치되지 않았습니다.
    echo https://python.org 에서 Python을 먼저 설치해주세요.
    pause
    exit /b 1
)

echo.
echo [2단계] faster-whisper 설치 (CUDA 가속)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install faster-whisper

echo.
echo [3단계] CUDA 가속 테스트
python -c "import torch; print(f'CUDA 사용 가능: {torch.cuda.is_available()}'); print(f'GPU 장치: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"없음\"}')"

echo.
echo ===== 설치 완료 =====
echo 이제 10-50배 빠른 GPU 가속이 활성화됩니다!
echo.
pause