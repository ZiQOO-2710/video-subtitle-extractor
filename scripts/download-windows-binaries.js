#!/usr/bin/env node

/**
 * Windows용 바이너리 다운로드 스크립트
 * FFmpeg와 Whisper.cpp Windows 실행파일을 다운로드합니다
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');

class WindowsBinaryManager {
  constructor() {
    this.binDir = path.join(__dirname, '../bin/win32');
    this.ensureBinDirectory();
  }

  ensureBinDirectory() {
    if (!fs.existsSync(this.binDir)) {
      fs.mkdirSync(this.binDir, { recursive: true });
      console.log(`✅ Windows 바이너리 디렉토리 생성: ${this.binDir}`);
    }
  }

  /**
   * FFmpeg Windows 바이너리 다운로드
   */
  async downloadFFmpeg() {
    const ffmpegPath = path.join(this.binDir, 'ffmpeg.exe');
    
    if (fs.existsSync(ffmpegPath)) {
      console.log('✅ FFmpeg.exe 이미 존재함');
      return;
    }

    console.log('📥 FFmpeg Windows 바이너리 다운로드 시작...');
    
    // FFmpeg 공식 Windows 빌드 다운로드
    const ffmpegUrl = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
    
    try {
      await this.downloadAndExtract(ffmpegUrl, this.binDir, 'ffmpeg.exe');
      console.log('✅ FFmpeg Windows 바이너리 설치 완료');
    } catch (error) {
      console.error('❌ FFmpeg 다운로드 실패:', error.message);
      console.log('📖 수동 설치 가이드:');
      console.log('1. https://ffmpeg.org/download.html 에서 Windows 빌드 다운로드');
      console.log('2. ffmpeg.exe 파일을 bin/win32/ 폴더에 복사');
    }
  }

  /**
   * Whisper.cpp Windows 바이너리 다운로드
   */
  async downloadWhisperCpp() {
    const whisperPath = path.join(this.binDir, 'main.exe');
    
    if (fs.existsSync(whisperPath)) {
      console.log('✅ Whisper main.exe 이미 존재함');
      return;
    }

    console.log('📥 Whisper.cpp Windows 바이너리 다운로드 시작...');
    
    try {
      // Whisper.cpp 미리 컴파일된 Windows 버전 다운로드
      const whisperUrl = 'https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.4/whisper-win64.zip';
      
      await this.downloadAndExtract(whisperUrl, this.binDir, 'main.exe');
      console.log('✅ Whisper.cpp Windows 바이너리 설치 완료');
    } catch (error) {
      console.error('❌ Whisper.cpp 다운로드 실패:', error.message);
      console.log('📖 수동 설치 가이드:');
      console.log('1. https://github.com/ggerganov/whisper.cpp/releases 에서 Windows 빌드 다운로드');
      console.log('2. main.exe 파일을 bin/win32/ 폴더에 복사');
    }
  }

  /**
   * ZIP 파일 다운로드 및 압축 해제
   */
  async downloadAndExtract(url, targetDir, executableName) {
    return new Promise((resolve, reject) => {
      const tempZipPath = path.join(targetDir, 'temp.zip');
      const file = fs.createWriteStream(tempZipPath);

      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize) {
            const progress = (downloadedSize / totalSize * 100).toFixed(1);
            process.stdout.write(`\r진행률: ${progress}%`);
          }
        });

        response.pipe(file);
        
        file.on('finish', async () => {
          file.close();
          console.log('\n📦 압축 해제 중...');
          
          try {
            await this.extractZip(tempZipPath, targetDir, executableName);
            fs.unlinkSync(tempZipPath); // 임시 파일 삭제
            resolve();
          } catch (extractError) {
            reject(extractError);
          }
        });
        
        file.on('error', (err) => {
          fs.unlink(tempZipPath, () => {});
          reject(err);
        });
      }).on('error', reject);
    });
  }

  /**
   * ZIP 파일에서 특정 실행파일 추출
   */
  async extractZip(zipPath, targetDir, executableName) {
    return new Promise((resolve, reject) => {
      // Windows에서 PowerShell을 사용한 압축 해제
      const powershellCmd = `
        Add-Type -AssemblyName System.IO.Compression.FileSystem;
        $zip = [System.IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/\\/g, '\\\\')}');
        $zip.Entries | Where-Object { $_.Name -like '*${executableName.replace('.exe', '')}*' -and $_.Name.EndsWith('.exe') } | ForEach-Object {
          [System.IO.Compression.ZipFileExtensions]::ExtractToFile($_, '${path.join(targetDir, executableName).replace(/\\/g, '\\\\')}', $true);
          Write-Host "Extracted: $($_.FullName)";
        };
        $zip.Dispose();
      `;

      const process = spawn('powershell.exe', ['-Command', powershellCmd], { stdio: 'inherit' });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`PowerShell 압축 해제 실패 (코드: ${code})`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`PowerShell 실행 오류: ${error.message}`));
      });
    });
  }

  /**
   * 바이너리 파일 실행 테스트
   */
  async testBinaries() {
    console.log('🧪 Windows 바이너리 테스트 중...');

    // FFmpeg 테스트
    const ffmpegPath = path.join(this.binDir, 'ffmpeg.exe');
    if (fs.existsSync(ffmpegPath)) {
      try {
        const { spawn } = require('child_process');
        const ffmpeg = spawn(ffmpegPath, ['-version'], { stdio: 'pipe' });
        
        ffmpeg.stdout.on('data', (data) => {
          if (data.toString().includes('ffmpeg version')) {
            console.log('✅ FFmpeg 정상 작동');
          }
        });
      } catch (error) {
        console.warn('⚠️ FFmpeg 테스트 실패:', error.message);
      }
    }

    // Whisper 테스트
    const whisperPath = path.join(this.binDir, 'main.exe');
    if (fs.existsSync(whisperPath)) {
      try {
        const whisper = spawn(whisperPath, ['--help'], { stdio: 'pipe' });
        
        whisper.stdout.on('data', (data) => {
          if (data.toString().includes('usage:')) {
            console.log('✅ Whisper.cpp 정상 작동');
          }
        });
      } catch (error) {
        console.warn('⚠️ Whisper.cpp 테스트 실패:', error.message);
      }
    }
  }

  /**
   * 전체 Windows 바이너리 설정
   */
  async setupWindowsBinaries() {
    console.log('🏠 Windows 바이너리 설정 시작\n');

    try {
      await this.downloadFFmpeg();
      await this.downloadWhisperCpp();
      await this.testBinaries();

      console.log('\n🎉 Windows 바이너리 설정 완료!');
      console.log('\n다음 단계:');
      console.log('1. npm run build-win    # Windows 빌드');
      console.log('2. npm run dist-win     # Windows 설치 파일 생성');

    } catch (error) {
      console.error('\n❌ Windows 바이너리 설정 실패:', error.message);
      console.log('\n📖 수동 설정이 필요합니다:');
      console.log('1. FFmpeg Windows 버전을 bin/win32/ffmpeg.exe에 복사');
      console.log('2. Whisper.cpp Windows 버전을 bin/win32/main.exe에 복사');
      process.exit(1);
    }
  }
}

// 스크립트가 직접 실행될 때만 실행
if (require.main === module) {
  const manager = new WindowsBinaryManager();
  manager.setupWindowsBinaries();
}

module.exports = WindowsBinaryManager;