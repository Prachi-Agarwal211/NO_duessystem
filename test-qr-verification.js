// Test QR Code Verification End-to-End
const QRCode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testQRVerification() {
  try {
    console.log('=== QR CODE VERIFICATION TEST ===\n');

    // Step 1: Get a certificate from database
    console.log('1. Fetching certificate from database...');
    const { data: formData, error } = await supabase
      .from('no_dues_forms')
      .select('*')
      .eq('final_certificate_generated', true)
      .limit(1)
      .single();

    if (error || !formData) {
      console.error('❌ No certificate found:', error);
      return;
    }

    console.log('✅ Found certificate:');
    console.log('- ID:', formData.id);
    console.log('- Student:', formData.student_name);
    console.log('- Registration:', formData.registration_no);
    console.log('- Hash length:', formData.blockchain_hash?.length || 0);
    console.log('- Hash:', formData.blockchain_hash);
    console.log('- TX:', formData.blockchain_tx);

    // Step 2: Generate QR data as it would be in certificate
    console.log('\n2. Generating QR data...');
    const qrData = {
      url: `https://nodues.jecrcuniversity.edu.in/verify?id=${formData.id}`,
      id: formData.id,
      regNo: formData.registration_no,
      name: formData.student_name,
      txId: formData.blockchain_tx,
      hash: formData.blockchain_hash,
      timestamp: Date.now()
    };

    console.log('QR Data:', JSON.stringify(qrData, null, 2));

    // Step 3: Generate QR code image
    console.log('\n3. Generating QR code image...');
    const dataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
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

    // Save QR code
    const fs = require('fs');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync('test-verification-qr.png', base64Data, 'base64');
    console.log('✅ QR Code saved as test-verification-qr.png');

    // Step 4: Test verification API (if server is running)
    console.log('\n4. Testing verification API...');
    try {
      const response = await fetch('http://localhost:3000/api/certificate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: qrData })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Verification successful!');
        console.log('- Valid:', result.valid);
        console.log('- Message:', result.message);
        if (result.certificate) {
          console.log('- Student:', result.certificate.studentName);
          console.log('- Registration:', result.certificate.registrationNo);
        }
      } else {
        const error = await response.json();
        console.log('❌ Verification failed:', error);
      }
    } catch (fetchError) {
      console.log('⚠️  Could not test API (server not running?):', fetchError.message);
    }

    // Step 5: Manual verification test
    console.log('\n5. Manual verification test...');
    const crypto = require('crypto');
    
    // Recreate hash generation
    const dataToHash = {
      student_id: formData.id,
      registration_no: formData.registration_no,
      full_name: formData.student_name,
      course: formData.course,
      branch: formData.branch,
      status: 'completed'
    };
    
    const dataString = JSON.stringify(dataToHash);
    const computedHash = crypto.createHash('sha256').update(dataString).digest('hex');
    
    console.log('Stored hash:', formData.blockchain_hash);
    console.log('Computed hash:', computedHash);
    console.log('Hashes match:', computedHash === formData.blockchain_hash);
    console.log('Stored hash length:', formData.blockchain_hash?.length);
    console.log('Computed hash length:', computedHash.length);

    console.log('\n=== TEST COMPLETE ===');
    console.log('📱 Scan test-verification-qr.png with the admin verification page');
    console.log('🔍 Or use the QR data above for manual testing');

  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

testQRVerification();
