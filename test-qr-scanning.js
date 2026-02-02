// Test script to generate QR code and test scanning functionality
const QRCode = require('qrcode');

// Test QR data that matches the certificate generation
const testQRData = {
  url: 'https://nodues.jecrcuniversity.edu.in/verify?id=123',
  id: '123',
  regNo: 'JECRC2024001',
  name: 'Test Student',
  txId: 'JECRC-TX-1706952000000-abc123def456',
  hash: 'a1b2c3d4e5f6',
  timestamp: Date.now()
};

async function generateTestQR() {
  try {
    console.log('Generating test QR code...');
    console.log('QR Data:', JSON.stringify(testQRData, null, 2));
    
    // Generate QR code as data URL
    const dataUrl = await QRCode.toDataURL(JSON.stringify(testQRData), {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    console.log('✅ QR Code generated successfully!');
    console.log('Data URL length:', dataUrl.length);
    console.log('First 100 chars:', dataUrl.substring(0, 100));
    
    // Save QR code as image file
    const fs = require('fs');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync('test-qr-code.png', base64Data, 'base64');
    
    console.log('✅ QR Code saved as test-qr-code.png');
    console.log('\nYou can now:');
    console.log('1. Open test-qr-code.png and scan it with the admin verification page');
    console.log('2. Or use the QR data string below for manual testing:');
    console.log(JSON.stringify(testQRData));
    
  } catch (error) {
    console.error('❌ Error generating QR code:', error);
  }
}

generateTestQR();
