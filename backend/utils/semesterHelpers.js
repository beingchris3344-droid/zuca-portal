// backend/utils/semesterHelpers.js

/**
 * Get the current semester from published schedules
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {Promise<Object|null>} - Current semester schedule or null
 */
async function getCurrentSemester(prisma) {
  try {
    const today = new Date();
    
    // First try to find a schedule that has an active flag set
    const activeSchedule = await prisma.schedule.findFirst({
      where: {
        isPublished: true,
        isActiveSemester: true  // You'll need to add this field
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (activeSchedule) {
      return activeSchedule;
    }
    
    // If no active flag, find schedule where today falls within date range
    const schedules = await prisma.schedule.findMany({
      where: {
        isPublished: true,
        startDate: { not: null },
        endDate: { not: null }
      },
      orderBy: { startDate: 'desc' }
    });
    
    for (const schedule of schedules) {
      const start = new Date(schedule.startDate);
      const end = new Date(schedule.endDate);
      // Set to end of day for inclusive comparison
      end.setHours(23, 59, 59, 999);
      
      if (today >= start && today <= end) {
        return schedule;
      }
    }
    
    // If no current semester, return the most recent schedule
    if (schedules.length > 0) {
      return schedules[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current semester:', error);
    return null;
  }
}

/**
 * Get all semesters (published schedules with date ranges)
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {Promise<Array>} - Array of semester schedules
 */
async function getAllSemesters(prisma) {
  try {
    const schedules = await prisma.schedule.findMany({
      where: {
        isPublished: true,
        startDate: { not: null },
        endDate: { not: null }
      },
      orderBy: { startDate: 'desc' }
    });
    
    return schedules.map(schedule => ({
      id: schedule.id,
      title: schedule.title,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      isCurrent: false // Will be set by caller
    }));
  } catch (error) {
    console.error('Error getting semesters:', error);
    return [];
  }
}

/**
 * Get semester period for a specific schedule
 * @param {Object} schedule - Schedule object with startDate and endDate
 * @returns {Object} - Formatted semester period
 */
function getSemesterPeriod(schedule) {
  if (!schedule || !schedule.startDate || !schedule.endDate) {
    return null;
  }
  
  const start = new Date(schedule.startDate);
  const end = new Date(schedule.endDate);
  
  const startStr = start.toLocaleDateString('en-US', { 
    month: 'short', 
    year: 'numeric' 
  });
  const endStr = end.toLocaleDateString('en-US', { 
    month: 'short', 
    year: 'numeric' 
  });
  
  return {
    start: schedule.startDate,
    end: schedule.endDate,
    display: `${startStr} - ${endStr}`,
    startFormatted: startStr,
    endFormatted: endStr
  };
}

/**
 * Check if a date falls within a semester period
 * @param {Date} date - Date to check
 * @param {Object} semester - Semester schedule with startDate and endDate
 * @returns {boolean} - True if date is within semester
 */
function isDateInSemester(date, semester) {
  if (!semester || !semester.startDate || !semester.endDate) {
    return false;
  }
  
  const checkDate = new Date(date);
  const start = new Date(semester.startDate);
  const end = new Date(semester.endDate);
  end.setHours(23, 59, 59, 999);
  
  return checkDate >= start && checkDate <= end;
}

module.exports = {
  getCurrentSemester,
  getAllSemesters,
  getSemesterPeriod,
  isDateInSemester
};