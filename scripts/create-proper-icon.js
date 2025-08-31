#!/usr/bin/env node

/**
 * 적절한 크기의 아이콘 생성 스크립트
 * 256x256 PNG를 기반으로 ICO 파일 생성
 */

const fs = require('fs');
const path = require('path');

class ProperIconGenerator {
  constructor() {
    this.assetsDir = path.join(__dirname, '../assets');
    this.ensureAssetsDirectory();
  }

  ensureAssetsDirectory() {
    if (!fs.existsSync(this.assetsDir)) {
      fs.mkdirSync(this.assetsDir, { recursive: true });
    }
  }

  /**
   * 256x256 기본 PNG 아이콘 생성
   */
  create256PNG() {
    const pngPath = path.join(this.assetsDir, 'icon-256.png');
    
    if (fs.existsSync(pngPath)) {
      console.log('✅ icon-256.png 이미 존재함');
      return;
    }

    // 간단한 256x256 PNG (영화 필름 아이콘 스타일)
    console.log('🎨 256x256 PNG 아이콘 생성 중...');
    
    // SVG to PNG 변환이 필요하지만, 여기서는 기본 아이콘 사용
    const svg = `
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- 배경 -->
  <rect width="256" height="256" rx="32" fill="url(#gradient)"/>
  
  <!-- 영화 필름 -->
  <rect x="48" y="48" width="160" height="160" rx="16" fill="#2c3e50" opacity="0.9"/>
  
  <!-- 필름 구멍들 -->
  <circle cx="72" cy="72" r="8" fill="#667eea"/>
  <circle cx="72" cy="112" r="8" fill="#667eea"/>
  <circle cx="72" cy="152" r="8" fill="#667eea"/>
  <circle cx="72" cy="192" r="8" fill="#667eea"/>
  
  <circle cx="184" cy="72" r="8" fill="#667eea"/>
  <circle cx="184" cy="112" r="8" fill="#667eea"/>
  <circle cx="184" cy="152" r="8" fill="#667eea"/>
  <circle cx="184" cy="192" r="8" fill="#667eea"/>
  
  <!-- 자막 라인들 -->
  <rect x="96" y="120" width="64" height="4" fill="#ecf0f1" rx="2"/>
  <rect x="96" y="132" width="48" height="4" fill="#ecf0f1" rx="2"/>
  <rect x="96" y="144" width="56" height="4" fill="#ecf0f1" rx="2"/>
  
  <!-- 재생 버튼 -->
  <polygon points="112,96 112,120 132,108" fill="#e74c3c"/>
</svg>`;

    // SVG를 파일로 저장 (추후 PNG 변환 도구 사용)
    const svgPath = path.join(this.assetsDir, 'icon.svg');
    fs.writeFileSync(svgPath, svg);
    console.log('✅ SVG 아이콘 생성 완료');
    
    return svgPath;
  }

  /**
   * 간단한 256x256 ICO 파일 생성
   */
  createProperICO() {
    const icoPath = path.join(this.assetsDir, 'icon.ico');
    
    // 기존 파일 삭제
    if (fs.existsSync(icoPath)) {
      fs.unlinkSync(icoPath);
    }

    console.log('🎨 256x256 ICO 아이콘 생성 중...');

    // 더 큰 ICO 파일 구조 생성
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);     // Reserved
    header.writeUInt16LE(1, 2);     // ICO format
    header.writeUInt16LE(1, 4);     // Number of images

    const imageEntry = Buffer.alloc(16);
    imageEntry.writeUInt8(0, 0);    // Width (0 = 256)
    imageEntry.writeUInt8(0, 1);    // Height (0 = 256)
    imageEntry.writeUInt8(0, 2);    // Colors
    imageEntry.writeUInt8(0, 3);    // Reserved
    imageEntry.writeUInt16LE(1, 4); // Color planes
    imageEntry.writeUInt16LE(32, 6); // Bits per pixel
    imageEntry.writeUInt32LE(0x40000, 8); // Size (approximate)
    imageEntry.writeUInt32LE(22, 12); // Offset

    // 큰 비트맵 데이터 생성 (256x256)
    const bmpHeader = Buffer.alloc(40);
    bmpHeader.writeUInt32LE(40, 0);     // Header size
    bmpHeader.writeInt32LE(256, 4);     // Width
    bmpHeader.writeInt32LE(512, 8);     // Height (256*2)
    bmpHeader.writeUInt16LE(1, 12);     // Planes
    bmpHeader.writeUInt16LE(32, 14);    // Bits per pixel

    // 256x256 픽셀 데이터 (그라데이션)
    const pixelData = Buffer.alloc(256 * 256 * 4);
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const offset = (y * 256 + x) * 4;
        
        // 영화 필름 아이콘 스타일
        if (x >= 48 && x <= 208 && y >= 48 && y <= 208) {
          // 필름 영역
          pixelData.writeUInt8(44, offset);     // Blue (2c)
          pixelData.writeUInt8(62, offset + 1); // Green (3e)
          pixelData.writeUInt8(80, offset + 2); // Red (50)
          pixelData.writeUInt8(255, offset + 3); // Alpha
        } else {
          // 배경 그라데이션
          const ratio = (x + y) / 512;
          pixelData.writeUInt8(102 + ratio * 40, offset);     // Blue
          pixelData.writeUInt8(126 + ratio * 30, offset + 1); // Green
          pixelData.writeUInt8(234, offset + 2);              // Red
          pixelData.writeUInt8(255, offset + 3);              // Alpha
        }
      }
    }

    // AND 마스크 (모두 투명)
    const andMask = Buffer.alloc(256 * 256 / 8);

    const icoData = Buffer.concat([header, imageEntry, bmpHeader, pixelData, andMask]);
    fs.writeFileSync(icoPath, icoData);
    console.log('✅ 256x256 ICO 아이콘 생성 완료');
  }

  /**
   * 모든 아이콘 생성
   */
  generateAllIcons() {
    console.log('🎨 고품질 아이콘 생성 시작...\n');
    
    try {
      this.create256PNG();
      this.createProperICO();
      
      // PNG도 256x256으로 복사
      const targetPng = path.join(this.assetsDir, 'icon.png');
      const sourceSvg = path.join(this.assetsDir, 'icon.svg');
      
      // SVG 내용을 기본 PNG로 저장 (실제로는 PNG 변환 필요)
      console.log('\n🎉 아이콘 생성 완료!');
      console.log('📋 생성된 파일:');
      console.log('• assets/icon.ico (256x256) - Windows용');
      console.log('• assets/icon.svg (벡터) - 소스 파일');
      console.log('\n💡 더 좋은 아이콘을 원한다면:');
      console.log('1. 256x256 PNG 이미지 준비');
      console.log('2. https://convertio.co/png-ico/ 에서 ICO 변환');
      console.log('3. assets/icon.ico 파일 교체');
      
    } catch (error) {
      console.error('❌ 아이콘 생성 실패:', error.message);
      console.log('📖 수동으로 256x256 ICO 파일을 assets/에 복사해주세요.');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const generator = new ProperIconGenerator();
  generator.generateAllIcons();
}

module.exports = ProperIconGenerator;