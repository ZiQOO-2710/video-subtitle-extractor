import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { VideoProcessor } from './services/VideoProcessor';
import { SpeechRecognition } from './services/SpeechRecognition';
import { FastWhisper } from './services/FastWhisper';
import { TranslationService } from './services/TranslationService';

interface ProcessingStats {
  videoFile?: string;
  videoInfo?: any;
  audioExtractionTime?: number;
  speechRecognitionTime?: number;
  translationTime?: number;
  totalProcessingTime?: number;
  modelUsed?: string;
  subtitleCount?: number;
  outputFiles?: string[];
  startTime?: number;
  endTime?: number;
}

class MainApp {
  private mainWindow: BrowserWindow | null = null;
  private videoProcessor: VideoProcessor;
  private speechRecognition: SpeechRecognition;
  private fastWhisper: FastWhisper;
  private translationService: TranslationService;
  private currentStats: ProcessingStats = {};

  constructor() {
    this.videoProcessor = new VideoProcessor();
    this.speechRecognition = new SpeechRecognition();
    this.fastWhisper = new FastWhisper();
    this.translationService = new TranslationService();
    
    this.setupApp();
    this.setupIpcHandlers();
  }

  private updateSpeechRecognitionWindow(): void {
    if (this.speechRecognition && this.mainWindow) {
      this.speechRecognition = new SpeechRecognition(this.mainWindow);
    }
    if (this.fastWhisper && this.mainWindow) {
      this.fastWhisper = new FastWhisper(this.mainWindow);
    }
  }

