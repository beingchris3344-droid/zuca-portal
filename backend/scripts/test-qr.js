const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test users
const users = {
  admin: {
    email: 'zucaportal2025@gmail.com',
    password: 'adminzuca',
    name: 'Admin User'
  },
  normal: {
    email: 'chrismaina4433@gmail.com',
    password: 'chris',
    name: 'Normal User'
  }
};

// Helper to log responses nicely
function logResponse(title, data) {
  console.log(`\n📌 ${title}`);
  console.log('─'.repeat(50));
  if (typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

// Helper to show error
function logError(title, error) {
  console.log(`\n❌ ${title}`);
  console.log('─'.repeat(50));
  console.log(`Status: ${error.response?.status || 'No response'}`);
  console.log(`Message: ${error.response?.data?.error || error.message}`);
  if (error.response?.data) {
    console.log('Details:', error.response.data);
  }
}

// Main test function
async function testUniversalQREndpoint() {
  console.log('\n🚀 STARTING UNIVERSAL QR ENDPOINT TEST');
  console.log('='.repeat(60));
  
  let adminToken = null;
  let adminSheetId = null;
  let normalToken = null;
  
  // Step 1: Get an attendance sheet ID first
  console.log('\n📋 STEP 1: Getting an attendance sheet ID...');
  try {
    // Login as admin first to get sheets
    const loginRes = await axios.post(`${BASE_URL}/api/login`, {
      email: users.admin.email,
      password: users.admin.password
    });
    
    adminToken = loginRes.data.token;
    
    // Get sheets
    const sheetsRes = await axios.get(`${BASE_URL}/api/attendance/all-sheets`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const sheets = sheetsRes.data.sheets || [];
    
    if (sheets.length === 0) {
      console.log('⚠️ No attendance sheets found. Please create one first.');
      console.log('   You can create one via the admin panel or use this command:');
      console.log('   POST /api/attendance/sheet with title and date');
      return;
    }
    
    adminSheetId = sheets[0].id;
    console.log(`✅ Found sheet: ${sheets[0].title} (ID: ${adminSheetId})`);
    
  } catch (error) {
    logError('Getting sheet ID', error);
    return;
  }
  
  // Step 2: Login as Admin and test endpoint
  console.log('\n👑 STEP 2: Testing as ADMIN');
  console.log('─'.repeat(50));
  
  try {
    // Login
    const loginRes = await axios.post(`${BASE_URL}/api/login`, {
      email: users.admin.email,
      password: users.admin.password
    });
    
    adminToken = loginRes.data.token;
    console.log(`✅ Admin logged in: ${loginRes.data.user.fullName}`);
    
    // Test universal QR endpoint
    const qrRes = await axios.get(
      `${BASE_URL}/api/attendance/sheet/${adminSheetId}/universal-qr`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    logResponse('ADMIN - Universal QR Response', {
      success: qrRes.data.success,
      universalUrl: qrRes.data.universalUrl,
      token: qrRes.data.token?.substring(0, 20) + '...',
      expiresAt: qrRes.data.expiresAt,
      sheetTitle: qrRes.data.sheet?.title
    });
    
    if (qrRes.data.qrCodeUrl) {
      console.log(`\n📱 QR Code generated successfully!`);
      console.log(`   Length: ${qrRes.data.qrCodeUrl.length} characters`);
      console.log(`   URL: ${qrRes.data.universalUrl}`);
    }
    
  } catch (error) {
    logError('Admin test failed', error);
  }
  
  // Step 3: Login as Normal User and test endpoint
  console.log('\n👤 STEP 3: Testing as NORMAL USER');
  console.log('─'.repeat(50));
  
  try {
    // Login as normal user
    const loginRes = await axios.post(`${BASE_URL}/api/login`, {
      email: users.normal.email,
      password: users.normal.password
    });
    
    normalToken = loginRes.data.token;
    console.log(`✅ Normal user logged in: ${loginRes.data.user.fullName}`);
    console.log(`   Role: ${loginRes.data.user.role}`);
    
    // Test universal QR endpoint
    const qrRes = await axios.get(
      `${BASE_URL}/api/attendance/sheet/${adminSheetId}/universal-qr`,
      { headers: { Authorization: `Bearer ${normalToken}` } }
    );
    
    logResponse('NORMAL USER - Universal QR Response', {
      success: qrRes.data.success,
      universalUrl: qrRes.data.universalUrl,
      token: qrRes.data.token?.substring(0, 20) + '...',
      expiresAt: qrRes.data.expiresAt
    });
    
  } catch (error) {
    logError('Normal user test failed', error);
    
    // Expected result: Normal user should get 403 Forbidden
    if (error.response?.status === 403) {
      console.log('\n✅ This is EXPECTED - Normal users cannot generate QR codes (requires admin/secretary/leader role)');
    }
  }
  
  // Step 4: Test the universal URL (check-in page)
  console.log('\n🌐 STEP 4: Testing the universal URL (check-in page)');
  console.log('─'.repeat(50));
  
  try {
    // Get a valid universal URL from admin
    const qrRes = await axios.get(
      `${BASE_URL}/api/attendance/sheet/${adminSheetId}/universal-qr`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    const universalUrl = qrRes.data.universalUrl;
    console.log(`Universal URL: ${universalUrl}`);
    
    // Test if the URL is accessible
    const pageRes = await axios.get(universalUrl);
    console.log(`✅ Check-in page is accessible (Status: ${pageRes.status})`);
    console.log(`   Content-Type: ${pageRes.headers['content-type']}`);
    
  } catch (error) {
    logError('Universal URL test failed', error);
  }
  
  console.log('\n✨ TEST COMPLETE');
  console.log('='.repeat(60));
}

// Run the test
testUniversalQREndpoint().catch(console.error);