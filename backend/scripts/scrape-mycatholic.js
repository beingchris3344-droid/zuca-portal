const axios = require('axios');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeMyCatholicLife() {
  console.log('\n📿 SCRAPING: MY CATHOLIC LIFE\n');
  console.log('='.repeat(60));
  
  const baseUrl = 'https://mycatholic.life';
  const prayersUrl = 'https://mycatholic.life/catholic-prayers/';
  
  try {
    // Get the main prayers page
    const response = await axios.get(prayersUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    const prayerLinks = new Set();
    
    // Find all prayer links
    $('a').each((i, el) => {
      let href = $(el).attr('href');
      const text = $(el).text().trim();
      
      if (href && href.includes('/catholic-prayers/') && href !== prayersUrl) {
        if (href.startsWith('/')) href = baseUrl + href;
        if (href.startsWith(baseUrl)) {
          prayerLinks.add(href);
        }
      }
    });
    
    console.log(`📊 Found ${prayerLinks.size} prayer links\n`);
    
    let saved = 0;
    let skipped = 0;
    let failed = 0;
    const urls = Array.from(prayerLinks);
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`[${i + 1}/${urls.length}] ${url.substring(0, 80)}...`);
      
      try {
        const prayerPage = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 30000
        });
        
        const $$ = cheerio.load(prayerPage.data);
        
        // Get title
        let title = $$('h1').first().text().trim();
        if (!title) title = $$('.entry-title').text().trim();
        if (!title) title = $$('title').text().trim().replace(' - My Catholic Life!', '');
        
        // Get prayer content
        let prayerText = '';
        
        // Try different selectors
        const selectors = [
          '.entry-content',
          '.post-content',
          'article .content',
          '.prayer-content',
          'main article'
        ];
        
        for (const selector of selectors) {
          const content = $$(selector).text().trim();
          if (content && content.length > 100) {
            prayerText = content;
            break;
          }
        }
        
        // If still no content, get all paragraphs
        if (!prayerText) {
          prayerText = $$('p').map((i, p) => $$(p).text().trim()).get().join('\n\n');
        }
        
        // Clean up
        prayerText = prayerText
          .replace(/\s+/g, ' ')
          .replace(/Share this:.*$/s, '')
          .replace(/Subscribe to.*$/s, '')
          .replace(/Copyright.*$/s, '')
          .trim();
        
        if (title && prayerText && prayerText.length > 50) {
          // Check if already exists
          const existing = await prisma.prayer.findFirst({
            where: { title: title, source: { contains: 'mycatholic' } }
          });
          
          if (!existing) {
            await prisma.prayer.create({
              data: {
                title: title.substring(0, 200),
                category: detectCategoryMyCatholic(title, prayerText),
                prayer: prayerText,
                language: 'en',
                version: 'traditional',
                source: url,
                isActive: true
              }
            });
            saved++;
            console.log(`  ✅ Saved (${saved})`);
          } else {
            skipped++;
            console.log(`  ⏭️ Already exists`);
          }
        } else {
          failed++;
          console.log(`  ❌ No content extracted`);
        }
        
      } catch (err) {
        failed++;
        console.log(`  ❌ Error: ${err.message}`);
      }
      
      await delay(1000);
    }
    
    console.log(`\n📊 My Catholic Life Summary:`);
    console.log(`   ✅ Saved: ${saved}`);
    console.log(`   ⏭️ Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    
  } catch (err) {
    console.error('Error scraping My Catholic Life:', err.message);
  }
}

function detectCategoryMyCatholic(title, content) {
  const text = (title + ' ' + content.substring(0, 500)).toLowerCase();
  
  if (text.includes('mary') || text.includes('marian') || text.includes('hail mary') || text.includes('rosary') || text.includes('our lady')) {
    return 'marian';
  }
  if (text.includes('saint') || text.includes('st.') || text.includes('st ') || text.includes('joseph') || text.includes('michael')) {
    return 'saints';
  }
  if (text.includes('penitent') || text.includes('contrition') || text.includes('confession')) {
    return 'penitential';
  }
  if (text.includes('mass') || text.includes('eucharist') || text.includes('communion')) {
    return 'liturgical';
  }
  if (text.includes('morning') || text.includes('evening') || text.includes('daily')) {
    return 'daily';
  }
  if (text.includes('creed') || text.includes('i believe')) {
    return 'creed';
  }
  if (text.includes('novena')) {
    return 'novena';
  }
  if (text.includes('angel') || text.includes('guardian angel')) {
    return 'angelic';
  }
  
  return 'other';
}

module.exports = scrapeMyCatholicLife;