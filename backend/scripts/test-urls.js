const axios = require('axios');

async function test() {
  console.log('Testing URLs...\n');
  
  const urls = [
    'https://mycatholic.life/catholic-prayers/',
    'https://www.ewtn.com/catholicism/prayers',
    'https://www.ewtn.com/prayers',
    'https://www.catholic.org/prayers/'
  ];
  
  for (const url of urls) {
    try {
      const res = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000
      });
      console.log('✅', url, '- Works (', res.status, ')');
    } catch (err) {
      console.log('❌', url, '-', err.message);
    }
  }
}

test();