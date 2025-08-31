# 🎬 동영상 자막 추출기

**100% 무료 · 완전 오프라인 · 개인정보 보호**

일본어 동영상에서 자막을 추출하고 한국어로 번역하는 무료 데스크톱 애플리케이션입니다.

## ✨ 주요 기능

- 🎥 **동영상 → 자막**: MP4, AVI, MKV 등 모든 동영상 형식 지원
- 🎤 **음성 인식**: OpenAI Whisper 로컬 모델 사용 (인터넷 불필요)
- 🌐 **자동 번역**: 일본어 → 한국어 무료 번역
- 💾 **SRT 출력**: 모든 플레이어와 호환되는 표준 자막 형식
- 🔒 **완전 프라이빗**: 모든 처리가 로컬에서 진행, 데이터 유출 없음

## 💰 완전 무료

- ❌ API 비용 없음
- ❌ 구독료 없음  
- ❌ 사용량 제한 없음
- ❌ 광고 없음
- ✅ 평생 무료 사용

## 🚀 빠른 시작

### 시스템 요구사항

- **운영체제**: Windows 10+ / macOS 10.15+ / Linux
- **메모리**: 최소 8GB RAM (16GB 권장)
- **저장공간**: 5GB (모델 파일 포함)
- **프로세서**: 64비트 CPU (멀티코어 권장)

### 설치 방법

1. **Node.js 설치** (18.0.0 이상)
   ```bash
   # Windows: https://nodejs.org 에서 다운로드
   # macOS: 
   brew install node
   # Linux:
   sudo apt install nodejs npm
   ```

2. **Python 설치** (3.8.0 이상)
   ```bash
   # Windows: https://python.org 에서 다운로드
   # macOS:
   brew install python
   # Linux:
   sudo apt install python3 python3-pip
   ```

3. **의존성 설치**
   ```bash
   npm install
   ```

4. **Python 라이브러리 설치**
   ```bash
   pip install torch transformers sentencepiece
   ```

### 개발 모드 실행

```bash
# 개발 서버 시작
npm run dev

# 별도 터미널에서 Electron 앱 실행
npm start
```

### 배포판 빌드

```bash
# 전체 빌드
npm run build

# 배포 패키지 생성
npm run dist
```

## 📖 사용 방법

### 1단계: 동영상 선택
- 앱에서 동영상 파일을 드래그앤드롭하거나 "파일 선택" 버튼 클릭
- 지원 형식: MP4, AVI, MKV, MOV, WMV, FLV, WebM

### 2단계: 설정 조정
- **음성 인식 모델**: 속도와 품질 중 선택
  - Tiny: 가장 빠름, 기본 품질
  - Base: 권장 (좋은 품질, 적당한 속도)
  - Large: 최고 품질, 가장 느림
- **언어 설정**: 음성 언어와 번역 언어 선택

### 3단계: 처리 시작
- "자막 추출 시작" 버튼 클릭
- 처리 과정 실시간 모니터링
- 완료되면 자막 파일 자동 저장

## 📁 프로젝트 구조

```
translate/
├── src/
│   ├── main/           # Electron 메인 프로세스
│   │   ├── services/   # 핵심 서비스 (FFmpeg, Whisper, 번역)
│   │   ├── main.ts     # 메인 엔트리 포인트
│   │   └── preload.ts  # 보안 브릿지
│   ├── renderer/       # React UI
│   │   ├── components/ # UI 컴포넌트
│   │   ├── styles/     # CSS 스타일
│   │   └── App.tsx     # 메인 앱 컴포넌트
│   └── shared/         # 공통 타입 정의
├── models/             # AI 모델 파일 저장소
├── package.json        # 의존성 및 스크립트
└── README.md          # 이 파일
```

## 🔧 기술 스택

### 프론트엔드
- **Electron**: 크로스플랫폼 데스크톱 앱
- **React**: 사용자 인터페이스
- **TypeScript**: 타입 안정성

### 백엔드 처리
- **FFmpeg**: 동영상/오디오 처리
- **OpenAI Whisper**: 음성 인식 (로컬 실행)
- **Helsinki-NLP Opus-MT**: 번역 모델

### 모든 기술이 오픈소스이며 무료입니다!

## ⚡ 성능 최적화

### 하드웨어별 권장 설정

| 시스템 사양 | 권장 모델 | 4시간 동영상 처리 시간 |
|------------|----------|---------------------|
| 8GB RAM | Whisper Tiny | ~1시간 |
| 16GB RAM | Whisper Base | ~1.5시간 |
| 32GB RAM | Whisper Medium | ~2시간 |
| 64GB RAM+ | Whisper Large | ~3시간 |

### 처리 속도 향상 팁
- SSD 저장공간 사용
- 처리 중 다른 프로그램 종료
- 충분한 메모리 확보
- 멀티코어 CPU 활용

## 🐛 문제 해결

### 자주 발생하는 문제

**Q: 모델 다운로드가 실패해요**
- A: 인터넷 연결 확인 후 재시도하세요. 방화벽이 차단하고 있을 수 있습니다.

**Q: 처리 시간이 너무 오래 걸려요**
- A: 더 작은 모델 (Tiny 또는 Base)을 사용해보세요.

**Q: 음성 인식 정확도가 낮아요**
- A: 더 큰 모델 (Medium 또는 Large)을 사용하거나, 음성 언어 설정을 확인하세요.

**Q: 번역 품질이 아쉬워요**
- A: 현재는 기본 번역 모델을 사용합니다. 향후 업데이트에서 더 좋은 모델을 추가할 예정입니다.

### 로그 파일 위치
- Windows: `%APPDATA%/video-subtitle-extractor/logs/`
- macOS: `~/Library/Logs/video-subtitle-extractor/`
- Linux: `~/.local/share/video-subtitle-extractor/logs/`

## 🤝 기여하기

이 프로젝트는 오픈소스입니다! 기여를 환영합니다.

1. Fork 이 저장소
2. 새 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 Push (`git push origin feature/amazing-feature`)  
5. Pull Request 생성

## 📄 라이센스

MIT License - 자유롭게 사용, 수정, 배포하세요!

## 🙏 감사의 말

이 프로젝트는 다음 오픈소스 프로젝트들 덕분에 가능했습니다:

- [OpenAI Whisper](https://github.com/openai/whisper) - 음성 인식
- [FFmpeg](https://ffmpeg.org/) - 동영상 처리  
- [Helsinki-NLP](https://huggingface.co/Helsinki-NLP) - 번역 모델
- [Electron](https://electronjs.org/) - 데스크톱 앱 프레임워크

---

**💫 즐거운 자막 추출하세요!**

문의사항이나 버그 리포트는 Issues에 남겨주세요. 🐛