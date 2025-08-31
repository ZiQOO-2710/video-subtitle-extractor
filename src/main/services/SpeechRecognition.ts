import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { app } from 'electron';

export interface WhisperOptions {
  language?: string;
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  outputFormat?: 'srt' | 'vtt' | 'txt' | 'json';
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  segments: TranscriptionSegment[];
  text: string;
  language: string;
  duration: number;
}

export class SpeechRecognition {
  private modelsDir: string;
  private whisperExecutable: string;

  constructor() {
    this.modelsDir = path.join(app.getPath('userData'), 'models');
    this.whisperExecutable = this.getWhisperExecutable();
    this.ensureModelsDirectory();
  }

  private getWhisperExecutable(): string {
    const platform = process.platform;
    
    if (platform === 'win32') {
      // Windows 실행 파일 경로
      const executablePath = path.join(process.resourcesPath || __dirname, '../../../bin/win32/main.exe');
      
      if (fs.existsSync(executablePath)) {
        return executablePath;
      } else {
        // 개발 모드에서는 로컬 빌드 사용
        return path.join(__dirname, '../../../bin/win32/main.exe');
      }
    } else {
      // macOS/Linux
      const executableName = 'main';
      return path.join(__dirname, '../../bin', platform, executableName);
    }
  }

  private ensureModelsDirectory(): void {
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }
  }

  /**
   * Whisper 모델 다운로드 및 설치
   */
  async downloadModel(modelSize: string = 'base'): Promise<void> {
    const modelFileName = `ggml-${modelSize}.bin`;
    const modelPath = path.join(this.modelsDir, modelFileName);

    // 이미 존재하면 스킵
    if (fs.existsSync(modelPath)) {
      console.log(`모델 이미 존재: ${modelFileName}`);
      return;
    }

    console.log(`Whisper 모델 다운로드 시작: ${modelFileName}`);
    
    // Hugging Face에서 모델 다운로드
    const modelUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelSize}.bin`;
    
    try {
      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(`모델 다운로드 실패: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      fs.writeFileSync(modelPath, Buffer.from(buffer));
      
      console.log(`모델 다운로드 완료: ${modelFileName}`);
      
      // 진행률 업데이트
      if (global.mainWindow) {
        global.mainWindow.webContents.send('progress-update', {
          stage: 'model-download',
          progress: 100,
          message: `${modelFileName} 다운로드 완료`
        });
      }
    } catch (error) {
      console.error('모델 다운로드 실패:', error);
      throw error;
    }
  }

  /**
   * 오디오 파일을 텍스트로 변환
   */
  async processAudio(audioPath: string, options: WhisperOptions = {}): Promise<TranscriptionResult> {
    const {
      language = 'ja',  // 기본값: 일본어
      model = 'base',
      outputFormat = 'srt'
    } = options;

    // 모델이 없으면 다운로드
    await this.downloadModel(model);

    const modelPath = path.join(this.modelsDir, `ggml-${model}.bin`);
    const outputDir = path.dirname(audioPath);
    const audioFileName = path.basename(audioPath, path.extname(audioPath));
    
    return new Promise((resolve, reject) => {
      console.log(`음성 인식 시작: ${audioPath}`);
      
      const args = [
        '-m', modelPath,
        '-f', audioPath,
        '-l', language,
        '-osrt',  // SRT 포맷으로 출력
        '--output-dir', outputDir,
        '--output-file', audioFileName
      ];

      console.log('Whisper 명령어:', this.whisperExecutable, args.join(' '));

      const whisperProcess = spawn(this.whisperExecutable, args);
      let stdout = '';
      let stderr = '';

      whisperProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log('Whisper stdout:', output);

        // 진행률 파싱 시도
        const progressMatch = output.match(/progress = (\d+)%/);
        if (progressMatch) {
          const progress = parseInt(progressMatch[1]);
          if (global.mainWindow) {
            global.mainWindow.webContents.send('progress-update', {
              stage: 'speech-recognition',
              progress,
              message: `음성 인식 중... ${progress}%`
            });
          }
        }
      });

      whisperProcess.stderr.on('data', (data) => {
        const error = data.toString();
        stderr += error;
        console.error('Whisper stderr:', error);
      });

      whisperProcess.on('close', (code) => {
        console.log(`Whisper 프로세스 종료, 코드: ${code}`);
        
        if (code === 0) {
          try {
            // SRT 파일 읽기
            const srtPath = path.join(outputDir, `${audioFileName}.srt`);
            const srtContent = fs.readFileSync(srtPath, 'utf-8');
            
            // SRT를 TranscriptionResult로 변환
            const result = this.parseSrtToTranscription(srtContent);
            resolve(result);
          } catch (error) {
            console.error('SRT 파일 읽기 실패:', error);
            reject(new Error(`SRT 파일 처리 실패: ${error}`));
          }
        } else {
          reject(new Error(`Whisper 실행 실패 (코드 ${code}): ${stderr}`));
        }
      });

      whisperProcess.on('error', (error) => {
        console.error('Whisper 프로세스 오류:', error);
        reject(error);
      });
    });
  }

  /**
   * 여러 오디오 청크를 병렬로 처리
   */
  async processAudioChunks(audioPaths: string[], options: WhisperOptions = {}): Promise<TranscriptionResult> {
    const chunks = await Promise.all(
      audioPaths.map((audioPath, index) => 
        this.processAudio(audioPath, {
          ...options,
          // 청크별 진행률 계산을 위해 인덱스 전달
        })
      )
    );

    // 청크들을 시간순으로 병합
    const allSegments: TranscriptionSegment[] = [];
    let timeOffset = 0;

    chunks.forEach((chunk) => {
      chunk.segments.forEach(segment => {
        allSegments.push({
          start: segment.start + timeOffset,
          end: segment.end + timeOffset,
          text: segment.text
        });
      });
      
      // 다음 청크의 시간 오프셋 계산
      if (chunk.segments.length > 0) {
        timeOffset = chunk.segments[chunk.segments.length - 1].end;
      }
    });

    return {
      segments: allSegments,
      text: allSegments.map(s => s.text).join(' '),
      language: chunks[0]?.language || 'ja',
      duration: timeOffset
    };
  }

  /**
   * SRT 내용을 TranscriptionResult로 변환
   */
  private parseSrtToTranscription(srtContent: string): TranscriptionResult {
    const segments: TranscriptionSegment[] = [];
    const blocks = srtContent.trim().split('\n\n');

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length >= 3) {
        const timecodeLine = lines[1];
        const textLines = lines.slice(2);
        
        // 타임코드 파싱 (00:00:01,234 --> 00:00:05,678)
        const timeMatch = timecodeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
        if (timeMatch) {
          const start = this.parseTimecode(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
          const end = this.parseTimecode(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
          const text = textLines.join(' ').trim();

          segments.push({ start, end, text });
        }
      }
    }

    return {
      segments,
      text: segments.map(s => s.text).join(' '),
      language: 'ja',
      duration: segments.length > 0 ? segments[segments.length - 1].end : 0
    };
  }

  private parseTimecode(hours: string, minutes: string, seconds: string, milliseconds: string): number {
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 1000;
  }

  /**
   * 설치된 모델 목록 조회
   */
  getInstalledModels(): string[] {
    const models: string[] = [];
    const modelSizes = ['tiny', 'base', 'small', 'medium', 'large'];

    modelSizes.forEach(size => {
      const modelPath = path.join(this.modelsDir, `ggml-${size}.bin`);
      if (fs.existsSync(modelPath)) {
        models.push(size);
      }
    });

    return models;
  }
}