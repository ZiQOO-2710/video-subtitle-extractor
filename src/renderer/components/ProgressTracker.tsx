import React from 'react';

interface ProcessingState {
  stage: 'idle' | 'audio-extraction' | 'speech-recognition' | 'translation' | 'completed' | 'error';
  progress: number;
  message: string;
  currentStep: number;
  totalSteps: number;
}

interface VideoInfo {
  duration: number;
  size: number;
}

interface ProgressTrackerProps {
  processing: ProcessingState;
  videoInfo: VideoInfo | null;
}

function ProgressTracker({ processing, videoInfo }: ProgressTrackerProps) {
  const getStageInfo = (stage: string) => {
    switch (stage) {
      case 'audio-extraction':
        return { icon: '🎵', title: '1단계: 오디오 추출', description: '동영상에서 음성 트랙을 분리하고 있습니다' };
      case 'speech-recognition':
        return { icon: '🎤', title: '2단계: 음성 인식', description: '음성을 텍스트로 변환하고 있습니다' };
      case 'translation':
        return { icon: '🌐', title: '3단계: 번역', description: '자막을 번역하고 있습니다' };
      case 'completed':
        return { icon: '✅', title: '완료', description: '모든 처리가 완료되었습니다' };
      default:
        return { icon: '⏳', title: '처리 중...', description: '작업을 진행하고 있습니다' };
    }
  };

  const stageInfo = getStageInfo(processing.stage);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}초`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    if (minutes < 60) return `${minutes}분 ${remainingSeconds}초`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}시간 ${remainingMinutes}분`;
  };

  const getEstimatedTime = (): string => {
    if (!videoInfo) return '계산 중...';
    
    const duration = videoInfo.duration;
    const size = videoInfo.size / (1024 * 1024 * 1024); // GB
    
    // 단계별 추정 시간 (매우 대략적)
    const audioExtractionTime = Math.max(60, duration * 0.1); // 최소 1분
    const speechRecognitionTime = duration * 0.5; // 실시간의 절반
    const translationTime = 60; // 약 1분
    
    const totalEstimatedTime = audioExtractionTime + speechRecognitionTime + translationTime;
    
    if (processing.stage === 'audio-extraction') {
      return formatTime(audioExtractionTime * (1 - processing.progress / 100));
    } else if (processing.stage === 'speech-recognition') {
      return formatTime(speechRecognitionTime * (1 - processing.progress / 100));
    } else if (processing.stage === 'translation') {
      return formatTime(translationTime * (1 - processing.progress / 100));
    }
    
    return formatTime(totalEstimatedTime);
  };

  return (
    <div className="progress-section">
      {/* 현재 단계 표시 */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>{stageInfo.icon}</div>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '5px' }}>
          {stageInfo.title}
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          {stageInfo.description}
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${processing.progress}%` }}
        />
      </div>

      <div className="progress-text">
        {processing.message}
      </div>

      <div style={{ textAlign: 'center', fontSize: '14px', color: '#666', marginBottom: '10px' }}>
        진행률: {processing.progress.toFixed(1)}% | 예상 남은 시간: {getEstimatedTime()}
      </div>

      {/* 단계별 상태 */}
      <div className="progress-details">
        <div className="progress-item">
          <div className="progress-item-title">
            {processing.currentStep >= 1 ? '✅' : processing.currentStep === 1 ? '🔄' : '⏳'} 오디오 추출
          </div>
          <div className="progress-item-status">
            {processing.currentStep > 1 ? '완료' : processing.currentStep === 1 ? '진행중' : '대기중'}
          </div>
        </div>

        <div className="progress-item">
          <div className="progress-item-title">
            {processing.currentStep >= 2 ? '✅' : processing.currentStep === 2 ? '🔄' : '⏳'} 음성 인식
          </div>
          <div className="progress-item-status">
            {processing.currentStep > 2 ? '완료' : processing.currentStep === 2 ? '진행중' : '대기중'}
          </div>
        </div>

        <div className="progress-item">
          <div className="progress-item-title">
            {processing.currentStep >= 3 ? '✅' : processing.currentStep === 3 ? '🔄' : '⏳'} 번역
          </div>
          <div className="progress-item-status">
            {processing.currentStep > 3 ? '완료' : processing.currentStep === 3 ? '진행중' : '대기중'}
          </div>
        </div>

        <div className="progress-item">
          <div className="progress-item-title">
            {processing.currentStep >= 4 ? '✅' : '⏳'} 완료
          </div>
          <div className="progress-item-status">
            {processing.currentStep >= 4 ? '완료' : '대기중'}
          </div>
        </div>
      </div>

      {/* 시스템 정보 */}
      {videoInfo && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: 'rgba(255, 255, 255, 0.5)', 
          borderRadius: '8px',
          fontSize: '12px',
          color: '#666'
        }}>
          <div><strong>처리 중인 파일:</strong></div>
          <div>• 재생 시간: {Math.floor(videoInfo.duration / 60)}분 {Math.floor(videoInfo.duration % 60)}초</div>
          <div>• 파일 크기: {(videoInfo.size / (1024 * 1024 * 1024)).toFixed(1)}GB</div>
          <div>• 처리 방식: 로컬 CPU 처리 (인터넷 연결 불필요)</div>
        </div>
      )}
    </div>
  );
}

export default ProgressTracker;