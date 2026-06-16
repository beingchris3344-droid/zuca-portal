// backend/scripts/check-prayers-db.js
// Run with: node scripts/check-prayers-db.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPrayers() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 PRAYERS DATABASE CHECK');
  console.log('='.repeat(80));
  
  // 1. Get total count
  const totalPrayers = await prisma.prayer.count();
  console.log(`\n📊 Total prayers in database: ${totalPrayers}`);
  
  // 2. Get all categories
  const categories = await prisma.prayer.groupBy({
    by: ['category'],
    _count: true
  });
  
  console.log('\n📂 Categories:');
  categories.forEach(cat => {
    console.log(`   • ${cat.category}: ${cat._count} prayers`);
  });
  
  // 3. Check for Rosary-related prayers
  console.log('\n📿 ROSARY-RELATED PRAYERS:');
  
  const rosaryPrayers = await prisma.prayer.findMany({
    where: {
      OR: [
        { title: { contains: 'rosary', mode: 'insensitive' } },
        { title: { contains: 'rosário', mode: 'insensitive' } },
        { category: { contains: 'rosary', mode: 'insensitive' } },
        { category: { contains: 'rosário', mode: 'insensitive' } },
        { title: { contains: 'hail mary', mode: 'insensitive' } },
        { title: { contains: 'our father', mode: 'insensitive' } },
        { title: { contains: 'glory be', mode: 'insensitive' } },
        { title: { contains: 'fatima', mode: 'insensitive' } },
        { title: { contains: 'apostles creed', mode: 'insensitive' } },
        { title: { contains: 'hail holy queen', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      title: true,
      category: true,
      language: true,
      version: true,
      prayer: true,
      order: true,
      isActive: true
    }
  });
  
  if (rosaryPrayers.length === 0) {
    console.log('   ❌ No Rosary-related prayers found in database!');
  } else {
    console.log(`   ✅ Found ${rosaryPrayers.length} prayers:`);
    rosaryPrayers.forEach(prayer => {
      const prayerPreview = prayer.prayer ? prayer.prayer.substring(0, 60) + '...' : 'No content';
      console.log(`\n   📌 ${prayer.title}`);
      console.log(`      Category: ${prayer.category}`);
      console.log(`      Language: ${prayer.language}`);
      console.log(`      Active: ${prayer.isActive}`);
      console.log(`      Preview: ${prayerPreview}`);
    });
  }
  
  // 4. Get all prayers (first 20) to see what's there
  console.log('\n📜 ALL PRAYERS (first 20):');
  console.log('-'.repeat(80));
  
  const allPrayers = await prisma.prayer.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      category: true,
      language: true,
      isActive: true
    }
  });
  
  if (allPrayers.length === 0) {
    console.log('   ❌ No prayers found in database!');
  } else {
    allPrayers.forEach((prayer, index) => {
      console.log(`   ${index + 1}. ${prayer.title} [${prayer.category}] - Active: ${prayer.isActive}`);
    });
  }
  
  // 5. Check for specific Rosary component prayers
  console.log('\n🔍 SPECIFIC ROSARY COMPONENTS:');
  console.log('-'.repeat(80));
  
  const requiredPrayers = [
    'Our Father',
    'Hail Mary',
    'Glory Be',
    'Apostles Creed',
    'Fatima Prayer',
    'Hail Holy Queen'
  ];
  
  for (const prayerTitle of requiredPrayers) {
    const found = await prisma.prayer.findFirst({
      where: {
        title: { contains: prayerTitle, mode: 'insensitive' }
      }
    });
    
    if (found) {
      console.log(`   ✅ ${prayerTitle} - FOUND (ID: ${found.id})`);
    } else {
      console.log(`   ❌ ${prayerTitle} - NOT FOUND`);
    }
  }
  
  // 6. Check for mystery prayers
  console.log('\n🔮 ROSARY MYSTERIES:');
  console.log('-'.repeat(80));
  
  const mysteries = [
    'Annunciation', 'Visitation', 'Nativity', 'Presentation', 'Finding',
    'Agony', 'Scourging', 'Crowning', 'Carrying', 'Crucifixion',
    'Resurrection', 'Ascension', 'Descent', 'Assumption', 'Coronation',
    'Baptism', 'Cana', 'Kingdom', 'Transfiguration', 'Eucharist'
  ];
  
  let foundMysteries = 0;
  for (const mystery of mysteries) {
    const found = await prisma.prayer.findFirst({
      where: {
        OR: [
          { title: { contains: mystery, mode: 'insensitive' } },
          { prayer: { contains: mystery, mode: 'insensitive' } }
        ]
      }
    });
    
    if (found) {
      foundMysteries++;
      console.log(`   ✅ ${mystery} - found`);
    } else {
      console.log(`   ❌ ${mystery} - not found as standalone prayer`);
    }
  }
  
  console.log(`\n   📊 Found ${foundMysteries}/${mysteries.length} mysteries as prayers`);
  
  // 7. Summary and recommendations
  console.log('\n' + '='.repeat(80));
  console.log('📋 SUMMARY & RECOMMENDATIONS');
  console.log('='.repeat(80));
  
  if (rosaryPrayers.length === 0) {
    console.log('\n⚠️ ISSUE: No Rosary prayers found in database!');
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   1. Run the seed script to add Rosary prayers');
    console.log('   2. Or add them manually via admin panel');
    console.log('   3. The Rosary API endpoints will still work with hardcoded data');
  } else {
    console.log('\n✅ Rosary data exists in database');
    
    const missingPrayers = requiredPrayers.filter(prayer => {
      // Check if exists
      return !rosaryPrayers.some(rp => rp.title.toLowerCase().includes(prayer.toLowerCase()));
    });
    
    if (missingPrayers.length > 0) {
      console.log(`\n⚠️ Missing required Rosary prayers: ${missingPrayers.join(', ')}`);
    }
  }
  
  console.log('\n📌 NOTE:');
  console.log('   • The Rosary API routes use HARDCODED prayers as fallback');
  console.log('   • For best results, add the missing prayers to database');
  console.log('   • Mysteries are handled by API logic, not database');
  
  console.log('\n' + '='.repeat(80));
  console.log('🏁 CHECK COMPLETED');
  console.log('='.repeat(80) + '\n');
  
  await prisma.$disconnect();
}

// Run the check
checkPrayers().catch(console.error);