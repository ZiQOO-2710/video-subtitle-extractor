import React from 'react';

interface Settings {
  speechModel: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  language: string;
  translationTarget: string;
  outputFormat: 'srt' | 'vtt' | 'txt';
}

interface SettingsPanelProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  const handleChange = (key: keyof Settings, value: string) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  const modelInfo = {
    tiny: { size: '39MB', speed: '매우 빠름', quality: '기본' },
    base: { size: '74MB', speed: '빠름', quality: '좋음' },
    small: { size: '244MB', speed: '보통', quality: '매우 좋음' },
    medium: { size: '769MB', speed: '느림', quality: '우수' },
    large: { size: '1.5GB', speed: '매우 느림', quality: '최고' }
  };

  return (
    <div className="settings">
      {/* 음성 인식 모델 선택 */}
      <div className="setting-item">
        <label className="setting-label">🎤 음성 인식 모델</label>
        <select 
          className="setting-select"
          value={settings.speechModel}
          onChange={(e) => handleChange('speechModel', e.target.value)}
        >
          <option value="tiny">Tiny - {modelInfo.tiny.size} (매우 빠름, 기본 품질)</option>
          <option value="base">Base - {modelInfo.base.size} (빠름, 좋은 품질) 권장</option>
          <option value="small">Small - {modelInfo.small.size} (보통, 매우 좋은 품질)</option>
          <option value="medium">Medium - {modelInfo.medium.size} (느림, 우수한 품질)</option>
          <option value="large">Large - {modelInfo.large.size} (매우 느림, 최고 품질)</option>
        </select>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          선택한 모델: {modelInfo[settings.speechModel].size}, 
          속도: {modelInfo[settings.speechModel].speed}, 
          품질: {modelInfo[settings.speechModel].quality}
        </div>
      </div>

      {/* 음성 언어 선택 */}
      <div className="setting-item">
        <label className="setting-label">🈂️ 음성 언어</label>
        <select 
          className="setting-select"
          value={settings.language}
          onChange={(e) => handleChange('language', e.target.value)}
        >
          <option value="ja">🇯🇵 일본어</option>
          <option value="ko">🇰🇷 한국어</option>
          <option value="en">🇺🇸 영어</option>
          <option value="zh">🇨🇳 중국어</option>
          <option value="auto">🌐 자동 감지</option>
        </select>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          동영상의 음성 언어를 선택하세요
        </div>
      </div>

      {/* 번역 대상 언어 */}
      <div className="setting-item">
        <label className="setting-label">🔄 번역 언어</label>
        <select 
          className="setting-select"
          value={settings.translationTarget}
          onChange={(e) => handleChange('translationTarget', e.target.value)}
        >
          <option value="ko">🇰🇷 한국어</option>
          <option value="ja">🇯🇵 일본어</option>
          <option value="en">🇺🇸 영어</option>
          <option value="zh">🇨🇳 중국어</option>
          <option value="none">번역하지 않음</option>
        </select>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          자막을 번역할 언어를 선택하세요
        </div>
      </div>

      {/* 출력 형식 */}
      <div className="setting-item">
        <label className="setting-label">💾 출력 형식</label>
        <select 
          className="setting-select"
          value={settings.outputFormat}
          onChange={(e) => handleChange('outputFormat', e.target.value)}
        >
          <option value="srt">SRT (SubRip) - 가장 호환성 좋음</option>
          <option value="vtt">VTT (WebVTT) - 웹용</option>
          <option value="txt">TXT (텍스트) - 단순 텍스트</option>
        </select>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          SRT 형식을 권장합니다 (대부분의 플레이어 지원)
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;