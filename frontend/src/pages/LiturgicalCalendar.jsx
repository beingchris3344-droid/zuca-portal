import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, ChevronLeft, ChevronRight, Sun, Moon, Cloud, 
  Star, Church, Book, Heart, Droplet, Leaf, Sparkles,
  AlertCircle, RefreshCw, ChevronDown, Eye, EyeOff,
  Filter, Download, Share2, Info, X, Award,
  Cross, Crown, Feather, Music, Bell, Coffee
} from 'lucide-react';
import { publicApi } from '../api';
import logo from '../assets/zuca-logo.png';

const LiturgicalCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthData, setMonthData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showModal, setShowModal] = useState(false);

  // Check screen size on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // REAL liturgical seasons with proper Catholic colors
  const liturgicalSeasons = {
    advent: { 
      color: '#800080', // Purple
      name: 'Advent', 
      icon: <Star size={isMobile ? 12 : 16} color="#FFD700" />,
      bg: 'rgba(128, 0, 128, 0.25)',
      border: '#800080',
      textColor: '#fff',
      description: 'Season of waiting and preparation'
    },
    christmas: { 
      color: '#FFFFFF', // White
      name: 'Christmas', 
      icon: <Sparkles size={isMobile ? 12 : 16} color="#FFD700" />,
      bg: 'rgba(255, 255, 255, 0.25)',
      border: '#FFD700',
      textColor: '#000',
      description: 'Celebrate the birth of our Lord'
    },
    lent: { 
      color: '#800080', // Purple
      name: 'Lent', 
      icon: <Cloud size={isMobile ? 12 : 16} color="#FFA500" />,
      bg: 'rgba(128, 0, 128, 0.25)',
      border: '#800080',
      textColor: '#fff',
      description: 'Prayer, fasting, and almsgiving'
    },
    easter: { 
      color: '#FFFFFF', // White
      name: 'Easter', 
      icon: <Sun size={isMobile ? 12 : 16} color="#FFD700" />,
      bg: 'rgba(255, 255, 255, 0.25)',
      border: '#FFD700',
      textColor: '#000',
      description: 'Rejoice in the Resurrection'
    },
    ordinary: { 
      color: '#008000', // Green
      name: 'Ordinary Time', 
      icon: <Leaf size={isMobile ? 12 : 16} color="#98FB98" />,
      bg: 'rgba(0, 128, 0, 0.25)',
      border: '#008000',
      textColor: '#fff',
      description: 'Grow in faith day by day'
    },
  };

  // Celebration types with distinct colors
  const celebrationTypes = {
    solemnity: { 
      color: '#FFD700', // Gold
      bg: 'rgba(255, 215, 0, 0.3)',
      border: '#FFD700',
      label: 'Solemnity',
      icon: '👑'
    },
    feast: { 
      color: '#00c6ff', // Blue
      bg: 'rgba(0, 198, 255, 0.3)',
      border: '#00c6ff',
      label: 'Feast',
      icon: '⭐'
    },
    memorial: { 
      color: '#98FB98', // Light green
      bg: 'rgba(152, 251, 152, 0.3)',
      border: '#98FB98',
      label: 'Memorial',
      icon: '🕊️'
    },
    'optional memorial': { 
      color: '#DDA0DD', // Plum
      bg: 'rgba(221, 160, 221, 0.3)',
      border: '#DDA0DD',
      label: 'Optional Memorial',
      icon: '🌸'
    },
    weekday: { 
      color: '#94a3b8', // Gray
      bg: 'rgba(148, 163, 184, 0.2)',
      border: '#94a3b8',
      label: 'Weekday',
      icon: '📅'
    },
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = isMobile 
    ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchMonthData();
  }, [currentDate]);

  const fetchMonthData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      
      console.log(`Fetching month: ${year}/${month}`);
      
      const response = await publicApi.get(`/api/calendar/month/${year}/${month}`);
      console.log('Month data:', response.data);
      
      const dataByDay = {};
      if (Array.isArray(response.data)) {
        response.data.forEach(day => {
          const dayDate = new Date(day.date);
          const dayNum = dayDate.getDate();
          dataByDay[dayNum] = day;
        });
      }
      
      setMonthData(dataByDay);
      setError(null);
      
    } catch (err) {
      console.error('Error fetching month data:', err);
      setError('Failed to load calendar data. Using sample data...');
      generateSampleData();
    } finally {
      setLoading(false);
    }
  };

  const generateSampleData = () => {
    const sample = {};
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const celebrations = [
      'Second Sunday of Lent', 'Monday of the 2nd Week', 'Tuesday of the 2nd Week',
      'Wednesday of the 2nd Week', 'Thursday of the 2nd Week', 'Friday of the 2nd Week',
      'Saturday of the 2nd Week', 'Third Sunday of Lent', 'Monday of the 3rd Week',
      'St. Patrick', 'Tuesday of the 3rd Week', 'St. Joseph', 'Wednesday of the 3rd Week',
      'Thursday of the 3rd Week', 'Friday of the 3rd Week', 'Saturday of the 3rd Week',
      'Fourth Sunday of Lent', 'Monday of the 4th Week', 'Tuesday of the 4th Week',
      'Wednesday of the 4th Week', 'Thursday of the 4th Week', 'Friday of the 4th Week',
      'Saturday of the 4th Week', 'Fifth Sunday of Lent', 'Monday of the 5th Week',
      'Tuesday of the 5th Week', 'Wednesday of the 5th Week', 'The Annunciation',
      'Thursday of the 5th Week', 'Friday of the 5th Week', 'Saturday of the 5th Week'
    ];
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dayOfWeek = date.getDay();
      const isSunday = dayOfWeek === 0;
      const isSpecialDay = i === 17 || i === 19 || i === 25;
      
      let season = 'ordinary';
      let seasonName = 'Ordinary Time';
      let color = '#008000';
      
      if (month === 2) {
        season = isSunday ? 'lent' : 'lent';
        seasonName = isSunday ? 'Lent' : 'Lent';
        color = '#800080';
      }
      
      let celebrationType = 'weekday';
      if (isSunday) celebrationType = 'solemnity';
      else if (isSpecialDay) celebrationType = i === 25 ? 'solemnity' : 'feast';
      else if (i % 5 === 0) celebrationType = 'memorial';
      
      sample[i] = {
        id: i,
        date: date.toISOString(),
        season: season,
        seasonName: seasonName,
        celebration: celebrations[i-1] || `${fullDayNames[dayOfWeek]} - Week ${Math.ceil(i/7)}`,
        celebrationType: celebrationType,
        liturgicalColor: color,
        rank: isSunday ? 'Solemnity' : celebrationType === 'solemnity' ? 'Solemnity' : 
              celebrationType === 'feast' ? 'Feast' : celebrationType === 'memorial' ? 'Memorial' : 'Weekday',
        holyDayOfObligation: i === 25,
      };
    }
    
    setMonthData(sample);
  };

  const changeMonth = (increment) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + increment);
    setCurrentDate(newDate);
    setSelectedDay(null);
  };

  const handleDayClick = (day) => {
  setSelectedDay(day);
  setShowModal(true); // This opens the modal
};

