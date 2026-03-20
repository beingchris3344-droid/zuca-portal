// backend/services/infiniteCalendar.js
class InfiniteCalendarService {
  constructor() {
    // Your populated base years (the ones you have complete data for)
    this.baseYears = {
      sunday: {
        A: 2026,  // Year A data from 2026
        B: 2027,  // Year B data from 2027
        C: 2025   // Year C data from 2025
      },
      weekday: {
        I: 2027,  // Year I data from 2027 (odd)
        II: 2026  // Year II data from 2026 (even)
      }
    };

    // SOLEMNITIES - fixed dates that should always have readings
    this.solemnities = [
      { month: 1, day: 1, name: "Mary, Mother of God" },
      { month: 1, day: 6, name: "Epiphany" },
      { month: 3, day: 19, name: "St. Joseph" },
      { month: 3, day: 25, name: "Annunciation" },
      { month: 5, day: 9, name: "Ascension" }, // Approximate - varies by region
      { month: 6, day: 2, name: "Corpus Christi" }, // Approximate - varies
      { month: 6, day: 29, name: "Sts. Peter and Paul" },
      { month: 8, day: 15, name: "Assumption" },
      { month: 11, day: 1, name: "All Saints" },
      { month: 12, day: 8, name: "Immaculate Conception" },
      { month: 12, day: 25, name: "Christmas" }
    ];
  }

  /**
   * Get readings for ANY date - past, present, or future
   */
  async getReadingsForAnyDate(targetDate, prisma) {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();
    const isSunday = targetDate.getDay() === 0;
    
    // If year is already in your database, use it directly
    if (year >= 2024 && year <= 2028) {
      return this.getDirectReadings(targetDate, prisma);
    }
    
    // For any other year, map to your base data
    const sourceYear = await this.findSourceYear(targetDate, isSunday, prisma);
    const sourceDate = new Date(sourceYear, month, day);
    
    console.log(`🔄 Mapping ${year} → ${sourceYear} for ${targetDate.toDateString()}`);
    
    // Get readings from source year
    const sourceReadings = await this.getDirectReadings(sourceDate, prisma);
    
    if (sourceReadings) {
      // Add mapping metadata
      return {
        ...sourceReadings,
        _mappedFrom: sourceDate.toISOString().split('T')[0],
        _originalYear: year
      };
    }
    
    return null;
  }

  async findSourceYear(targetDate, isSunday, prisma) {
    const targetYear = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();
    
    // STEP 1: Check if this is a solemnity (fixed date)
    const isSolemnity = this.solemnities.some(s => 
      s.month === month && s.day === day
    );
    
    // In findSourceYear method, replace the solemnity section:

if (isSolemnity) {
  console.log(`✨ ${targetDate.toDateString()} is a solemnity - searching for COMPLETE readings...`);
  
  // Define what "complete" means for a solemnity
  // We need Gospel + First Reading at minimum
  let bestYear = null;
  let bestScore = -1;
  
  // Try each of your populated years (2024-2028)
  for (let testYear = 2024; testYear <= 2028; testYear++) {
    const testDate = new Date(testYear, targetDate.getMonth(), day);
    
    const readings = await this.getDirectReadings(testDate, prisma);
    
    if (readings && readings.readings) {
      // Calculate completeness score
      let score = 0;
      const r = readings.readings;
      
      // Gospel is most important (3 points if has text)
      if (r.gospel && r.gospel.text && r.gospel.text.length > 50) score += 3;
      // First Reading is next (2 points)
      if (r.firstReading && r.firstReading.text && r.firstReading.text.length > 50) score += 2;
      // Psalm (1 point)
      if (r.responsorialPsalm && r.responsorialPsalm.text && r.responsorialPsalm.text.length > 20) score += 1;
      // Second Reading (1 point, optional for some solemnities)
      if (r.secondReading && r.secondReading.text && r.secondReading.text.length > 20) score += 1;
      
      // Bonus: If source is not fallback
      if (r.source !== 'fallback') score += 1;
      
      console.log(`   Year ${testYear}: score ${score}`);
      
      if (score > bestScore) {
        bestScore = score;
        bestYear = testYear;
      }
      
      // If we found a perfect score (7+), stop searching
      if (bestScore >= 7) break;
    }
  }
  
  if (bestYear) {
    console.log(`✅ Selected ${bestYear} with score ${bestScore}`);
    return bestYear;
  }
  
  console.log(`⚠️ No complete solemnity readings found, using cycle mapping`);
}
    
    // STEP 2: Regular cycle-based mapping
    if (isSunday) {
      // Sunday cycle: A(2026) → B(2027) → C(2025) → repeats
      const cycleMap = {
        0: 2026, // Year A
        1: 2027, // Year B
        2: 2025  // Year C
      };
      
      // Calculate cycle offset from your base
      const offset = (targetYear - 2026) % 3;
      const adjustedOffset = ((offset % 3) + 3) % 3; // Handle negatives
      
      return cycleMap[adjustedOffset];
    } else {
      // Weekday cycle: I(odd years), II(even years)
      const targetParity = targetYear % 2;
      return targetParity === 0 ? 2026 : 2027; // Even → II (2026), Odd → I (2027)
    }
  }

  async getDirectReadings(date, prisma) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await prisma.liturgicalDay.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
  }

  /**
   * Pre-populate future years using mapping (optional)
   */
  async prePopulateYears(startYear, endYear, prisma) {
    console.log(`🌍 Pre-populating years ${startYear} to ${endYear}...`);
    
    for (let year = startYear; year <= endYear; year++) {
      if (year >= 2024 && year <= 2028) continue; // Skip already populated
      
      console.log(`📅 Processing year ${year}...`);
      
      for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
          const targetDate = new Date(year, month, day);
          
          // Check if already exists
          const exists = await prisma.liturgicalDay.findFirst({
            where: {
              date: {
                gte: new Date(year, month, day, 0, 0, 0),
                lte: new Date(year, month, day, 23, 59, 59, 999)
              }
            }
          });
          
          if (!exists) {
            const sourceReadings = await this.getReadingsForAnyDate(targetDate, prisma);
            
            if (sourceReadings) {
              await prisma.liturgicalDay.create({
                data: {
                  date: targetDate,
                  season: sourceReadings.season,
                  seasonName: sourceReadings.seasonName,
                  celebration: sourceReadings.celebration,
                  celebrationType: sourceReadings.celebrationType,
                  liturgicalColor: sourceReadings.liturgicalColor,
                  rank: sourceReadings.rank,
                  yearCycle: this.getCycleForYear(year, targetDate.getDay() === 0),
                  weekdayCycle: year % 2 === 0 ? 'II' : 'I',
                  weekNumber: sourceReadings.weekNumber,
                  holyDayOfObligation: sourceReadings.holyDayOfObligation,
                  readings: sourceReadings.readings
                }
              });
            }
          }
        }
      }
    }
    
    console.log(`✅ Pre-population complete for years ${startYear}-${endYear}`);
  }

  getCycleForYear(year, isSunday) {
    if (!isSunday) return null;
    
    const cycles = ['A', 'B', 'C'];
    const offset = (year - 2026) % 3;
    const adjustedOffset = ((offset % 3) + 3) % 3;
    return cycles[adjustedOffset];
  }
}

module.exports = new InfiniteCalendarService();