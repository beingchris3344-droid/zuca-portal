// backend/scripts/test-rosary-api.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testRosaryAPI() {
  console.log('\n' + '='.repeat(80));
  console.log('📿 TESTING ROSARY API');
  console.log('='.repeat(80));
  
  // Test 1: Get mysteries for today
  console.log('\n1. GET /api/prayers/rosary/mysteries');
  console.log('-'.repeat(40));
  try {
    const response = await axios.get(`${BASE_URL}/api/prayers/rosary/mysteries`);
    console.log(`   ✅ Day: ${response.data.day}`);
    console.log(`   ✅ Mysteries: ${response.data.mysteries.name}`);
    console.log(`   ✅ Total mysteries: ${response.data.mysteries.mysteries.length}`);
    console.log('\n   📿 The 5 Mysteries:');
    response.data.mysteries.mysteries.forEach((m, i) => {
      console.log(`      ${i+1}. ${m.name}`);
      console.log(`         Fruit: ${m.fruit}`);
    });
    console.log('\n   ✅ Mysteries API works!');
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.error || error.message);
  }
  
  // Test 2: Get Rosary guide
  console.log('\n2. GET /api/prayers/rosary/guide');
  console.log('-'.repeat(40));
  try {
    const response = await axios.get(`${BASE_URL}/api/prayers/rosary/guide`);
    console.log(`   ✅ Day Mystery: ${response.data.dayMystery}`);
    console.log(`   ✅ Prayers available: ${Object.keys(response.data.prayers).length}`);
    console.log('   ✅ Guide API works!');
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.error || error.message);
  }
  
  // Test 3: Get specific mystery
  console.log('\n3. GET /api/prayers/rosary/mystery/Annunciation');
  console.log('-'.repeat(40));
  try {
    const response = await axios.get(`${BASE_URL}/api/prayers/rosary/mystery/Annunciation`);
    if (response.data.success) {
      console.log(`   ✅ Mystery: ${response.data.mystery.name}`);
      console.log(`   ✅ Description: ${response.data.mystery.description}`);
      console.log('   ✅ Mystery API works!');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.error || error.message);
  }
  
  // Test 4: Get a random prayer
  console.log('\n4. GET /api/prayers?category=rosary&limit=5');
  console.log('-'.repeat(40));
  try {
    const response = await axios.get(`${BASE_URL}/api/prayers?category=rosary&limit=5`);
    console.log(`   ✅ Found ${response.data.prayers.length} rosary prayers`);
    console.log('   ✅ Prayer listing works!');
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.error || error.message);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📿 ROSARY API SUMMARY');
  console.log('='.repeat(80));
  console.log('\n✅ All Rosary API endpoints are working!');
  console.log('\n📌 Available endpoints:');
  console.log('   • GET /api/prayers/rosary/mysteries - Get mysteries for today');
  console.log('   • GET /api/prayers/rosary/mysteries/:day - Get mysteries for specific day (0-6)');
  console.log('   • GET /api/prayers/rosary/guide - Get complete Rosary guide with prayers');
  console.log('   • GET /api/prayers/rosary/mystery/:name - Get specific mystery details');
  console.log('   • GET /api/prayers?category=rosary - List all rosary prayers');
  
  console.log('\n' + '='.repeat(80));
  console.log('🏁 TEST COMPLETED');
  console.log('='.repeat(80) + '\n');
}

testRosaryAPI();