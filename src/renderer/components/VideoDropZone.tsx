import React, { useCallback, useState } from 'react';

interface VideoDropZoneProps {
  onFileSelect: (filePath: string) => void;
}

function VideoDropZone({ onFileSelect }: VideoDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => 
      file.type.startsWith('video/') || 
      /\.(mp4|avi|mkv|mov|wmv|flv|webm|m4v)$/i.test(file.name)
    );

    if (videoFile) {
      onFileSelect(videoFile.path);
    } else {
      alert('지원하는 동영상 파일을 선택해주세요.');
    }
  }, [onFileSelect]);

  const handleFileButtonClick = useCallback(async () => {
    try {
      const filePath = await window.electronAPI.selectVideoFile();
      if (filePath) {
        onFileSelect(filePath);
      }
    } catch (error) {
      console.error('파일 선택 오류:', error);
    }
  }, [onFileSelect]);

  return (
    <div
      className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleFileButtonClick}
    >
      <div className="drop-zone-icon">🎬</div>
      <div className="drop-zone-text">
        동영상 파일을 여기에 드래그하세요
      </div>
      <div className="drop-zone-subtext">
        또는 클릭하여 파일 선택
      </div>
      <div className="drop-zone-subtext">
        지원 형식: MP4, AVI, MKV, MOV, WMV, FLV, WebM
      </div>
    </div>
  );
}

export default VideoDropZone;