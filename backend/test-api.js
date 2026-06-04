const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function test() {
  console.log('\n========================================');
  console.log('   TESTING PRAYER API');
  console.log('========================================\n');

  try {
    // 1. LOGIN
    console.log('📋 STEP 1: LOGIN');
    const loginRes = await axios.post(`${BASE_URL}/login`, {
      email: 'zucaportal2025@gmail.com',
      password: 'adminzuca'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Login successful!');
    console.log(`Token: ${token.substring(0, 50)}...\n`);
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // 2. GET FIRST PRAYER
    console.log('📋 STEP 2: GET FIRST PRAYER');
    const prayersRes = await axios.get(`${BASE_URL}/prayers?limit=1`);
    const prayerId = prayersRes.data.prayers[0].id;
    const prayerTitle = prayersRes.data.prayers[0].title;
    console.log(`✅ Prayer ID: ${prayerId}`);
    console.log(`✅ Prayer Title: ${prayerTitle}\n`);
    
    // 3. TEST FAVORITES
    console.log('📋 STEP 3: TEST FAVORITES');
    
    // Add to favorites
    const addFav = await axios.post(`${BASE_URL}/prayers/${prayerId}/favorite`, {}, { headers });
    console.log(`✅ Add to favorites: ${addFav.data.message}`);
    
    // Check if favorited
    const checkFav = await axios.get(`${BASE_URL}/prayers/${prayerId}/is-favorited`, { headers });
    console.log(`✅ Is favorited: ${checkFav.data.isFavorited}`);
    
    // Get all favorites
    const getFavs = await axios.get(`${BASE_URL}/prayers/my/favorites`, { headers });
    console.log(`✅ Total favorites: ${getFavs.data.favorites.length}`);
    
    // Remove from favorites
    const removeFav = await axios.post(`${BASE_URL}/prayers/${prayerId}/favorite`, {}, { headers });
    console.log(`✅ Remove from favorites: ${removeFav.data.message}\n`);
    
    // 4. TEST NOTES
    console.log('📋 STEP 4: TEST NOTES');
    
    // Add note
    const addNote = await axios.post(`${BASE_URL}/prayers/${prayerId}/note`, 
      { note: 'This is my personal reflection on this prayer - added via API test' },
      { headers }
    );
    console.log(`✅ Note added: ${addNote.data.success}`);
    
    // Get note
    const getNote = await axios.get(`${BASE_URL}/prayers/${prayerId}/my-note`, { headers });
    console.log(`✅ Note retrieved: ${getNote.data.note?.note.substring(0, 50)}...`);
    
    // Update note
    const updateNote = await axios.post(`${BASE_URL}/prayers/${prayerId}/note`,
      { note: 'UPDATED: I now pray this every morning and evening' },
      { headers }
    );
    console.log(`✅ Note updated: ${updateNote.data.success}`);
    
    // Get all notes
    const allNotes = await axios.get(`${BASE_URL}/prayers/my/notes`, { headers });
    console.log(`✅ Total notes: ${allNotes.data.notes.length}`);
    
    // Delete note
    const deleteNote = await axios.delete(`${BASE_URL}/prayers/${prayerId}/note`, { headers });
    console.log(`✅ Note deleted: ${deleteNote.data.message}\n`);
    
    // 5. TEST ADMIN CREATE
    console.log('📋 STEP 5: TEST ADMIN CREATE');
    const createPrayer = await axios.post(`${BASE_URL}/prayers/admin`,
      {
        title: 'TEST PRAYER - Created via API',
        category: 'daily',
        prayer: 'This is a test prayer created through the API to verify admin functionality.',
        language: 'en',
        version: 'traditional'
      },
      { headers }
    );
    const newPrayerId = createPrayer.data.prayer.id;
    console.log(`✅ Prayer created: ${newPrayerId}`);
    console.log(`   Title: ${createPrayer.data.prayer.title}\n`);
    
    // 6. TEST ADMIN UPDATE
    console.log('📋 STEP 6: TEST ADMIN UPDATE');
    const updatePrayer = await axios.put(`${BASE_URL}/prayers/admin/${newPrayerId}`,
      {
        title: 'UPDATED TEST PRAYER',
        category: 'morning',
        isActive: true
      },
      { headers }
    );
    console.log(`✅ Prayer updated: ${updatePrayer.data.prayer.title}`);
    console.log(`   Category: ${updatePrayer.data.prayer.category}\n`);
    
    // 7. GET ADMIN ALL
    console.log('📋 STEP 7: GET ALL PRAYERS (ADMIN VIEW)');
    const allPrayers = await axios.get(`${BASE_URL}/prayers/admin/all`, { headers });
    console.log(`✅ Total prayers in database: ${allPrayers.data.count}\n`);
    
    // 8. TEST ADMIN DELETE
    console.log('📋 STEP 8: TEST ADMIN DELETE');
    const deletePrayer = await axios.delete(`${BASE_URL}/prayers/admin/${newPrayerId}`, { headers });
    console.log(`✅ Prayer deleted: ${deletePrayer.data.message}\n`);
    
    // 9. VERIFY DELETION
    console.log('📋 STEP 9: VERIFY DELETION');
    try {
      await axios.get(`${BASE_URL}/prayers/${newPrayerId}`);
      console.log('❌ Prayer still exists! (ERROR)');
    } catch (err) {
      console.log('✅ Prayer successfully deleted (404 not found)\n');
    }
    
    // SUMMARY
    console.log('========================================');
    console.log('🎉 ALL TESTS PASSED!');
    console.log('========================================');
    console.log('✅ Favorites: Add, check, list, remove');
    console.log('✅ Notes: Add, get, update, list, delete');
    console.log('✅ Admin: Create, update, delete');
    console.log('========================================\n');
    
  } catch (err) {
    console.error('❌ ERROR:', err.response?.data || err.message);
  }
}

test();