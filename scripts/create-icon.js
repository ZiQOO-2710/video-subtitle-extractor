#!/usr/bin/env node

/**
 * 기본 아이콘 파일 생성 스크립트
 * Windows 빌드를 위한 임시 아이콘을 생성합니다
 */

const fs = require('fs');
const path = require('path');

class IconGenerator {
  constructor() {
    this.assetsDir = path.join(__dirname, '../assets');
    this.ensureAssetsDirectory();
  }

  ensureAssetsDirectory() {
    if (!fs.existsSync(this.assetsDir)) {
      fs.mkdirSync(this.assetsDir, { recursive: true });
      console.log('✅ assets 디렉토리 생성');
    }
  }

  /**
   * 기본 아이콘 파일들 생성
   */
  generateIcons() {
    console.log('🎨 기본 아이콘 파일들 생성 중...\n');

    // Windows ICO 파일을 위한 기본 데이터 (16x16 픽셀)
    const createBasicIco = () => {
      const icoPath = path.join(this.assetsDir, 'icon.ico');
      
      if (fs.existsSync(icoPath)) {
        console.log('✅ icon.ico 이미 존재함');
        return;
      }

      // 기본 ICO 파일 헤더 (매우 간단한 16x16 아이콘)
      const icoHeader = Buffer.from([
        0x00, 0x00, // Reserved
        0x01, 0x00, // ICO format
        0x01, 0x00, // Number of images
        // Image directory entry
        0x10, 0x10, // Width, Height (16x16)
        0x00,       // Color palette
        0x00,       // Reserved
        0x01, 0x00, // Color planes
        0x20, 0x00, // Bits per pixel (32)
        0x00, 0x01, 0x00, 0x00, // Size of bitmap data
        0x16, 0x00, 0x00, 0x00  // Offset to bitmap data
      ]);

      // 간단한 비트맵 데이터 (16x16 파란색 사각형)
      const bitmapData = Buffer.alloc(256 + 64); // BITMAPINFOHEADER + pixel data
      
      // BITMAPINFOHEADER
      bitmapData.writeUInt32LE(40, 0); // Header size
      bitmapData.writeInt32LE(16, 4);  // Width
      bitmapData.writeInt32LE(32, 8);  // Height (16*2 for ICO)
      bitmapData.writeUInt16LE(1, 12); // Planes
      bitmapData.writeUInt16LE(32, 14); // Bits per pixel
      
      // 픽셀 데이터 (파란색으로 채우기)
      for (let i = 40; i < 40 + 256; i += 4) {
        bitmapData.writeUInt8(255, i);     // Blue
        bitmapData.writeUInt8(100, i + 1); // Green  
        bitmapData.writeUInt8(50, i + 2);  // Red
        bitmapData.writeUInt8(255, i + 3); // Alpha
      }

      const icoData = Buffer.concat([icoHeader, bitmapData]);
      fs.writeFileSync(icoPath, icoData);
      console.log('✅ icon.ico 생성 완료');
    };

    // PNG 아이콘 생성 (Linux용)
    const createBasicPng = () => {
      const pngPath = path.join(this.assetsDir, 'icon.png');
      
      if (fs.existsSync(pngPath)) {
        console.log('✅ icon.png 이미 존재함');
        return;
      }

      // 매우 간단한 PNG 파일 (1x1 투명 픽셀)
      const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk size
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, // Width: 1
        0x00, 0x00, 0x00, 0x01, // Height: 1
        0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
        0x1F, 0x15, 0xC4, 0x89, // CRC
        0x00, 0x00, 0x00, 0x0A, // IDAT chunk size
        0x49, 0x44, 0x41, 0x54, // IDAT
        0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // Compressed data
        0xE2, 0x21, 0xBC, 0x33, // CRC
        0x00, 0x00, 0x00, 0x00, // IEND chunk size
        0x49, 0x45, 0x4E, 0x44, // IEND
        0xAE, 0x42, 0x60, 0x82  // CRC
      ]);

      fs.writeFileSync(pngPath, pngData);
      console.log('✅ icon.png 생성 완료');
    };

    // ICNS 파일 생성 (macOS용)
    const createBasicIcns = () => {
      const icnsPath = path.join(this.assetsDir, 'icon.icns');
      
      if (fs.existsSync(icnsPath)) {
        console.log('✅ icon.icns 이미 존재함');
        return;
      }

      // 기본 ICNS 파일 헤더
      const icnsData = Buffer.from([
        0x69, 0x63, 0x6E, 0x73, // 'icns' signature
        0x00, 0x00, 0x00, 0x08  // File size (8 bytes - header only)
      ]);

      fs.writeFileSync(icnsPath, icnsData);
      console.log('✅ icon.icns 생성 완료');
    };

    try {
      createBasicIco();
      createBasicPng();  
      createBasicIcns();
      
      console.log('\n🎉 모든 아이콘 파일 생성 완료!');
      console.log('💡 나중에 실제 아이콘으로 교체하실 수 있습니다.');
      
    } catch (error) {
      console.error('❌ 아이콘 생성 실패:', error.message);
      console.log('📖 수동으로 아이콘 파일을 assets/ 폴더에 복사해주세요.');
    }
  }

  /**
   * 아이콘 정보 표시
   */
  showIconInfo() {
    console.log('\n📋 아이콘 파일 정보:');
    console.log('• icon.ico - Windows 설치 프로그램용');
    console.log('• icon.png - Linux AppImage용'); 
    console.log('• icon.icns - macOS DMG용');
    console.log('\n💡 더 좋은 아이콘으로 교체하려면:');
    console.log('1. 256x256 PNG 이미지 준비');
    console.log('2. 온라인 도구로 ICO/ICNS 변환');
    console.log('3. assets/ 폴더의 파일들 교체');
  }
}

// 스크립트가 직접 실행될 때만 실행
if (require.main === module) {
  const generator = new IconGenerator();
  generator.generateIcons();
  generator.showIconInfo();
}

module.exports = IconGenerator;