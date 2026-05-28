// Open IndexedDB for storing offline check-ins
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zuca_offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingCheckins')) {
        db.createObjectStore('pendingCheckins', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offlineData')) {
        db.createObjectStore('offlineData', { keyPath: 'key' });
      }
    };
  });
};

// Save offline check-in
export const saveOfflineCheckin = async (sheetId, deviceId, deviceName) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['pendingCheckins'], 'readwrite');
    const store = transaction.objectStore('pendingCheckins');
    
    const checkin = {
      id: Date.now(),
      sheetId,
      deviceId,
      deviceName: deviceName || 'Offline Check-in',
      timestamp: new Date().toISOString(),
      synced: false
    };
    
    store.add(checkin);
    console.log('💾 Offline check-in saved:', checkin);
    return checkin;
  } catch (error) {
    console.error('Failed to save offline check-in:', error);
    return null;
  }
};

// Get all pending check-ins
export const getPendingCheckins = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pendingCheckins'], 'readonly');
      const store = transaction.objectStore('pendingCheckins');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get pending check-ins:', error);
    return [];
  }
};

// Remove a synced check-in
export const removePendingCheckin = async (id) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['pendingCheckins'], 'readwrite');
    const store = transaction.objectStore('pendingCheckins');
    store.delete(id);
    console.log('🗑️ Removed synced check-in:', id);
  } catch (error) {
    console.error('Failed to remove check-in:', error);
  }
};

// Save offline data (like active sheets)
export const saveOfflineData = async (key, data) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['offlineData'], 'readwrite');
    const store = transaction.objectStore('offlineData');
    store.put({ key, data, timestamp: Date.now() });
    console.log('💾 Offline data saved:', key);
  } catch (error) {
    console.error('Failed to save offline data:', error);
  }
};

// Get offline data
export const getOfflineData = async (key) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get offline data:', error);
    return null;
  }
};

// Sync all pending check-ins when back online
export const syncOfflineCheckins = async (api, getHeaders) => {
  const pending = await getPendingCheckins();
  
  if (pending.length === 0) return;
  
  console.log(`🔄 Syncing ${pending.length} offline check-in(s)...`);
  
  let synced = 0;
  let failed = 0;
  
  for (const checkin of pending) {
    try {
      const response = await api.post('/api/attendance/self-checkin', {
        sheetId: checkin.sheetId,
        deviceId: checkin.deviceId,
        deviceName: `${checkin.deviceName} (Synced)`
      }, { headers: getHeaders() });
      
      if (response.data.success) {
        await removePendingCheckin(checkin.id);
        synced++;
        console.log(`✅ Synced check-in for sheet: ${checkin.sheetId}`);
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      console.error(`❌ Failed to sync check-in ${checkin.id}:`, error);
    }
  }
  
  console.log(`📊 Sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
};

// Clear all pending check-ins (for testing)
export const clearAllPendingCheckins = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['pendingCheckins'], 'readwrite');
    const store = transaction.objectStore('pendingCheckins');
    store.clear();
    console.log('🗑️ All pending check-ins cleared');
  } catch (error) {
    console.error('Failed to clear check-ins:', error);
  }
};

// Get pending count
export const getPendingCount = async () => {
  const pending = await getPendingCheckins();
  return pending.length;
};