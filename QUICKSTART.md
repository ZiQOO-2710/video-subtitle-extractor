# 🚀 빠른 시작 가이드

## 1️⃣ 필수 프로그램 설치 (5분)

### Node.js 설치
```bash
# 현재 버전 확인
node --version  # 18.0.0 이상 필요

# 없다면 https://nodejs.org 에서 LTS 버전 다운로드
```

### Python 설치
```bash
# 현재 버전 확인
python --version  # 3.8.0 이상 필요

# 없다면 https://python.org 에서 다운로드
```

## 2️⃣ 프로젝트 설정 (10분)

```bash
# 1. 의존성 설치
npm install

# 2. 자동 설정 실행 (모델 다운로드 포함)
npm run setup

# 설정 완료까지 약 5-10분 소요 (인터넷 속도에 따라)
```

## 3️⃣ 앱 실행 (1분)

### 개발 모드 (추천)
```bash
npm run dev
```

### 프로덕션 모드  
```bash
npm run build
npm start
```

## 4️⃣ 사용 방법

1. **동영상 드래그앤드롭** 📁
2. **설정 조정** (모델 선택, 언어 설정) ⚙️
3. **자막 추출 시작** 🚀
4. **결과 확인** ✅

---

## ⚡ 성능 팁

### 빠른 처리를 원한다면:
- **Whisper Tiny** 모델 선택
- 8GB RAM 이상 권장

### 높은 품질을 원한다면:
- **Whisper Base/Medium** 모델 선택
- 16GB RAM 이상 권장

---

## 🆘 문제 해결

### "모델을 찾을 수 없음" 오류
```bash
npm run setup  # 다시 실행
```

### "Python 패키지 없음" 오류
```bash
pip install torch transformers sentencepiece
```

### 기타 문제
1. 인터넷 연결 확인
2. 방화벽 설정 확인  
3. 디스크 공간 확인 (5GB 이상)

---

## 💡 첫 테스트 추천

1. **짧은 동영상**으로 시작 (1-5분)
2. **Tiny 모델** 사용
3. 결과 확인 후 더 큰 파일 도전

---

**🎉 준비 완료! 무료 자막 추출을 즐기세요!**