const closeModal = () => {
  setShowModal(false);
  setSelectedDay(null); // Optional: clear selected day when closing
};

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

 

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const getSeasonInfo = (dayData) => {
    if (!dayData || !dayData.season) return liturgicalSeasons.ordinary;
    return liturgicalSeasons[dayData.season] || liturgicalSeasons.ordinary;
  };

  const getCelebrationTypeInfo = (type) => {
    if (!type) return celebrationTypes.weekday;
    return celebrationTypes[type] || celebrationTypes.weekday;
  };

  const formatDayDate = (day) => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCelebrationShort = (celebration) => {
    if (!celebration) return '';
    if (isMobile) {
      const words = celebration.split(' ');
      if (words.length > 2) {
        return words.slice(0, 2).join(' ') + '…';
      }
      if (celebration.length > 12) {
        return celebration.substring(0, 10) + '…';
      }
      return celebration;
    }
    const words = celebration.split(' ');
    if (words.length > 4) {
      return words.slice(0, 3).join(' ') + '…';
    }
    if (celebration.length > 25) {
      return celebration.substring(0, 22) + '…';
    }
    return celebration;
  };

  const getTypeIcon = (type) => {
    const icons = {
      'solemnity': '👑',
      'feast': '⭐',
      'memorial': '🕊️',
      'optional memorial': '🌸',
      'weekday': '📅'
    };
    return icons[type] || '📅';
  };

  const getFirstReading = (readingsJson) => {
    if (!readingsJson) return null;
    try {
      const readings = JSON.parse(readingsJson);
      return readings[0]?.citation || null;
    } catch (e) {
      return null;
    }
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth();
    const firstDay = getFirstDayOfMonth();
    const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;
    
    const cells = [];
    
    // Day headers
    dayNames.forEach((day, index) => {
      const isWeekend = index === 0 || index === 6;
      cells.push(
        <div key={`header-${index}`} style={{
          ...styles.dayHeader,
          color: isWeekend ? '#FFD700' : 'rgba(255,255,255,0.8)',
          fontSize: isMobile ? '12px' : '14px',
          padding: isMobile ? '5px 0' : '10px 0',
        }}>
          {day}
        </div>
      );
    });
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} style={styles.emptyCell}></div>);
    }
    
    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = monthData[day];
      const celebrationType = dayData ? getCelebrationTypeInfo(dayData.celebrationType) : celebrationTypes.weekday;
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      const dayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay();
      const isSunday = dayOfWeek === 0;
      
      const firstReading = dayData ? getFirstReading(dayData.readings) : null;
      
      let cellStyle = {
        ...styles.dayCell,
        background: dayData ? celebrationType.bg : 'rgba(255,255,255,0.02)',
        border: isToday ? (isMobile ? '2px solid #FFD700' : '3px solid #FFD700') : 
                `1px solid ${dayData ? celebrationType.border : 'rgba(255,255,255,0.1)'}`,
        minHeight: isMobile ? '65px' : '100px',
        padding: isMobile ? '4px 2px' : '10px',
        aspectRatio: isMobile ? '1 / 1' : 'auto',
      };
      
      cells.push(
        <div 
          key={`day-${day}`}
          style={cellStyle}
          onClick={() => handleDayClick(day)}
        >
          <div style={{
            ...styles.dayNumber,
            backgroundColor: isSunday ? 'rgba(255,215,0,0.2)' : 'transparent',
            color: isSunday ? '#FFD700' : 'white',
            fontWeight: isSunday ? 'bold' : 'normal',
            fontSize: isMobile ? '14px' : '16px',
            width: isMobile ? '22px' : '24px',
            height: isMobile ? '22px' : '24px',
            marginBottom: isMobile ? '2px' : '6px',
          }}>
            {day}
          </div>
          
          {dayData && (
            <>
              <div style={{
                ...styles.dayCelebration,
                fontSize: isMobile ? '8px' : '11px',
                lineHeight: isMobile ? '1.1' : '1.3',
                marginBottom: isMobile ? '1px' : '6px',
                maxHeight: isMobile ? '28px' : 'none',
                overflow: 'hidden',
              }}>
                {getCelebrationShort(dayData.celebration)}
              </div>
              
              {firstReading && (
                <div style={{
                  ...styles.dayVerse,
                  fontSize: isMobile ? '7px' : '9px',
                  marginBottom: isMobile ? '1px' : '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {isMobile ? firstReading.split(' ')[0] : firstReading}
                </div>
              )}
              
              <div style={styles.dayMeta}>
                <span style={{
                  ...styles.dayType,
                  fontSize: isMobile ? '8px' : '12px',
                  padding: isMobile ? '1px 3px' : '2px 6px',
                  backgroundColor: celebrationType.bg,
                  color: celebrationType.color,
                  border: `1px solid ${celebrationType.border}`,
                }}>
                  {getTypeIcon(dayData.celebrationType)}
                </span>
                
                {dayData.holyDayOfObligation && (
                  <span style={{
                    ...styles.holyBadge,
                    fontSize: isMobile ? '10px' : '14px',
                  }} title="Holy Day of Obligation">
                    ⛪
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      );
    }
    
    const remainingCells = totalCells - cells.length;
    for (let i = 0; i < remainingCells; i++) {
      cells.push(<div key={`empty-end-${i}`} style={styles.emptyCell}></div>);
    }
    
    return cells;
  };

  const renderReadings = (readingsJson) => {
    if (!readingsJson) return null;
    try {
      const readings = JSON.parse(readingsJson);
      return (
        <div style={styles.modalReadingsSection}>
          <h4 style={styles.modalReadingsTitle}>Daily Readings</h4>
          {readings.map((reading, index) => (
            <div key={index} style={styles.modalReadingItem}>
              <span style={styles.modalReadingLabel}>{reading.title}:</span>
              <span style={styles.modalReadingCitation}>{reading.citation}</span>
            </div>
          ))}
        </div>
      );
    } catch (e) {
      return null;
    }
  };

  // Modal Component
  const DayModal = ({ day, onClose }) => {
    if (!day || !monthData[day]) return null;
    
    const dayData = monthData[day];
    const seasonInfo = getSeasonInfo(dayData);
    const celebrationTypeInfo = getCelebrationTypeInfo(dayData.celebrationType);
    
    return (
      <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <button style={styles.modalCloseButton} onClick={onClose}>
            <X size={24} />
          </button>
          
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>{formatDayDate(day)}</h2>
          </div>
          
          <div style={styles.modalBody}>
            {/* Celebration */}
            <div style={styles.modalSection}>
              <div style={styles.modalCelebration}>
                <span style={styles.modalCelebrationIcon}>{getTypeIcon(dayData.celebrationType)}</span>
                <span style={styles.modalCelebrationName}>{dayData.celebration}</span>
              </div>
            </div>
            
            {/* Season Badge */}
            <div style={styles.modalSection}>
              <div style={{
                ...styles.modalSeasonBadge,
                backgroundColor: seasonInfo.bg,
                color: seasonInfo.textColor,
                borderColor: seasonInfo.border,
              }}>
                {seasonInfo.icon} {dayData.seasonName}
              </div>
            </div>
            
            {/* Details Grid */}
            <div style={styles.modalDetailsGrid}>
              <div style={styles.modalDetailItem}>
                <span style={styles.modalDetailLabel}>Type</span>
                <span style={{
                  ...styles.modalDetailValue,
                  color: celebrationTypeInfo.color,
                }}>
                  {dayData.celebrationType}
                </span>
              </div>
              
              <div style={styles.modalDetailItem}>
                <span style={styles.modalDetailLabel}>Color</span>
                <div style={styles.modalColorDisplay}>
                  <span style={{
                    ...styles.modalColorDot,
                    backgroundColor: seasonInfo.color,
                  }}></span>
                  <span style={styles.modalDetailValue}>
                    {seasonInfo.color === '#800080' ? 'Purple' :
                     seasonInfo.color === '#008000' ? 'Green' : 'White'}
                  </span>
                </div>
              </div>
              
              {dayData.rank && (
                <div style={styles.modalDetailItem}>
                  <span style={styles.modalDetailLabel}>Rank</span>
                  <span style={styles.modalDetailValue}>{dayData.rank}</span>
                </div>
              )}
              
              {dayData.holyDayOfObligation && (
                <div style={styles.modalDetailItem}>
                  <span style={styles.modalDetailLabel}>Obligation</span>
                  <span style={styles.modalDetailValue}>⛪ Holy Day</span>
                </div>
              )}
            </div>
            
            {/* Readings */}
            {renderReadings(dayData.readings)}
            
            {/* Year Cycle if available */}
            {dayData.yearCycle && (
              <div style={styles.modalFooter}>
                <span style={styles.modalCycle}>{dayData.yearCycle}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingAnimation}>
            <div style={styles.loadingRing}></div>
            <div style={styles.loadingRingInner}></div>
            <Church style={styles.loadingIcon} />
          </div>
          <h2 style={styles.loadingTitle}>Loading Liturgical Calendar</h2>
          <p style={styles.loadingSubtitle}>Fetching {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Floating Background */}
      <div style={styles.floatingBg}>
        <div style={styles.blob1}></div>
        <div style={styles.blob2}></div>
      </div>

      <div style={styles.content}>
        {/* Header */}
        <div style={{
          ...styles.header,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '10px' : '20px',
          marginBottom: isMobile ? '15px' : '30px',
        }}>
          <div style={styles.headerLeft}>
            <img src={logo} alt="ZUCA Logo" style={{
              ...styles.logo,
              width: isMobile ? '35px' : '50px',
              height: isMobile ? '35px' : '50px',
            }} />
            <h1 style={{
              ...styles.title,
              fontSize: isMobile ? '20px' : '32px',
            }}>Liturgical Calendar</h1>
          </div>
          <Link to="/" style={{
            ...styles.homeLink,
            fontSize: isMobile ? '13px' : '16px',
            padding: isMobile ? '5px 10px' : '8px 16px',
          }}>
            ← Back
          </Link>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={fetchMonthData} style={styles.retryButton}>
              <RefreshCw size={14} />
            </button>
          </div>
        )}

        {/* Month Navigation */}
        <div style={{
          ...styles.navigation,
          padding: isMobile ? '5px 10px' : '10px 20px',
          marginBottom: isMobile ? '10px' : '20px',
        }}>
          <button onClick={() => changeMonth(-1)} style={{
            ...styles.navButton,
            width: isMobile ? '32px' : '40px',
            height: isMobile ? '32px' : '40px',
          }}>
            <ChevronLeft size={isMobile ? 18 : 24} />
          </button>
          <div style={styles.monthDisplay}>
            <h2 style={{
              ...styles.monthYear,
              fontSize: isMobile ? '16px' : '24px',
            }}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button onClick={goToToday} style={{
              ...styles.todayButton,
              padding: isMobile ? '3px 8px' : '6px 16px',
              fontSize: isMobile ? '11px' : '14px',
            }}>
              Today
            </button>
          </div>
          <button onClick={() => changeMonth(1)} style={{
            ...styles.navButton,
            width: isMobile ? '32px' : '40px',
            height: isMobile ? '32px' : '40px',
          }}>
            <ChevronRight size={isMobile ? 18 : 24} />
          </button>
        </div>

        {/* Legend Toggle for Mobile */}
        {isMobile && (
          <button 
            onClick={() => setShowLegend(!showLegend)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px',
              padding: '6px 12px',
              color: 'white',
              fontSize: '12px',
              marginBottom: '10px',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'center',
            }}
          >
            {showLegend ? 'Hide Legend' : 'Show Legend'}
          </button>
        )}

        {/* Legend */}
        {(showLegend || !isMobile) && (
          <div style={{
            ...styles.legend,
            padding: isMobile ? '8px 10px' : '15px 20px',
            gap: isMobile ? '6px' : '15px',
            marginBottom: isMobile ? '10px' : '20px',
          }}>
            <div style={styles.legendItem}>
              <span style={{...styles.legendDot, width: isMobile ? '12px' : '16px', height: isMobile ? '12px' : '16px'}}></span>
              <span style={{fontSize: isMobile ? '10px' : '13px'}}>Purple</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{...styles.legendDot, width: isMobile ? '12px' : '16px', height: isMobile ? '12px' : '16px', backgroundColor: '#FFFFFF', border: '1px solid #FFD700'}}></span>
              <span style={{fontSize: isMobile ? '10px' : '13px'}}>White</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{...styles.legendDot, width: isMobile ? '12px' : '16px', height: isMobile ? '12px' : '16px', backgroundColor: '#008000'}}></span>
              <span style={{fontSize: isMobile ? '10px' : '13px'}}>Green</span>
            </div>
            <div style={styles.legendItem}>
              <span style={styles.legendIcon}>👑</span>
              <span style={{fontSize: isMobile ? '10px' : '13px'}}>Solemnity</span>
            </div>
            <div style={styles.legendItem}>
              <span style={styles.legendIcon}>⭐</span>
              <span style={{fontSize: isMobile ? '10px' : '13px'}}>Feast</span>
            </div>
            <div style={styles.legendItem}>
              <span style={styles.legendIcon}>🕊️</span>
              <span style={{fontSize: isMobile ? '10px' : '13px'}}>Memorial</span>
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div style={{
          ...styles.calendarWrapper,
          padding: isMobile ? '8px' : '20px',
          marginBottom: isMobile ? '10px' : '20px',
        }}>
          <div style={{
            ...styles.calendarGrid,
            gap: isMobile ? '2px' : '8px',
          }}>
            {renderCalendarGrid()}
          </div>
        </div>

        {/* Modal Popup */}
        {selectedDay && monthData[selectedDay] && (
          <DayModal day={selectedDay} onClose={closeModal} />
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <p>© {new Date().getFullYear()} Zetech Catholic Action Portal</p>
          <p style={styles.credit}>Built by CHRISTECH WEBSYS</p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media (max-width: 480px) {
          .calendar-grid {
            gap: 1px !important;
          }
        }
      `}</style>
    </div>
  );
};

// ================== STYLES ==================
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a1e 0%, #1a0033 50%, #0a0a1e 100%)',
    padding: '8px',
    position: 'relative',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    width: '100%',
    overflowX: 'hidden',
    boxSizing: 'border-box',
  },

  floatingBg: {
    position: 'fixed',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 0,
  },

  blob1: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    top: '-100px',
    right: '-100px',
    background: '#800080',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: 0.15,
    animation: 'float 20s infinite',
  },

  blob2: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    bottom: '-100px',
    left: '-100px',
    background: '#008000',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: 0.15,
    animation: 'float 20s infinite',
    animationDelay: '-5s',
  },

  content: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px',
    width: '100%',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  logo: {
    borderRadius: '50%',
    border: '2px solid #00c6ff',
  },

  title: {
    color: 'white',
    fontWeight: 'bold',
    margin: 0,
    background: 'linear-gradient(135deg, #fff, #00c6ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },

  homeLink: {
    color: '#00c6ff',
    textDecoration: 'none',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },

  errorBanner: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '8px 12px',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#ef4444',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
  },

  retryButton: {
    marginLeft: 'auto',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    borderRadius: '40px',
    width: '100%',
    boxSizing: 'border-box',
  },

  navButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  monthDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  monthYear: {
    color: 'white',
    margin: 0,
  },

  todayButton: {
    background: 'rgba(0, 198, 255, 0.2)',
    border: '1px solid #00c6ff',
    borderRadius: '16px',
    color: '#00c6ff',
    cursor: 'pointer',
  },

  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    width: '100%',
    boxSizing: 'border-box',
  },

  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: 'rgba(255, 255, 255, 0.9)',
  },

  legendDot: {
    borderRadius: '4px',
  },

  legendIcon: {
    fontSize: '14px',
  },

  calendarWrapper: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '16px',
    width: '100%',
    boxSizing: 'border-box',
  },

  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    width: '100%',
  },

  dayHeader: {
    textAlign: 'center',
    fontWeight: '600',
  },

  emptyCell: {
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '8px',
    aspectRatio: '1 / 1',
    width: '100%',
  },

  dayCell: {
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    boxSizing: 'border-box',
  },

  dayNumber: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
  },

  dayCelebration: {
    color: 'white',
    fontWeight: '500',
  },

  dayVerse: {
    color: '#FFD700',
    fontWeight: 'bold',
  },

  dayMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },

  dayType: {
    borderRadius: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  holyBadge: {
    lineHeight: 1,
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease',
    padding: '10px',
  },

  modalContent: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '20px',
    padding: '20px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
    animation: 'slideUp 0.3s ease',
  },

  modalCloseButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  modalHeader: {
    marginBottom: '15px',
    paddingRight: '30px',
  },

  modalTitle: {
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
    background: 'linear-gradient(135deg, #fff, #00c6ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },

  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  modalSection: {
    marginBottom: '5px',
  },

  modalCelebration: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '12px',
    borderRadius: '10px',
  },

  modalCelebrationIcon: {
    fontSize: '20px',
  },

  modalCelebrationName: {
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
  },

  modalSeasonBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '13px',
    border: '1px solid',
  },

  modalDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '10px',
    padding: '12px',
  },

  modalDetailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  modalDetailLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  modalDetailValue: {
    color: 'white',
    fontSize: '13px',
    fontWeight: '500',
  },

  modalColorDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },

  modalColorDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
  },

  modalReadingsSection: {
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '10px',
    padding: '12px',
    marginTop: '5px',
  },

  modalReadingsTitle: {
    color: '#FFD700',
    fontSize: '15px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },

  modalReadingItem: {
    display: 'flex',
    gap: '8px',
    marginBottom: '6px',
    fontSize: '13px',
    padding: '4px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },

  modalReadingLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    minWidth: '90px',
    fontSize: '12px',
  },

  modalReadingCitation: {
    color: '#00c6ff',
    fontWeight: '500',
    fontSize: '12px',
  },

  modalFooter: {
    marginTop: '8px',
    textAlign: 'center',
  },

  modalCycle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '12px',
    fontStyle: 'italic',
  },

  footer: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: '11px',
    marginTop: '15px',
  },

  credit: {
    marginTop: '3px',
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: '10px',
  },

  // Loading Styles
  loadingContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a1e 0%, #1a0033 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingContent: {
    textAlign: 'center',
  },

  loadingAnimation: {
    position: 'relative',
    width: '70px',
    height: '70px',
    margin: '0 auto 15px',
  },

  loadingRing: {
    position: 'absolute',
    inset: 0,
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
  },

  loadingRingInner: {
    position: 'absolute',
    inset: 0,
    border: '3px solid transparent',
    borderTopColor: '#800080',
    borderRightColor: '#008000',
    borderBottomColor: '#FFFFFF',
    borderLeftColor: '#00c6ff',
    borderRadius: '50%',
    animation: 'spin 1.5s linear infinite',
  },

  loadingIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '28px',
    height: '28px',
    color: 'white',
  },

  loadingTitle: {
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '5px',
  },

  loadingSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '12px',
  },
};

export default LiturgicalCalendar;