// frontend/src/pages/choir/ChoirWhatsAppBroadcast.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import BASE_URL from "../../api";
import {
  FiUsers,
  FiCalendar,
  FiClock,
  FiMessageCircle,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiEdit2,
  FiEye,
  FiAlertCircle,
  FiRadio,
  FiStar,
  FiSun,
  FiMoon,
  FiZap,
  FiLoader,
  FiClock as FiClockIcon,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

export default function ChoirWhatsAppBroadcast() {
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Groups
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [lastUpdatedBy, setLastUpdatedBy] = useState(null);

  // Message
  const [message, setMessage] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // AI Assistant
  const [aiMessageInput, setAiMessageInput] = useState("");
  const [aiMessageOutput, setAiMessageOutput] = useState("");
  const [aiMessageLoading, setAiMessageLoading] = useState(false);
  const [aiMessageType, setAiMessageType] = useState("announcement");
  const [aiMessageTone, setAiMessageTone] = useState("warm");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // ==================== DAILY TEMPLATES ====================
  const dayTemplates = {
    monday: {
      id: "monday",
      label: "Monday",
      icon: <FiSun size={16} />,
      full: `🌞 Morning, Choir Fam! 🎶❤️

NEW WEEK. NEW ENERGY. NEW VIBES! 🔥🥳

Let's kick things off with grateful hearts and our voices ready to praise! 🎶🎵🎤

Today's activity:
🙏🏾 Holy Rosary & 🎶 Choir Practice
⏰ TIME: 4:30 PM 
📍 VENUE: Room A002

Let's make this one memorable! ❤️‍🔥🎶
Have a blessed Monday, everyone! ✨🙏🏾`
    },
    tuesday: {
      id: "tuesday",
      label: "Tuesday",
      icon: <FiClock size={16} />,
      full: `🌞 Good Morning, Choir Family! 🎶❤️

WALKING IN FAITH. SINGING IN UNITY. 🕊️🎵

Today we come together in prayer and song! Let's prepare our hearts for tomorrow's mass. 🙏✨

Today's activities:
🙏🏾 Divine Mercy & 🎶 Choir Practice (for tomorrow's mass)
⏰ TIME: 4:30 PM 
📍 VENUE: Room A002

Let's lift our voices in harmony! 🎤🎶
Have a blessed Tuesday, everyone! ✨🙏🏾`
    },
    wednesday: {
      id: "wednesday",
      label: "Wednesday",
      icon: <FiCalendar size={16} />,
      full: `🌞 Happy Wednesday, Choir Fam! 🎶✨

MIDWEEK GRACE. MIDWEEK PRAISE. 🙏🎵

Let's gather together and receive God's blessings through the Holy Mass! ⛪❤️

Today's activity:
🙏🏾 Holy Mass
⏰ TIME: 4:30 PM 
📍 VENUE: Room A002

Come with open hearts and ready spirits! 🙌
Have a blessed Wednesday, everyone! ✨🙏🏾`
    },
    thursday: {
      id: "thursday",
      label: "Thursday",
      icon: <FiStar size={16} />,
      full: `🌞 Morning, Beloved Choir! 🎶💫

THANKFUL HEARTS. JOYFUL VOICES. 🎵🕊️

Another beautiful day to worship together! Let's come together in prayer, reflection, and community! 🙏❤️

Today's activities:
🙏🏾 Praise & Worship, Holy Rosary, Bible Reflection & Jumuiya Meetings
⏰ TIME: 4:30 PM 
📍 VENUE: Room A002

Let's grow together in faith and fellowship! ✨
Have a blessed Thursday, everyone! ✨🙏🏾`
    },
    friday: {
      id: "friday",
      label: "Friday",
      icon: <FiMoon size={16} />,
      full: `🌞 Happy Friday, Choir Family! 🎶🤗

FAITHFUL WEEK. BLESSED ENDING. 🎵✨

Let's end this week with powerful prayer and beautiful music! One more day to lift our voices in praise! 🎤❤️

Today's activities:
🙏🏾 Holy Rosary & 🎶 Choir Practice
⏰ TIME: 4:30 PM 
📍 VENUE: Room A002

Let's finish the week strong! 🎶💪
Have a blessed Friday, everyone! ✨🙏🏾`
    },
    saturday: {
      id: "saturday",
      label: "Saturday",
      icon: <FiStar size={16} />,
      full: `🌞 Good Morning, Choir Fam! 🎶💕

WEEKEND VIBES. RESTED HEARTS. 🕊️✨

Take a moment to breathe, relax, and thank God for the week He has given us! 🙏💫

Today's activities:
No scheduled activities. Enjoy your weekend! 🎉

Rest well, recharge, and come back stronger! ❤️
Have a blessed and restful Saturday, everyone! ✨🙏🏾`
    },
    sunday: {
      id: "sunday",
      label: "Sunday",
      icon: <FiSun size={16} />,
      full: `🌞 Happy Sunday, Choir Family! 🎶⛪

THE LORD'S DAY. THE DAY OF JOY! ✨🙌

Let's come together to celebrate the Holy Mass and fellowship in God's presence! 🕊️❤️

Today's activities:
🙏🏾 Holy Mass & Fellowship
⏰ TIME: 10:00 AM 
📍 VENUE: Main Church

Come ready to worship and receive blessings! 🙏
Have a blessed Sunday, everyone! ✨🙏🏾`
    }
  };

  // ==================== FETCH DATA ====================
  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/choir/whatsapp/groups`, { headers });
      if (res.data.success) {
        setGroups(res.data.groups);
        
        // Fetch saved global settings
        try {
          const settingsRes = await axios.get(`${BASE_URL}/api/choir/whatsapp/settings`, { headers });
          if (settingsRes.data.success) {
            const savedIds = settingsRes.data.settings?.selectedGroupIds || [];
            // Only keep IDs that still exist
            const validIds = savedIds.filter(id => res.data.groups.some(g => g.groupId === id));
            setSelectedGroups(validIds);
            
            if (settingsRes.data.updatedBy) {
              setLastUpdatedBy(settingsRes.data.updatedBy);
            }
          }
        } catch (err) {
          console.error("Error fetching settings:", err);
          setSelectedGroups([]);
        }
      }
    } catch (err) {
      console.error("Error fetching groups:", err);
      setError("Failed to load WhatsApp groups");
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/choir/whatsapp/history?limit=20`, { headers });
      if (res.data.success) {
        setBroadcastHistory(res.data.broadcasts);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchHistory();
  }, []);

  // ==================== TEMPLATE HANDLERS ====================
  const applyTemplate = (dayId) => {
    const template = dayTemplates[dayId];
    if (template) {
      setMessage(template.full);
      setSelectedDay(dayId);
      setSuccess(`✅ ${template.label} template loaded! Edit as needed.`);
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  // ==================== AI MESSAGE HANDLER ====================
  const handleAIPolishMessage = async () => {
    if (!aiMessageInput.trim()) {
      setError("Please enter a message to polish");
      return;
    }

    setAiMessageLoading(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/api/admin/ai/polish-message`,
        {
          message: aiMessageInput,
          tone: aiMessageTone,
          type: aiMessageType
        },
        { headers }
      );

      if (res.data.success) {
        setAiMessageOutput(res.data.polished);
        setSuccess("✅ Message polished successfully!");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("AI polish error:", err);
      setError("Failed to polish message");
    } finally {
      setAiMessageLoading(false);
    }
  };

  const usePolishedMessage = () => {
    if (!aiMessageOutput) {
      setError("Please generate a polished message first");
      return;
    }
    setMessage(aiMessageOutput);
    setAiMessageOutput("");
    setSuccess("✅ Polished message applied!");
    setTimeout(() => setSuccess(""), 3000);
  };

  // ==================== BROADCAST HANDLER ====================
  const handleBroadcast = async () => {
    if (!message.trim()) {
      setError("Please enter a message to broadcast");
      return;
    }

    if (selectedGroups.length === 0) {
      setError("Please select at least one group");
      return;
    }

    if (!window.confirm(`Broadcast this message to ${selectedGroups.length} selected group(s)?`)) {
      return;
    }

    setProcessing(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/api/choir/whatsapp/broadcast`,
        {
          groupIds: selectedGroups,
          message: message
        },
        { headers }
      );

      if (res.data.success) {
        setSuccess(`✅ ${res.data.message}`);
        setMessage("");
        await fetchHistory();
        setTimeout(() => setSuccess(""), 5000);
      }
    } catch (err) {
      console.error("Broadcast error:", err);
      setError(err.response?.data?.error || "Failed to broadcast");
    } finally {
      setProcessing(false);
    }
  };

  // ==================== TOGGLE GROUP SELECTION ====================
  const toggleGroup = async (groupId) => {
    const newSelection = selectedGroups.includes(groupId)
      ? selectedGroups.filter(id => id !== groupId)
      : [...selectedGroups, groupId];
    
    setSelectedGroups(newSelection);
    
    try {
      await axios.post(
        `${BASE_URL}/api/choir/whatsapp/settings`,
        { selectedGroupIds: newSelection },
        { headers }
      );
      // Fetch updated settings to get the updatedBy name
      const settingsRes = await axios.get(`${BASE_URL}/api/choir/whatsapp/settings`, { headers });
      if (settingsRes.data.success && settingsRes.data.updatedBy) {
        setLastUpdatedBy(settingsRes.data.updatedBy);
        setSuccess(`✅ Groups updated by ${settingsRes.data.updatedBy}`);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Failed to save group selection");
    }
  };

  const toggleAllGroups = async () => {
    const newSelection = selectedGroups.length === groups.length
      ? []
      : groups.map(g => g.groupId);
    
    setSelectedGroups(newSelection);
    
    try {
      await axios.post(
        `${BASE_URL}/api/choir/whatsapp/settings`,
        { selectedGroupIds: newSelection },
        { headers }
      );
      const settingsRes = await axios.get(`${BASE_URL}/api/choir/whatsapp/settings`, { headers });
      if (settingsRes.data.success && settingsRes.data.updatedBy) {
        setLastUpdatedBy(settingsRes.data.updatedBy);
        setSuccess(newSelection.length === 0 
          ? `✅ All groups deselected by ${settingsRes.data.updatedBy}` 
          : `✅ All ${newSelection.length} groups selected by ${settingsRes.data.updatedBy}`);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Failed to save group selection");
    }
  };

  // ==================== FORMAT DATE ====================
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ==================== MAIN RENDER ====================
  return (
    <div className="choir-broadcast-page">
      {/* HEADER */}
      <div className="page-header">
        <div className="header-left">
          <div className="title-icon">
            <FaWhatsapp size={28} />
          </div>
          <div>
            <h1>Choir WhatsApp Broadcast</h1>
            <p className="subtitle">Send announcements to choir members instantly</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={() => { fetchGroups(); fetchHistory(); }}>
            <FiRefreshCw size={18} /> Refresh
          </button>
          <button className="btn-history" onClick={() => setShowHistory(!showHistory)}>
            <FiClockIcon size={18} /> {showHistory ? 'Hide History' : 'View History'}
          </button>
        </div>
      </div>

      {/* ALERTS */}
      {success && (
        <div className="alert success">
          <FiCheck size={18} />
          <span>{success}</span>
          <button onClick={() => setSuccess("")}><FiX size={18} /></button>
        </div>
      )}
      {error && (
        <div className="alert error">
          <FiAlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError("")}><FiX size={18} /></button>
        </div>
      )}

      {/* LAST UPDATED BY */}
      {lastUpdatedBy && (
        <div className="alert info" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
          <FiUsers size={18} />
          <span>👤 Group selection last updated by: <strong>{lastUpdatedBy}</strong></span>
        </div>
      )}

      {/* AI MESSAGE ASSISTANT */}
      <div className="card ai-card">
        <div className="card-header">
          <FiZap size={18} style={{ color: '#075e54' }} />
          <h3>AI Message Assistant</h3>
          <span className="badge">✨ Polish • Formal • Announcement</span>
        </div>
        <div className="card-body">
          <div className="ai-grid">
            <div className="ai-input-section">
              <div className="ai-controls">
                <select
                  value={aiMessageType}
                  onChange={(e) => setAiMessageType(e.target.value)}
                  className="ai-select"
                >
                  <option value="polish"> Polish</option>
                  <option value="formal"> Formal</option>
                  <option value="casual"> Casual</option>
                  <option value="announcement"> Announcement</option>
                  <option value="prayer"> Prayer</option>
                </select>
                <select
                  value={aiMessageTone}
                  onChange={(e) => setAiMessageTone(e.target.value)}
                  className="ai-select"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="warm">Warm</option>
                  <option value="urgent">Urgent</option>
                </select>
                <button
                  className="btn-ai-generate"
                  onClick={handleAIPolishMessage}
                  disabled={aiMessageLoading || !aiMessageInput.trim()}
                >
                  {aiMessageLoading ? <FiLoader size={16} className="spin" /> : <FiZap size={16} />}
                  {aiMessageLoading ? 'Generating...' : 'Generate'}
                </button>
              </div>
              <textarea
                placeholder="Describe what you want to say... e.g., 'Tell members about the mass this Sunday at 10am'"
                value={aiMessageInput}
                onChange={(e) => setAiMessageInput(e.target.value)}
                rows="3"
                className="ai-textarea"
              />
              <div className="ai-hint">
                <FiAlertCircle size={14} />
                <span>Describe your message naturally, and AI will polish it for you</span>
              </div>
            </div>
            <div className="ai-output-section">
              {aiMessageOutput ? (
                <>
                  <div className="ai-output-header">
                    <span className="ai-output-label">✨ Polished Message</span>
                    <button className="btn-use" onClick={usePolishedMessage}>
                      <FiCheck size={14} /> Use in Message
                    </button>
                  </div>
                  <div className="ai-output-content">{aiMessageOutput}</div>
                </>
              ) : (
                <div className="ai-empty">
                  <FiZap size={48} style={{ color: '#cbd5e1' }} />
                  <p>Describe your message above and click Generate</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK TEMPLATES */}
      <div className="card">
        <div className="card-header">
          <FiCalendar size={18} />
          <h3>Daily Templates</h3>
          <span className="badge">Quick fill</span>
        </div>
        <div className="card-body">
          <div className="template-grid">
            {Object.entries(dayTemplates).map(([key, template]) => (
              <button
                key={key}
                className={`template-btn ${selectedDay === key ? 'active' : ''}`}
                onClick={() => applyTemplate(key)}
              >
                {template.icon}
                {template.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MESSAGE EDITOR */}
      <div className="card">
        <div className="card-header">
          <FiEdit2 size={18} />
          <h3>Your Message</h3>
          <span className="badge">{message.length} characters</span>
        </div>
        <div className="card-body">
          <div className="emoji-bar">
            <button onClick={() => setMessage(m + '🌞 ')}>🌞</button>
            <button onClick={() => setMessage(m + '🎶 ')}>🎶</button>
            <button onClick={() => setMessage(m + '❤️ ')}>❤️</button>
            <button onClick={() => setMessage(m + '🔥 ')}>🔥</button>
            <button onClick={() => setMessage(m + '🙏 ')}>🙏</button>
            <button onClick={() => setMessage(m + '✨ ')}>✨</button>
            <button onClick={() => setMessage(m + '⭐ ')}>⭐</button>
            <button onClick={() => setMessage(m + '📅 ')}>📅</button>
            <button onClick={() => setMessage(m + '⏰ ')}>⏰</button>
            <button onClick={() => setMessage(m + '📍 ')}>📍</button>
            <button onClick={() => setMessage(m + '💫 ')}>💫</button>
            <button onClick={() => setMessage(m + '🌟 ')}>🌟</button>
            <button onClick={() => setMessage(m + '😄 ')}>😄</button>
            <button onClick={() => setMessage(m + '🎵 ')}>🎵</button>
            <button onClick={() => setMessage(m + '🎤 ')}>🎤</button>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here... Or use a template above!"
            rows="6"
            className="message-textarea"
          />
        </div>
      </div>

      {/* GROUP SELECTION */}
      <div className="card">
        <div className="card-header">
          <FiUsers size={18} />
          <h3>Select Groups</h3>
          <span className="badge">{selectedGroups.length} of {groups.length} groups selected</span>
          <button className="btn-toggle-all" onClick={toggleAllGroups}>
            {selectedGroups.length === groups.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="card-body">
          {loadingGroups ? (
            <div className="loading-groups">Loading groups...</div>
          ) : (
            <div className="groups-grid">
              {groups.map(group => (
                <label key={group.groupId} className="group-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group.groupId)}
                    onChange={() => toggleGroup(group.groupId)}
                  />
                  <span className="checkmark" />
                  <span className="group-name">{group.groupName || group.groupId}</span>
                  <span className="group-members">{group.participants || 0} members</span>
                  {group.isActive && <span className="badge-active">Active</span>}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BROADCAST BUTTON */}
      <div className="card">
        <div className="card-body">
          <button
            className="btn-broadcast"
            onClick={handleBroadcast}
            disabled={processing || !message.trim() || selectedGroups.length === 0}
            style={{ width: '100%' }}
          >
            {processing ? <FiLoader size={18} className="spin" /> : <FiRadio size={18} />}
            Broadcast to {selectedGroups.length} Selected Group{selectedGroups.length !== 1 ? 's' : ''}
          </button>
          {selectedGroups.length === 0 && (
            <div className="action-hint" style={{ marginTop: '10px', color: '#ef4444', textAlign: 'center' }}>
              ⚠️ Please select at least one group below
            </div>
          )}
        </div>
      </div>

      {/* PREVIEW */}
      {message.trim() && (
        <div className="card preview-card">
          <div className="card-header">
            <FiEye size={18} />
            <h3>Preview</h3>
            <span className="badge">How your message will look</span>
          </div>
          <div className="card-body">
            <div className="preview-content">
              {message.split('\n').map((line, i) => (
                <p key={i}>{line || '\u00A0'}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {showHistory && (
        <div className="card history-card">
          <div className="card-header">
            <FiClockIcon size={18} />
            <h3>Broadcast History</h3>
            <span className="badge">{broadcastHistory.length} broadcasts</span>
            <button className="btn-refresh-small" onClick={fetchHistory}>
              <FiRefreshCw size={14} />
            </button>
          </div>
          <div className="card-body">
            {loadingHistory ? (
              <div className="loading-history">Loading history...</div>
            ) : broadcastHistory.length === 0 ? (
              <div className="empty-history">
                <FiMessageCircle size={48} style={{ color: '#cbd5e1' }} />
                <p>No broadcasts sent yet</p>
              </div>
            ) : (
              <div className="history-list">
                {broadcastHistory.map(item => (
                  <div key={item.id} className="history-item">
                    <div className="history-header">
                      <span className="history-status">
                        {item.status === 'sent' ? (
                          <FiCheckCircle size={16} style={{ color: '#25D366' }} />
                        ) : item.status === 'partial' ? (
                          <FiAlertCircle size={16} style={{ color: '#f59e0b' }} />
                        ) : (
                          <FiXCircle size={16} style={{ color: '#ef4444' }} />
                        )}
                        {item.status}
                      </span>
                      <span className="history-date">{formatDate(item.sentAt)}</span>
                      <span className="history-count">
                        {item.successCount}/{item.totalCount} groups
                      </span>
                    </div>
                    <div className="history-message">
                      {item.message.length > 100 ? item.message.substring(0, 100) + '...' : item.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =============================================
          STYLES
          ============================================= */}
      <style>{`
        .choir-broadcast-page {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
          background: #f8fafc;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .title-icon {
          width: 48px;
          height: 48px;
          background: #25D366;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .page-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
        }

        .subtitle {
          margin: 4px 0 0;
          font-size: 14px;
          color: #64748b;
        }

        .header-actions {
          display: flex;
          gap: 10px;
        }

        .btn-refresh, .btn-history {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #1e293b;
          transition: all 0.2s;
        }

        .btn-refresh:hover, .btn-history:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .alert.info {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }

        /* Cards */
        .card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          margin-bottom: 20px;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: #fafbfc;
          border-bottom: 1px solid #e2e8f0;
          flex-wrap: wrap;
        }

        .card-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
        }

        .card-body {
          padding: 20px;
        }

        .badge {
          background: #f1f5f9;
          padding: 2px 12px;
          border-radius: 12px;
          font-size: 12px;
          color: #64748b;
          margin-left: auto;
        }

        .badge-active {
          font-size: 10px;
          background: #dcfce7;
          color: #16a34a;
          padding: 2px 8px;
          border-radius: 10px;
        }

        /* Alerts */
        .alert {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .alert.success {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .alert.error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert button {
          margin-left: auto;
          background: none;
          border: none;
          cursor: pointer;
          color: inherit;
        }

        /* AI Card */
        .ai-card {
          border-color: #25D366;
          background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
        }

        .ai-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .ai-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .ai-select {
          padding: 8px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          background: white;
          outline: none;
          flex: 1;
          min-width: 120px;
          color: #1e293b;
        }

        .ai-select:focus {
          border-color: #25D366;
          box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.1);
        }

        .btn-ai-generate {
          padding: 8px 20px;
          background: #075e54;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
        }

        .btn-ai-generate:hover:not(:disabled) {
          background: #054a44;
        }

        .btn-ai-generate:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ai-textarea {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          font-family: inherit;
          resize: vertical;
          color: #1e293b;
        }

        .ai-textarea:focus {
          border-color: #25D366;
          box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.1);
        }

        .ai-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #ecfdf5;
          border-radius: 8px;
          font-size: 12px;
          color: #065f46;
          margin-top: 8px;
        }

        .ai-output-section {
          background: #f8fafc;
          border-radius: 12px;
          padding: 16px;
          min-height: 150px;
          display: flex;
          flex-direction: column;
        }

        .ai-output-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .ai-output-label {
          font-weight: 600;
          font-size: 14px;
          color: #1e293b;
        }

        .btn-use {
          padding: 4px 16px;
          background: #075e54;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          transition: all 0.2s;
        }

        .btn-use:hover {
          background: #054a44;
        }

        .ai-output-content {
          flex: 1;
          padding: 12px;
          background: white;
          border-radius: 8px;
          white-space: pre-wrap;
          font-size: 14px;
          line-height: 1.6;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          max-height: 150px;
          overflow-y: auto;
        }

        .ai-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          text-align: center;
          padding: 20px;
        }

        .ai-empty p {
          margin: 8px 0 0;
          font-size: 14px;
        }

        /* Templates */
        .template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 8px;
        }

        .template-btn {
          padding: 10px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
          transition: all 0.2s;
        }

        .template-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .template-btn.active {
          background: #ecfdf5;
          border-color: #25D366;
          color: #075e54;
        }

        /* Message Editor */
        .emoji-bar {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .emoji-bar button {
          padding: 4px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s;
        }

        .emoji-bar button:hover {
          background: #f1f5f9;
          transform: scale(1.05);
        }

        .message-textarea {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          outline: none;
          color: #1e293b;
        }

        .message-textarea:focus {
          border-color: #25D366;
          box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.1);
        }

        /* Groups */
        .groups-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          max-height: 250px;
          overflow-y: auto;
        }

        .group-checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .group-checkbox:hover {
          background: #f8fafc;
        }

        .group-checkbox input {
          display: none;
        }

        .checkmark {
          width: 18px;
          height: 18px;
          border: 2px solid #cbd5e1;
          border-radius: 4px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .group-checkbox input:checked + .checkmark {
          background: #25D366;
          border-color: #25D366;
        }

        .group-checkbox input:checked + .checkmark::after {
          content: "✓";
          color: white;
          font-size: 12px;
        }

        .group-name {
          flex: 1;
          font-weight: 500;
          font-size: 14px;
          color: #1e293b;
        }

        .group-members {
          font-size: 12px;
          color: #94a3b8;
        }

        .btn-toggle-all {
          padding: 4px 12px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          color: #1e293b;
          transition: all 0.2s;
        }

        .btn-toggle-all:hover {
          background: #e2e8f0;
        }

        .loading-groups {
          text-align: center;
          padding: 20px;
          color: #94a3b8;
        }

        /* Broadcast Button */
        .btn-broadcast {
          width: 100%;
          padding: 14px 20px;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s;
        }

        .btn-broadcast:hover:not(:disabled) {
          background: #1da85c;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
        }

        .btn-broadcast:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Preview */
        .preview-card {
          background: #fafbfc;
        }

        .preview-content {
          background: white;
          padding: 16px 20px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          white-space: pre-wrap;
          font-size: 14px;
          line-height: 1.8;
          color: #1e293b;
        }

        .preview-content p {
          margin: 4px 0;
        }

        /* History */
        .history-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .history-item {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
        }

        .history-item:last-child {
          border-bottom: none;
        }

        .history-header {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }

        .history-status {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          font-size: 13px;
          text-transform: capitalize;
          color: #1e293b;
        }

        .history-date {
          font-size: 12px;
          color: #94a3b8;
        }

        .history-count {
          font-size: 12px;
          background: #f1f5f9;
          padding: 2px 10px;
          border-radius: 10px;
          color: #64748b;
        }

        .history-message {
          font-size: 14px;
          color: #475569;
          line-height: 1.5;
        }

        .empty-history {
          text-align: center;
          padding: 30px;
          color: #94a3b8;
        }

        .loading-history {
          text-align: center;
          padding: 20px;
          color: #94a3b8;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .choir-broadcast-page { padding: 16px; }
          .ai-grid { grid-template-columns: 1fr; }
          .groups-grid { grid-template-columns: 1fr; }
          .template-grid { grid-template-columns: repeat(4, 1fr); }
          .page-header { flex-direction: column; align-items: stretch; }
          .header-actions { flex-wrap: wrap; }
          .header-actions button { flex: 1; }
        }

        @media (max-width: 480px) {
          .template-grid { grid-template-columns: repeat(3, 1fr); }
          .ai-controls { flex-direction: column; }
          .ai-select { width: 100%; }
        }
      `}</style>
    </div>
  );
}