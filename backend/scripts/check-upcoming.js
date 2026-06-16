const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUpcoming() {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  
  const upcoming = await prisma.scheduledNotification.findMany({
    where: {
      notifyAt: {
        gte: now,
        lte: oneHourFromNow
      },
      isSent: false
    },
    include: { event: true }
  });
  
  console.log(`📬 Notifications to send in next hour: ${upcoming.length}\n`);
  
  if (upcoming.length === 0) {
    console.log('No notifications in the next hour.');
    
    // Show next notification
    const next = await prisma.scheduledNotification.findFirst({
      where: { isSent: false, notifyAt: { gt: now } },
      orderBy: { notifyAt: 'asc' }
    });
    
    if (next) {
      const minutes = Math.round((next.notifyAt - now) / 60000);
      console.log(`Next notification at: ${next.notifyAt.toLocaleString()} (in ${minutes} minutes)`);
      console.log(`   Title: ${next.title}`);
    }
  } else {
    for (const n of upcoming) {
      const minutes = Math.round((n.notifyAt - now) / 60000);
      console.log(`📌 ${n.title}`);
      console.log(`   Event: ${n.event.title}`);
      console.log(`   In: ${minutes} minutes (at ${n.notifyAt.toLocaleString()})`);
      console.log('');
    }
  }
  
  await prisma.$disconnect();
}

checkUpcoming();