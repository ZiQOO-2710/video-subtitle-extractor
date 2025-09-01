import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface FastWhisperOptions {
  language?: string;
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  device?: 'cuda' | 'cpu';
}

export class FastWhisper {
  private mainWindow?: Electron.BrowserWindow;

  constructor(mainWindow?: Electron.BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * CUDA 가속 음성 인식 (faster-whisper 사용)
   */
  async processAudio(audioPath: string, options: FastWhisperOptions = {}): Promise<any> {
    const {
      language = 'ja',
      model = 'base',
      device = 'cuda'  // GTX 980Ti CUDA 사용
    } = options;

    return new Promise((resolve, reject) => {
      console.log(`🚀 CUDA 가속 음성 인식 시작: ${audioPath}`);

      // Python script 실행
      const pythonScript = `
import sys
from faster_whisper import WhisperModel
import json

# CUDA 모델 로드 (GTX 980Ti 최적화 - Maxwell 아키텍처용 float32)
model = WhisperModel("${model}", device="${device}", compute_type="float32")

# 음성 인식 실행
segments, info = model.transcribe("${audioPath.replace(/\\/g, '\\\\')}", language="${language}")

# SRT 형식으로 변환
result = []
for segment in segments:
    result.append({
        "start": segment.start,
        "end": segment.end,
        "text": segment.text
    })

# 결과 출력
print(json.dumps({
    "segments": result,
    "language": info.language,
    "duration": info.duration
}))
`;

      const tempScriptPath = path.join(process.cwd(), 'temp', 'whisper_cuda.py');
      
      // 임시 디렉토리 생성
      const tempDir = path.dirname(tempScriptPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Python 스크립트 저장
      fs.writeFileSync(tempScriptPath, pythonScript);

      const pythonProcess = spawn('python', [tempScriptPath]);
      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        
        // GPU 사용률 체크 및 진행률 업데이트
        if (this.mainWindow) {
          this.mainWindow.webContents.send('progress-update', {
            stage: 'speech-recognition',
            progress: 50, // GPU 처리는 매우 빠르므로 대략적인 진행률
            message: '🚀 GPU 가속 음성 인식 중...'
          });
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        stderr += error;
        console.log('CUDA Whisper stderr:', error);
      });

      pythonProcess.on('close', (code) => {
        // 임시 파일 정리
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (err) {
          console.warn('임시 파일 정리 실패:', err);
        }

        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim());
            console.log('🎉 CUDA 가속 처리 완료!');
            resolve(result);
          } catch (error) {
            reject(new Error(`결과 파싱 실패: ${error}`));
          }
        } else {
          reject(new Error(`CUDA Whisper 실행 실패 (코드 ${code}): ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('CUDA Whisper 프로세스 오류:', error);
        reject(error);
      });
    });
  }

  /**
   * CUDA 사용 가능 여부 확인 (실제 모델 로딩 테스트)
   */
  async checkCudaAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const checkScript = `
import torch
from faster_whisper import WhisperModel
import sys

try:
    print('CUDA_AVAILABLE:' + str(torch.cuda.is_available()))
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        print('GPU_NAME:' + gpu_name)
        
        # 실제 모델 로딩 테스트 (tiny 모델로 빠른 테스트)
        print('TESTING_MODEL_LOAD')
        model = WhisperModel("tiny", device="cuda", compute_type="float32")
        print('MODEL_LOAD_SUCCESS:True')
        del model
        torch.cuda.empty_cache()
    else:
        print('MODEL_LOAD_SUCCESS:False')
except Exception as e:
    print(f'MODEL_LOAD_ERROR:{str(e)}')
    print('MODEL_LOAD_SUCCESS:False')
`;

      const tempPath = path.join(process.cwd(), 'temp', 'cuda_check.py');
      
      // 임시 디렉토리 생성
      const tempDir = path.dirname(tempPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      fs.writeFileSync(tempPath, checkScript);

      const checkProcess = spawn('python', [tempPath]);
      let output = '';
      let errorOutput = '';

      checkProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      checkProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      checkProcess.on('close', (code) => {
        try {
          fs.unlinkSync(tempPath);
        } catch (err) {
          // 임시 파일 삭제 실패 무시
        }
        
        const cudaAvailable = output.includes('CUDA_AVAILABLE:True');
        const modelLoadSuccess = output.includes('MODEL_LOAD_SUCCESS:True');
        const gpuName = output.match(/GPU_NAME:(.+)/)?.[1];
        
        if (cudaAvailable && modelLoadSuccess && gpuName) {
          console.log(`🚀 CUDA 가속 사용 가능: ${gpuName} (모델 로딩 테스트 통과)`);
          resolve(true);
        } else {
          if (cudaAvailable && !modelLoadSuccess) {
            console.log(`⚠️ CUDA는 감지되나 모델 로딩 실패: ${gpuName}`);
            if (output.includes('MODEL_LOAD_ERROR:')) {
              const errorMatch = output.match(/MODEL_LOAD_ERROR:(.+)/);
              if (errorMatch) {
                console.log(`CUDA 에러: ${errorMatch[1]}`);
              }
            }
          }
          resolve(false);
        }
      });

      checkProcess.on('error', () => {
        resolve(false);
      });
    });
  }
}