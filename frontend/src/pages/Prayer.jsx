// Prayer.jsx — Complete with Browse Prayers section + Rosary + Stations + Proper Formatting
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import './Prayer.css';

const Prayer = () => {
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMainTab, setActiveMainTab] = useState('browse');
  const [selectedSet, setSelectedSet] = useState('sorrowful');
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [expandedPrayer, setExpandedPrayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showQuickPrayers, setShowQuickPrayers] = useState(true);
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  
  // API data states
  const [dailyPrayers, setDailyPrayers] = useState([]);
  const [marianPrayers, setMarianPrayers] = useState([]);
  const [saintsPrayers, setSaintsPrayers] = useState([]);
  const [stationsData, setStationsData] = useState([]);
  const [mysteries, setMysteries] = useState({
    joyful: [],
    sorrowful: [],
    glorious: [],
    luminous: []
  });
  const [favorites, setFavorites] = useState([]);
  const [allPrayers, setAllPrayers] = useState([]);
  const [filteredPrayers, setFilteredPrayers] = useState([]);
  
  // Rosary state
  const [currentMysteryIndex, setCurrentMysteryIndex] = useState(0);
  const [hailMaryCount, setHailMaryCount] = useState(0);
  const [completedDecades, setCompletedDecades] = useState([]);
  const [showMysteryDetails, setShowMysteryDetails] = useState(false);
  const [showStationDetails, setShowStationDetails] = useState(false);

  // Get user info
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const fullName = user.fullName || '';
  const firstName = fullName.split(' ')[0];
  const userId = user.id || localStorage.getItem('userId') || 'anonymous';

  // Get current mystery set
  const currentSet = mysteries[selectedSet] || [];
  const currentMystery = currentSet[currentMysteryIndex];
  const currentStation = stationsData[currentStationIndex];

  // Get day name
  const getDayName = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getSuggestedMystery = () => {
    const day = getDayName();
    if (day === 'Tuesday' || day === 'Friday') return 'sorrowful';
    if (day === 'Monday' || day === 'Saturday') return 'joyful';
    if (day === 'Wednesday' || day === 'Sunday') return 'glorious';
    if (day === 'Thursday') return 'luminous';
    return 'sorrowful';
  };

  // Clean prayer text
  const cleanPrayerText = (text) => {
    if (!text) return 'Prayer content not available';
    
    let cleaned = text;
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
    cleaned = cleaned.replace(/Share this Page.*$/s, '');
    cleaned = cleaned.replace(/More Prayers.*$/s, '');
    cleaned = cleaned.replace(/Daily Reflections.*$/s, '');
    cleaned = cleaned.replace(/More Sharing Options.*$/s, '');
    cleaned = cleaned.replace(/View Video.*$/s, '');
    cleaned = cleaned.replace(/<img[^>]*>/g, '');
    cleaned = cleaned.replace(/\.jpg|\.png|\.jpeg|\.webp/g, '');
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
    
    return cleaned.trim() || 'Prayer content available';
  };

  // Enhanced prayer text formatting - properly structures the prayer for readability
  const formatPrayerText = (text) => {
    if (!text) return <p>Prayer content not available</p>;
    
    let cleaned = cleanPrayerText(text);
    
    // Split into paragraphs
    const paragraphs = cleaned.split(/\n\s*\n/);
    
    return paragraphs.map((paragraph, idx) => {
      if (!paragraph.trim()) return null;
      
      // Check if this is a title or heading (all caps or short)
      const isHeading = paragraph.length < 100 && paragraph === paragraph.toUpperCase() && paragraph.length > 10;
      
      // Check if this is a verse or response (starts with V/ or R/)
      const isVerse = paragraph.match(/^[VR]\//);
      
      // Check if this is a numbered section
      const isNumbered = paragraph.match(/^\d+\./);
      
      if (isHeading) {
        return <h3 key={idx} className="prayer-heading">{paragraph}</h3>;
      }
      
      if (isVerse) {
        const [label, ...content] = paragraph.split(/\s+/);
        return (
          <div key={idx} className="prayer-verse">
            <span className="verse-label">{label}</span>
            <span className="verse-content">{content.join(' ')}</span>
          </div>
        );
      }
      
      if (isNumbered) {
        return (
          <div key={idx} className="prayer-numbered">
            {paragraph.split('\n').map((line, i) => (
              <p key={i} className="prayer-line numbered-line">{line}</p>
            ))}
          </div>
        );
      }
      
      // Regular paragraph - split into sentences for better flow
      const sentences = paragraph.split(/(?<=[.!?])\s+(?=[A-Z])/);
      
      return (
        <div key={idx} className="prayer-paragraph">
          {sentences.map((sentence, i) => (
            <p key={i} className="prayer-sentence">{sentence}</p>
          ))}
        </div>
      );
    }).filter(Boolean);
  };

 // Fetch all prayers
useEffect(() => {
  const fetchAllPrayers = async () => {
    setLoading(true);
    try {
      const dailyRes = await api.get('/api/prayers?category=daily&limit=50');
      setDailyPrayers(dailyRes.data.prayers || []);
      
      const marianRes = await api.get('/api/prayers?category=marian&limit=50');
      setMarianPrayers(marianRes.data.prayers || []);
      
      const saintsRes = await api.get('/api/prayers?category=saints&limit=100');
      setSaintsPrayers(saintsRes.data.prayers || []);
      
      const stations = saintsRes.data.prayers.filter(p => 
        p.title?.toLowerCase().includes('station') || 
        p.title?.toLowerCase().includes('stations of the cross')
      );
      setStationsData(stations.length > 0 ? stations : saintsRes.data.prayers.slice(0, 14));
      
      const rosaryRes = await api.get('/api/prayers?category=rosary&limit=100');
      const rosaryPrayers = rosaryRes.data.prayers || [];
      
      const joyful = rosaryPrayers.filter(p => p.title?.toLowerCase().includes('joyful'));
      const sorrowful = rosaryPrayers.filter(p => p.title?.toLowerCase().includes('sorrowful'));
      const glorious = rosaryPrayers.filter(p => p.title?.toLowerCase().includes('glorious'));
      const luminous = rosaryPrayers.filter(p => p.title?.toLowerCase().includes('luminous'));
      
      setMysteries({
        joyful: joyful.length > 0 ? joyful : rosaryPrayers.slice(0, 5),
        sorrowful: sorrowful.length > 0 ? sorrowful : rosaryPrayers.slice(5, 10),
        glorious: glorious.length > 0 ? glorious : rosaryPrayers.slice(10, 15),
        luminous: luminous.length > 0 ? luminous : rosaryPrayers.slice(15, 20)
      });
      
      // Combine ALL prayers from all categories
      const all = [
        ...(dailyRes.data.prayers || []),
        ...(marianRes.data.prayers || []),
        ...(saintsRes.data.prayers || []),
        ...(rosaryPrayers || [])
      ].filter(p => {
        // Only filter out prayers with images or empty content
        if (p.prayer?.includes('<img') || p.prayer?.includes('.jpg')) return false;
        if (!p.prayer) return false;
        if (p.prayer?.includes('Share this Page')) return false;
        return true;
      });
      
      // Remove duplicates by title
      const unique = [];
      const titles = new Set();
      for (const prayer of all) {
        if (!titles.has(prayer.title)) {
          titles.add(prayer.title);
          unique.push(prayer);
        }
      }
      setAllPrayers(unique);
      setFilteredPrayers(unique);
      
      const favoritesRes = await api.get(`/api/prayers/my/favorites?userId=${userId}`);
      setFavorites(favoritesRes.data.favorites || []);
      
    } catch (err) {
      console.error('Error fetching prayers:', err);
      setError('Failed to load prayers. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  fetchAllPrayers();
}, [userId]);

  // Filter prayers by category
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredPrayers(allPrayers);
    } else {
      setFilteredPrayers(allPrayers.filter(p => p.category === activeFilter));
    }
  }, [activeFilter, allPrayers]);

  // Search prayers
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/api/prayers?search=${encodeURIComponent(searchTerm)}&limit=50`);
      const filtered = (res.data.prayers || []).filter(p => {
        if (p.prayer?.includes('<img')) return false;
        return true;
      });
      setSearchResults(filtered);
      setShowSearchResults(true);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Toggle favorite
  const toggleFavorite = async (prayerId) => {
    try {
      const res = await api.post(`/api/prayers/${prayerId}/favorite`, { userId });
      if (res.data.favorited) {
        setFavorites([...favorites, { prayerId }]);
      } else {
        setFavorites(favorites.filter(f => f.prayerId !== prayerId));
      }
    } catch (err) {
      console.error('Favorite error:', err);
    }
  };

  const isFavorited = (prayerId) => {
    return favorites.some(f => f.prayerId === prayerId);
  };

  // Rosary functions
  const handleHailMaryClick = () => {
    if (hailMaryCount < 10) setHailMaryCount(hailMaryCount + 1);
  };

  const completeDecade = () => {
    if (!completedDecades.includes(currentMysteryIndex)) {
      setCompletedDecades([...completedDecades, currentMysteryIndex]);
    }
    if (currentMysteryIndex < 4) {
      setCurrentMysteryIndex(currentMysteryIndex + 1);
      setHailMaryCount(0);
      setShowMysteryDetails(false);
    }
  };

  const resetRosary = () => {
    setCurrentMysteryIndex(0);
    setHailMaryCount(0);
    setCompletedDecades([]);
    setShowMysteryDetails(false);
  };

  const isDecadeComplete = hailMaryCount === 10;
  const isRosaryComplete = completedDecades.length === 5;

  // Stations functions
  const nextStation = () => {
    if (currentStationIndex < stationsData.length - 1) {
      setCurrentStationIndex(currentStationIndex + 1);
      setShowStationDetails(false);
    }
  };

  const prevStation = () => {
    if (currentStationIndex > 0) {
      setCurrentStationIndex(currentStationIndex - 1);
      setShowStationDetails(false);
    }
  };

  const resetStations = () => {
    setCurrentStationIndex(0);
    setShowStationDetails(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="prayer-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading prayers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prayer-container">
        <div className="error-screen">
          <h2>Unable to Load Data</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="prayer-container">
      {/* Header with Back Button */}
      <div className="prayer-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="header-title">
          <h1>{firstName}'s Prayer Space</h1>
          <p>Today is {getDayName()} • Suggested: {getSuggestedMystery().toUpperCase()} Mysteries</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search prayers by title or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="search-btn" onClick={handleSearch}>Search</button>
          {searchTerm && <button className="clear-btn" onClick={clearSearch}>✕</button>}
        </div>
      </div>

      {/* Search Results Section */}
      {showSearchResults && (
        <div className="search-results">
          <h3>Search Results ({searchResults.length})</h3>
          {searchResults.length === 0 ? (
            <p className="no-results">No prayers found matching "{searchTerm}"</p>
          ) : (
            <div className="search-results-grid">
              {searchResults.map(prayer => (
                <div key={prayer.id} className="search-result-card" onClick={() => setSelectedPrayer(prayer)}>
                  <h4>{prayer.title}</h4>
                  <span className="result-category">{prayer.category}</span>
                  <p>{cleanPrayerText(prayer.prayer).substring(0, 100)}...</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Tabs */}
      <div className="main-tabs">
        <button className={activeMainTab === 'browse' ? 'main-tab-active' : 'main-tab'} onClick={() => setActiveMainTab('browse')}>
          Browse Prayers
        </button>
        <button className={activeMainTab === 'rosary' ? 'main-tab-active' : 'main-tab'} onClick={() => setActiveMainTab('rosary')}>
          Holy Rosary
        </button>
        <button className={activeMainTab === 'stations' ? 'main-tab-active' : 'main-tab'} onClick={() => setActiveMainTab('stations')}>
          Stations of the Cross
        </button>
      </div>

      {/* ========== BROWSE PRAYERS SECTION ========== */}
      {activeMainTab === 'browse' && (
        <div className="browse-section">
          {/* Category Filters */}
          <div className="category-filters">
            <button 
              className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All
            </button>
            <button 
              className={`filter-chip ${activeFilter === 'daily' ? 'active' : ''}`}
              onClick={() => setActiveFilter('daily')}
            >
              Daily
            </button>
            <button 
              className={`filter-chip ${activeFilter === 'marian' ? 'active' : ''}`}
              onClick={() => setActiveFilter('marian')}
            >
              Marian
            </button>
            <button 
              className={`filter-chip ${activeFilter === 'saints' ? 'active' : ''}`}
              onClick={() => setActiveFilter('saints')}
            >
              Saints
            </button>
            <button 
              className={`filter-chip ${activeFilter === 'rosary' ? 'active' : ''}`}
              onClick={() => setActiveFilter('rosary')}
            >
              Rosary
            </button>
          </div>

          {/* Prayer Grid */}
          <div className="prayer-grid">
            {filteredPrayers.map(prayer => (
              <div key={prayer.id} className="prayer-card" onClick={() => setSelectedPrayer(prayer)}>
                <div className="prayer-card-header">
                  <h3>{prayer.title}</h3>
                  <button 
                    className="favorite-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(prayer.id);
                    }}
                  >
                    {isFavorited(prayer.id) ? '★' : '☆'}
                  </button>
                </div>
                <span className="prayer-category">{prayer.category}</span>
                <p className="prayer-preview">{cleanPrayerText(prayer.prayer).substring(0, 120)}...</p>
              </div>
            ))}
          </div>

          {filteredPrayers.length === 0 && (
            <div className="empty-state">
              <p>No prayers found</p>
            </div>
          )}
        </div>
      )}

      {/* ========== ROSARY SECTION ========== */}
      {activeMainTab === 'rosary' && (
        <div className="two-columns">
          <div className="devotion-column">
            <div className="mystery-selector">
              <button className={selectedSet === 'sorrowful' ? 'set-active' : 'set-btn'} onClick={() => { setSelectedSet('sorrowful'); resetRosary(); }}>
                Sorrowful <span>Tue/Fri</span>
              </button>
              <button className={selectedSet === 'joyful' ? 'set-active' : 'set-btn'} onClick={() => { setSelectedSet('joyful'); resetRosary(); }}>
                Joyful <span>Mon/Sat</span>
              </button>
              <button className={selectedSet === 'glorious' ? 'set-active' : 'set-btn'} onClick={() => { setSelectedSet('glorious'); resetRosary(); }}>
                Glorious <span>Wed/Sun</span>
              </button>
              <button className={selectedSet === 'luminous' ? 'set-active' : 'set-btn'} onClick={() => { setSelectedSet('luminous'); resetRosary(); }}>
                Luminous <span>Thu</span>
              </button>
            </div>

            {isRosaryComplete ? (
              <div className="devotion-complete">
                <div className="complete-icon">🎉</div>
                <h3>Congratulations!</h3>
                <p>You have completed the {selectedSet} mysteries.</p>
                <button onClick={resetRosary} className="reset-btn">Pray Again</button>
              </div>
            ) : (
              currentMystery && (
                <div className="mystery-card">
                  <div className="mystery-header">
                    <span className="mystery-badge">Mystery {currentMysteryIndex + 1} of 5</span>
                    <button className="details-toggle" onClick={() => setShowMysteryDetails(!showMysteryDetails)}>
                      {showMysteryDetails ? 'Hide' : 'Show Meditation'}
                    </button>
                  </div>
                  <h2>{currentMystery.title}</h2>
                  
                  {showMysteryDetails && (
                    <div className="mystery-details">
                      {formatPrayerText(currentMystery.prayer)}
                    </div>
                  )}
                  
                  <div className="rosary-counter-section">
                    <div className="prayer-row"><span className="prayer-name">1. Our Father</span></div>
                    <div className="prayer-row hail-mary-row">
                      <span className="prayer-name">2. Ten Hail Marys</span>
                      <div className="counter-controls">
                        <button className="counter-btn" onClick={handleHailMaryClick}>+</button>
                        <span className="counter-count">{hailMaryCount} / 10</span>
                      </div>
                      <div className="beads">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className={`bead ${i < hailMaryCount ? 'prayed' : ''}`} />
                        ))}
                      </div>
                    </div>
                    <div className="prayer-row"><span className="prayer-name">3. Glory Be</span></div>
                    <div className="prayer-row"><span className="prayer-name">4. Oh My Jesus</span></div>
                  </div>
                  
                  {isDecadeComplete && <div className="decade-complete">✅ Decade complete! Click "Next Mystery" to continue.</div>}
                  
                  <div className="action-buttons">
                    <button onClick={completeDecade} className="next-btn">
                      {currentMysteryIndex === 4 ? 'Finish Rosary' : 'Next Mystery →'}
                    </button>
                    <button onClick={resetRosary} className="reset-btn">Reset</button>
                  </div>
                </div>
              )
            )}

            {completedDecades.length > 0 && (
              <div className="completed-tracker">
                <h4>Completed:</h4>
                <div className="completed-list">
                  {completedDecades.map(idx => (
                    <span key={idx} className="completed-item">{currentSet[idx]?.title}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="prayers-column">
            <div className="prayers-panel">
              <h3>Prayer Guide</h3>
              
              <div className="quick-prayers-toggle" onClick={() => setShowQuickPrayers(!showQuickPrayers)}>
                <span>Quick Prayers</span>
                <span>{showQuickPrayers ? '▲' : '▼'}</span>
              </div>
              
              {showQuickPrayers && (
                <div className="quick-prayers-grid">
                  {dailyPrayers.slice(0, 4).map(prayer => (
                    <button key={prayer.id} className="quick-prayer-btn" onClick={() => setSelectedPrayer(prayer)}>
                      {prayer.title}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="prayer-section">
                <h4>Daily Prayers ({dailyPrayers.length})</h4>
                {dailyPrayers.slice(0, 8).map(prayer => (
                  <div key={prayer.id} className="prayer-card-compact" onClick={() => setSelectedPrayer(prayer)}>
                    <div className="prayer-title">
                      <span>{prayer.title}</span>
                      <button className="favorite-star" onClick={(e) => { e.stopPropagation(); toggleFavorite(prayer.id); }}>
                        {isFavorited(prayer.id) ? '★' : '☆'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== STATIONS SECTION ========== */}
      {activeMainTab === 'stations' && stationsData.length > 0 && (
        <div className="stations-section">
          <div className="stations-progress">
            <span>Station {currentStationIndex + 1} of {stationsData.length}</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((currentStationIndex + 1) / stationsData.length) * 100}%` }}></div>
            </div>
          </div>

          {currentStation && (
            <div className="station-card">
              <div className="station-number">Station {currentStationIndex + 1}</div>
              <h2>{currentStation.title}</h2>
              
              <div className="station-response">
                <p><strong>V/</strong> We adore you, Christ, and we praise you.</p>
                <p><strong>R/</strong> Because by your holy Cross, you have redeemed the world.</p>
              </div>
              
              <button className="details-toggle" onClick={() => setShowStationDetails(!showStationDetails)}>
                {showStationDetails ? 'Hide Meditation' : 'Show Meditation'}
              </button>
              
              {showStationDetails && (
                <div className="station-details">
                  <div className="station-meditation">
                    <h4>Meditation</h4>
                    {formatPrayerText(currentStation.prayer)}
                  </div>
                </div>
              )}
              
              <div className="station-navigation">
                <button onClick={prevStation} disabled={currentStationIndex === 0} className="nav-prev">← Previous</button>
                <button onClick={nextStation} disabled={currentStationIndex === stationsData.length - 1} className="nav-next">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prayer Modal for viewing full prayer */}
      {selectedPrayer && (
        <div className="modal-overlay" onClick={() => setSelectedPrayer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedPrayer.title}</h2>
              <button className="modal-close" onClick={() => setSelectedPrayer(null)}>✕</button>
            </div>
            <div className="modal-category">
              <span className="category-badge">{selectedPrayer.category}</span>
              <button className="modal-favorite" onClick={() => toggleFavorite(selectedPrayer.id)}>
                {isFavorited(selectedPrayer.id) ? '★ Remove from favorites' : '☆ Add to favorites'}
              </button>
            </div>
            <div className="modal-body">
              {formatPrayerText(selectedPrayer.prayer)}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .prayer-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          background: #f5f0e8;
          min-height: 100vh;
        }

        .prayer-header {
          position: relative;
          text-align: center;
          padding: 20px;
          background: #1e3a32;
          color: white;
          border-radius: 20px;
          margin-bottom: 24px;
        }

        .back-button {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 30px;
          cursor: pointer;
          font-size: 14px;
        }

        .header-title h1 {
          font-size: 1.4rem;
          margin: 0 0 5px;
        }

        .header-title p {
          font-size: 0.75rem;
          opacity: 0.9;
        }

        /* Search */
        .search-section {
          margin-bottom: 20px;
        }

        .search-bar {
          display: flex;
          gap: 8px;
        }

        .search-bar input {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 30px;
          font-size: 14px;
          background: white;
        }

        .search-btn, .clear-btn {
          padding: 0 20px;
          background: #1e3a32;
          color: white;
          border: none;
          border-radius: 30px;
          cursor: pointer;
        }

        .clear-btn {
          background: #ef4444;
        }

        /* Search Results */
        .search-results {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .search-results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .search-result-card {
          padding: 16px;
          border: 1px solid #e0d6c8;
          border-radius: 12px;
          cursor: pointer;
        }

        .search-result-card h4 {
          margin: 0 0 8px;
          color: #1e3a32;
        }

        .result-category {
          display: inline-block;
          padding: 2px 8px;
          background: #f0ebe3;
          border-radius: 20px;
          font-size: 11px;
          margin-bottom: 8px;
        }

        /* Main Tabs */
        .main-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .main-tab, .main-tab-active {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 40px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .main-tab {
          background: white;
          color: #1e3a32;
        }

        .main-tab-active {
          background: #1e3a32;
          color: white;
        }

        /* Browse Section */
        .browse-section {
          background: white;
          border-radius: 20px;
          padding: 20px;
        }

        .category-filters {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .filter-chip {
          padding: 8px 20px;
          background: #f0ebe3;
          border: none;
          border-radius: 30px;
          cursor: pointer;
          font-size: 14px;
        }

        .filter-chip.active {
          background: #1e3a32;
          color: white;
        }

        .prayer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .prayer-card {
          background: #f9f6f0;
          border-radius: 16px;
          padding: 20px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .prayer-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .prayer-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .prayer-card-header h3 {
          font-size: 1rem;
          color: #1e3a32;
          margin: 0;
        }

        .favorite-icon {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #c9b78b;
        }

        .prayer-category {
          display: inline-block;
          padding: 2px 10px;
          background: #e0d6c8;
          border-radius: 20px;
          font-size: 11px;
          margin-bottom: 12px;
        }

        .prayer-preview {
          font-size: 13px;
          color: #666;
          line-height: 1.4;
        }

        /* Two Columns Layout */
        .two-columns {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        @media (min-width: 768px) {
          .two-columns {
            grid-template-columns: 1fr 0.9fr;
          }
        }

        .devotion-column, .prayers-column {
          background: white;
          border-radius: 20px;
          padding: 20px;
        }

        /* Mystery Selector */
        .mystery-selector {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }

        @media (min-width: 500px) {
          .mystery-selector {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .set-btn, .set-active {
          padding: 10px;
          border: none;
          border-radius: 12px;
          font-size: 12px;
          cursor: pointer;
          text-align: center;
        }

        .set-btn {
          background: #f0ebe3;
          color: #1e3a32;
        }

        .set-active {
          background: #1e3a32;
          color: white;
        }

        .set-btn span, .set-active span {
          font-size: 10px;
          display: block;
        }

        /* Mystery Card */
        .mystery-card h2 {
          font-size: 1.2rem;
          color: #1e3a32;
          margin: 12px 0;
          border-left: 3px solid #c9b78b;
          padding-left: 12px;
        }

        .details-toggle {
          background: none;
          border: 1px solid #c9b78b;
          padding: 4px 12px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 12px;
        }

        .mystery-details, .station-details {
          background: #f9f6f0;
          padding: 15px;
          border-radius: 12px;
          margin: 12px 0;
          max-height: 300px;
          overflow-y: auto;
        }

        /* ========== PRAYER TEXT FORMATTING ========== */
        .prayer-paragraph {
          margin-bottom: 20px;
        }

        .prayer-sentence {
          margin-bottom: 8px;
          line-height: 1.7;
          font-size: 15px;
          color: #2c3e2f;
        }

        .prayer-heading {
          font-size: 1.2rem;
          font-weight: 600;
          color: #1e3a32;
          text-align: center;
          margin: 24px 0 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #c9b78b;
        }

        .prayer-verse {
          display: flex;
          gap: 12px;
          margin: 12px 0;
          padding: 8px 12px;
          background: #f9f6f0;
          border-radius: 8px;
          font-style: italic;
        }

        .verse-label {
          font-weight: 700;
          color: #8b5a2b;
          min-width: 30px;
        }

        .verse-content {
          flex: 1;
          color: #4a4a4a;
        }

        .prayer-numbered {
          margin: 12px 0;
          padding-left: 20px;
        }

        .numbered-line {
          margin-bottom: 8px;
          position: relative;
        }

        .prayer-line {
          margin-bottom: 12px;
          line-height: 1.6;
          font-size: 15px;
        }

        /* Scrollbar for modal */
        .modal-body {
          max-height: calc(85vh - 120px);
          overflow-y: auto;
          padding-right: 8px;
        }

        .modal-body::-webkit-scrollbar {
          width: 4px;
        }

        .modal-body::-webkit-scrollbar-track {
          background: #f0ebe3;
          border-radius: 10px;
        }

        .modal-body::-webkit-scrollbar-thumb {
          background: #c9b78b;
          border-radius: 10px;
        }

        /* Drop cap for first letter */
        .prayer-paragraph:first-of-type .prayer-sentence:first-child::first-letter {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1e3a32;
          float: left;
          margin-right: 8px;
          line-height: 1;
        }

        /* Rosary Counter */
        .rosary-counter-section {
          background: #f9f6f0;
          padding: 15px;
          border-radius: 15px;
          margin: 15px 0;
        }

        .prayer-row {
          padding: 8px 0;
          border-bottom: 1px solid #e0d6c8;
        }

        .counter-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 8px 0;
        }

        .counter-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #c9b78b;
          border: none;
          font-size: 20px;
          cursor: pointer;
        }

        .beads {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .bead {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #e0d6c8;
        }

        .bead.prayed {
          background: #c9b78b;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin-top: 15px;
        }

        .next-btn, .reset-btn {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 25px;
          font-weight: 600;
          cursor: pointer;
        }

        .next-btn {
          background: #1e3a32;
          color: white;
        }

        .reset-btn {
          background: #8b5a2b;
          color: white;
        }

        .decade-complete {
          background: #d4edda;
          padding: 10px;
          border-radius: 10px;
          text-align: center;
          font-size: 13px;
          margin: 12px 0;
        }

        .completed-tracker {
          margin-top: 15px;
          padding: 12px;
          background: #e8f0e8;
          border-radius: 12px;
        }

        .completed-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }

        .completed-item {
          background: #1e3a32;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
        }

        /* Prayers Column */
        .prayers-panel h3 {
          color: #1e3a32;
          margin-bottom: 15px;
        }

        .quick-prayers-toggle {
          display: flex;
          justify-content: space-between;
          padding: 12px;
          background: #f0ebe3;
          border-radius: 12px;
          margin-bottom: 15px;
          cursor: pointer;
        }

        .quick-prayers-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }

        .quick-prayer-btn {
          padding: 10px;
          background: #f0ebe3;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 12px;
        }

        .prayer-section h4 {
          color: #1e3a32;
          font-size: 14px;
          margin-bottom: 12px;
          border-left: 3px solid #c9b78b;
          padding-left: 10px;
        }

        .prayer-card-compact {
          margin-bottom: 8px;
          border: 1px solid #f0ebe3;
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
        }

        .prayer-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f9f6f0;
        }

        .favorite-star {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
        }

        /* Stations */
        .stations-section {
          background: white;
          border-radius: 20px;
          padding: 20px;
        }

        .stations-progress {
          margin-bottom: 20px;
          text-align: center;
        }

        .progress-bar {
          height: 6px;
          background: #e0d6c8;
          border-radius: 3px;
          margin-top: 8px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #1e3a32;
          border-radius: 3px;
        }

        .station-card h2 {
          font-size: 1.2rem;
          color: #1e3a32;
          margin: 12px 0;
        }

        .station-number {
          display: inline-block;
          background: #c9b78b;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
        }

        .station-response {
          background: #f9f6f0;
          padding: 12px;
          border-radius: 12px;
          margin: 12px 0;
        }

        .station-navigation {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .nav-prev, .nav-next {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 25px;
          cursor: pointer;
        }

        .nav-prev {
          background: #8b5a2b;
          color: white;
        }

        .nav-next {
          background: #1e3a32;
          color: white;
        }

        .nav-prev:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 20px;
          max-width: 700px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          padding: 24px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f0ebe3;
        }

        .modal-header h2 {
          font-size: 1.3rem;
          color: #1e3a32;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
        }

        .modal-category {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .category-badge {
          background: #f0ebe3;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
        }

        .modal-favorite {
          background: none;
          border: none;
          cursor: pointer;
          color: #c9b78b;
        }

        .devotion-complete {
          text-align: center;
          padding: 40px;
        }

        .complete-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }

        .loading-screen, .error-screen {
          text-align: center;
          padding: 60px;
          background: white;
          border-radius: 20px;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f0ebe3;
          border-top-color: #1e3a32;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        @media (max-width: 768px) {
          .prayer-container {
            padding: 12px;
          }

          .prayer-grid {
            grid-template-columns: 1fr;
          }

          .modal-content {
            padding: 20px;
          }

          .back-button {
            top: 12px;
            left: 12px;
            padding: 6px 12px;
            font-size: 12px;
          }

          .prayer-sentence {
            font-size: 14px;
          }
        }
          /* Prayer Grid - Responsive */
.prayer-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

/* Search results grid - also 2 columns on mobile */
.search-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

/* For smaller phones, keep 2 columns but adjust padding */
@media (max-width: 480px) {
  .prayer-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .prayer-card {
    padding: 12px;
  }
  
  .prayer-card-header h3 {
    font-size: 0.85rem;
  }
  
  .prayer-preview {
    font-size: 11px;
  }
  
  .search-results-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  .search-result-card h4 {
    font-size: 0.85rem;
  }
}

/* For tablets and up, use more columns */
@media (min-width: 768px) {
  .prayer-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  
  .search-results-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .prayer-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .search-results-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
      `}</style>
    </div>
  );
};

export default Prayer;