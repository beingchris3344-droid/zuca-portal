// Prayer.jsx — Complete with working Stations of the Cross
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import './Prayer.css';

const Prayer = () => {
  const [rosaryData, setRosaryData] = useState(null);
   const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMainTab, setActiveMainTab] = useState('rosary');
  const [selectedSet, setSelectedSet] = useState('sorrowful');
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [expandedPrayer, setExpandedPrayer] = useState(null);
  
  // Rosary state
  const [currentMysteryIndex, setCurrentMysteryIndex] = useState(0);
  const [hailMaryCount, setHailMaryCount] = useState(0);
  const [completedDecades, setCompletedDecades] = useState([]);
  const [showMysteryDetails, setShowMysteryDetails] = useState(false);
  const [showStationDetails, setShowStationDetails] = useState(false);

  // Complete Stations of the Cross Data
  const stationsData = [
    { id: "1", title: "Jesus Is Condemned to Death", v: "We adore you, Christ, and we praise you.", r: "Because by your holy Cross, you have redeemed the world.", meditation: "Jesus, after having been scourged and crowned with thorns, was unjustly condemned by Pilate to die on the Cross.", prayer: "Jesus, it is because of my sins that You are going to die. Through the merits of Your sorrowful journey, help me in my journey to Heaven. I love You, Jesus. I repent of my sins. Help me to never sin again and to love You always and to do Your will." },
    { id: "2", title: "Jesus Takes Up His Cross", v: "We adore you, Christ, and we praise you.", r: "Because by your holy Cross, you have redeemed the world.", meditation: "Jesus, in making this journey with the Cross on His shoulders, thought of us, and offered for us, to His Father, the death that He was about to undergo.", prayer: "Jesus, I embrace all the suffering that you send to me. Through the merits of your pain in carrying Your Cross, help me to carry my cross with patience and resignation. I love you, Jesus. I repent of my sins. Help me to never sin again and to love you always and to do your will." },
    { id: "3", title: "Jesus Falls the First Time", v: "We adore you, Christ, and we praise you.", r: "Because by your holy Cross, you have redeemed the world.", meditation: "Jesus fell for the first time under His Cross. He had been scourged and had a crown of thorns on His head, and the soldiers hit Him. He was in so much pain He could barely walk, but He had to carry the heavy Cross.", prayer: "Jesus, the weight of my sins adds to your suffering and makes it infinitely worse. Through the merits of your first fall, deliver me from falling into mortal sin. I love you, Jesus. I repent of my sins. Help me to never sin again and to love you always and to do your will." },
    { id: "4", title: "Jesus Meets His Sorrowful Mother", v: "We adore you, Christ, and we praise you.", r: "Because by your holy Cross, you have redeemed the world.", meditation: "Jesus met His Mother Mary along His journey. They loved each other so deeply.", prayer: "Jesus, through the sorrow and joy you had in meeting your Mother Mary, help me to be truly devoted to her. Mary, help me to remember in my heart the suffering your Son underwent for me. I love you, Jesus. I repent of my sins. Help me to never sin again and to love you always and to do your will." },
    { id: "5", title: "Simon Of Cyrene Helps Jesus Carry The Cross", v: "We adore you, Christ, and we praise you.", r: "Because by your holy Cross, you have redeemed the world.", meditation: "When the Jews saw how weak Jesus was, they feared He might die on the way, before He was crucified, so they forced a man named Simon the Cyrenian to carry the Cross behind our Lord.", prayer: "Jesus, I accept the cross you give to me, and I accept how you want me to die. I offer all my sufferings and troubles to you. I love you, Jesus. I repent of my sins. Help me to never sin again and to love you always and to do your will." },
    { id: "6", title: "Veronica Wipes the Face of Jesus", v: "We adore you, Christ, and we praise you.", r: "Because by your holy Cross, you have redeemed the world.", meditation: "A woman named Veronica, seeing Jesus suffering so much, and sweat and blood dripping down His face, gave Him a towel to wipe His face. By a miracle, He left an image of His face on the towel.", prayer: "Jesus, your face was once clean and good to look upon, but blood and sweat disfigured it, and Veronica wiped Your face clean. My soul was once clean and beautiful when I was baptized, but sin disfigured it. Through your suffering, wipe my soul clean. I love you, Jesus. I repent of my sins. Help me to never sin again and to love You always and to do Your will." },
    { id: "7", title: "Jesus Falls a Second Time", v: "We adore you, Christ, and we praise you.", r: "Because by your holy Cross, you have redeemed the world.", meditation: "Jesus fell the second time under the Cross. The fall renews all the pain in His body and makes His head throb.", prayer: "Jesus, so many times you have forgiven me, and so many times I have sinned again. Through the merits of your second fall, help me and preserve me in your grace until I die. Help me to call on you every time I am tempted. I love you, Jesus. I repent of my sins. Help me to never sin again and to love you always and to do your will." },
    { id: "8", title: "Jesus Meets the Women of Jerusalem", v: "We adore you, Christ, and we praise you.", r: "Because by your holy Cross, you have redeemed the world.", meditation: "These women wept with compassion at seeing Jesus walking to His death. But Jesus said to them, 'Weep not for me but for your children.'", prayer: "Jesus, I am sorry for all my sins, because of the pain and sadness they cause you, who loves me so much. I love you, Jesus. I repent of my sins. Help me to never sin again and to love you always and to do your will." },
    { id: "9", title: "Jesus Falls the Third Time", v: "We adore you, Christ, and we praise you.", r: "Because by your holy Cross, you have redeemed the world.", meditation: "Jesus fell for the third time. He was so weak and the soldiers pushed Him to walk faster, but He could barely move.", prayer: "Jesus, by my weakness in temptation, you are going to Calvary. Give me strength to conquer temptation. I love you, Jesus. I repent of my sins. Help me to never sin again and to love you always and to do your will." },
    { id: "10", title: "Jesus Is Stripped of His Garments", v: "We adore you, Christ, and we praise you.", r: "Because by your holy Cross, you have redeemed the world.", meditation: "The soldiers snatched Jesus' robe off Him.", prayer: "Jesus, help me to strip my soul of bad habits so I can give all my love to you, who are so worthy of all my love. I love you, Jesus. I repent of my sins. Help me to never sin again and to love you always and to do your will." },
    { id: "11", title: "Jesus Is Nailed to the Cross", v: "We adore you, Christ, and we praise you.", r: "Because by your holy Cross, you have redeemed the world.", meditation: "Jesus was thrown down onto the Cross. He stretched out His arms and offered His life to the Father for our salvation. The soldiers nailed Him to the Cross and pushed the Cross to stand up.", prayer: "Jesus, keep my heart. Keep me always close to you. I love you, Jesus. I repent of my sins. Help me to never sin again and to love You always and to do Your will." },
    { id: "12", title: "Jesus Dies on the Cross", v: "We adore you, Christ, and we praise you.", r: "Because by your holy Cross, you have redeemed the world.", meditation: "After suffering for three hours on the Cross, Jesus gave up His life to the Father and died.", prayer: "Jesus, through my sins, I deserve to be punished, but your death is my hope. Through the merits of your death, give me the grace that when I die, I will die as you want me to. I entrust my soul into your hands. I love you, Jesus. I repent of my sins. Help me to never sin again and to love you always and to do your will." },
    { id: "13", title: "Jesus Is Taken Down from the Cross", v: "We adore you, Christ, and we praise you.", r: "Because by your holy Cross, you have redeemed the world.", meditation: "Two of Jesus' disciples took Jesus down from the Cross and Mary His Mother held Him close to her heart.", prayer: "Mary, sorrowful Mother, pray to your Son for me. Jesus, you have died because you love me. Help me to love you always. I love you, Jesus. I repent of my sins. Help me to never sin again and to love you always and to do your will." },
    { id: "14", title: "Jesus Is Laid in the Tomb", v: "We adore you, Christ, and we praise you.", r: "Because by your holy Cross, you have redeemed the world.", meditation: "The two disciples and Mary laid Jesus in the tomb.", prayer: "Jesus, You rose on the third day. Through your Resurrection, make me rise glorious on the last day, to be always with you in Heaven, praising and loving you. I love you, Jesus. I repent of my sins. Help me to never sin again and to love you always and to do your will." }
  ];

  // Fetch rosary data
  useEffect(() => {
    const fetchRosaryData = async () => {
      try {
        const response = await fetch('/rosary-data.json');
        if (!response.ok) throw new Error('Failed to load rosary data');
        const data = await response.json();
        setRosaryData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRosaryData();
  }, []);

  const getCurrentMysterySet = () => {
    if (!rosaryData) return null;
    return rosaryData.mysteries[selectedSet];
  };

  // Get username anywhere in your component
const user = JSON.parse(localStorage.getItem('user') || '{}');
const fullName = user.fullName || '';
const firstName = fullName.split(' ')[0];


  const currentSet = getCurrentMysterySet();
  const currentMystery = currentSet?.mysteries[currentMysteryIndex];
  const currentStation = stationsData[currentStationIndex];
  
  const isDecadeComplete = hailMaryCount === 10;
  const isRosaryComplete = completedDecades.length === 5;

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

  const nextStation = () => {
    if (currentStationIndex < 13) {
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

  // All prayers for the right panel
  const allPrayers = rosaryData ? {
    opening: rosaryData.openingPrayers || [],
    closing: rosaryData.closingPrayers || []
  } : { opening: [], closing: [] };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>🙏 Loading prayers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>⚠️ Unable to Load Data</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="prayer-container">
      {/* Header */}
      <div className="prayer-header">
        <button className="back-button" onClick={() => navigate(-1)}>
    ← Back
  </button>
        <h1>📿 {firstName}'s PRAYER SPACE 📿</h1>
        <p>Today is {getDayName()} • Suggested: {getSuggestedMystery().toUpperCase()} Mysteries</p>
      </div>

      {/* Main Tabs */}
      <div className="main-tabs">
        <button className={activeMainTab === 'rosary' ? 'main-tab-active' : 'main-tab'} onClick={() => setActiveMainTab('rosary')}>
          📿 Holy Rosary
        </button>
        <button className={activeMainTab === 'stations' ? 'main-tab-active' : 'main-tab'} onClick={() => setActiveMainTab('stations')}>
          ✝️ Stations of the Cross
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="two-columns">
        {/* LEFT COLUMN: Active Devotion */}
        <div className="devotion-column">
          
          {/* ========== ROSARY SECTION ========== */}
          {activeMainTab === 'rosary' && (
            <>
              <div className="mystery-selector">
                <button className={selectedSet === 'sorrowful' ? 'set-active' : 'set-btn'} onClick={() => { setSelectedSet('sorrowful'); resetRosary(); }}>😢 Sorrowful <span>Tue/Fri</span></button>
                <button className={selectedSet === 'joyful' ? 'set-active' : 'set-btn'} onClick={() => { setSelectedSet('joyful'); resetRosary(); }}>😊 Joyful <span>Mon/Sat</span></button>
                <button className={selectedSet === 'glorious' ? 'set-active' : 'set-btn'} onClick={() => { setSelectedSet('glorious'); resetRosary(); }}>👑 Glorious <span>Wed/Sun</span></button>
                <button className={selectedSet === 'luminous' ? 'set-active' : 'set-btn'} onClick={() => { setSelectedSet('luminous'); resetRosary(); }}>💡 Luminous <span>Thu</span></button>
              </div>

              {currentSet && (
                <div className="current-set-banner">
                  <h3>{selectedSet.toUpperCase()} MYSTERIES</h3>
                  <p>Prayed on: {currentSet.day}</p>
                </div>
              )}

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
                      <span className="mystery-badge">Mystery {currentMystery.number} of 5</span>
                      <button className="details-toggle" onClick={() => setShowMysteryDetails(!showMysteryDetails)}>
                        {showMysteryDetails ? 'Hide' : 'Show Meditation'}
                      </button>
                    </div>
                    <h2>{currentMystery.title}</h2>
                    
                    {showMysteryDetails && (
                      <div className="mystery-details">
                        <div className="mystery-description">
                          {currentMystery.description.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                        </div>
                        <div className="spiritual-fruit">🌿 Spiritual Fruit: <strong>{currentMystery.spiritualFruit}</strong></div>
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
                          {[...Array(10)].map((_, i) => <div key={i} className={`bead ${i < hailMaryCount ? 'prayed' : ''}`} />)}
                        </div>
                      </div>
                      <div className="prayer-row"><span className="prayer-name">3. Glory Be</span></div>
                      <div className="prayer-row"><span className="prayer-name">4. Oh My Jesus</span></div>
                    </div>
                    
                    {isDecadeComplete && <div className="decade-complete">✅ Decade complete! Click "Next Mystery" to continue.</div>}
                    
                    <div className="action-buttons">
                      <button onClick={completeDecade} className="next-btn">{currentMysteryIndex === 4 ? '🎉 Finish Rosary' : 'Next Mystery →'}</button>
                      <button onClick={resetRosary} className="reset-btn">Reset</button>
                    </div>
                  </div>
                )
              )}

              {completedDecades.length > 0 && (
                <div className="completed-tracker">
                  <h4>✅ Completed:</h4>
                  <div className="completed-list">
                    {completedDecades.map(idx => <span key={idx} className="completed-item">{currentSet?.mysteries[idx]?.title}</span>)}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========== STATIONS OF THE CROSS SECTION ========== */}
          {activeMainTab === 'stations' && (
            <>
              <div className="stations-progress">
                <span>Station {currentStationIndex + 1} of 14</span>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${((currentStationIndex + 1) / 14) * 100}%` }}></div>
                </div>
              </div>

              {currentStation && (
                <div className="station-card">
                  <div className="station-number">Station {currentStation.id}</div>
                  <h2>{currentStation.title}</h2>
                  
                  <div className="station-response">
                    <p><strong>V/</strong> {currentStation.v}</p>
                    <p><strong>R/</strong> {currentStation.r}</p>
                  </div>
                  
                  <button className="details-toggle" onClick={() => setShowStationDetails(!showStationDetails)}>
                    {showStationDetails ? 'Hide Meditation & Prayer' : 'Show Meditation & Prayer'}
                  </button>
                  
                  {showStationDetails && (
                    <div className="station-details">
                      <div className="station-meditation">
                        <h4>📖 Meditation</h4>
                        <p>{currentStation.meditation}</p>
                      </div>
                      <div className="station-prayer">
                        <h4>🙏 Prayer</h4>
                        <p>{currentStation.prayer}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="station-navigation">
                    <button onClick={prevStation} disabled={currentStationIndex === 0} className="nav-prev">← Previous Station</button>
                    <button onClick={nextStation} disabled={currentStationIndex === 13} className="nav-next">Next Station →</button>
                  </div>
                </div>
              )}

              {currentStationIndex === 13 && showStationDetails && (
                <div className="stations-complete">
                  <div className="complete-icon">✝️</div>
                  <h3>You have completed the Stations of the Cross!</h3>
                  <p>May the passion of Christ strengthen you always.</p>
                  <button onClick={resetStations} className="reset-btn">Start Over</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT COLUMN: Prayer Library (All Prayers Visible) */}
        <div className="prayers-column">
          <div className="prayers-panel">
            <h3>📖 Prayer Guide</h3>
            <p className="panel-subtitle">Click any prayer to expand — no popups</p>
            
            {/* Opening Prayers */}
            <div className="prayer-section">
              <h4>Opening Prayers</h4>
              {allPrayers.opening.map((prayer, idx) => (
                <div key={idx} className="prayer-card-compact">
                  <div className="prayer-title" onClick={() => setExpandedPrayer(expandedPrayer === `opening-${idx}` ? null : `opening-${idx}`)}>
                    <span className="prayer-icon">🙏</span>
                    <span>{prayer.title}</span>
                    <span className="toggle-icon">{expandedPrayer === `opening-${idx}` ? '▲' : '▼'}</span>
                  </div>
                  {expandedPrayer === `opening-${idx}` && (
                    <div className="prayer-text-expanded">
                      {prayer.text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Closing Prayers */}
            <div className="prayer-section">
              <h4>Closing Prayers</h4>
              {allPrayers.closing.map((prayer, idx) => (
                <div key={idx} className="prayer-card-compact">
                  <div className="prayer-title" onClick={() => setExpandedPrayer(expandedPrayer === `closing-${idx}` ? null : `closing-${idx}`)}>
                    <span className="prayer-icon">🙏</span>
                    <span>{prayer.title}</span>
                    <span className="toggle-icon">{expandedPrayer === `closing-${idx}` ? '▲' : '▼'}</span>
                  </div>
                  {expandedPrayer === `closing-${idx}` && (
                    <div className="prayer-text-expanded">
                      {prayer.text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Stations of the Cross List */}
            <div className="prayer-section">
              <h4>✝️ Stations of the Cross</h4>
              {stationsData.map((station) => (
                <div key={station.id} className="prayer-card-compact">
                  <div className="prayer-title" onClick={() => setExpandedPrayer(expandedPrayer === `station-${station.id}` ? null : `station-${station.id}`)}>
                    <span className="prayer-icon">✝️</span>
                    <span>{station.id}. {station.title}</span>
                    <span className="toggle-icon">{expandedPrayer === `station-${station.id}` ? '▲' : '▼'}</span>
                  </div>
                  {expandedPrayer === `station-${station.id}` && (
                    <div className="prayer-text-expanded">
                      <p><strong>V/</strong> {station.v}</p>
                      <p><strong>R/</strong> {station.r}</p>
                      <p><strong>📖 Meditation:</strong> {station.meditation}</p>
                      <p><strong>🙏 Prayer:</strong> {station.prayer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Prayer;