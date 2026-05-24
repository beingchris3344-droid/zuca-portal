// frontend/src/components/messenger/ChatsList.jsx
import React, { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, MessageCircle } from 'lucide-react';
import { useMessenger } from '../../contexts/MessengerContext';
import { api } from '../../api';

// Helper function to get executive badge info
const getExecutiveBadge = (role, executivePosition) => {
  if (role === 'admin') return { text: 'Admin', color: '#075E54', icon: '👑' };
  
  const badgeMap = {
    'Chairperson': { text: 'Chairperson', color: '#3b82f6', icon: '👑' },
    'Secretary': { text: 'Secretary', color: '#8b5cf6', icon: '📋' },
    'Treasurer': { text: 'Treasurer', color: '#f59e0b', icon: '💰' },
    'Choir Moderator': { text: 'Choir', color: '#10b981', icon: '🎵' },
    'Media Moderator': { text: 'Media', color: '#ef4444', icon: '📸' },
    'Jumuia Leader': { text: 'Jumuia Leader', color: '#06b6d4', icon: '👥' }
  };
  
  for (const [key, value] of Object.entries(badgeMap)) {
    if (executivePosition?.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  if (executivePosition) {
    return { text: executivePosition, color: '#64748b', icon: '⭐' };
  }
  
  return null;
};

const ChatsList = ({ onSelectChat, onNewChat }) => {
  const { conversations, onlineUsers, loading, user, startConversation } = useMessenger();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState([]);
  const [allAdmins, setAllAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Fetch all admin users (ONLY admins for pinning)
  useEffect(() => {
    fetchAllAdmins();
  }, []);

  const fetchAllAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const res = await api.get('/api/messenger/search/all-users');
      // ONLY get users with admin role (not executives)
      const admins = res.data.users.filter(u => u.role === 'admin');
      setAllAdmins(admins);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      const sorted = [...conversations].sort((a, b) => {
        // Only admins are considered "pinned"
        const isPinnedA = a.participant?.role === 'admin';
        const isPinnedB = b.participant?.role === 'admin';
        
        if (isPinnedA && !isPinnedB) return -1;
        if (!isPinnedA && isPinnedB) return 1;
        
        const timeA = new Date(a.lastMessageAt || 0);
        const timeB = new Date(b.lastMessageAt || 0);
        return timeB - timeA;
      });
      setFilteredChats(sorted);
    } else {
      const filtered = conversations.filter(conv =>
        conv.participant?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const sorted = filtered.sort((a, b) => {
        const isPinnedA = a.participant?.role === 'admin';
        const isPinnedB = b.participant?.role === 'admin';
        if (isPinnedA && !isPinnedB) return -1;
        if (!isPinnedA && isPinnedB) return 1;
        const timeA = new Date(a.lastMessageAt || 0);
        const timeB = new Date(b.lastMessageAt || 0);
        return timeB - timeA;
      });
      setFilteredChats(sorted);
    }
  }, [searchQuery, conversations]);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getLastMessageText = (conv) => {
    if (conv.lastMessage) {
      return conv.lastMessage.length > 35 
        ? conv.lastMessage.substring(0, 35) + '...' 
        : conv.lastMessage;
    }
    return 'Tap to start chatting';
  };

  const handleStartChatWithAdmin = async (adminUser) => {
    const conversation = await startConversation(adminUser.id);
    if (conversation) {
      onSelectChat(conversation);
    }
  };

  // Get existing admin conversations
  const existingAdminConversations = filteredChats.filter(chat => chat.participant?.role === 'admin');
  const existingAdminIds = new Set(existingAdminConversations.map(c => c.participant?.id));
  
  // Get admins without existing conversations
  const newAdmins = allAdmins.filter(admin => !existingAdminIds.has(admin.id) && admin.id !== user?.id);
  
  // Combine: existing admin conversations + new admins + regular chats
  const displayChats = [
    ...existingAdminConversations,
    ...newAdmins.map(admin => ({
      id: `admin-${admin.id}`,
      participant: admin,
      lastMessage: null,
      lastMessageAt: null,
      unreadCount: 0,
      isVirtual: true
    })),
    ...filteredChats.filter(chat => chat.participant?.role !== 'admin')
  ];

  const hasPinnedChats = existingAdminConversations.length > 0 || newAdmins.length > 0;
  const regularChats = displayChats.filter(chat => chat.participant?.role !== 'admin');

  if (loading) {
    return (
      <div className="chats-loading">
        <div className="loading-spinner"></div>
        <p>Loading chats...</p>
      </div>
    );
  }

  return (
    <div className="chats-list-container">
      {/* Header - WhatsApp Dark Teal */}
      <div className="chats-header">
        <div className="logo-section">
          <h2>ZUCA Messenger</h2>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={onNewChat}>
            <Plus size={22} />
          </button>
          <button className="icon-btn">
            <MoreVertical size={22} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Chats List */}
      <div className="chats-scroll">
        {displayChats.length === 0 && regularChats.length === 0 ? (
          <div className="no-chats">
            <div className="no-chats-icon">
              <MessageCircle size={48} strokeWidth={1} />
            </div>
            <h3>No conversations yet</h3>
            <p>Start a new chat to begin messaging</p>
            <button className="new-chat-btn" onClick={onNewChat}>
              <Plus size={18} />
              New Chat
            </button>
          </div>
        ) : (
          <>
            {/* Pinned Section (Only Admins) */}
            {hasPinnedChats && searchQuery.length === 0 && (
              <>
                <div className="pinned-header">
                  <span className="pinned-icon">📌</span>
                  <span>Pinned</span>
                </div>
                {displayChats.filter(chat => chat.participant?.role === 'admin').map((chat) => {
                  const isOnline = onlineUsers.includes(chat.participant?.id);
                  const isVirtual = chat.isVirtual;
                  const badge = getExecutiveBadge(chat.participant?.role, chat.participant?.executivePosition);
                  
                  return (
                    <div
                      key={chat.id}
                      className="chat-item pinned-chat"
                      onClick={() => isVirtual ? handleStartChatWithAdmin(chat.participant) : onSelectChat(chat)}
                    >
                      <div className="chat-avatar">
                        {chat.participant?.profileImage ? (
                          <img src={chat.participant.profileImage} alt="" />
                        ) : (
                          <div className="avatar-placeholder" style={{ backgroundColor: '#075E54' }}>
                            {chat.participant?.fullName?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        {isOnline && <div className="online-indicator"></div>}
                        <div className="pinned-crown">👑</div>
                      </div>
                      <div className="chat-info">
                        <div className="chat-name">
                          {chat.participant?.fullName}
                          <span className="admin-badge">Admin</span>
                        </div>
                        <div className="chat-message">
                          {isVirtual ? (
                            <span className="message-text">Click to start chatting</span>
                          ) : (
                            <>
                              {chat.unreadCount > 0 && <span className="unread-dot"></span>}
                              <span className="message-text">{getLastMessageText(chat)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="chat-meta">
                        {!isVirtual && (
                          <>
                            <div className="chat-time">{formatTime(chat.lastMessageAt)}</div>
                            {chat.unreadCount > 0 && (
                              <div className="unread-badge">{chat.unreadCount}</div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* All Chats Section (Regular users + Executives) */}
            {regularChats.length > 0 && searchQuery.length === 0 && hasPinnedChats && (
              <div className="all-chats-header">
                <span>Chats</span>
              </div>
            )}
            
            {regularChats.map((chat) => {
              const isOnline = onlineUsers.includes(chat.participant?.id);
              const isMe = chat.participant?.id === user?.id;
              if (isMe) return null;
              const badge = getExecutiveBadge(chat.participant?.role, chat.participant?.executivePosition);
              
              return (
                <div
                  key={chat.id}
                  className="chat-item"
                  onClick={() => onSelectChat(chat)}
                >
                  <div className="chat-avatar">
                    {chat.participant?.profileImage ? (
                      <img src={chat.participant.profileImage} alt="" />
                    ) : (
                      <div className="avatar-placeholder" style={{ backgroundColor: badge?.color || '#128C7E' }}>
                        {chat.participant?.fullName?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    {isOnline && <div className="online-indicator"></div>}
                    {badge && !chat.participant?.role === 'admin' && (
                      <div className="executive-crown" style={{ backgroundColor: badge.color }}>
                        {badge.icon}
                      </div>
                    )}
                  </div>
                  <div className="chat-info">
                    <div className="chat-name">
                      {chat.participant?.fullName}
                      {badge && chat.participant?.role !== 'admin' && (
                        <span className="executive-badge" style={{ background: badge.color }}>
                          {badge.text}
                        </span>
                      )}
                    </div>
                    <div className="chat-message">
                      {chat.unreadCount > 0 && <span className="unread-dot"></span>}
                      <span className="message-text">{getLastMessageText(chat)}</span>
                    </div>
                  </div>
                  <div className="chat-meta">
                    <div className="chat-time">{formatTime(chat.lastMessageAt)}</div>
                    {chat.unreadCount > 0 && (
                      <div className="unread-badge">{chat.unreadCount}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <style jsx>{`
        .chats-list-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #FFFFFF;
        }

        .chats-header {
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #075E54;
        }

        .logo-section h2 {
          font-size: 20px;
          font-weight: 600;
          color: #FFFFFF;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .icon-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          transition: all 0.2s;
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .search-container {
          padding: 12px 16px;
          background: #FFFFFF;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #F0F2F5;
          border-radius: 30px;
          padding: 8px 16px;
        }

        .search-icon {
          color: #667781;
        }

        .search-box input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          color: #111B21;
        }

        .search-box input::placeholder {
          color: #667781;
        }

        .pinned-header {
          padding: 8px 16px;
          background: #F8F9FA;
          font-size: 12px;
          color: #667781;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid #E9EDEF;
        }

        .all-chats-header {
          padding: 8px 16px;
          background: #F8F9FA;
          font-size: 12px;
          color: #667781;
          border-bottom: 1px solid #E9EDEF;
        }

        .chats-scroll {
          flex: 1;
          overflow-y: auto;
          background: #FFFFFF;
        }

        .chat-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid #E9EDEF;
        }

        .chat-item.pinned-chat {
          background: #F8F9FA;
        }

        .chat-item.pinned-chat:hover {
          background: #F0F2F5;
        }

        .chat-item:hover {
          background: #F5F6F6;
        }

        .chat-avatar {
          position: relative;
          width: 56px;
          height: 56px;
          flex-shrink: 0;
        }

        .chat-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 600;
          color: white;
        }

        .online-indicator {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 14px;
          height: 14px;
          background: #25D366;
          border-radius: 50%;
          border: 2px solid #FFFFFF;
        }

        .pinned-crown {
          position: absolute;
          top: -4px;
          right: -4px;
          font-size: 14px;
          background: #FFD700;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #FFFFFF;
        }

        .executive-crown {
          position: absolute;
          top: -4px;
          right: -4px;
          font-size: 11px;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #FFFFFF;
        }

        .chat-info {
          flex: 1;
          min-width: 0;
        }

        .chat-name {
          font-size: 16px;
          font-weight: 500;
          color: #111B21;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .admin-badge {
          font-size: 10px;
          background: #075E54;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .executive-badge {
          font-size: 9px;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 500;
          color: white;
        }

        .chat-message {
          font-size: 13px;
          color: #667781;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          background: #25D366;
          border-radius: 50%;
          display: inline-block;
        }

        .message-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-meta {
          text-align: right;
          flex-shrink: 0;
        }

        .chat-time {
          font-size: 11px;
          color: #667781;
          margin-bottom: 6px;
        }

        .unread-badge {
          background: #25D366;
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 20px;
          min-width: 20px;
          text-align: center;
        }

        .no-chats {
          text-align: center;
          padding: 60px 20px;
        }

        .no-chats-icon {
          margin-bottom: 20px;
          color: #667781;
        }

        .no-chats h3 {
          font-size: 18px;
          color: #111B21;
          margin-bottom: 8px;
        }

        .no-chats p {
          font-size: 14px;
          color: #667781;
          margin-bottom: 24px;
        }

        .new-chat-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #075E54;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .new-chat-btn:hover {
          background: #054a42;
        }

        .chats-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 16px;
          background: #FFFFFF;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #E9EDEF;
          border-top-color: #075E54;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ChatsList;