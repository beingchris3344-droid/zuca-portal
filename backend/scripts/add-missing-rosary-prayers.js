// backend/scripts/add-missing-rosary-prayers.js
// Run with: node scripts/add-missing-rosary-prayers.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMissingPrayers() {
  console.log('\n' + '='.repeat(80));
  console.log('📿 ADDING MISSING ROSARY PRAYERS');
  console.log('='.repeat(80));
  
  // Check if Apostles Creed already exists
  const existingApostlesCreed = await prisma.prayer.findFirst({
    where: {
      title: { contains: 'Apostles Creed', mode: 'insensitive' }
    }
  });
  
  // 1. Add Apostles Creed if not exists
  if (!existingApostlesCreed) {
    console.log('\n📝 Adding Apostles Creed...');
    
    const apostlesCreed = await prisma.prayer.create({
      data: {
        title: 'Apostles Creed',
        category: 'creed',
        language: 'en',
        version: 'traditional',
        prayer: `I believe in God, the Father almighty,
Creator of heaven and earth,
and in Jesus Christ, his only Son, our Lord,
who was conceived by the Holy Spirit,
born of the Virgin Mary,
suffered under Pontius Pilate,
was crucified, died and was buried;
he descended into hell;
on the third day he rose again from the dead;
he ascended into heaven,
and is seated at the right hand of God the Father almighty;
from there he will come to judge the living and the dead.

I believe in the Holy Spirit,
the holy catholic Church,
the communion of saints,
the forgiveness of sins,
the resurrection of the body,
and life everlasting.
Amen.`,
        order: 10,
        isActive: true,
        source: 'manual'
      }
    });
    
    console.log(`   ✅ Added: ${apostlesCreed.title} (ID: ${apostlesCreed.id})`);
  } else {
    console.log(`\n📝 Apostles Creed already exists (ID: ${existingApostlesCreed.id})`);
  }
  
  // Check if Fatima Prayer already exists
  const existingFatima = await prisma.prayer.findFirst({
    where: {
      OR: [
        { title: { contains: 'Fatima Prayer', mode: 'insensitive' } },
        { title: { contains: 'O my Jesus', mode: 'insensitive' } }
      ]
    }
  });
  
  // 2. Add Fatima Prayer if not exists
  if (!existingFatima) {
    console.log('\n📝 Adding Fatima Prayer...');
    
    const fatimaPrayer = await prisma.prayer.create({
      data: {
        title: 'Fatima Prayer',
        category: 'rosary',
        language: 'en',
        version: 'traditional',
        prayer: `O my Jesus, forgive us our sins,
save us from the fires of hell,
lead all souls to heaven,
especially those in most need of thy mercy.
Amen.`,
        order: 15,
        isActive: true,
        source: 'manual'
      }
    });
    
    console.log(`   ✅ Added: ${fatimaPrayer.title} (ID: ${fatimaPrayer.id})`);
  } else {
    console.log(`\n📝 Fatima Prayer already exists (ID: ${existingFatima.id})`);
  }
  
  // 3. Verify all prayers now exist
  console.log('\n🔍 VERIFYING ALL ROSARY PRAYERS:');
  console.log('-'.repeat(40));
  
  const requiredPrayers = [
    'Our Father',
    'Hail Mary',
    'Glory Be',
    'Apostles Creed',
    'Fatima Prayer',
    'Hail Holy Queen'
  ];
  
  let allFound = true;
  for (const prayerTitle of requiredPrayers) {
    const found = await prisma.prayer.findFirst({
      where: {
        title: { contains: prayerTitle, mode: 'insensitive' }
      }
    });
    
    if (found) {
      console.log(`   ✅ ${prayerTitle} - FOUND`);
    } else {
      console.log(`   ❌ ${prayerTitle} - STILL MISSING`);
      allFound = false;
    }
  }
  
  // 4. Show complete Rosary guide
  console.log('\n' + '='.repeat(80));
  console.log('📿 COMPLETE ROSARY PRAYER SET');
  console.log('='.repeat(80));
  
  console.log('\nThe Rosary now has all required prayers:');
  console.log('   1. Sign of the Cross');
  console.log('   2. Apostles Creed ✅');
  console.log('   3. Our Father');
  console.log('   4. Three Hail Marys');
  console.log('   5. Glory Be');
  console.log('   6. Fatima Prayer ✅');
  console.log('   7. Hail Holy Queen');
  
  // 5. Get updated count
  const totalPrayers = await prisma.prayer.count();
  const rosaryPrayers = await prisma.prayer.count({
    where: { category: 'rosary' }
  });
  
  console.log(`\n📊 DATABASE STATS:`);
  console.log(`   Total prayers: ${totalPrayers}`);
  console.log(`   Rosary prayers: ${rosaryPrayers}`);
  
  if (allFound) {
    console.log('\n🎉 SUCCESS! All Rosary prayers are now in the database!');
    console.log('\n💡 You can now use the Rosary API endpoints:');
    console.log('   GET /api/prayers/rosary/mysteries - Get today\'s mysteries');
    console.log('   GET /api/prayers/rosary/guide - Get complete Rosary guide');
    console.log('   GET /api/prayers/rosary/mystery/:name - Get specific mystery');
  } else {
    console.log('\n⚠️ Some prayers are still missing. Please check manually.');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🏁 SCRIPT COMPLETED');
  console.log('='.repeat(80) + '\n');
  
  await prisma.$disconnect();
}

// Run the script
addMissingPrayers().catch(console.error);