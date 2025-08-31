#!/usr/bin/env node

/**
 * 초기 설정 스크립트
 * 필요한 모델과 바이너리를 다운로드합니다
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');

class SetupManager {
  constructor() {
    this.modelsDir = path.join(__dirname, '../models');
    this.binDir = path.join(__dirname, '../bin');
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.modelsDir, this.binDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ 디렉토리 생성: ${dir}`);
      }
    });
  }

  /**
   * Whisper 모델 다운로드
   */
  async downloadWhisperModel(modelSize = 'base') {
    const modelFileName = `ggml-${modelSize}.bin`;
    const modelPath = path.join(this.modelsDir, modelFileName);
    
    if (fs.existsSync(modelPath)) {
      console.log(`✅ ${modelFileName} 이미 존재함`);
      return;
    }

    console.log(`📥 Whisper ${modelSize} 모델 다운로드 시작...`);
    
    const modelUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${modelFileName}`;
    
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(modelPath);
      
      https.get(modelUrl, (response) => {
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          const progress = (downloadedSize / totalSize * 100).toFixed(1);
          process.stdout.write(`\r진행률: ${progress}%`);
        });

        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`\n✅ ${modelFileName} 다운로드 완료`);
          resolve();
        });
        
        file.on('error', (err) => {
          fs.unlink(modelPath, () => {}); // 실패한 파일 삭제
          reject(err);
        });
      }).on('error', reject);
    });
  }

  /**
   * Python 패키지 설치
   */
  async installPythonPackages() {
    console.log('📦 Python 패키지 설치 중...');
    
    const packages = [
      'torch',
      'transformers==4.35.0',
      'sentencepiece',
      'accelerate',
      'datasets'
    ];

    return new Promise((resolve, reject) => {
      const pip = spawn('pip', ['install', ...packages], { stdio: 'inherit' });
      
      pip.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Python 패키지 설치 완료');
          resolve();
        } else {
          reject(new Error(`Python 패키지 설치 실패 (코드: ${code})`));
        }
      });
    });
  }

  /**
   * 번역 모델 다운로드 테스트
   */
  async testTranslationModel() {
    console.log('🧪 번역 모델 테스트 중...');
    
    const testScript = `
import os
from transformers import MarianMTModel, MarianTokenizer

try:
    model_name = "Helsinki-NLP/opus-mt-ja-ko"
    tokenizer = MarianTokenizer.from_pretrained(model_name)
    model = MarianMTModel.from_pretrained(model_name)
    
    # 간단한 번역 테스트
    test_text = "こんにちは"
    inputs = tokenizer(test_text, return_tensors="pt", padding=True)
    translated = model.generate(**inputs)
    result = tokenizer.decode(translated[0], skip_special_tokens=True)
    
    print(f"번역 테스트 성공: '{test_text}' -> '{result}'")
    
except Exception as e:
    print(f"번역 모델 테스트 실패: {e}")
    exit(1)
`;

    const scriptPath = path.join(this.modelsDir, 'test_translation.py');
    fs.writeFileSync(scriptPath, testScript);

    return new Promise((resolve, reject) => {
      const python = spawn('python', [scriptPath], { stdio: 'inherit' });
      
      python.on('close', (code) => {
        fs.unlinkSync(scriptPath); // 테스트 스크립트 삭제
        
        if (code === 0) {
          console.log('✅ 번역 모델 테스트 통과');
          resolve();
        } else {
          reject(new Error(`번역 모델 테스트 실패 (코드: ${code})`));
        }
      });
    });
  }

  /**
   * 시스템 요구사항 체크
   */
  checkSystemRequirements() {
    console.log('🔍 시스템 요구사항 확인 중...');
    
    // Node.js 버전 체크
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      console.error('❌ Node.js 18.0.0 이상이 필요합니다. 현재 버전:', nodeVersion);
      return false;
    }
    console.log('✅ Node.js 버전:', nodeVersion);

    // 메모리 체크
    const totalMem = require('os').totalmem();
    const totalGB = (totalMem / (1024**3)).toFixed(1);
    
    if (totalMem < 8 * 1024**3) {
      console.warn('⚠️ 8GB 이상의 RAM을 권장합니다. 현재:', totalGB + 'GB');
    } else {
      console.log('✅ 시스템 메모리:', totalGB + 'GB');
    }

    return true;
  }

  /**
   * 전체 설정 실행
   */
  async runSetup() {
    console.log('🚀 동영상 자막 추출기 설정 시작\n');

    try {
      // 1. 시스템 요구사항 체크
      if (!this.checkSystemRequirements()) {
        throw new Error('시스템 요구사항을 만족하지 않습니다');
      }

      // 2. Python 패키지 설치
      await this.installPythonPackages();

      // 3. 기본 Whisper 모델 다운로드
      await this.downloadWhisperModel('base');

      // 4. 번역 모델 테스트
      await this.testTranslationModel();

      console.log('\n🎉 설정이 완료되었습니다!');
      console.log('\n다음 명령어로 앱을 실행하세요:');
      console.log('  npm run dev    # 개발 모드');
      console.log('  npm start      # 프로덕션 모드');

    } catch (error) {
      console.error('\n❌ 설정 중 오류 발생:', error.message);
      console.log('\n문제 해결 방법:');
      console.log('  1. Python 3.8+ 설치 확인');
      console.log('  2. 인터넷 연결 확인');
      console.log('  3. 충분한 디스크 공간 확보 (~5GB)');
      process.exit(1);
    }
  }
}

// 스크립트가 직접 실행될 때만 실행
if (require.main === module) {
  const setup = new SetupManager();
  setup.runSetup();
}

module.exports = SetupManager;