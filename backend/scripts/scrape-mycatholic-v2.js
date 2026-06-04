const axios = require('axios');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeMyCatholicLife() {
  console.log('\n📿 SCRAPING: MY CATHOLIC LIFE\n');
  console.log('='.repeat(60));
  
  const baseUrl = 'https://mycatholic.life';
  const startUrl = 'https://mycatholic.life/catholic-prayers/';
  
  try {
    // Get the main prayers page
    console.log('Fetching main page...');
    const response = await axios.get(startUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    const prayerUrls = new Set();
    
    // Find all prayer links on the page
    $('a').each((i, el) => {
      let href = $(el).attr('href');
      const text = $(el).text().trim();
      
      // Look for prayer links (they have /catholic-prayers/ in the path)
      if (href && href.includes('/catholic-prayers/') && href !== startUrl) {
        // Skip anchor links and query params
        if (!href.includes('#') && !href.includes('?')) {
          if (href.startsWith('/')) href = baseUrl + href;
          if (href.startsWith(baseUrl)) {
            prayerUrls.add(href);
          }
        }
      }
    });
    
    console.log(`\n📊 Found ${prayerUrls.size} prayer pages\n`);
    
    let saved = 0;
    let skipped = 0;
    let failed = 0;
    const urls = Array.from(prayerUrls);
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`[${i + 1}/${urls.length}] ${url.replace(baseUrl, '')}`);
      
      try {
        const prayerPage = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 30000
        });
        
        const $$ = cheerio.load(prayerPage.data);
        
        // Get title - try multiple selectors
        let title = $$('h1').first().text().trim();
        if (!title) title = $$('.entry-title').text().trim();
        if (!title) title = $$('title').text().trim().replace(' - My Catholic Life!', '');
        
        // Get prayer content
        let prayerText = '';
        
        // Try different content selectors
        const contentSelectors = [
          '.entry-content',
          '.post-content',
          'article .entry-content',
          'main .content',
          '.prayer-content'
        ];
        
        for (const selector of contentSelectors) {
          const content = $$(selector).text().trim();
          if (content && content.length > 100) {
            prayerText = content;
            break;
          }
        }
        
        // If still no content, get all paragraphs
        if (!prayerText || prayerText.length < 100) {
          prayerText = $$('p').map((i, p) => $$(p).text().trim()).get().join('\n\n');
        }
        
        // Clean up the prayer text
        prayerText = prayerText
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .replace(/Share this:.*$/s, '')
          .replace(/Subscribe to.*$/s, '')
          .replace(/Copyright.*$/s, '')
          .replace(/Search for:.*$/s, '')
          .trim();
        
        // Determine category based on URL or content
        let category = 'other';
        const urlLower = url.toLowerCase();
        const titleLower = title.toLowerCase();
        
        if (urlLower.includes('mary') || titleLower.includes('mary') || titleLower.includes('marian') || titleLower.includes('hail mary')) {
          category = 'marian';
        } else if (urlLower.includes('saint') || titleLower.includes('st.') || titleLower.includes('saint')) {
          category = 'saints';
        } else if (urlLower.includes('daily') || titleLower.includes('daily') || titleLower.includes('morning') || titleLower.includes('evening')) {
          category = 'daily';
        } else if (urlLower.includes('confession') || titleLower.includes('penitent') || titleLower.includes('contrition')) {
          category = 'penitential';
        } else if (urlLower.includes('novena')) {
          category = 'novena';
        } else if (urlLower.includes('angel')) {
          category = 'angelic';
        } else if (urlLower.includes('mass') || urlLower.includes('eucharist')) {
          category = 'liturgical';
        }
        
        if (title && prayerText && prayerText.length > 50) {
          // Check if prayer already exists (by title)
          const existing = await prisma.prayer.findFirst({
            where: {
              title: title,
              source: { contains: 'mycatholic' }
            }
          });
          
          if (!existing) {
            await prisma.prayer.create({
              data: {
                title: title.substring(0, 200),
                category: category,
                prayer: prayerText.substring(0, 5000), // Limit length
                language: 'en',
                version: 'traditional',
                source: url,
                isActive: true
              }
            });
            saved++;
            console.log(`  ✅ Saved as: ${category}`);
          } else {
            skipped++;
            console.log(`  ⏭️ Already exists`);
          }
        } else {
          failed++;
          console.log(`  ❌ No content (title: ${!!title}, text length: ${prayerText?.length || 0})`);
        }
        
      } catch (err) {
        failed++;
        console.log(`  ❌ Error: ${err.message}`);
      }
      
      // Be respectful - delay between requests
      await delay(1500);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 SCRAPING SUMMARY:');
    console.log(`   ✅ New prayers saved: ${saved}`);
    console.log(`   ⏭️ Already existed: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📚 Total processed: ${urls.length}`);
    
  } catch (err) {
    console.error('Error scraping My Catholic Life:', err.message);
  }
}

// Run the scraper
scrapeMyCatholicLife()
  .catch(console.error)
  .finally(async () => {
    const total = await prisma.prayer.count();
    console.log(`\n📊 TOTAL PRAYERS IN DATABASE: ${total}\n`);
    await prisma.$disconnect();
  });