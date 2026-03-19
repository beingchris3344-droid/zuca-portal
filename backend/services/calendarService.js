const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const romcal = require('romcal');

class CalendarService {
  constructor() {
    this.romcal = romcal;
  }

  async generateLiturgicalData(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    try {
      console.log(`🔍 Generating for: ${year}-${month}-${day}`);
      
      // Get calendar for the year
      const calendar = await this.romcal.calendarFor({
        year: year,
        country: 'general',
        locale: 'en'
      });
      
      // Find the specific day by comparing the moment date
      const targetDate = new Date(year, month-1, day);
      targetDate.setHours(0, 0, 0, 0);
      
      const dayData = calendar.find(item => {
        const itemDate = new Date(item.moment);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === targetDate.getTime();
      });
      
      if (!dayData) {
        throw new Error(`No data for ${year}-${month}-${day}`);
      }
      
      console.log('✅ Found data for:', dayData.name);
      return this.transformData(dayData, date);
      
    } catch (error) {
      console.error('Romcal error:', error);
      throw error;
    }
  }

  transformData(romcalData, date) {
    // Check if there are multiple celebrations
    const celebrations = romcalData.celebrations || [romcalData];
    
    // Find the highest ranking celebration (SOLEMNITY > FEAST > MEMORIAL > COMMEMORATION > FERIA)
    let primaryCelebration = celebrations[0]; // Default to first
    
    // Look for a solemnity first
    for (const celebration of celebrations) {
      if (celebration.type === 'SOLEMNITY') {
        primaryCelebration = celebration;
        break;
      }
    }
    
    // If no solemnity, look for a feast
    if (primaryCelebration.type !== 'SOLEMNITY') {
      for (const celebration of celebrations) {
        if (celebration.type === 'FEAST') {
          primaryCelebration = celebration;
          break;
        }
      }
    }
    
    // If no feast, look for a memorial
    if (primaryCelebration.type !== 'SOLEMNITY' && primaryCelebration.type !== 'FEAST') {
      for (const celebration of celebrations) {
        if (celebration.type === 'MEMORIAL') {
          primaryCelebration = celebration;
          break;
        }
      }
    }
    
    const name = primaryCelebration.name || 'Weekday';
    const type = primaryCelebration.type || 'WEEKDAY';
    const season = romcalData.data?.season?.value || 'Ordinary Time';
    const color = primaryCelebration.colour || romcalData.data?.meta?.liturgicalColor?.value || '#008000';
    const cycle = romcalData.data?.meta?.cycle?.value || 'Year C';
    
    // Map type to celebration type
    let celebrationType = 'weekday';
    if (type === 'SOLEMNITY') celebrationType = 'solemnity';
    else if (type === 'FEAST') celebrationType = 'feast';
    else if (type === 'MEMORIAL') celebrationType = 'memorial';
    else if (type === 'COMMEMORATION') celebrationType = 'optional memorial';
    
    // Map season to our format
    let seasonKey = 'ordinary';
    let seasonName = 'Ordinary Time';
    let liturgicalColor = 'green';
    
    if (season.toLowerCase().includes('advent')) {
      seasonKey = 'advent';
      seasonName = 'Advent';
      liturgicalColor = 'purple';
    } else if (season.toLowerCase().includes('christmas')) {
      seasonKey = 'christmas';
      seasonName = 'Christmas';
      liturgicalColor = 'white';
    } else if (season.toLowerCase().includes('lent')) {
      seasonKey = 'lent';
      seasonName = 'Lent';
      liturgicalColor = 'purple';
    } else if (season.toLowerCase().includes('easter')) {
      seasonKey = 'easter';
      seasonName = 'Easter';
      liturgicalColor = 'white';
    }
    
    // Override color based on celebration type and actual color from Romcal
    if (celebrationType === 'solemnity') {
      liturgicalColor = 'white';
    } else if (color === '#FFFFFF') {
      liturgicalColor = 'white';
    } else if (color === '#800080') {
      liturgicalColor = 'purple';
    } else if (color === '#FF0000') {
      liturgicalColor = 'red';
    } else if (color === '#008000') {
      liturgicalColor = 'green';
    }
    
    // Format celebration name for special solemnities
    let celebrationName = name;
    if (name.includes('Joseph') && type === 'SOLEMNITY') {
      celebrationName = 'Solemnity of St. Joseph';
    } else if (name.includes('Annunciation')) {
      celebrationName = 'The Annunciation of the Lord';
    } else if (name.includes('Patrick') && type === 'SOLEMNITY') {
      celebrationName = 'St. Patrick';
    }
    
    // Get readings for this date
    let readings = this.getReadingsForDate(date, celebrationName);
    
    return {
      date: date,
      season: seasonKey,
      seasonName: seasonName,
      celebration: celebrationName,
      celebrationType: celebrationType,
      liturgicalColor: liturgicalColor,
      rank: type,
      yearCycle: cycle,
      weekdayCycle: null,
      weekNumber: romcalData.data?.calendar?.week || null,
      holyDayOfObligation: this.isHolyDayOfObligation(celebrationName),
      readings: readings
    };
  }

