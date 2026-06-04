const axios = require('axios');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function scrapeRosaryFromWikipedia() {
  console.log('\n📿 SCRAPING ROSARY MYSTERIES FROM WIKIPEDIA\n');
  console.log('='.repeat(60));
  
  const url = 'https://en.wikipedia.org/wiki/Rosary';
  
  try {
    const response = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Find the table that contains all mysteries
    // Wikipedia has a wikitable with the mysteries
    
    const tables = $('table.wikitable');
    let allMysteries = [];
    
    for (const table of tables) {
      const rows = $(table).find('tr');
      let currentSet = null;
      
      rows.each((i, row) => {
        const cells = $(row).find('td');
        const headers = $(row).find('th');
        
        // Check if this row has mystery set headers
        if (headers.length >= 4) {
          const headerText = $(headers[0]).text().toLowerCase();
          if (headerText.includes('joyful')) currentSet = 'joyful';
          else if (headerText.includes('sorrowful')) currentSet = 'sorrowful';
          else if (headerText.includes('glorious')) currentSet = 'glorious';
          else if (headerText.includes('luminous')) currentSet = 'luminous';
        }
        
        // Extract mystery names from cells
        if (cells.length >= 4 && currentSet) {
          for (let col = 0; col < 4 && col < cells.length; col++) {
            let mysteryText = $(cells[col]).text().trim();
            mysteryText = mysteryText.replace(/\[.*?\]/g, '').replace(/\n/g, ' ');
            if (mysteryText && mysteryText.length > 5 && mysteryText.length < 150) {
              allMysteries.push({
                type: currentSet,
                title: mysteryText,
                order: (allMysteries.filter(m => m.type === currentSet).length) + 1
              });
            }
          }
        }
      });
    }
    
    // Also look for the traditional list in the text
    const pageText = $('body').text();
    
    // Extract using regex patterns for each mystery set
    const mysteryPatterns = [
      { type: 'joyful', pattern: /Joyful Mysteries[^\n]*\n([\s\S]*?)(?=Luminous|Sorrowful|Glorious|$)/i },
      { type: 'luminous', pattern: /Luminous Mysteries[^\n]*\n([\s\S]*?)(?=Sorrowful|Glorious|$)/i },
      { type: 'sorrowful', pattern: /Sorrowful Mysteries[^\n]*\n([\s\S]*?)(?=Glorious|$)/i },
      { type: 'glorious', pattern: /Glorious Mysteries[^\n]*\n([\s\S]*?)(?=$)/i }
    ];
    
    for (const pattern of mysteryPatterns) {
      const match = pageText.match(pattern.pattern);
      if (match) {
        const section = match[1];
        const numberPattern = /(\d+)\.\s+([^\n.]+)/g;
        let numMatch;
        let order = 1;
        
        while ((numMatch = numberPattern.exec(section)) !== null) {
          let title = numMatch[2].trim();
          title = title.replace(/\[.*?\]/g, '');
          if (title && title.length > 3 && title.length < 100) {
            allMysteries.push({
              type: pattern.type,
              title: title,
              order: order
            });
            order++;
          }
        }
      }
    }
    
    // Deduplicate by (type, order)
    const uniqueMysteries = [];
    const seen = new Set();
    for (const m of allMysteries) {
      const key = `${m.type}-${m.order}`;
      if (!seen.has(key) && m.title && m.order <= 5) {
        seen.add(key);
        uniqueMysteries.push(m);
      }
    }
    
    // Fallback mysteries if we didn't get all 20
    const fallbackMysteries = {
      joyful: [
        'The Annunciation',
        'The Visitation', 
        'The Nativity',
        'The Presentation',
        'The Finding in the Temple'
      ],
      sorrowful: [
        'The Agony in the Garden',
        'The Scourging at the Pillar',
        'The Crowning with Thorns',
        'The Carrying of the Cross',
        'The Crucifixion'
      ],
      glorious: [
        'The Resurrection',
        'The Ascension',
        'The Descent of the Holy Spirit',
        'The Assumption of Mary',
        'The Coronation of Mary'
      ],
      luminous: [
        'The Baptism of Jesus',
        'The Wedding at Cana',
        'The Proclamation of the Kingdom',
        'The Transfiguration',
        'The Institution of the Eucharist'
      ]
    };
    
    // Ensure we have all 20 mysteries
    let totalSaved = 0;
    const mysteryTypes = ['joyful', 'sorrowful', 'glorious', 'luminous'];
    
    for (const type of mysteryTypes) {
      console.log(`\n📖 Processing ${type.toUpperCase()} mysteries...`);
      
      const scrapedMysteries = uniqueMysteries.filter(m => m.type === type);
      const finalMysteries = scrapedMysteries.length === 5 ? scrapedMysteries : 
        fallbackMysteries[type].map((title, idx) => ({ type, title, order: idx + 1 }));
      
      for (const mystery of finalMysteries) {
        // Check if already exists
        const existing = await prisma.prayer.findFirst({
          where: {
            category: 'rosary',
            subcategory: type,
            order: mystery.order
          }
        });
        
        if (!existing) {
          await prisma.prayer.create({
            data: {
              title: mystery.title,
              category: 'rosary',
              subcategory: type,
              prayer: `Meditation on the ${mystery.title}`,
              language: 'en',
              version: 'traditional',
              order: mystery.order,
              isActive: true,
              source: url
            }
          });
          console.log(`  ✅ ${mystery.order}. ${mystery.title}`);
          totalSaved++;
        } else {
          console.log(`  ⏭️ ${mystery.order}. ${mystery.title} (already exists)`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n✨ TOTAL ROSARY MYSTERIES SAVED: ${totalSaved}`);
    
    const finalCount = await prisma.prayer.count({
      where: { category: 'rosary' }
    });
    console.log(`📊 Total rosary mysteries in database: ${finalCount}/20`);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  await prisma.$disconnect();
}

scrapeRosaryFromWikipedia();