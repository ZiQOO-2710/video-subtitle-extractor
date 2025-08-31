import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { VideoProcessor } from './services/VideoProcessor';
import { SpeechRecognition } from './services/SpeechRecognition';
import { TranslationService } from './services/TranslationService';

class MainApp {
  private mainWindow: BrowserWindow | null = null;
  private videoProcessor: VideoProcessor;
  private speechRecognition: SpeechRecognition;
  private translationService: TranslationService;

  constructor() {
    this.videoProcessor = new VideoProcessor();
    this.speechRecognition = new SpeechRecognition();
    this.translationService = new TranslationService();
    
    this.setupApp();
    this.setupIpcHandlers();
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
          }
        ]
      });
      
      return result.canceled ? null : result.filePaths[0];
    });

    // 동영상 정보 가져오기
    ipcMain.handle('get-video-info', async (_, videoPath: string) => {
      try {
        return await this.videoProcessor.getVideoInfo(videoPath);
      } catch (error) {
        console.error('비디오 정보 가져오기 실패:', error);
        throw error;
      }
    });

    // 오디오 추출
    ipcMain.handle('extract-audio', async (_, videoPath: string, outputPath: string) => {
      try {
        return await this.videoProcessor.extractAudio(videoPath, outputPath);
      } catch (error) {
        console.error('오디오 추출 실패:', error);
        throw error;
      }
    });

    // 음성 인식
    ipcMain.handle('speech-to-text', async (_, audioPath: string, options: any) => {
      try {
        return await this.speechRecognition.processAudio(audioPath, options);
      } catch (error) {
        console.error('음성 인식 실패:', error);
        throw error;
      }
    });

    // 번역
    ipcMain.handle('translate-srt', async (_, srtPath: string, targetLanguage: string) => {
      try {
        return await this.translationService.translateSrtFile(srtPath, targetLanguage);
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
      // 간단한 통계 대화상자 표시
      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: '처리 통계',
        message: '동영상 자막 추출기 통계',
        detail: '100% 무료로 사용 중입니다!\n개인정보 보호와 오프라인 처리를 제공합니다.',
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