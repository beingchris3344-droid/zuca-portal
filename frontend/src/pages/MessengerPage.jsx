// frontend/src/pages/MessengerPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMessenger } from '../contexts/MessengerContext';
import ChatsList from '../components/messenger/ChatsList';
import ChatWindow from '../components/messenger/ChatWindow';
import NewChatModal from '../components/messenger/NewChatModal';
import ChatInfoDrawer from '../components/messenger/ChatInfoDrawer';

export default function MessengerPage() {
  const navigate = useNavigate();
  const { 
    user, 
    loading, 
    fetchUser, 
    fetchConversations,
    darkMode,
    setDarkMode 
  } = useMessenger();
  
  const [activeConversation, setActiveConversation] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list', 'chat', 'info'
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // Check screen size for responsive layout
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (desktop) {
        setMobileView('list');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

 -//  initialization
useEffect(() => {
  const init = async () => {
    
    await fetchUser();
    await fetchConversations(); 
  };
  init();
}, []);

  const handleSelectChat = (conversation) => {
    setActiveConversation(conversation);
    if (!isDesktop) {
      setMobileView('chat');
    }
  };

  const handleBackToList = () => {
    setMobileView('list');
    setShowInfoDrawer(false);
  };

  const handleOpenInfo = () => {
    if (isDesktop) {
      setShowInfoDrawer(true);
    } else {
      setMobileView('info');
    }
  };

  const handleCloseInfo = () => {
    if (isDesktop) {
      setShowInfoDrawer(false);
    } else {
      setMobileView('chat');
    }
  };

  const handleNewChat = () => {
    setShowNewChat(true);
  };

  const handleCloseNewChat = () => {
    setShowNewChat(false);
  };

  const handleChatStarted = (conversation) => {
    setActiveConversation(conversation);
    setShowNewChat(false);
    if (!isDesktop) {
      setMobileView('chat');
    }
  };

  const goBack = () => navigate(-1);
  const goHome = () => navigate('/dashboard');

  

  return (
    <div className={`messenger-page ${darkMode ? 'dark' : ''}`}>
      {/* Desktop Layout - Two Panels Side by Side */}
      {isDesktop ? (
        <div className="desktop-container">
          {/* Left Panel - Chats List */}
          <div className="chats-panel">
            <ChatsList 
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
            />
          </div>
          
          {/* Right Panel - Chat Window */}
          <div className="chat-panel">
            <ChatWindow 
              conversation={activeConversation}
              onBack={handleBackToList}
              onOpenInfo={handleOpenInfo}
            />
          </div>
          
          {/* Right Drawer - Chat Info (optional) */}
          {showInfoDrawer && activeConversation && (
            <div className="info-drawer">
              <ChatInfoDrawer 
                conversation={activeConversation}
                onClose={handleCloseInfo}
              />
            </div>
          )}
        </div>
      ) : (
        /* Mobile Layout - Single Panel with Views */
        <div className="mobile-container">
          {mobileView === 'list' && (
            <ChatsList 
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
            />
          )}
          
          {mobileView === 'chat' && activeConversation && (
            <ChatWindow 
              conversation={activeConversation}
              onBack={handleBackToList}
              onOpenInfo={handleOpenInfo}
            />
          )}
          
          {mobileView === 'info' && activeConversation && (
            <ChatInfoDrawer 
              conversation={activeConversation}
              onClose={handleCloseInfo}
              isMobile={true}
            />
          )}
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <NewChatModal 
          onClose={handleCloseNewChat}
          onChatStart={handleChatStarted}
        />
      )}

      <style jsx>{`
        .messenger-page {
          height: 100vh;
          background: #ECE5DD;
          overflow: hidden;
        }

        /* Loading State */
        .messenger-loading {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #075E54;
          color: white;
          gap: 16px;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255, 255, 255, 0.2);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .messenger-loading h3 {
          font-size: 20px;
          font-weight: 500;
        }

        .messenger-loading p {
          font-size: 14px;
          opacity: 0.8;
        }

        /* Desktop Layout */
        .desktop-container {
          display: flex;
          height: 100%;
          width: 100%;
        }

        .chats-panel {
          width: 380px;
          flex-shrink: 0;
          background: #FFFFFF;
          border-right: 1px solid #E9EDEF;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .chat-panel {
          flex: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .info-drawer {
          width: 320px;
          flex-shrink: 0;
          background: #FFFFFF;
          border-left: 1px solid #E9EDEF;
          height: 100%;
          overflow-y: auto;
        }

        /* Mobile Layout */
        .mobile-container {
          height: 100%;
          width: 100%;
        }

        /* Dark Mode Styles */
        .messenger-page.dark {
          background: #111B21;
        }

        .messenger-page.dark .chats-panel {
          background: #111B21;
          border-right-color: #202C33;
        }

        .messenger-page.dark .info-drawer {
          background: #111B21;
          border-left-color: #202C33;
        }

        /* Responsive Adjustments */
        @media (max-width: 1024px) {
          .chats-panel {
            width: 320px;
          }
          
          .info-drawer {
            width: 280px;
          }
        }

        @media (max-width: 768px) {
          .chats-panel {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}