  private setupApp(): void {
    app.whenReady().then(() => {
      this.createWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, '../../assets/icon.png'),
      title: '동영상 자막 추출기 - 무료 오프라인'
    });

    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, 'index.html'));
    }

    // SpeechRecognition에 mainWindow 설정
    this.updateSpeechRecognitionWindow();
  }

  /**
   * FastWhisper 결과를 SRT 파일로 변환
   */
  private async convertToSrt(cudaResult: any, audioPath: string, format: string, outputFolder?: string): Promise<string> {
    const fs = require('fs');
    const path = require('path');
    
    // outputFolder가 지정되면 그 폴더 사용, 아니면 오디오 파일과 같은 폴더
    const outputDir = outputFolder || path.dirname(audioPath);
    const baseName = path.basename(audioPath, path.extname(audioPath));
    const srtPath = path.join(outputDir, `${baseName}_transcribed.srt`);
    
    // SRT 형식으로 변환
    let srtContent = '';
    cudaResult.segments.forEach((segment: any, index: number) => {
      const startTime = this.formatSrtTime(segment.start);
      const endTime = this.formatSrtTime(segment.end);
      
      srtContent += `${index + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${segment.text.trim()}\n\n`;
    });
    
    fs.writeFileSync(srtPath, srtContent, 'utf-8');
    return srtPath;
  }

  /**
   * 시간을 SRT 형식으로 변환 (HH:MM:SS,mmm)
   */
  private formatSrtTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  private setupIpcHandlers(): void {
    // 파일 선택 다이얼로그
    ipcMain.handle('select-video-file', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openFile'],
        filters: [
          {
            name: '동영상 파일',
            extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v']
          },
          {
            name: '모든 파일',
            extensions: ['*']
          }
        ],
        title: '동영상 파일을 선택하세요'
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      
      const selectedPath = result.filePaths[0];
      console.log('선택된 파일:', selectedPath);
      
      // 한글 파일명 검증
      try {
        const stats = require('fs').statSync(selectedPath);
        if (stats.isFile()) {
          return selectedPath;
        } else {
          throw new Error('선택한 항목이 파일이 아닙니다.');
        }
      } catch (error) {
        console.error('파일 접근 오류:', error);
        throw new Error(`파일에 접근할 수 없습니다: ${error}`);
      }
    });

    // 저장 폴더 선택 다이얼로그
    ipcMain.handle('select-output-folder', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory'],
        title: '자막 파일 저장 폴더를 선택하세요'
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      
      return result.filePaths[0];
    });

    // 동영상 정보 가져오기
    ipcMain.handle('get-video-info', async (_, videoPath: string) => {
      try {
        const videoInfo = await this.videoProcessor.getVideoInfo(videoPath);
        
        // 통계 초기화
        this.currentStats = {
          videoFile: path.basename(videoPath),
          videoInfo: videoInfo,
          startTime: Date.now()
        };
        
        return videoInfo;
      } catch (error) {
        console.error('비디오 정보 가져오기 실패:', error);
        throw error;
      }
    });

    // 오디오 추출
    ipcMain.handle('extract-audio', async (_, videoPath: string, outputPath: string) => {
      try {
        const startTime = Date.now();
        const audioPath = await this.videoProcessor.extractAudio(videoPath, outputPath);
        const endTime = Date.now();
        
        // 오디오 추출 시간 기록
        this.currentStats.audioExtractionTime = endTime - startTime;
        
        return audioPath;
      } catch (error) {
        console.error('오디오 추출 실패:', error);
        throw error;
      }
    });

    // 음성 인식
    ipcMain.handle('speech-to-text', async (_, audioPath: string, options: any) => {
      try {
        const startTime = Date.now();
        let result;
        let processingMethod = 'CPU';
        
        // CUDA 사용 가능 여부 확인 후 FastWhisper 또는 기본 SpeechRecognition 선택
        const cudaAvailable = await this.fastWhisper.checkCudaAvailable();
        
        if (cudaAvailable) {
          try {
            console.log('🚀 CUDA 가속 시도 중 - GPU로 처리합니다');
            processingMethod = 'CUDA GPU';
            
            // FastWhisper CUDA 가속 처리
            const fastWhisperOptions = {
              language: options.language,
              model: options.model,
              device: 'cuda' as 'cuda'
            };
            
            const cudaResult = await this.fastWhisper.processAudio(audioPath, fastWhisperOptions);
            
            // 기존 SpeechRecognition 형식으로 변환
            result = {
              segments: cudaResult.segments,
              srtPath: await this.convertToSrt(cudaResult, audioPath, options.outputFormat || 'srt', options.outputFolder),
              language: cudaResult.language || options.language,
              duration: cudaResult.duration
            };
            
            console.log('✅ CUDA 가속 처리 성공!');
          } catch (cudaError: any) {
            console.log('⚠️ CUDA 가속 실패, CPU 처리로 전환합니다:', cudaError?.message || cudaError);
            processingMethod = 'CPU (CUDA 실패 후 전환)';
            result = await this.speechRecognition.processAudio(audioPath, options);
          }
        } else {
          console.log('💻 CPU 처리 - CUDA를 사용할 수 없습니다');
          processingMethod = 'CPU';
          result = await this.speechRecognition.processAudio(audioPath, options);
        }
        
        const endTime = Date.now();
        
        // 음성 인식 통계 기록
        this.currentStats.speechRecognitionTime = endTime - startTime;
        this.currentStats.modelUsed = `${options.model || 'base'} (${processingMethod})`;
        this.currentStats.subtitleCount = result.segments?.length || 0;
        this.currentStats.outputFiles = result.srtPath ? [result.srtPath] : [];
        
        // 번역하지 않는 경우 여기서 총 처리 시간 계산
        this.currentStats.endTime = Date.now();
        if (this.currentStats.startTime) {
          this.currentStats.totalProcessingTime = this.currentStats.endTime - this.currentStats.startTime;
        }
        
        return result;
      } catch (error) {
        console.error('음성 인식 실패:', error);
        throw error;
      }
    });

    // 번역
    ipcMain.handle('translate-srt', async (_, srtPath: string, targetLanguage: string) => {
      try {
        const startTime = Date.now();
        const translatedPath = await this.translationService.translateSrtFile(srtPath, targetLanguage);
        const endTime = Date.now();
        
        // 번역 통계 기록
        this.currentStats.translationTime = endTime - startTime;
        if (this.currentStats.outputFiles) {
          this.currentStats.outputFiles.push(translatedPath);
        } else {
          this.currentStats.outputFiles = [translatedPath];
        }
        
        // 총 처리 시간 계산
        this.currentStats.endTime = Date.now();
        if (this.currentStats.startTime) {
          this.currentStats.totalProcessingTime = this.currentStats.endTime - this.currentStats.startTime;
        }
        
        return translatedPath;
      } catch (error) {
        console.error('번역 실패:', error);
        throw error;
      }
    });

    // 파일/폴더 열기
    ipcMain.handle('open-file-location', async (_, filePath: string) => {
      const { shell } = require('electron');
      await shell.showItemInFolder(filePath);
    });

    ipcMain.handle('open-folder', async (_, folderPath: string) => {
      const { shell } = require('electron');
      await shell.openPath(folderPath);
    });

    ipcMain.handle('show-stats', async () => {
      // 상세한 처리 통계 표시
      const stats = this.currentStats;
      
      if (!stats.videoFile) {
        dialog.showMessageBox(this.mainWindow!, {
          type: 'info',
          title: '처리 통계',
          message: '아직 처리된 파일이 없습니다.',
          detail: '동영상을 처리한 후 통계를 확인할 수 있습니다.',
          buttons: ['확인']
        });
        return;
      }

      // 시간 포맷팅 함수
      const formatTime = (ms: number): string => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
          return `${minutes}분 ${remainingSeconds}초`;
        } else {
          return `${remainingSeconds}초`;
        }
      };

      // 파일 크기 포맷팅 함수
      const formatFileSize = (bytes: number): string => {
        const mb = bytes / (1024 * 1024);
        if (mb >= 1024) {
          return `${(mb / 1024).toFixed(1)} GB`;
        } else {
          return `${mb.toFixed(1)} MB`;
        }
      };

      // 통계 메시지 구성
      let message = `📊 처리 통계 - ${stats.videoFile}\n\n`;
      
      // 동영상 정보
      if (stats.videoInfo) {
        const info = stats.videoInfo;
        message += `🎬 동영상 정보:\n`;
        message += `   • 해상도: ${info.width}x${info.height}\n`;
        message += `   • 길이: ${formatTime(info.duration * 1000)}\n`;
        message += `   • 파일 크기: ${formatFileSize(info.size)}\n`;
        message += `   • 코덱: ${info.videoCodec}/${info.audioCodec}\n\n`;
      }

      // 처리 시간 통계
      message += `⏱️ 처리 시간:\n`;
      if (stats.audioExtractionTime) {
        message += `   • 오디오 추출: ${formatTime(stats.audioExtractionTime)}\n`;
      }
      if (stats.speechRecognitionTime) {
        message += `   • 음성 인식: ${formatTime(stats.speechRecognitionTime)}\n`;
      }
      if (stats.translationTime) {
        message += `   • 번역: ${formatTime(stats.translationTime)}\n`;
      }
      if (stats.totalProcessingTime) {
        message += `   • 총 처리 시간: ${formatTime(stats.totalProcessingTime)}\n\n`;
      }

      // 자막 정보
      if (stats.modelUsed || stats.subtitleCount) {
        message += `🎙️ 음성 인식:\n`;
        if (stats.modelUsed) {
          message += `   • 사용 모델: ${stats.modelUsed.toUpperCase()}\n`;
        }
        if (stats.subtitleCount) {
          message += `   • 생성된 자막 수: ${stats.subtitleCount}개\n\n`;
        }
      }

      // 출력 파일
      if (stats.outputFiles && stats.outputFiles.length > 0) {
        message += `📁 생성된 파일:\n`;
        stats.outputFiles.forEach((file, index) => {
          const fileName = path.basename(file);
          message += `   • ${fileName}\n`;
        });
        message += `\n`;
      }

      message += `✨ 100% 무료 · 완전 오프라인 · 개인정보 보호`;

      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: '동영상 자막 추출 통계',
        message: '처리 완료!',
        detail: message,
        buttons: ['확인']
      });
    });

    // 진행률 업데이트 전송
    ipcMain.on('progress-update', (_, data) => {
      this.mainWindow?.webContents.send('progress-update', data);
    });
  }
}

// 앱 시작
new MainApp();