  // ===== COMPLETE READINGS FUNCTION FOR ALL MONTHS AND ALL DAYS =====
  getReadingsForDate(date, celebrationName) {
    console.log(`📖 GETTING READINGS FOR: ${date.toISOString()} - ${celebrationName}`);
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    let readings = [];
    
    // ===== SPECIAL SOLEMNITIES (Fixed dates throughout the year) =====
    if (month === 1 && day === 1) { // January 1 - Mary, Mother of God
      readings = [
        { title: "First Reading", citation: "Num 6:22-27", text: "" },
        { title: "Psalm", citation: "Ps 67:2-3, 5, 6, 8", text: "" },
        { title: "Second Reading", citation: "Gal 4:4-7", text: "" },
        { title: "Gospel", citation: "Lk 2:16-21", text: "" }
      ];
    }
    else if (month === 1 && day === 6) { // January 6 - Epiphany (or nearest Sunday)
      readings = [
        { title: "First Reading", citation: "Is 60:1-6", text: "" },
        { title: "Psalm", citation: "Ps 72:1-2, 7-8, 10-13", text: "" },
        { title: "Second Reading", citation: "Eph 3:2-3, 5-6", text: "" },
        { title: "Gospel", citation: "Mt 2:1-12", text: "" }
      ];
    }
    else if (month === 2 && day === 2) { // February 2 - Presentation of the Lord
      readings = [
        { title: "First Reading", citation: "Mal 3:1-4", text: "" },
        { title: "Psalm", citation: "Ps 24:7, 8, 9, 10", text: "" },
        { title: "Second Reading", citation: "Heb 2:14-18", text: "" },
        { title: "Gospel", citation: "Lk 2:22-40", text: "" }
      ];
    }
    else if (month === 3 && day === 17) { // March 17 - St. Patrick
      readings = [
        { title: "First Reading", citation: "1 Thes 2:2-8", text: "" },
        { title: "Psalm", citation: "Ps 117:1, 2", text: "" },
        { title: "Gospel", citation: "Mt 10:16-23", text: "" }
      ];
    }
    else if (month === 3 && day === 19) { // March 19 - St. Joseph
      readings = [
        { title: "First Reading", citation: "2 Sm 7:4-5, 12-14, 16", text: "" },
        { title: "Psalm", citation: "Ps 89:2-3, 4-5, 27, 29", text: "" },
        { title: "Second Reading", citation: "Rom 4:13, 16-18, 22", text: "" },
        { title: "Gospel", citation: "Mt 1:16, 18-21, 24a", text: "" }
      ];
    }
    else if (month === 3 && day === 25) { // March 25 - Annunciation
      readings = [
        { title: "First Reading", citation: "Is 7:10-14, 8:10", text: "" },
        { title: "Psalm", citation: "Ps 40:7-11", text: "" },
        { title: "Second Reading", citation: "Heb 10:4-10", text: "" },
        { title: "Gospel", citation: "Lk 1:26-38", text: "" }
      ];
    }
    else if (month === 6 && day === 24) { // June 24 - Birth of John the Baptist
      readings = [
        { title: "First Reading", citation: "Is 49:1-6", text: "" },
        { title: "Psalm", citation: "Ps 139:1-3, 13-15", text: "" },
        { title: "Second Reading", citation: "Acts 13:22-26", text: "" },
        { title: "Gospel", citation: "Lk 1:57-66, 80", text: "" }
      ];
    }
    else if (month === 6 && day === 29) { // June 29 - Sts. Peter and Paul
      readings = [
        { title: "First Reading", citation: "Acts 12:1-11", text: "" },
        { title: "Psalm", citation: "Ps 34:2-9", text: "" },
        { title: "Second Reading", citation: "2 Tim 4:6-8, 17-18", text: "" },
        { title: "Gospel", citation: "Mt 16:13-19", text: "" }
      ];
    }
    else if (month === 8 && day === 6) { // August 6 - Transfiguration
      readings = [
        { title: "First Reading", citation: "Dan 7:9-10, 13-14", text: "" },
        { title: "Psalm", citation: "Ps 97:1-2, 5-6, 9", text: "" },
        { title: "Second Reading", citation: "2 Pt 1:16-19", text: "" },
        { title: "Gospel", citation: "Mk 9:2-10", text: "" }
      ];
    }
    else if (month === 8 && day === 15) { // August 15 - Assumption
      readings = [
        { title: "First Reading", citation: "Rev 11:19, 12:1-6, 10", text: "" },
        { title: "Psalm", citation: "Ps 45:10, 11, 12, 16", text: "" },
        { title: "Second Reading", citation: "1 Cor 15:20-27", text: "" },
        { title: "Gospel", citation: "Lk 1:39-56", text: "" }
      ];
    }
    else if (month === 9 && day === 8) { // September 8 - Birth of Mary
      readings = [
        { title: "First Reading", citation: "Mic 5:1-4", text: "" },
        { title: "Psalm", citation: "Ps 13:6, 6", text: "" },
        { title: "Gospel", citation: "Mt 1:1-16, 18-23", text: "" }
      ];
    }
    else if (month === 9 && day === 14) { // September 14 - Exaltation of the Cross
      readings = [
        { title: "First Reading", citation: "Num 21:4-9", text: "" },
        { title: "Psalm", citation: "Ps 78:1-2, 34-38", text: "" },
        { title: "Second Reading", citation: "Phil 2:6-11", text: "" },
        { title: "Gospel", citation: "Jn 3:13-17", text: "" }
      ];
    }
    else if (month === 11 && day === 1) { // November 1 - All Saints
      readings = [
        { title: "First Reading", citation: "Rev 7:2-4, 9-14", text: "" },
        { title: "Psalm", citation: "Ps 24:1-6", text: "" },
        { title: "Second Reading", citation: "1 Jn 3:1-3", text: "" },
        { title: "Gospel", citation: "Mt 5:1-12", text: "" }
      ];
    }
    else if (month === 11 && day === 2) { // November 2 - All Souls
      readings = [
        { title: "First Reading", citation: "Wis 3:1-9", text: "" },
        { title: "Psalm", citation: "Ps 23:1-6", text: "" },
        { title: "Second Reading", citation: "Rom 6:3-9", text: "" },
        { title: "Gospel", citation: "Jn 6:37-40", text: "" }
      ];
    }
    else if (month === 12 && day === 8) { // December 8 - Immaculate Conception
      readings = [
        { title: "First Reading", citation: "Gen 3:9-15, 20", text: "" },
        { title: "Psalm", citation: "Ps 98:1-4", text: "" },
        { title: "Second Reading", citation: "Eph 1:3-6, 11-12", text: "" },
        { title: "Gospel", citation: "Lk 1:26-38", text: "" }
      ];
    }
    else if (month === 12 && day === 12) { // December 12 - Our Lady of Guadalupe
      readings = [
        { title: "First Reading", citation: "Zec 2:14-17", text: "" },
        { title: "Psalm", citation: "Jdt 13:18, 19", text: "" },
        { title: "Gospel", citation: "Lk 1:39-47", text: "" }
      ];
    }
    else if (month === 12 && day === 25) { // December 25 - Christmas
      readings = [
        { title: "First Reading", citation: "Is 52:7-10", text: "" },
        { title: "Psalm", citation: "Ps 98:1-6", text: "" },
        { title: "Second Reading", citation: "Heb 1:1-6", text: "" },
        { title: "Gospel", citation: "Jn 1:1-18", text: "" }
      ];
    }
    else if (month === 12 && day === 26) { // December 26 - St. Stephen
      readings = [
        { title: "First Reading", citation: "Acts 6:8-10, 7:54-59", text: "" },
        { title: "Psalm", citation: "Ps 31:3-4, 6, 8, 16-17", text: "" },
        { title: "Gospel", citation: "Mt 10:17-22", text: "" }
      ];
    }
    else if (month === 12 && day === 27) { // December 27 - St. John
      readings = [
        { title: "First Reading", citation: "1 Jn 1:1-4", text: "" },
        { title: "Psalm", citation: "Ps 97:1-2, 5-6, 11-12", text: "" },
        { title: "Gospel", citation: "Jn 20:2-8", text: "" }
      ];
    }
    else if (month === 12 && day === 28) { // December 28 - Holy Innocents
      readings = [
        { title: "First Reading", citation: "1 Jn 1:5–2:2", text: "" },
        { title: "Psalm", citation: "Ps 124:2-5, 7-8", text: "" },
        { title: "Gospel", citation: "Mt 2:13-18", text: "" }
      ];
    }
    // ===== SUNDAY READINGS (ALL MONTHS) =====
    else if (dayOfWeek === 0) {
      // Get the week of the month (1-5)
      const weekOfMonth = Math.ceil(day / 7);
      
      // Different readings based on liturgical season
      if (month === 12 || month === 1) { // Advent/Christmas season
        if (weekOfMonth === 1) {
          readings = [
            { title: "First Reading", citation: "Is 63:16-17, 19; 64:2-7", text: "" },
            { title: "Psalm", citation: "Ps 80:2-3, 15-16, 18-19", text: "" },
            { title: "Second Reading", citation: "1 Cor 1:3-9", text: "" },
            { title: "Gospel", citation: "Mk 13:33-37", text: "" }
          ];
        } else if (weekOfMonth === 2) {
          readings = [
            { title: "First Reading", citation: "Is 40:1-5, 9-11", text: "" },
            { title: "Psalm", citation: "Ps 85:9-14", text: "" },
            { title: "Second Reading", citation: "2 Pt 3:8-14", text: "" },
            { title: "Gospel", citation: "Mk 1:1-8", text: "" }
          ];
        } else if (weekOfMonth === 3) {
          readings = [
            { title: "First Reading", citation: "Is 61:1-2, 10-11", text: "" },
            { title: "Psalm", citation: "Lk 1:46-50, 53-54", text: "" },
            { title: "Second Reading", citation: "1 Thes 5:16-24", text: "" },
            { title: "Gospel", citation: "Jn 1:6-8, 19-28", text: "" }
          ];
        } else if (weekOfMonth === 4) {
          readings = [
            { title: "First Reading", citation: "2 Sm 7:1-5, 8-11, 16", text: "" },
            { title: "Psalm", citation: "Ps 89:2-5, 27, 29", text: "" },
            { title: "Second Reading", citation: "Rom 16:25-27", text: "" },
            { title: "Gospel", citation: "Lk 1:26-38", text: "" }
          ];
        }
      }
      else if (month === 2 || month === 3 || month === 4) { // Lent/Easter (Feb-Apr)
        if (celebrationName.includes('Lent') || month === 2 || month === 3) {
          // Lent Sundays (simplified mapping)
          if (day <= 7 || (month === 2 && day > 25)) {
            readings = [
              { title: "First Reading", citation: "Deut 26:4-10", text: "" },
              { title: "Psalm", citation: "Ps 91:1-2, 10-15", text: "" },
              { title: "Second Reading", citation: "Rom 10:8-13", text: "" },
              { title: "Gospel", citation: "Lk 4:1-13", text: "" }
            ];
          } else if (day <= 14 || (month === 3 && day < 8)) {
            readings = [
              { title: "First Reading", citation: "Gen 15:5-12, 17-18", text: "" },
              { title: "Psalm", citation: "Ps 27:1, 7-9, 13-14", text: "" },
              { title: "Second Reading", citation: "Phil 3:17–4:1", text: "" },
              { title: "Gospel", citation: "Lk 9:28-36", text: "" }
            ];
          } else if (day <= 21 || (month === 3 && day < 15)) {
            readings = [
              { title: "First Reading", citation: "Ex 3:1-8, 13-15", text: "" },
              { title: "Psalm", citation: "Ps 103:1-4, 6-8, 11", text: "" },
              { title: "Second Reading", citation: "1 Cor 10:1-6, 10-12", text: "" },
              { title: "Gospel", citation: "Lk 13:1-9", text: "" }
            ];
          } else {
            readings = [
              { title: "First Reading", citation: "Is 43:16-21", text: "" },
              { title: "Psalm", citation: "Ps 126:1-6", text: "" },
              { title: "Second Reading", citation: "Phil 3:8-14", text: "" },
              { title: "Gospel", citation: "Jn 8:1-11", text: "" }
            ];
          }
        } else if (celebrationName.includes('Easter') || month === 4) {
          // Easter Sundays
          if (day <= 7) {
            readings = [
              { title: "First Reading", citation: "Acts 10:34, 37-43", text: "" },
              { title: "Psalm", citation: "Ps 118:1-2, 16-17, 22-23", text: "" },
              { title: "Second Reading", citation: "Col 3:1-4", text: "" },
              { title: "Gospel", citation: "Jn 20:1-9", text: "" }
            ];
          } else if (day <= 14) {
            readings = [
              { title: "First Reading", citation: "Acts 2:42-47", text: "" },
              { title: "Psalm", citation: "Ps 118:2-4, 13-15, 22-24", text: "" },
              { title: "Second Reading", citation: "1 Pt 1:3-9", text: "" },
              { title: "Gospel", citation: "Jn 20:19-31", text: "" }
            ];
          } else if (day <= 21) {
            readings = [
              { title: "First Reading", citation: "Acts 3:13-15, 17-19", text: "" },
              { title: "Psalm", citation: "Ps 4:2, 4, 7-9", text: "" },
              { title: "Second Reading", citation: "1 Jn 2:1-5", text: "" },
              { title: "Gospel", citation: "Lk 24:35-48", text: "" }
            ];
          } else {
            readings = [
              { title: "First Reading", citation: "Acts 4:8-12", text: "" },
              { title: "Psalm", citation: "Ps 118:1, 8-9, 21-23, 26, 29", text: "" },
              { title: "Second Reading", citation: "1 Jn 3:1-2", text: "" },
              { title: "Gospel", citation: "Jn 10:11-18", text: "" }
            ];
          }
        }
      }
      else { // Ordinary Time Sundays (May-November)
        // General pattern for Ordinary Time - varies by week
        if (weekOfMonth === 1) {
          readings = [
            { title: "First Reading", citation: "Is 60:1-6", text: "" },
            { title: "Psalm", citation: "Ps 72:1-2, 7-8, 10-13", text: "" },
            { title: "Second Reading", citation: "Eph 3:2-3, 5-6", text: "" },
            { title: "Gospel", citation: "Mt 2:1-12", text: "" }
          ];
        } else if (weekOfMonth === 2) {
          readings = [
            { title: "First Reading", citation: "Is 49:3, 5-6", text: "" },
            { title: "Psalm", citation: "Ps 40:2, 4, 7-10", text: "" },
            { title: "Second Reading", citation: "1 Cor 1:1-3", text: "" },
            { title: "Gospel", citation: "Jn 1:29-34", text: "" }
          ];
        } else if (weekOfMonth === 3) {
          readings = [
            { title: "First Reading", citation: "Is 8:23–9:3", text: "" },
            { title: "Psalm", citation: "Ps 27:1, 4, 13-14", text: "" },
            { title: "Second Reading", citation: "1 Cor 1:10-13, 17", text: "" },
            { title: "Gospel", citation: "Mt 4:12-23", text: "" }
          ];
        } else if (weekOfMonth === 4) {
          readings = [
            { title: "First Reading", citation: "Zep 2:3; 3:12-13", text: "" },
            { title: "Psalm", citation: "Ps 146:6-10", text: "" },
            { title: "Second Reading", citation: "1 Cor 1:26-31", text: "" },
            { title: "Gospel", citation: "Mt 5:1-12", text: "" }
          ];
        } else {
          readings = [
            { title: "First Reading", citation: "Is 58:7-10", text: "" },
            { title: "Psalm", citation: "Ps 112:4-9", text: "" },
            { title: "Second Reading", citation: "1 Cor 2:1-5", text: "" },
            { title: "Gospel", citation: "Mt 5:13-16", text: "" }
          ];
        }
      }
    }
    // ===== WEEKDAY READINGS (ALL MONTHS) =====
    else {
      // Default weekday readings pattern that varies by day of week
      // This is a simplified pattern - in reality, weekday readings follow a 2-year cycle
      if (dayOfWeek === 1) { // Monday
        readings = [
          { title: "First Reading", citation: "Acts 1:12-14", text: "" },
          { title: "Psalm", citation: "Ps 113:1-8", text: "" },
          { title: "Gospel", citation: "Jn 19:25-27", text: "" }
        ];
      } else if (dayOfWeek === 2) { // Tuesday
        readings = [
          { title: "First Reading", citation: "Acts 4:32-35", text: "" },
          { title: "Psalm", citation: "Ps 93:1-2, 5", text: "" },
          { title: "Gospel", citation: "Jn 3:7-15", text: "" }
        ];
      } else if (dayOfWeek === 3) { // Wednesday
        readings = [
          { title: "First Reading", citation: "Acts 5:17-26", text: "" },
          { title: "Psalm", citation: "Ps 34:2-9", text: "" },
          { title: "Gospel", citation: "Jn 3:16-21", text: "" }
        ];
      } else if (dayOfWeek === 4) { // Thursday
        readings = [
          { title: "First Reading", citation: "Acts 8:26-40", text: "" },
          { title: "Psalm", citation: "Ps 66:8-9, 16-17, 20", text: "" },
          { title: "Gospel", citation: "Jn 6:44-51", text: "" }
        ];
      } else if (dayOfWeek === 5) { // Friday
        readings = [
          { title: "First Reading", citation: "Acts 9:1-20", text: "" },
          { title: "Psalm", citation: "Ps 117:1-2", text: "" },
          { title: "Gospel", citation: "Jn 6:52-59", text: "" }
        ];
      } else if (dayOfWeek === 6) { // Saturday
        readings = [
          { title: "First Reading", citation: "Acts 9:31-42", text: "" },
          { title: "Psalm", citation: "Ps 116:12-17", text: "" },
          { title: "Gospel", citation: "Jn 6:60-69", text: "" }
        ];
      }
    }
    
    return JSON.stringify(readings);
  }

