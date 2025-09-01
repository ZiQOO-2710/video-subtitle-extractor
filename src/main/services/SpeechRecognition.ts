import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { app } from 'electron';

export interface WhisperOptions {
  language?: string;
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  outputFormat?: 'srt' | 'vtt' | 'txt' | 'json';
  outputFolder?: string;
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
  srtPath?: string;
}

export class SpeechRecognition {
  private modelsDir: string;
  private whisperExecutable: string;
  private totalDuration?: number;
  private mainWindow?: Electron.BrowserWindow;

  constructor(mainWindow?: Electron.BrowserWindow) {
    // 프로젝트 루트의 models 폴더 사용
    this.modelsDir = path.join(process.cwd(), 'models');
    this.whisperExecutable = this.getWhisperExecutable();
    this.mainWindow = mainWindow;
    this.ensureModelsDirectory();
  }

  private getWhisperExecutable(): string {
    const platform = process.platform;
    
    if (platform === 'win32') {
      // Windows 실행 파일 경로 - 프로젝트 루트에서 찾기
      const projectRoot = process.cwd();
      const executablePath = path.join(projectRoot, 'bin/win32/whisper-cli.exe');
      
      if (fs.existsSync(executablePath)) {
        return executablePath;
      } else {
        // 배포 모드에서는 리소스 경로 사용
        const resourcePath = path.join(process.resourcesPath || projectRoot, 'bin/win32/whisper-cli.exe');
        if (fs.existsSync(resourcePath)) {
          return resourcePath;
        } else {
          // fallback to main.exe
          const mainExePath = path.join(projectRoot, 'bin/win32/main.exe');
          if (fs.existsSync(mainExePath)) {
            console.warn('Using deprecated main.exe, consider updating to whisper-cli.exe');
            return mainExePath;
          } else {
            console.error('Whisper executable not found:', executablePath);
            return executablePath; // 기본 경로 반환
          }
        }
      }
    } else {
      // macOS/Linux
      const executableName = 'main';
      return path.join(process.cwd(), 'bin', platform, executableName);
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
      outputFormat = 'srt',
      outputFolder
    } = options;

    // 모델이 없으면 다운로드
    await this.downloadModel(model);

    const modelPath = path.join(this.modelsDir, `ggml-${model}.bin`);
    const outputDir = outputFolder || path.dirname(audioPath);
    const audioFileName = path.basename(audioPath, path.extname(audioPath));
    
    // 한글 파일명이 포함된 경우 임시 영문 파일명 사용
    const hasKorean = /[\u3131-\u3163\uac00-\ud7a3]/g.test(audioFileName);
    const tempAudioFileName = hasKorean ? 
      `temp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}` : 
      audioFileName;
    
    const tempOutputDir = path.join(process.cwd(), 'temp');
    
    // 임시 디렉토리 생성
    if (!fs.existsSync(tempOutputDir)) {
      fs.mkdirSync(tempOutputDir, { recursive: true });
    }
    
    return new Promise((resolve, reject) => {
      console.log(`음성 인식 시작: ${audioPath}`);
      
      const args = [
        '-m', modelPath,
        '-f', audioPath,
        '-l', language,
        '-osrt',  // SRT 포맷으로 출력
        '-of', path.join(tempOutputDir, tempAudioFileName)  // 임시 출력 파일 경로 (확장자 제외)
      ];

      console.log('Whisper 명령어:', this.whisperExecutable, args.join(' '));

      const whisperProcess = spawn(this.whisperExecutable, args);
      let stdout = '';
      let stderr = '';
      let progressTimer: NodeJS.Timeout | null = null;
      let processingStartTime = Date.now();
      let lastProgress = 0;

      // 3초마다 진행률 추정 업데이트
      const startProgressTimer = () => {
        progressTimer = setInterval(() => {
          if (this.totalDuration && this.totalDuration > 0 && this.mainWindow) {
            const elapsed = (Date.now() - processingStartTime) / 1000;
            // tiny 모델 기준 처리 속도 추정 (실제 오디오 시간의 약 0.1-0.25배)
            const estimatedProgress = Math.min((elapsed / (this.totalDuration * 0.2)) * 100, 95);
            
            if (estimatedProgress > lastProgress + 1) { // 최소 1% 증가했을 때만 업데이트
              lastProgress = estimatedProgress;
              
              this.mainWindow.webContents.send('progress-update', {
                stage: 'speech-recognition',
                progress: Math.round(estimatedProgress),
                message: `음성 인식 중... ${Math.round(estimatedProgress)}% (${Math.floor(elapsed/60)}:${Math.floor(elapsed%60).toString().padStart(2,'0')} 경과)`
              });
            }
          }
        }, 3000); // 3초마다 업데이트
      };

      whisperProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log('Whisper stdout:', output);

        // 진행률 파싱 시도 - Whisper 시간 기반 진행률 계산
        const timeMatch = output.match(/\[(\d{2}):(\d{2}):(\d{2})\.\d+\s*-->/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseInt(timeMatch[3]);
          const currentSeconds = hours * 3600 + minutes * 60 + seconds;
          
          // 예상 총 시간을 stderr에서 파악했던 599.4초 사용 (동적으로 업데이트 가능)
          const totalSeconds = this.totalDuration || 600; // 기본값 10분
          const progress = Math.min((currentSeconds / totalSeconds) * 100, 100);
          
          if (this.mainWindow && progress > lastProgress) {
            lastProgress = progress;
            this.mainWindow.webContents.send('progress-update', {
              stage: 'speech-recognition',
              progress: Math.round(progress),
              message: `음성 인식 중... ${Math.round(progress)}% (${Math.floor(currentSeconds/60)}:${(currentSeconds%60).toString().padStart(2,'0')} 처리됨)`
            });
          }
        }
        
        // 총 시간 파싱 (처음에만 실행)
        const durationMatch = output.match(/\((\d+) samples, ([\d.]+) sec\)/);
        if (durationMatch && !this.totalDuration) {
          this.totalDuration = parseFloat(durationMatch[2]);
        }
      });

      whisperProcess.stderr.on('data', (data) => {
        const error = data.toString();
        stderr += error;
        console.error('Whisper stderr:', error);
        
        // stderr에서 총 처리 시간 파싱
        const durationMatch = error.match(/\((\d+) samples, ([\d.]+) sec\)/);
        if (durationMatch && !this.totalDuration) {
          this.totalDuration = parseFloat(durationMatch[2]);
          console.log(`총 오디오 길이: ${this.totalDuration}초`);
          startProgressTimer(); // 총 시간을 알게 되면 타이머 시작
        }
      });

      whisperProcess.on('close', (code) => {
        console.log(`Whisper 프로세스 종료, 코드: ${code}`);
        
        // 타이머 정리
        if (progressTimer) {
          clearInterval(progressTimer);
          progressTimer = null;
        }
        
        if (code === 0) {
          try {
            // 임시 SRT 파일 읽기
            const tempSrtPath = path.join(tempOutputDir, `${tempAudioFileName}.srt`);
            const srtContent = fs.readFileSync(tempSrtPath, 'utf-8');
            
            // 최종 SRT 파일 경로 (한글 파일명 유지)
            const finalSrtPath = path.join(outputDir, `${audioFileName}.srt`);
            
            // 한글 파일명인 경우에만 임시 파일을 최종 경로로 복사
            if (hasKorean) {
              fs.writeFileSync(finalSrtPath, srtContent, 'utf-8');
              
              // 임시 파일 정리
              try {
                fs.unlinkSync(tempSrtPath);
              } catch (cleanupError) {
                console.warn('임시 파일 정리 실패:', cleanupError);
              }
            }
            
            // SRT를 TranscriptionResult로 변환
            const result = this.parseSrtToTranscription(srtContent);
            
            // SRT 파일 경로를 결과에 추가 (한글 경로 또는 원본 경로)
            const resultWithPath = {
              ...result,
              srtPath: hasKorean ? finalSrtPath : tempSrtPath
            };
            
            resolve(resultWithPath);
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