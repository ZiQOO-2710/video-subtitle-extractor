#!/usr/bin/env node

/**
 * 빌드 전 준비 작업
 * 필요한 디렉토리와 파일들을 미리 생성
 */

const fs = require('fs');
const path = require('path');

console.log('📦 빌드 전 준비 작업 시작...\n');

// bin/win32 폴더 생성
const binDir = path.join(__dirname, '../bin/win32');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
  console.log('✅ bin/win32 디렉토리 생성');
}

// 기본 모델 폴더 생성
const modelsDir = path.join(__dirname, '../models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
  console.log('✅ models 디렉토리 생성');
  
  // README 파일 생성
  const readmePath = path.join(modelsDir, 'README.md');
  fs.writeFileSync(readmePath, `# AI 모델 저장소

이 폴더에는 음성 인식과 번역을 위한 AI 모델들이 저장됩니다.

## 자동 다운로드 모델들
- Whisper 음성 인식 모델 (base.bin)
- Helsinki-NLP 번역 모델

모든 모델은 첫 실행시 자동으로 다운로드됩니다.
`);
  console.log('✅ models/README.md 생성');
}

// 임시 바이너리 파일들 생성 (실제 다운로드 전까지)
const dummyFFmpeg = path.join(binDir, 'ffmpeg.exe');
const dummyWhisper = path.join(binDir, 'main.exe');

if (!fs.existsSync(dummyFFmpeg)) {
  fs.writeFileSync(dummyFFmpeg, '# Placeholder for FFmpeg executable');
  console.log('📝 임시 FFmpeg 파일 생성 (실제 파일로 교체 필요)');
}

if (!fs.existsSync(dummyWhisper)) {
  fs.writeFileSync(dummyWhisper, '# Placeholder for Whisper executable');
  console.log('📝 임시 Whisper 파일 생성 (실제 파일로 교체 필요)');
}

console.log('\n🎉 빌드 전 준비 완료!');
console.log('💡 실제 바이너리는 npm run setup-win으로 다운로드하세요.');