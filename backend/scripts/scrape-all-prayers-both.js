const scrapeMyCatholicLife = require('./scrape-mycatholic');
const scrapeEWTN = require('./scrape-rosary-wikipedia-v2');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('\n🙏 STARTING PRAYER SCRAPING FROM BOTH SOURCES\n');
  console.log('='.repeat(60));
  
  // Run both scrapers
  await scrapeMyCatholicLife();
  await new Promise(r => setTimeout(r, 3000)); // Wait between scrapers
  await scrapeEWTN();
  
  // Get final count
  const total = await prisma.prayer.count();
  console.log('\n' + '='.repeat(60));
  console.log(`\n🎉 TOTAL PRAYERS IN DATABASE: ${total}\n`);
  
  await prisma.$disconnect();
}

main().catch(console.error);