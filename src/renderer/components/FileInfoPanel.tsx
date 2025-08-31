import React from 'react';

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

interface FileInfoPanelProps {
  videoInfo: VideoInfo;
  filePath: string;
}

function FileInfoPanel({ videoInfo, filePath }: FileInfoPanelProps) {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getEstimatedTime = (duration: number): string => {
    // 대략적인 처리 시간 추정 (실제 시간의 1/4 ~ 1/2)
    const estimatedMinutes = Math.ceil(duration / 60 / 3);
    if (estimatedMinutes < 1) return '1분 미만';
    if (estimatedMinutes < 60) return `약 ${estimatedMinutes}분`;
    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = estimatedMinutes % 60;
    return `약 ${hours}시간 ${minutes}분`;
  };

  return (
    <div className="file-info">
      <div className="file-info-title">
        📁 {filePath.split('/').pop() || filePath.split('\\').pop()}
      </div>
      
      <div className="file-info-details">
        <div className="file-info-item">
          <span className="file-info-label">재생 시간</span>
          <span className="file-info-value">{formatDuration(videoInfo.duration)}</span>
        </div>
        
        <div className="file-info-item">
          <span className="file-info-label">해상도</span>
          <span className="file-info-value">{videoInfo.width}×{videoInfo.height}</span>
        </div>
        
        <div className="file-info-item">
          <span className="file-info-label">FPS</span>
          <span className="file-info-value">{videoInfo.fps.toFixed(1)}</span>
        </div>
        
        <div className="file-info-item">
          <span className="file-info-label">파일 크기</span>
          <span className="file-info-value">{formatFileSize(videoInfo.size)}</span>
        </div>
        
        <div className="file-info-item">
          <span className="file-info-label">비디오 코덱</span>
          <span className="file-info-value">{videoInfo.videoCodec.toUpperCase()}</span>
        </div>
        
        <div className="file-info-item">
          <span className="file-info-label">오디오 코덱</span>
          <span className="file-info-value">{videoInfo.audioCodec.toUpperCase()}</span>
        </div>
        
        <div className="file-info-item">
          <span className="file-info-label">컨테이너</span>
          <span className="file-info-value">{videoInfo.format.toUpperCase()}</span>
        </div>
        
        <div className="file-info-item">
          <span className="file-info-label">예상 처리 시간</span>
          <span className="file-info-value text-warning">{getEstimatedTime(videoInfo.duration)}</span>
        </div>
      </div>
      
      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'rgba(102, 126, 234, 0.1)', borderRadius: '6px', fontSize: '14px' }}>
        💡 <strong>팁:</strong> 긴 동영상일수록 처리 시간이 오래 걸립니다. 
        처리 중에는 컴퓨터를 절전 모드로 전환하지 마세요.
      </div>
    </div>
  );
}

export default FileInfoPanel;