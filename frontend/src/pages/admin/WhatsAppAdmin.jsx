import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import { io } from 'socket.io-client';
import BASE_URL from '../../api';

export default function WhatsAppAdmin() {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [activeChatName, setActiveChatName] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profilePics, setProfilePics] = useState({});
  const messagesEndRef = useRef(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await api.get('/api/whatsapp/chat/chats', { headers });
        setChats(res.data.chats);
        generateAvatars(res.data.chats);
      } catch (err) {
        console.error("Error fetching chats:", err);
      }
    };
    fetchChats();
    const interval = setInterval(fetchChats, 10000);
    return () => clearInterval(interval);
  }, []);

  const generateAvatars = (chatList) => {
    const newPics = { ...profilePics };
    for (const chat of chatList) {
      if (chat.profilePic) {
        newPics[chat.chatId] = chat.profilePic;
      } else if (!newPics[chat.chatId]) {
        newPics[chat.chatId] = `https://ui-avatars.com/api/?name=${chat.name}&background=random&color=fff&size=128&bold=true`;
      }
    }
    setProfilePics(newPics);
  };

  useEffect(() => {
    if (!activeChat) return;
    
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/api/whatsapp/chat/chats/${activeChat}/messages`, { headers });
        setMessages(res.data.messages);
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };
    
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const socket = io(BASE_URL);
    
    socket.on('new_whatsapp_message', (data) => {
      setChats(prev => {
        const existing = prev.find(c => c.chatId === data.chatId);
        const newChat = {
          chatId: data.chatId,
          name: data.senderName || data.chatId.split('@')[0],
          lastMessage: data.text,
          timestamp: data.timestamp,
          isGroup: data.chatId.includes('@g.us'),
          profilePic: data.profilePic 
        };
        
        if (existing) {
          return [newChat, ...prev.filter(c => c.chatId !== data.chatId)];
        }
        return [newChat, ...prev];
      });

      if (data.profilePic) {
        setProfilePics(prev => ({ ...prev, [data.chatId]: data.profilePic }));
      }

      if (activeChat === data.chatId) {
        setMessages(prev => [...prev, {
          text: data.text,
          senderName: data.senderName,
          isFromMe: false,
          timestamp: data.timestamp
        }]);
      }
    });

    return () => socket.disconnect();
  }, [activeChat]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    const textToSend = inputText;
    setInputText(''); 

    try {
      await api.post(`/api/whatsapp/chat/chats/${activeChat}/send`, { message: textToSend }, { headers });
    } catch (err) {
      alert('Failed to send message');
      setInputText(textToSend); 
    }
  };

  const handleStartNewChat = async (e) => {
    e.preventDefault();
    if (!newPhone) return;
    setIsLoading(true);

    try {
      const res = await api.post('/api/whatsapp/chat/new-chat', { phoneNumber: newPhone }, { headers });
      setActiveChat(res.data.chatId);
      setActiveChatName(res.data.name);
      setShowNewChatModal(false);
      setNewPhone('');
      
      setChats(prev => {
        if (!prev.find(c => c.chatId === res.data.chatId)) {
          return [{ chatId: res.data.chatId, name: res.data.name, lastMessage: "New Chat", timestamp: new Date() }, ...prev];
        }
        return prev;
      });
      setProfilePics(prev => ({
        ...prev,
        [res.data.chatId]: `https://ui-avatars.com/api/?name=${res.data.name}&background=random&color=fff&size=128`
      }));
    } catch (err) {
      alert('Invalid phone number');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`wa-portal-wrapper ${activeChat ? 'mobile-chat-open' : ''}`}>
      
      {showNewChatModal && (
        <div className="wa-modal-overlay">
          <div className="wa-modal">
            <h2 className="wa-modal-title">New Chat</h2>
            <form onSubmit={handleStartNewChat}>
              <input 
                type="text" 
                placeholder="Phone number (e.g., 0712345678)" 
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="wa-modal-input"
                autoFocus
              />
              <div className="wa-modal-actions">
                <button type="button" onClick={() => setShowNewChatModal(false)} className="wa-btn wa-btn-text">Cancel</button>
                <button type="submit" disabled={isLoading} className="wa-btn wa-btn-green">
                  {isLoading ? 'Starting...' : 'Start Chat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="wa-sidebar">
        <div className="wa-sidebar-header">
          <div className="wa-avatar">
             <img src="https://ui-avatars.com/api/?name=Admin&background=00a884&color=fff" alt="Admin" />
          </div>
          <span className="wa-header-name">Admin</span>
          <button onClick={() => setShowNewChatModal(true)} className="wa-icon-btn" title="New Chat">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path>
            </svg>
          </button>
        </div>

        <div className="wa-search-container">
          <div className="wa-search-box">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#54656f" style={{ marginRight: '12px' }}>
              <path d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 001.256-3.386 5.207 5.207 0 10-5.207 5.208 5.183 5.183 0 003.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.807 0a3.605 3.605 0 110-7.21 3.605 3.605 0 010 7.21z"></path>
            </svg>
            <input type="text" placeholder="Search or start new chat" className="wa-search-input" />
          </div>
        </div>
        
        <div className="wa-chat-list">
          {chats.length === 0 && (
            <div className="wa-empty-state">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="#d1d7db">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"></path>
              </svg>
              No chats yet.<br />Click the + icon to start a new chat.
            </div>
          )}
          
          {chats.map(chat => (
            <div 
              key={chat.chatId}
              onClick={() => { setActiveChat(chat.chatId); setActiveChatName(chat.name); }}
              className={`wa-chat-item ${activeChat === chat.chatId ? 'active' : ''}`}
            >
              <div className="wa-avatar">
                <img src={profilePics[chat.chatId]} alt="avatar" />
              </div>
              <div className="wa-chat-info">
                <div className="wa-chat-top">
                  <h3 className="wa-chat-name">{chat.name}</h3>
                  <span className="wa-chat-time">
                    {chat.timestamp && chat.timestamp !== new Date(0).toISOString() 
                      ? new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                </div>
                <p className="wa-chat-last-msg">{chat.lastMessage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wa-main">
        <div className="wa-doodle-bg"></div>

        {activeChat ? (
          <>
            <div className="wa-main-header">
               <button 
                 className="wa-mobile-back" 
                 onClick={() => setActiveChat(null)}
               >
                 <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                   <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
                 </svg>
               </button>

               <div className="wa-avatar">
                 <img src={profilePics[activeChat]} alt="avatar" />
               </div>
               <div className="wa-main-header-info">
                 <h2>{activeChatName}</h2>
                 <p>click here for contact info</p>
               </div>
               <div className="wa-main-header-icons">
                 <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"></path></svg>
                 <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
               </div>
            </div>

            <div className="wa-messages-area">
              {messages.length === 0 && (
                <div className="wa-encryption-notice">
                  🔒 Messages are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
                </div>
              )}
              {messages.map((msg, idx) => {
                const isMe = msg.isFromMe;
                const isGroup = activeChat.includes('@g.us');
                return (
                  <div key={idx} className={`wa-message ${isMe ? 'outgoing' : 'incoming'}`}>
                    
                    {!isMe && isGroup && (
                      <div className="wa-message-sender" style={{ color: '#06cf9c', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
                        {msg.senderName || 'Unknown Member'}
                      </div>
                    )}
                    
                    <div className="wa-message-text">{msg.text}</div>
                    <div className="wa-message-meta">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isMe && (
                        <svg viewBox="0 0 16 15" width="16" height="15" fill="#53bdeb">
                          <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.879a.32.32 0 01-.484.033l-.358-.325a.319.319 0 00-.484.032l-.378.483a.418.418 0 00.036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 00-.064-.512zm-4.1 0l-.478-.372a.365.365 0 00-.51.063L4.566 9.879a.32.32 0 01-.484.033L1.891 7.769a.366.366 0 00-.515.006l-.423.433a.364.364 0 00.006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 00-.063-.51z"></path>
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="wa-input-area">
              <div className="wa-input-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"></path></svg>
              </div>
              <form onSubmit={handleSend} className="wa-input-form">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message" 
                  className="wa-input"
                />
              </form>
              <button onClick={handleSend} className="wa-send-btn">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="wa-empty-chat">
            <h1>WhatsApp Web</h1>
            <p>Send and receive messages without keeping your phone online.<br/>Use WhatsApp on up to 4 linked devices and 1 phone at the same time.</p>
            <div className="wa-empty-chat-footer">
              <svg viewBox="0 0 10 12" width="10" height="12" fill="currentColor"><path d="M5 0C3.343 0 2 1.343 2 3v1H1c-.552 0-1 .448-1 1v6c0 .552.448 1 1 1h8c.552 0 1-.448 1-1V5c0-.552-.448-1-1-1H8V3c0-1.657-1.343-3-3-3zm0 1.5c.828 0 1.5.672 1.5 1.5v1h-3V3c0-.828.672-1.5 1.5-1.5z"></path></svg>
              End-to-end encrypted
            </div>
          </div>
        )}
      </div>

      <style>{`
        .wa-portal-wrapper {
          display: flex;
          height: calc(100vh - 140px);
          width: 100%;
          background: #f0f2f5;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          overflow: hidden;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          position: relative;
        }

        .wa-sidebar {
          width: 30%;
          min-width: 320px;
          max-width: 400px;
          background: #ffffff;
          border-right: 1px solid #d1d7db;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .wa-sidebar-header {
          background: #f0f2f5;
          height: 60px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #d1d7db;
          border-top-left-radius: 8px;
          flex-shrink: 0;
        }

        .wa-header-name {
          color: #41525d;
          font-weight: 600;
          font-size: 14px;
          flex: 1;
          margin-left: 12px;
        }

        .wa-icon-btn {
          background: transparent;
          border: none;
          color: #54656f;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wa-icon-btn:hover { background: #e9edef; }

        .wa-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }
        
        .wa-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .wa-search-container {
          padding: 8px 12px;
          border-bottom: 1px solid #d1d7db;
          background: #ffffff;
          flex-shrink: 0;
        }

        .wa-search-box {
          background: #f0f2f5;
          display: flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 8px;
        }

        .wa-search-input {
          background: transparent;
          border: none;
          outline: none;
          font-size: 14px;
          width: 100%;
          color: #3b4a54;
        }

        .wa-search-input::placeholder { color: #8696a0; }

        .wa-chat-list {
          flex: 1;
          overflow-y: auto;
          background: #ffffff;
          border-bottom-left-radius: 8px;
        }

        .wa-chat-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.1s;
        }

        .wa-chat-item:hover { background: #f5f6f6; }
        .wa-chat-item.active { background: #f0f2f5; }

        .wa-chat-item .wa-avatar {
          width: 49px;
          height: 49px;
          margin-right: 15px;
        }

        .wa-chat-info {
          flex: 1;
          border-bottom: 1px solid #f0f2f5;
          padding-bottom: 12px;
          min-width: 0;
        }

        .wa-chat-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }

        .wa-chat-name {
          font-size: 17px;
          color: #111b21;
          font-weight: 400;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .wa-chat-time {
          font-size: 12px;
          color: #667781;
        }

        .wa-chat-last-msg {
          font-size: 14px;
          color: #667781;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .wa-empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #667781;
          font-size: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .wa-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          background: #efeae2;
          border-bottom-right-radius: 8px;
          border-top-right-radius: 8px;
          height: 100%;
        }

        .wa-doodle-bg {
          position: absolute;
          inset: 0;
          opacity: 0.4;
          pointer-events: none;
          background-image: url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png");
          background-size: 400px;
          background-blend-mode: multiply;
          border-top-right-radius: 8px;
          border-bottom-right-radius: 8px;
        }

        .wa-main-header {
          background: #f0f2f5;
          height: 60px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid #d1d7db;
          z-index: 10;
          border-top-right-radius: 8px;
          flex-shrink: 0;
        }

        .wa-main-header .wa-avatar {
          width: 40px;
          height: 40px;
          margin-right: 12px;
        }

        .wa-main-header-info {
          flex: 1;
        }

        .wa-main-header-info h2 {
          font-size: 16px;
          color: #111b21;
          font-weight: 500;
          margin: 0;
        }

        .wa-main-header-info p {
          font-size: 13px;
          color: #667781;
          margin: 0;
        }

        .wa-main-header-icons {
          display: flex;
          gap: 20px;
          color: #54656f;
        }

        .wa-main-header-icons svg { cursor: pointer; }

        .wa-messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 20px 40px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .wa-encryption-notice {
          text-align: center;
          color: #667781;
          font-size: 13px;
          margin-top: 20px;
          background: #ffeecd;
          padding: 8px 16px;
          border-radius: 8px;
          align-self: center;
          box-shadow: 0 1px 1px rgba(0,0,0,0.1);
        }

        .wa-message {
          max-width: 65%;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 14.2px;
          box-shadow: 0 1px 1px rgba(0,0,0,0.1);
          position: relative;
          margin-bottom: 2px;
          display: flex;
          flex-direction: column;
        }

        .wa-message.incoming {
          background: #ffffff;
          align-self: flex-start;
          border-top-left-radius: 0;
        }

        .wa-message.outgoing {
          background: #d9fdd3;
          align-self: flex-end;
          border-top-right-radius: 0;
        }

        .wa-message-sender {
          font-size: 13px;
          font-weight: 600;
          color: #06cf9c;
          margin-bottom: 4px;
        }

        .wa-message-text {
          color: #111b21;
          line-height: 19px;
          white-space: pre-wrap;
          padding-right: 50px;
        }

        .wa-message-meta {
          position: absolute;
          bottom: 4px;
          right: 8px;
          font-size: 11px;
          color: #667781;
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .wa-input-area {
          background: #f0f2f5;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 10;
          border-bottom-right-radius: 8px;
          flex-shrink: 0;
        }

        .wa-input-icon {
          color: #54656f;
          cursor: pointer;
          display: flex;
        }

        .wa-input-form {
          flex: 1;
          display: flex;
        }

        .wa-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 8px;
          border: none;
          outline: none;
          font-size: 15px;
          color: #111b21;
          box-shadow: 0 1px 1px rgba(0,0,0,0.1);
        }

        .wa-send-btn {
          background: transparent;
          border: none;
          color: #54656f;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .wa-send-btn:hover { color: #00a884; }

        .wa-empty-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 10;
          background: #f0f2f5;
          border-bottom: 6px solid #00a884;
          border-bottom-right-radius: 8px;
          border-top-right-radius: 8px;
        }

        .wa-empty-chat h1 {
          font-size: 32px;
          color: #41525d;
          font-weight: 300;
          margin-bottom: 16px;
        }

        .wa-empty-chat p {
          color: #667781;
          font-size: 14px;
          text-align: center;
          line-height: 1.6;
        }

        .wa-empty-chat-footer {
          margin-top: 40px;
          color: #8696a0;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .wa-modal-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }

        .wa-modal {
          background: #ffffff;
          padding: 24px;
          border-radius: 12px;
          width: 400px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .wa-modal-title {
          font-size: 20px;
          font-weight: 600;
          color: #111b21;
          margin-bottom: 16px;
          margin-top: 0;
        }

        .wa-modal-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d7db;
          border-radius: 8px;
          margin-bottom: 16px;
          outline: none;
          font-size: 14px;
        }

        .wa-modal-input:focus { border-color: #00a884; }

        .wa-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .wa-btn {
          padding: 8px 20px;
          border-radius: 8px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          border: none;
          transition: background 0.2s;
        }

        .wa-btn-text {
          background: transparent;
          color: #667781;
        }

        .wa-btn-text:hover { background: #f5f6f6; }

        .wa-btn-green {
          background: #00a884;
          color: #ffffff;
        }

        .wa-btn-green:hover { background: #008f6f; }

        .wa-mobile-back {
          display: none;
          background: transparent;
          border: none;
          color: #54656f;
          cursor: pointer;
          padding: 8px;
          margin-right: 8px;
        }

        @media (max-width: 768px) {
          .wa-portal-wrapper {
            height: calc(100vh - 140px);
            border-radius: 0;
            box-shadow: none;
          }

          .wa-sidebar {
            width: 100%;
            max-width: 100%;
            border-right: none;
            border-radius: 0;
          }

          .wa-main {
            display: none;
            width: 100%;
            border-radius: 0;
          }

          .wa-portal-wrapper.mobile-chat-open .wa-sidebar {
            display: none;
          }

          .wa-portal-wrapper.mobile-chat-open .wa-main {
            display: flex;
          }

          .wa-mobile-back {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .wa-messages-area {
            padding: 16px;
          }

          .wa-input-area {
            padding: 8px 12px;
          }

          .wa-modal {
            width: 90%;
            margin: 20px;
          }
        }
      `}</style>
    </div>
  );
}