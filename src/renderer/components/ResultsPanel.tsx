import React from 'react';

interface Results {
  originalSrt?: string;
  translatedSrt?: string;
}

interface ResultsPanelProps {
  results: Results;
  onReset: () => void;
}

function ResultsPanel({ results, onReset }: ResultsPanelProps) {
  const handleOpenFile = (filePath: string) => {
    // Electron에서 파일 탐색기로 파일 위치 열기
    if (window.electronAPI && window.electronAPI.openFileLocation) {
      window.electronAPI.openFileLocation(filePath);
    } else {
      // 대체 방법: 클립보드에 경로 복사
      navigator.clipboard.writeText(filePath);
      alert('파일 경로가 클립보드에 복사되었습니다.');
    }
  };

  const handleOpenFolder = (filePath: string) => {
    const folderPath = filePath.substring(0, filePath.lastIndexOf('/') || filePath.lastIndexOf('\\'));
    if (window.electronAPI && window.electronAPI.openFolder) {
      window.electronAPI.openFolder(folderPath);
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎉</div>
      <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '10px' }}>
        자막 추출이 완료되었습니다!
      </div>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '30px' }}>
        생성된 자막 파일들을 확인하세요
      </div>

      {/* 결과 파일들 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {results.originalSrt && (
          <div style={{ 
            padding: '20px', 
            backgroundColor: 'rgba(102, 126, 234, 0.1)', 
            borderRadius: '12px',
            border: '1px solid rgba(102, 126, 234, 0.3)'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎤</div>
            <div style={{ fontWeight: '600', marginBottom: '10px' }}>원본 자막 (음성 인식)</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px', wordBreak: 'break-all' }}>
              {results.originalSrt.split('/').pop() || results.originalSrt.split('\\').pop()}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                className="button secondary"
                onClick={() => handleOpenFile(results.originalSrt!)}
                style={{ fontSize: '14px', padding: '8px 16px' }}
              >
                파일 열기
              </button>
              <button 
                className="button secondary"
                onClick={() => handleOpenFolder(results.originalSrt!)}
                style={{ fontSize: '14px', padding: '8px 16px' }}
              >
                폴더 열기
              </button>
            </div>
          </div>
        )}

        {results.translatedSrt && (
          <div style={{ 
            padding: '20px', 
            backgroundColor: 'rgba(40, 167, 69, 0.1)', 
            borderRadius: '12px',
            border: '1px solid rgba(40, 167, 69, 0.3)'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🌐</div>
            <div style={{ fontWeight: '600', marginBottom: '10px' }}>번역된 자막</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px', wordBreak: 'break-all' }}>
              {results.translatedSrt.split('/').pop() || results.translatedSrt.split('\\').pop()}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                className="button secondary"
                onClick={() => handleOpenFile(results.translatedSrt!)}
                style={{ fontSize: '14px', padding: '8px 16px' }}
              >
                파일 열기
              </button>
              <button 
                className="button secondary"
                onClick={() => handleOpenFolder(results.translatedSrt!)}
                style={{ fontSize: '14px', padding: '8px 16px' }}
              >
                폴더 열기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 사용 팁 */}
      <div style={{ 
        backgroundColor: 'rgba(255, 193, 7, 0.1)', 
        padding: '20px', 
        borderRadius: '12px', 
        marginBottom: '30px',
        textAlign: 'left'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '15px', textAlign: 'center' }}>
          💡 자막 파일 사용 방법
        </div>
        <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
          • <strong>동영상 플레이어:</strong> VLC, PotPlayer 등에서 자막 파일을 불러오세요<br/>
          • <strong>동일한 이름:</strong> 동영상 파일과 자막 파일을 같은 폴더에 두면 자동으로 인식됩니다<br/>
          • <strong>편집 가능:</strong> 메모장이나 텍스트 에디터로 자막을 수정할 수 있습니다<br/>
          • <strong>형식 변환:</strong> 필요시 온라인 도구로 다른 형식으로 변환하세요
        </div>
      </div>

      {/* 액션 버튼들 */}
      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
        <button className="button" onClick={onReset}>
          새 동영상 처리하기
        </button>
        <button 
          className="button secondary"
          onClick={() => {
            if (window.electronAPI && window.electronAPI.showStats) {
              window.electronAPI.showStats();
            }
          }}
        >
          처리 통계 보기
        </button>
      </div>

      {/* 만족도 조사 (선택사항) */}
      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        backgroundColor: 'rgba(255, 255, 255, 0.3)', 
        borderRadius: '8px',
        fontSize: '14px',
        color: '#666'
      }}>
        <div>이 프로그램이 도움이 되셨나요? 😊</div>
        <div style={{ marginTop: '5px' }}>
          100% 무료 · 오픈소스 · 개인정보 보호 · 무제한 사용
        </div>
      </div>
    </div>
  );
}

export default ResultsPanel;