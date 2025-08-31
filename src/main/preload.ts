import { contextBridge, ipcRenderer } from 'electron';

// Electron API를 렌더러에 안전하게 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 파일 선택
  selectVideoFile: () => ipcRenderer.invoke('select-video-file'),
  
  // 동영상 처리
  getVideoInfo: (videoPath: string) => ipcRenderer.invoke('get-video-info', videoPath),
  extractAudio: (videoPath: string, outputPath: string) => ipcRenderer.invoke('extract-audio', videoPath, outputPath),
  
  // 음성 인식
  speechToText: (audioPath: string, options: any) => ipcRenderer.invoke('speech-to-text', audioPath, options),
  
  // 번역
  translateSrt: (srtPath: string, targetLanguage: string) => ipcRenderer.invoke('translate-srt', srtPath, targetLanguage),
  
  // 파일 시스템 작업
  openFileLocation: (filePath: string) => ipcRenderer.invoke('open-file-location', filePath),
  openFolder: (folderPath: string) => ipcRenderer.invoke('open-folder', folderPath),
  showStats: () => ipcRenderer.invoke('show-stats'),
  
  // 이벤트 리스너
  onProgressUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('progress-update', (_, data) => callback(data));
  },
  
  // 리스너 제거
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// 타입 정의를 위한 전역 인터페이스
declare global {
  interface Window {
    electronAPI: {
      selectVideoFile: () => Promise<string | null>;
      getVideoInfo: (videoPath: string) => Promise<any>;
      extractAudio: (videoPath: string, outputPath: string) => Promise<string>;
      speechToText: (audioPath: string, options: any) => Promise<any>;
      translateSrt: (srtPath: string, targetLanguage: string) => Promise<string>;
      openFileLocation: (filePath: string) => Promise<void>;
      openFolder: (folderPath: string) => Promise<void>;
      showStats: () => Promise<void>;
      onProgressUpdate: (callback: (data: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}