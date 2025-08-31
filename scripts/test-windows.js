#!/usr/bin/env node

/**
 * Windows 호환성 테스트 스크립트
 * 시스템 요구사항과 바이너리 파일들을 검사합니다
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

class WindowsCompatibilityTester {
  constructor() {
    this.results = {
      system: {},
      binaries: {},
      python: {},
      nodejs: {},
      overall: 'UNKNOWN'
    };
  }

  /**
   * 시스템 정보 수집
   */
  checkSystemInfo() {
    console.log('🖥️ 시스템 정보 확인 중...\n');

    this.results.system = {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      totalMemory: Math.round(os.totalmem() / (1024**3)) + 'GB',
      freeMemory: Math.round(os.freemem() / (1024**3)) + 'GB',
      cpuCores: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'Unknown'
    };

    console.log(`플랫폼: ${this.results.system.platform}`);
    console.log(`아키텍처: ${this.results.system.arch}`);
    console.log(`Windows 버전: ${this.results.system.release}`);
    console.log(`총 메모리: ${this.results.system.totalMemory}`);
    console.log(`사용 가능 메모리: ${this.results.system.freeMemory}`);
    console.log(`CPU 코어: ${this.results.system.cpuCores}개`);
    console.log(`CPU 모델: ${this.results.system.cpuModel}`);

    // Windows 버전 체크
    const isWindows10Plus = this.results.system.platform === 'win32';
    const hasEnoughMemory = parseInt(this.results.system.totalMemory) >= 8;

    console.log(`\n✅ Windows 호환성: ${isWindows10Plus ? 'OK' : 'FAIL'}`);
    console.log(`✅ 메모리 요구사항: ${hasEnoughMemory ? 'OK' : 'WARN (8GB 권장)'}`);

    return isWindows10Plus && hasEnoughMemory;
  }

  /**
   * Node.js 버전 확인
   */
  async checkNodeJS() {
    console.log('\n📦 Node.js 확인 중...\n');

    return new Promise((resolve) => {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

      this.results.nodejs = {
        version: nodeVersion,
        majorVersion,
        path: process.execPath,
        isCompatible: majorVersion >= 18
      };

      console.log(`Node.js 버전: ${nodeVersion}`);
      console.log(`실행 경로: ${process.execPath}`);
      console.log(`✅ 호환성: ${this.results.nodejs.isCompatible ? 'OK (18+)' : 'FAIL (18+ 필요)'}`);

      resolve(this.results.nodejs.isCompatible);
    });
  }

  /**
   * Python 설치 확인
   */
  async checkPython() {
    console.log('\n🐍 Python 확인 중...\n');

    return new Promise((resolve) => {
      // Python 명령어들 시도
      const pythonCommands = ['python', 'python3', 'py'];
      let pythonFound = false;

      const tryPython = async (cmd) => {
        return new Promise((resolve) => {
          const python = spawn(cmd, ['--version'], { stdio: 'pipe' });
          
          python.stdout.on('data', (data) => {
            const version = data.toString().trim();
            console.log(`${cmd} 발견: ${version}`);
            
            this.results.python = {
              command: cmd,
              version: version,
              isInstalled: true
            };
            
            pythonFound = true;
            resolve(true);
          });

          python.stderr.on('data', (data) => {
            const version = data.toString().trim();
            if (version.includes('Python')) {
              console.log(`${cmd} 발견: ${version}`);
              this.results.python = {
                command: cmd,
                version: version,
                isInstalled: true
              };
              pythonFound = true;
              resolve(true);
            } else {
              resolve(false);
            }
          });

          python.on('close', (code) => {
            if (code !== 0 && !pythonFound) {
              resolve(false);
            }
          });

          python.on('error', () => {
            resolve(false);
          });
        });
      };

      // Python 명령어들을 순차적으로 시도
      (async () => {
        for (const cmd of pythonCommands) {
          if (!pythonFound) {
            await tryPython(cmd);
          }
        }

        if (!pythonFound) {
          console.log('❌ Python을 찾을 수 없습니다');
          this.results.python = { isInstalled: false };
        }

        resolve(pythonFound);
      })();
    });
  }

  /**
   * Python 패키지 확인
   */
  async checkPythonPackages() {
    if (!this.results.python.isInstalled) {
      return false;
    }

    console.log('\n📚 Python 패키지 확인 중...\n');

    const requiredPackages = ['torch', 'transformers', 'sentencepiece'];
    const pythonCmd = this.results.python.command;

    return new Promise((resolve) => {
      const checkScript = `
import sys
packages = ${JSON.stringify(requiredPackages)}
missing = []
for pkg in packages:
    try:
        __import__(pkg)
        print(f"✅ {pkg}: 설치됨")
    except ImportError:
        missing.append(pkg)
        print(f"❌ {pkg}: 미설치")
        
if missing:
    print(f"\\n설치 필요: {' '.join(missing)}")
    sys.exit(1)
else:
    print("\\n✅ 모든 패키지가 설치되어 있습니다")
    sys.exit(0)
      `;

      const python = spawn(pythonCmd, ['-c', checkScript], { stdio: 'inherit' });
      
      python.on('close', (code) => {
        this.results.python.packagesInstalled = code === 0;
        resolve(code === 0);
      });
    });
  }

  /**
   * Windows 바이너리 파일 확인
   */
  checkBinaries() {
    console.log('\n🔧 바이너리 파일 확인 중...\n');

    const binDir = path.join(__dirname, '../bin/win32');
    const requiredBinaries = {
      'ffmpeg.exe': 'FFmpeg (동영상 처리)',
      'main.exe': 'Whisper.cpp (음성 인식)'
    };

    let allFound = true;

    for (const [filename, description] of Object.entries(requiredBinaries)) {
      const filePath = path.join(binDir, filename);
      const exists = fs.existsSync(filePath);
      
      this.results.binaries[filename] = {
        path: filePath,
        exists,
        description
      };

      if (exists) {
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / (1024*1024)).toFixed(1);
        console.log(`✅ ${description}: 발견 (${sizeMB}MB)`);
      } else {
        console.log(`❌ ${description}: 미발견`);
        console.log(`   예상 경로: ${filePath}`);
        allFound = false;
      }
    }

    if (!allFound) {
      console.log('\n📖 바이너리 설치 방법:');
      console.log('npm run setup-win');
    }

    return allFound;
  }

  /**
   * 전체 테스트 실행
   */
  async runAllTests() {
    console.log('🧪 Windows 호환성 테스트 시작\n');
    console.log('='.repeat(50));

    const systemOK = this.checkSystemInfo();
    const nodeOK = await this.checkNodeJS();
    const pythonOK = await this.checkPython();
    const packagesOK = await this.checkPythonPackages();
    const binariesOK = this.checkBinaries();

    console.log('\n' + '='.repeat(50));
    console.log('📋 테스트 결과 요약\n');

    console.log(`시스템 요구사항: ${systemOK ? '✅ 통과' : '❌ 실패'}`);
    console.log(`Node.js 18+: ${nodeOK ? '✅ 통과' : '❌ 실패'}`);
    console.log(`Python 설치: ${pythonOK ? '✅ 통과' : '❌ 실패'}`);
    console.log(`Python 패키지: ${packagesOK ? '✅ 통과' : '⚠️ 불완전'}`);
    console.log(`바이너리 파일: ${binariesOK ? '✅ 통과' : '❌ 실패'}`);

    const overallScore = [systemOK, nodeOK, pythonOK, binariesOK].filter(Boolean).length;
    
    if (overallScore >= 4 && packagesOK) {
      this.results.overall = 'READY';
      console.log('\n🎉 모든 테스트 통과! 앱을 실행할 준비가 되었습니다.');
      console.log('\n실행 명령어:');
      console.log('start-windows.bat  # 또는');
      console.log('npm run dev');
    } else if (overallScore >= 3) {
      this.results.overall = 'PARTIAL';
      console.log('\n⚠️ 부분적으로 준비됨. 일부 수동 설치가 필요할 수 있습니다.');
      
      if (!pythonOK) console.log('• Python 3.8+ 설치 필요');
      if (!packagesOK) console.log('• pip install torch transformers sentencepiece');
      if (!binariesOK) console.log('• npm run setup-win');
    } else {
      this.results.overall = 'NOT_READY';
      console.log('\n❌ 추가 설치가 필요합니다.');
      console.log('\n📖 Windows 설치 가이드를 참고하세요:');
      console.log('WINDOWS-README.md 파일을 확인하세요.');
    }

    return this.results;
  }

  /**
   * 결과를 JSON 파일로 저장
   */
  saveResults() {
    const resultPath = path.join(__dirname, '../test-results.json');
    fs.writeFileSync(resultPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 상세 결과가 저장되었습니다: ${resultPath}`);
  }
}

// 스크립트가 직접 실행될 때만 실행
if (require.main === module) {
  const tester = new WindowsCompatibilityTester();
  tester.runAllTests().then(() => {
    tester.saveResults();
  });
}

module.exports = WindowsCompatibilityTester;