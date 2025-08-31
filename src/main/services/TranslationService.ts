import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { app } from 'electron';

export interface TranslationOptions {
  sourceLanguage: string;
  targetLanguage: string;
  model?: string;
  batchSize?: number;
}

export interface SrtEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

export class TranslationService {
  private modelsDir: string;
  private pythonExecutable: string;

  constructor() {
    this.modelsDir = path.join(app.getPath('userData'), 'translation_models');
    this.pythonExecutable = this.getPythonExecutable();
    this.ensureModelsDirectory();
  }

  private getPythonExecutable(): string {
    if (process.platform === 'win32') {
      // Windows에서 Python 경로 찾기
      const commonPaths = [
        'python.exe',
        'python3.exe',
        'C:\\Python39\\python.exe',
        'C:\\Python38\\python.exe',
        'C:\\Python311\\python.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Programs\\Python\\Python39\\python.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs\\Python\\Python311\\python.exe')
      ];
      
      // 시스템에서 Python 찾기
      for (const pythonPath of commonPaths) {
        try {
          if (pythonPath.includes('\\') && fs.existsSync(pythonPath)) {
            return pythonPath;
          } else if (!pythonPath.includes('\\')) {
            // PATH에서 찾기
            return pythonPath;
          }
        } catch (error) {
          continue;
        }
      }
      
      return 'python.exe'; // 기본값
    } else {
      return 'python3';
    }
  }

  private ensureModelsDirectory(): void {
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }
  }

  /**
   * 번역 모델 다운로드 (일본어 → 한국어)
   */
  async downloadTranslationModel(): Promise<void> {
    const modelName = 'opus-mt-ja-ko';
    const modelDir = path.join(this.modelsDir, modelName);

    if (fs.existsSync(modelDir)) {
      console.log('번역 모델 이미 존재');
      return;
    }

    console.log('번역 모델 다운로드 시작...');

    // Python 스크립트로 Hugging Face 모델 다운로드
    const downloadScript = `
import os
from transformers import MarianMTModel, MarianTokenizer

model_name = "Helsinki-NLP/opus-mt-ja-ko"
model_dir = "${modelDir.replace(/\\/g, '/')}"

# 모델과 토크나이저 다운로드
model = MarianMTModel.from_pretrained(model_name)
tokenizer = MarianTokenizer.from_pretrained(model_name)

# 로컬에 저장
model.save_pretrained(model_dir)
tokenizer.save_pretrained(model_dir)

print("번역 모델 다운로드 완료")
`;

    const scriptPath = path.join(this.modelsDir, 'download_model.py');
    fs.writeFileSync(scriptPath, downloadScript);

    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonExecutable, [scriptPath]);
      
      process.stdout.on('data', (data) => {
        console.log('모델 다운로드:', data.toString());
      });

      process.stderr.on('data', (data) => {
        console.error('모델 다운로드 오류:', data.toString());
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log('번역 모델 설치 완료');
          resolve();
        } else {
          reject(new Error(`모델 다운로드 실패 (코드: ${code})`));
        }
      });
    });
  }

  /**
   * SRT 파일 번역
   */
  async translateSrtFile(srtPath: string, targetLanguage: string = 'ko'): Promise<string> {
    // 번역 모델이 없으면 다운로드
    await this.ensureTranslationModel();

    const srtContent = fs.readFileSync(srtPath, 'utf-8');
    const srtEntries = this.parseSrt(srtContent);

    console.log(`${srtEntries.length}개 자막 항목 번역 시작`);

    // 텍스트만 추출하여 번역
    const textsToTranslate = srtEntries.map(entry => entry.text);
    const translatedTexts = await this.translateTexts(textsToTranslate, 'ja', targetLanguage);

    // 번역된 텍스트로 SRT 재구성
    const translatedEntries = srtEntries.map((entry, index) => ({
      ...entry,
      text: translatedTexts[index]
    }));

    // 새 SRT 파일 생성
    const outputPath = srtPath.replace('.srt', '_translated.srt');
    const translatedSrt = this.generateSrt(translatedEntries);
    fs.writeFileSync(outputPath, translatedSrt, 'utf-8');

    console.log(`번역 완료: ${outputPath}`);
    return outputPath;
  }

  /**
   * 텍스트 배열 번역
   */
  private async translateTexts(texts: string[], sourceLang: string, targetLang: string): Promise<string[]> {
    const modelDir = path.join(this.modelsDir, 'opus-mt-ja-ko');
    
    // Python 번역 스크립트
    const translationScript = `
import json
import sys
from transformers import MarianMTModel, MarianTokenizer

model_dir = "${modelDir.replace(/\\/g, '/')}"
model = MarianMTModel.from_pretrained(model_dir)
tokenizer = MarianTokenizer.from_pretrained(model_dir)

# stdin에서 텍스트 배열 읽기
input_texts = json.loads(sys.stdin.read())

translated_texts = []
for i, text in enumerate(input_texts):
    try:
        # 일본어 → 한국어 번역
        inputs = tokenizer(text, return_tensors="pt", padding=True)
        translated = model.generate(**inputs)
        translated_text = tokenizer.decode(translated[0], skip_special_tokens=True)
        translated_texts.append(translated_text)
        
        # 진행률 출력 (stderr로)
        progress = (i + 1) / len(input_texts) * 100
        print(f"번역 진행률: {progress:.1f}%", file=sys.stderr)
        
    except Exception as e:
        print(f"번역 오류 (항목 {i}): {e}", file=sys.stderr)
        translated_texts.append(text)  # 원본 텍스트 사용

# 결과를 JSON으로 출력
print(json.dumps(translated_texts, ensure_ascii=False))
`;

    const scriptPath = path.join(this.modelsDir, 'translate.py');
    fs.writeFileSync(scriptPath, translationScript);

    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonExecutable, [scriptPath]);
      let stdout = '';
      let stderr = '';

      // 입력 텍스트를 JSON으로 전송
      process.stdin.write(JSON.stringify(texts));
      process.stdin.end();

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        const error = data.toString();
        stderr += error;
        
        // 진행률 파싱
        const progressMatch = error.match(/번역 진행률: ([\d.]+)%/);
        if (progressMatch && global.mainWindow) {
          const progress = parseFloat(progressMatch[1]);
          global.mainWindow.webContents.send('progress-update', {
            stage: 'translation',
            progress,
            message: `번역 중... ${progress.toFixed(1)}%`
          });
        }
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const translatedTexts = JSON.parse(stdout);
            resolve(translatedTexts);
          } catch (error) {
            reject(new Error(`번역 결과 파싱 실패: ${error}`));
          }
        } else {
          reject(new Error(`번역 실패 (코드: ${code}): ${stderr}`));
        }
      });
    });
  }

  /**
   * 번역 모델 존재 확인 및 설치
   */
  private async ensureTranslationModel(): Promise<void> {
    const modelDir = path.join(this.modelsDir, 'opus-mt-ja-ko');
    
    if (!fs.existsSync(modelDir)) {
      console.log('번역 모델이 없습니다. 다운로드를 시작합니다...');
      await this.downloadTranslationModel();
    }
  }

  /**
   * SRT 파일 파싱
   */
  private parseSrt(srtContent: string): SrtEntry[] {
    const entries: SrtEntry[] = [];
    const blocks = srtContent.trim().split('\n\n');

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length >= 3) {
        const index = parseInt(lines[0]);
        const timeLine = lines[1];
        const textLines = lines.slice(2);

        // 시간 라인 파싱 (00:00:01,234 --> 00:00:05,678)
        const timeMatch = timeLine.match(/^([\d:,]+) --> ([\d:,]+)$/);
        if (timeMatch) {
          entries.push({
            index,
            startTime: timeMatch[1],
            endTime: timeMatch[2],
            text: textLines.join('\n')
          });
        }
      }
    }

    return entries;
  }

  /**
   * SRT 파일 생성
   */
  private generateSrt(entries: SrtEntry[]): string {
    return entries.map(entry => 
      `${entry.index}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}\n`
    ).join('\n');
  }

  /**
   * 지원하는 언어 쌍 조회
   */
  getSupportedLanguagePairs(): Array<{source: string, target: string, model: string}> {
    return [
      { source: 'ja', target: 'ko', model: 'opus-mt-ja-ko' },
      { source: 'en', target: 'ko', model: 'opus-mt-en-ko' },
      { source: 'ko', target: 'en', model: 'opus-mt-ko-en' }
    ];
  }
}