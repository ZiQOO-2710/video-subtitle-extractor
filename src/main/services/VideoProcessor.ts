import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

// FFmpeg 바이너리 경로 설정 (Windows 호환)
let ffmpegPath;
if (process.platform === 'win32') {
  // Windows에서는 내장된 FFmpeg 사용
  ffmpegPath = path.join(process.resourcesPath || __dirname, '../../../bin/win32/ffmpeg.exe');
  if (!fs.existsSync(ffmpegPath)) {
    // 개발 모드에서는 프로젝트 내 바이너리 사용
    ffmpegPath = path.join(__dirname, '../../../bin/win32/ffmpeg.exe');
    if (!fs.existsSync(ffmpegPath)) {
      // 프로젝트 루트에서 찾기
      ffmpegPath = path.join(process.cwd(), 'bin/win32/ffmpeg.exe');
      if (!fs.existsSync(ffmpegPath)) {
        // ffmpeg-installer 패키지 사용 시도
        try {
          ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
        } catch (error) {
          console.error('FFmpeg not found. Please install FFmpeg in bin/win32/ folder');
          // 시스템 PATH에서 ffmpeg 찾기 시도
          ffmpegPath = 'ffmpeg';
        }
      }
    }
  }
} else {
  try {
    ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  } catch (error) {
    // 시스템 PATH에서 ffmpeg 사용
    ffmpegPath = 'ffmpeg';
  }
}

ffmpeg.setFfmpegPath(ffmpegPath);
console.log('FFmpeg 경로:', ffmpegPath);

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  fps: number;
  size: number;
  format: string;
  audioCodec: string;
  videoCodec: string;
}

export class VideoProcessor {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(app.getPath('userData'), 'temp');
    this.ensureTempDirectory();
  }

  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 동영상 파일 정보 추출
   */
  async getVideoInfo(videoPath: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      console.log(`동영상 정보 조회: ${videoPath}`);
      
      ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
        if (err) {
          reject(new Error(`비디오 정보 추출 실패: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');

        if (!videoStream) {
          reject(new Error('비디오 스트림을 찾을 수 없습니다'));
          return;
        }

        const stats = fs.statSync(videoPath);

        const info: VideoInfo = {
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps: this.parseFps(videoStream.r_frame_rate || '0/1'),
          size: stats.size,
          format: metadata.format.format_name || 'unknown',
          audioCodec: audioStream?.codec_name || 'none',
          videoCodec: videoStream.codec_name || 'unknown'
        };

        resolve(info);
      });
    });
  }

  /**
   * 동영상에서 오디오 추출
   */
  async extractAudio(videoPath: string, outputPath?: string): Promise<string> {
    const fileName = path.basename(videoPath, path.extname(videoPath));
    const audioPath = outputPath || path.join(this.tempDir, `${fileName}_audio.wav`);

    return new Promise((resolve, reject) => {
      console.log(`오디오 추출 시작: ${videoPath} -> ${audioPath}`);

      ffmpeg(videoPath)
        .audioCodec('pcm_s16le')  // 16-bit PCM (Whisper 호환)
        .audioFrequency(16000)    // 16kHz (Whisper 권장)
        .audioChannels(1)         // 모노 (처리 속도 향상)
        .format('wav')
        .on('start', (commandLine: any) => {
          console.log('FFmpeg 명령어:', commandLine);
        })
        .on('progress', (progress: any) => {
          console.log(`오디오 추출 진행률: ${progress.percent?.toFixed(1)}%`);
          
          // 진행률을 렌더러로 전송
          if (global.mainWindow) {
            global.mainWindow.webContents.send('progress-update', {
              stage: 'audio-extraction',
              progress: progress.percent || 0,
              message: `오디오 추출 중... ${progress.percent?.toFixed(1)}%`
            });
          }
        })
        .on('end', () => {
          console.log('오디오 추출 완료');
          resolve(audioPath);
        })
        .on('error', (err: any) => {
          console.error('오디오 추출 실패:', err);
          reject(new Error(`오디오 추출 실패: ${err.message}`));
        })
        .save(audioPath);
    });
  }

  /**
   * 큰 동영상을 청크로 분할하여 오디오 추출
   */
  async extractAudioInChunks(videoPath: string, chunkDuration: number = 600): Promise<string[]> {
    const videoInfo = await this.getVideoInfo(videoPath);
    const totalDuration = videoInfo.duration;
    const numChunks = Math.ceil(totalDuration / chunkDuration);
    const audioPaths: string[] = [];

    console.log(`${numChunks}개 청크로 분할 추출 시작 (청크당 ${chunkDuration}초)`);

    for (let i = 0; i < numChunks; i++) {
      const startTime = i * chunkDuration;
      const fileName = path.basename(videoPath, path.extname(videoPath));
      const chunkPath = path.join(this.tempDir, `${fileName}_chunk_${i + 1}.wav`);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .seekInput(startTime)
          .duration(Math.min(chunkDuration, totalDuration - startTime))
          .audioCodec('pcm_s16le')
          .audioFrequency(16000)
          .audioChannels(1)
          .format('wav')
          .on('progress', (progress: any) => {
            const totalProgress = ((i + (progress.percent || 0) / 100) / numChunks) * 100;
            console.log(`청크 ${i + 1}/${numChunks} 추출 진행률: ${progress.percent?.toFixed(1)}%`);
            
            if (global.mainWindow) {
              global.mainWindow.webContents.send('progress-update', {
                stage: 'audio-extraction',
                progress: totalProgress,
                message: `청크 ${i + 1}/${numChunks} 오디오 추출 중...`
              });
            }
          })
          .on('end', () => {
            console.log(`청크 ${i + 1} 추출 완료`);
            resolve();
          })
          .on('error', reject)
          .save(chunkPath);
      });

      audioPaths.push(chunkPath);
    }

    return audioPaths;
  }

  /**
   * 임시 파일 정리
   */
  cleanupTempFiles(): void {
    try {
      const files = fs.readdirSync(this.tempDir);
      files.forEach(file => {
        const filePath = path.join(this.tempDir, file);
        fs.unlinkSync(filePath);
      });
      console.log('임시 파일 정리 완료');
    } catch (error) {
      console.error('임시 파일 정리 실패:', error);
    }
  }

  private parseFps(fpsString: string): number {
    const [num, den] = fpsString.split('/').map(Number);
    return den ? num / den : 0;
  }
}

// 전역 변수 타입 확장
declare global {
  var mainWindow: Electron.BrowserWindow | undefined;
}