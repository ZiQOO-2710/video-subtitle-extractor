import React, { useState, useCallback, useEffect } from 'react';
import VideoDropZone from './components/VideoDropZone';
import FileInfoPanel from './components/FileInfoPanel';
import SettingsPanel from './components/SettingsPanel';
import ProgressTracker from './components/ProgressTracker';
import ResultsPanel from './components/ResultsPanel';

interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  fps: number;
  size: number;
  format: string;
  audioCodec: string;
  videoCodec: string;
}

interface ProcessingState {
  stage: 'idle' | 'audio-extraction' | 'speech-recognition' | 'translation' | 'completed' | 'error';
  progress: number;
  message: string;
  currentStep: number;
  totalSteps: number;
}

interface Settings {
  speechModel: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  language: string;
  translationTarget: string;
  outputFormat: 'srt' | 'vtt' | 'txt';
}

function App() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({
    stage: 'idle',
    progress: 0,
    message: '',
    currentStep: 0,
    totalSteps: 4
  });
  const [settings, setSettings] = useState<Settings>({
    speechModel: 'base',
    language: 'ja',
    translationTarget: 'ko',
    outputFormat: 'srt'
  });
  const [results, setResults] = useState<{
    originalSrt?: string;
    translatedSrt?: string;
  }>({});

  // Electron API 진행률 업데이트 리스너
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onProgressUpdate((data: any) => {
        setProcessing(prev => ({
          ...prev,
          stage: data.stage,
          progress: data.progress,
          message: data.message
        }));
      });

      return () => {
        window.electronAPI.removeAllListeners('progress-update');
      };
    }
  }, []);

  // 파일 선택 처리
  const handleFileSelect = useCallback(async (filePath: string) => {
    setSelectedFile(filePath);
    
    try {
      const info = await window.electronAPI.getVideoInfo(filePath);
      setVideoInfo(info);
      console.log('비디오 정보:', info);
    } catch (error) {
      console.error('비디오 정보 가져오기 실패:', error);
      setProcessing({
        stage: 'error',
        progress: 0,
        message: '비디오 정보를 가져올 수 없습니다.',
        currentStep: 0,
        totalSteps: 4
      });
    }
  }, []);

  // 자막 추출 프로세스 시작
  const handleStartExtraction = useCallback(async () => {
    if (!selectedFile) return;

    try {
      setProcessing({
        stage: 'audio-extraction',
        progress: 0,
        message: '오디오 추출 준비 중...',
        currentStep: 1,
        totalSteps: 4
      });

      // 1단계: 오디오 추출
      const audioPath = await window.electronAPI.extractAudio(selectedFile, '');
      console.log('오디오 추출 완료:', audioPath);

      setProcessing(prev => ({
        ...prev,
        stage: 'speech-recognition',
        currentStep: 2,
        message: '음성 인식 준비 중...'
      }));

      // 2단계: 음성 인식
      const transcriptionResult = await window.electronAPI.speechToText(audioPath, {
        language: settings.language,
        model: settings.speechModel,
        outputFormat: settings.outputFormat
      });
      
      console.log('음성 인식 완료:', transcriptionResult);
      setResults(prev => ({ ...prev, originalSrt: transcriptionResult.srtPath }));

      setProcessing(prev => ({
        ...prev,
        stage: 'translation',
        currentStep: 3,
        message: '번역 준비 중...'
      }));

      // 3단계: 번역 (선택사항)
      if (settings.translationTarget !== settings.language) {
        const translatedSrt = await window.electronAPI.translateSrt(
          transcriptionResult.srtPath,
          settings.translationTarget
        );
        
        console.log('번역 완료:', translatedSrt);
        setResults(prev => ({ ...prev, translatedSrt }));
      }

      // 완료
      setProcessing({
        stage: 'completed',
        progress: 100,
        message: '모든 작업이 완료되었습니다!',
        currentStep: 4,
        totalSteps: 4
      });

    } catch (error) {
      console.error('처리 중 오류 발생:', error);
      setProcessing({
        stage: 'error',
        progress: 0,
        message: `오류 발생: ${error}`,
        currentStep: 0,
        totalSteps: 4
      });
    }
  }, [selectedFile, settings]);

  // 새 파일 선택
  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setVideoInfo(null);
    setProcessing({
      stage: 'idle',
      progress: 0,
      message: '',
      currentStep: 0,
      totalSteps: 4
    });
    setResults({});
  }, []);

  return (
    <div className="app">
      {/* 헤더 */}
      <header className="header">
        <h1>🎬 동영상 자막 추출기</h1>
        <p className="subtitle">100% 무료 · 완전 오프라인 · 개인정보 보호</p>
      </header>

      <div className="main-content">
        {/* 파일 선택 영역 */}
        {!selectedFile && (
          <section className="section">
            <h2 className="section-title">1단계: 동영상 파일 선택</h2>
            <VideoDropZone onFileSelect={handleFileSelect} />
          </section>
        )}

        {/* 파일 정보 및 설정 */}
        {selectedFile && videoInfo && processing.stage === 'idle' && (
          <>
            <section className="section">
              <h2 className="section-title">2단계: 파일 정보 확인</h2>
              <FileInfoPanel videoInfo={videoInfo} filePath={selectedFile} />
              
              <div className="flex flex-center gap-10 mt-20">
                <button className="button secondary" onClick={handleReset}>
                  다른 파일 선택
                </button>
                <button className="button" onClick={handleStartExtraction}>
                  자막 추출 시작
                </button>
              </div>
            </section>

            <section className="section">
              <h2 className="section-title">3단계: 처리 설정</h2>
              <SettingsPanel settings={settings} onSettingsChange={setSettings} />
            </section>
          </>
        )}

        {/* 진행률 표시 */}
        {processing.stage !== 'idle' && processing.stage !== 'completed' && (
          <section className="section">
            <h2 className="section-title">처리 진행 상황</h2>
            <ProgressTracker processing={processing} videoInfo={videoInfo} />
          </section>
        )}

        {/* 결과 표시 */}
        {processing.stage === 'completed' && (
          <section className="section">
            <h2 className="section-title">✅ 완료!</h2>
            <ResultsPanel results={results} onReset={handleReset} />
          </section>
        )}

        {/* 오류 표시 */}
        {processing.stage === 'error' && (
          <section className="section">
            <h2 className="section-title text-error">❌ 오류 발생</h2>
            <p className="text-error">{processing.message}</p>
            <div className="flex flex-center gap-10 mt-20">
              <button className="button secondary" onClick={handleReset}>
                다시 시도
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;