  isHolyDayOfObligation(celebrationName) {
    const holyDays = [
      'Mary, Mother of God',
      'Epiphany',
      'Ascension',
      'Corpus Christi',
      'Assumption',
      'All Saints',
      'Immaculate Conception',
      'Christmas',
      'St. Joseph',
      'Sts. Peter and Paul'
    ];
    
    return holyDays.some(day => 
      celebrationName.includes(day)
    );
  }

  async getOrCreateLiturgicalDay(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Check database first
    let liturgicalDay = await prisma.liturgicalDay.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    
    if (liturgicalDay) {
      return liturgicalDay;
    }
    
    // Generate using Romcal
    console.log(`Generating data for ${date.toISOString().split('T')[0]} using Romcal`);
    
    try {
      const generatedData = await this.generateLiturgicalData(date);
      
      liturgicalDay = await prisma.liturgicalDay.create({
        data: generatedData
      });
      
      return liturgicalDay;
    } catch (error) {
      console.error('Error generating liturgical day:', error);
      return this.getFallbackDay(date);
    }
  }

  getFallbackDay(date) {
    // Simple fallback that determines season based on date
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    let season = 'ordinary';
    let seasonName = 'Ordinary Time';
    let color = 'green';
    
    // Very basic season detection (you can enhance this)
    if ((month === 12 && day >= 25) || (month === 1 && day <= 5)) {
      season = 'christmas';
      seasonName = 'Christmas';
      color = 'white';
    } else if ((month === 3 || month === 4) && day <= 20) {
      season = 'lent';
      seasonName = 'Lent';
      color = 'purple';
    } else if (month === 4 && day > 20) {
      season = 'easter';
      seasonName = 'Easter';
      color = 'white';
    }
    
    return {
      date: date,
      season: season,
      seasonName: seasonName,
      celebration: 'Weekday',
      celebrationType: 'weekday',
      liturgicalColor: color,
      rank: 'Weekday',
      holyDayOfObligation: false
    };
  }

  async getLiturgicalMonth(year, month) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    // Get existing days
    const existingDays = await prisma.liturgicalDay.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    // Create map of existing days
    const daysMap = {};
    existingDays.forEach(day => {
      const dayDate = new Date(day.date);
      daysMap[dayDate.getDate()] = day;
    });
    
    // Generate missing days
    const daysInMonth = endDate.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      if (!daysMap[d]) {
        const fetchDate = new Date(year, month, d);
        await this.getOrCreateLiturgicalDay(fetchDate);
      }
    }
    
    // Return all days
    return await prisma.liturgicalDay.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
  }
}

module.exports = new CalendarService();