// frontend/src/components/ZucaAIAssistant.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import BASE_URL from "../api";
import logoImg from "../assets/zuca-logo.png";
import { 
  FiSend, FiX, FiMinimize2, FiMaximize2, 
  FiTrash, FiMic, FiMicOff, FiCopy, FiCheck,
  FiDownload, FiPaperclip
} from "react-icons/fi";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ZucaAIAssistant({ user, onClose, isOpen, isFullPage, onBack, navigate: propNavigate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const lastRequestTime = useRef(0);
  const fileInputRef = useRef(null);
  
  // Use navigate from props or create our own
  const navigate = propNavigate || useNavigate();
  const [localFullPage, setLocalFullPage] = useState(false);

  // Load chat history
  useEffect(() => {
    const savedHistory = localStorage.getItem('zuca_ai_history');
    if (savedHistory && !isFullPage && !localFullPage) {
      try {
        const history = JSON.parse(savedHistory);
        if (history.length > 0) {
          setMessages(history.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp) })));
        }
      } catch (e) {}
    }
  }, [isFullPage, localFullPage]);

  // Save chat history
  useEffect(() => {
    if (!isFullPage && !localFullPage && messages.length > 0) {
      const toSave = messages.slice(-100).map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString()
      }));
      localStorage.setItem('zuca_ai_history', JSON.stringify(toSave));
    }
  }, [messages, isFullPage, localFullPage]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: Date.now(),
        role: "assistant",
        content: `Tumsifu Yesu Kristu! 🙏\n\nHello **${user?.fullName?.split(" ")[0] || "there"}**! I'm your **ZUCA AI Assistant**.\n\n### What I can do:\n\n| Command | What happens |\n|---------|--------------|\n| 📸 **Open Gallery** | Opens the media gallery |\n| 🎵 **Open Hymn Book** | Opens all hymns |\n| 📖 **Show lyrics for [song]** | Opens exact hymn page |\n| 💰 **What do I owe?** | Shows your pledges |\n| 💵 **I want to give 5000** | Creates a pledge |\n| 💬 **Tell everyone hello** | Sends to chat |\n| 🔔 **Read notifications** | Shows all unread |\n| ✅ **Mark all as read** | Clears notifications |\n| 👤 **Who am I?** | Your profile |\n| ⛪ **When is mass?** | Mass schedule |\n| 🏠 **What jumuia groups?** | List of groups |\n\n**Try saying "Open Gallery" or "Show lyrics for Amazing Grace"** 🙏`,
        timestamp: new Date()
      }]);
    }
  }, [user, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Voice recognition
  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice recognition not supported. Try Chrome!");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.onresult = (event) => {
      setInput(event.results[0][0].transcript);
      setIsListening(false);
      setTimeout(() => sendMessage(), 100);
    };
    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.start();
    setIsListening(true);
  };

  const stopVoiceInput = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch(e) {}
  };

  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      type: file.type,
      size: file.size,
      file: file
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const sendMessage = useCallback(async () => {
    if ((!input.trim() && attachments.length === 0)) return;
    if (loading) return;
    
    const now = Date.now();
    if (now - lastRequestTime.current < 2000) {
      const waitTime = Math.ceil((2000 - (now - lastRequestTime.current)) / 1000);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: "assistant",
        content: `Please wait ${waitTime} second(s) before sending another message. 🙏`,
        timestamp: new Date()
      }]);
      return;
    }
    
    const userMessage = input.trim();
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: "user",
      content: userMessage,
      timestamp: new Date()
    }]);
    setInput("");
    setAttachments([]);
    setLoading(true);
    lastRequestTime.current = now;
    
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${BASE_URL}/api/ai/assistant`, {
        message: userMessage
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      });
      
      const aiResponse = response.data.response;
      
      // Handle navigation actions
      if (response.data.action === "navigate" && response.data.path) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: "assistant",
          content: aiResponse,
          timestamp: new Date()
        }]);
        setTimeout(() => {
          window.location.href = response.data.path;
        }, 500);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: "assistant",
          content: aiResponse,
          timestamp: new Date()
        }]);
      }
      
    } catch (err) {
      console.error("AI error:", err);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: "assistant",
        content: "Tumsifu Yesu Kristu! 🙏 I'm having trouble connecting. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, attachments, loading]);

  const clearChat = () => {
    setMessages([{
      id: Date.now(),
      role: "assistant",
      content: `Chat cleared! 👋 Hello again! I'm still here for you. What would you like to do? Tumsifu Yesu Kristu! 🙏`,
      timestamp: new Date()
    }]);
    localStorage.removeItem('zuca_ai_history');
  };

  const exportChat = () => {
    const chatText = messages.map(msg => {
      const role = msg.role === 'user' ? 'You' : 'ZUCA AI';
      const time = msg.timestamp.toLocaleString();
      return `[${time}] ${role}:\n${msg.content}\n`;
    }).join('\n---\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zuca-chat-${new Date().toISOString().slice(0,19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Get user avatar (profile image or initial)
  const getUserAvatar = () => {
    if (user?.profileImage) {
      return user.profileImage;
    }
    return null;
  };

  // Get user initial for avatar fallback
  const getUserInitial = () => {
    if (user?.fullName) {
      return user.fullName.charAt(0).toUpperCase();
    }
    return "U";
  };

  // FIXED: Open full page function
  const openFullPage = () => {
    setLocalFullPage(true);
  };

  // FIXED: Close widget function
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // FIXED: Close full page and go back to widget
  const closeFullPage = () => {
    setLocalFullPage(false);
  };

  // FIXED: Handle back button (for when isFullPage prop is true)
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setLocalFullPage(false);
    }
  };

  const quickActions = [
    { emoji: "📸", label: "Open Gallery", action: "Open Gallery" },
    { emoji: "🎵", label: "Open Hymn Book", action: "Open Hymn Book" },
    { emoji: "💰", label: "What do I owe?", action: "What do I owe?" },
    { emoji: "💬", label: "Send to chat", action: "Tell everyone hello" },
    { emoji: "🔔", label: "Read notifications", action: "Read notifications" },
    { emoji: "👤", label: "Who am I?", action: "Who am I?" },
    { emoji: "⛪", label: "Mass Schedule", action: "When is mass?" },
    { emoji: "🏠", label: "Jumuia Groups", action: "What jumuia groups?" },
  ];

  // Full page mode (from props OR local state)
  if (isFullPage || localFullPage) {
    return (
      <div style={fullPageContainerStyle}>
        <div style={fullPageHeaderStyle}>
          <button onClick={handleBack} style={backButtonStyle}>
            ← Back to Dashboard
          </button>
          <div style={fullPageTitleStyle}>
            <img src={logoImg} alt="ZUCA" style={fullPageLogoStyle} />
            <div>
              <h2 style={{ margin: 0, color: "#0f172a", fontSize: "20px" }}>ZUCA AI</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Your Intelligent Assistant</p>
            </div>
            <span style={userBadgeStyle}>🙏 USER</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={exportChat} style={iconBtnStyle} title="Export chat">📥</button>
            <button onClick={clearChat} style={iconBtnStyle} title="Clear chat">🗑️</button>
            <button onClick={handleClose} style={iconBtnStyle} title="Close">✕</button>
          </div>
        </div>
        
        <div style={fullPageMessagesStyle}>
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              msg={msg} 
              isUser={msg.role === "user"} 
              isFullPage={true} 
              userAvatar={getUserAvatar()}
              userInitial={getUserInitial()}
              copiedId={copiedId}
              setCopiedId={setCopiedId}
            />
          ))}
          {loading && <TypingIndicator isFullPage={true} />}
          <div ref={messagesEndRef} />
        </div>

        <AttachmentPreviewComponent attachments={attachments} removeAttachment={removeAttachment} isFullPage={true} />
        
        <div style={fullPageInputStyle}>
          <input type="file" ref={fileInputRef} onChange={handleFileAttach} multiple style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()} style={fullPageActionBtn(false)} title="Attach file">
            <FiPaperclip size={18} />
          </button>
          <button 
            onClick={isListening ? stopVoiceInput : startVoiceInput} 
            style={fullPageActionBtn(isListening)}
          >
            {isListening ? <FiMicOff size={18} /> : <FiMic size={18} />}
          </button>
          <textarea 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyPress={handleKeyPress} 
            placeholder="Ask me anything... Try 'Open Gallery' or 'Show lyrics for Amazing Grace'" 
            style={fullPageTextareaStyle}
            rows={1}
          />
          <button 
            onClick={sendMessage} 
            disabled={loading || (!input.trim() && attachments.length === 0)} 
            style={fullPageSendBtnStyle}
          >
            <FiSend size={18} />
          </button>
        </div>
        
        <div style={fullPageQuickActionsStyle}>
          {quickActions.map((action, idx) => (
            <button key={idx} onClick={() => setInput(action.action)} style={quickActionBtnStyle}>
              <span style={{ fontSize: "14px" }}>{action.emoji}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Widget mode
  return (
    <div style={widgetContainerStyle}>
      <div style={widgetHeaderStyle}>
        <div style={widgetHeaderLeftStyle}>
          <img src={logoImg} alt="ZUCA" style={widgetLogoStyle} />
          <div>
            <h3 style={widgetTitleStyle}>ZUCA AI Assistant</h3>
            <p style={widgetStatusStyle}>● Online</p>
          </div>
        </div>
        <div style={widgetHeaderActionsStyle}>
          <button onClick={openFullPage} style={widgetIconBtnStyle} title="Full Screen">
            <FiMaximize2 size={12} />
          </button>
          <button onClick={exportChat} style={widgetIconBtnStyle} title="Export">
            <FiDownload size={12} />
          </button>
          <button onClick={clearChat} style={widgetIconBtnStyle} title="Clear">
            <FiTrash size={12} />
          </button>
          <button onClick={handleClose} style={widgetIconBtnStyle} title="Close">
            <FiX size={12} />
          </button>
        </div>
      </div>

      <div style={widgetMessagesStyle}>
        {messages.slice(-15).map((msg) => (
          <MessageBubble 
            key={msg.id} 
            msg={msg} 
            isUser={msg.role === "user"} 
            isFullPage={false} 
            userAvatar={getUserAvatar()}
            userInitial={getUserInitial()}
            copiedId={copiedId}
            setCopiedId={setCopiedId}
          />
        ))}
        {loading && <TypingIndicator isFullPage={false} />}
        <div ref={messagesEndRef} />
      </div>

      <AttachmentPreviewComponent attachments={attachments} removeAttachment={removeAttachment} isFullPage={false} />

      <div style={widgetInputStyle}>
        <input type="file" ref={fileInputRef} onChange={handleFileAttach} multiple style={{ display: "none" }} />
        <button onClick={() => fileInputRef.current?.click()} style={widgetActionBtn(false)}>
          <FiPaperclip size={12} />
        </button>
        <button onClick={isListening ? stopVoiceInput : startVoiceInput} style={widgetActionBtn(isListening)}>
          {isListening ? <FiMicOff size={12} /> : <FiMic size={12} />}
        </button>
        <textarea 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyPress={handleKeyPress} 
          placeholder="Ask me anything..." 
          style={widgetTextareaStyle}
          rows={1}
        />
        <button onClick={sendMessage} disabled={loading || (!input.trim() && attachments.length === 0)} style={widgetSendBtnStyle}>
          <FiSend size={12} />
        </button>
      </div>

      <div style={widgetQuickActionsStyle}>
        {quickActions.slice(0, 5).map((action, idx) => (
          <button key={idx} onClick={() => setInput(action.action)} style={widgetQuickBtnStyle}>
            {action.emoji} {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== MESSAGE BUBBLE COMPONENT ====================
const MessageBubble = ({ msg, isUser, isFullPage, userAvatar, userInitial, copiedId, setCopiedId }) => {
  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch(e) {}
  };

  return (
    <div style={{ 
      display: "flex", 
      gap: isFullPage ? "12px" : "10px", 
      flexDirection: isUser ? "row-reverse" : "row", 
      alignItems: "flex-start", 
      marginBottom: isFullPage ? "20px" : "16px" 
    }}>
      <div style={{ 
        width: isFullPage ? "40px" : "36px", 
        height: isFullPage ? "40px" : "36px", 
        borderRadius: "12px", 
        background: isUser 
          ? "linear-gradient(135deg, #3b82f6, #2563eb)" 
          : "linear-gradient(135deg, #ef4444, #dc2626)",
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        fontSize: isFullPage ? "18px" : "16px", 
        flexShrink: 0,
        color: "white",
        overflow: "hidden"
      }}>
        {isUser ? (
          userAvatar ? (
            <img 
              src={userAvatar} 
              alt="User" 
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            userInitial
          )
        ) : (
          <img 
            src={logoImg} 
            alt="ZUCA" 
            style={{ width: "100%", height: "100%", objectFit: "cover", padding: isFullPage ? "8px" : "6px" }}
          />
        )}
      </div>
      
      <div style={{ 
        maxWidth: isFullPage ? "70%" : "75%", 
        padding: isFullPage ? "12px 16px" : "10px 14px", 
        borderRadius: "16px", 
        background: isUser ? "#eff6ff" : "#f8fafc", 
        color: "#1e293b", 
        fontSize: isFullPage ? "14px" : "13px", 
        lineHeight: "1.5", 
        border: "1px solid #e2e8f0"
      }}>
        {isUser ? (
          <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }} />,
            table: ({node, ...props}) => <table {...props} style={{ borderCollapse: "collapse", width: "100%", margin: "8px 0" }} />,
            th: ({node, ...props}) => <th {...props} style={{ border: "1px solid #e2e8f0", padding: "6px", textAlign: "left", background: "#f1f5f9" }} />,
            td: ({node, ...props}) => <td {...props} style={{ border: "1px solid #e2e8f0", padding: "6px" }} />,
            code: ({node, ...props}) => <code {...props} style={{ background: "#f1f5f9", padding: "2px 4px", borderRadius: "4px" }} />
          }}>
            {msg.content}
          </ReactMarkdown>
        )}
        
        <div style={{ 
          fontSize: isFullPage ? "10px" : "9px", 
          color: "#94a3b8", 
          marginTop: "8px", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center" 
        }}>
          <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <button 
            onClick={() => copyToClipboard(msg.content, msg.id)} 
            style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
          >
            {copiedId === msg.id ? <FiCheck size={isFullPage ? 12 : 10} /> : <FiCopy size={isFullPage ? 12 : 10} />}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== TYPING INDICATOR ====================
const TypingIndicator = ({ isFullPage }) => (
  <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
    <div style={{ 
      width: isFullPage ? "40px" : "36px", 
      height: isFullPage ? "40px" : "36px", 
      borderRadius: "12px", 
      background: "linear-gradient(135deg, #ef4444, #dc2626)",
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      overflow: "hidden"
    }}>
      <img 
        src={logoImg} 
        alt="ZUCA" 
        style={{ width: "100%", height: "100%", objectFit: "cover", padding: isFullPage ? "8px" : "6px" }}
      />
    </div>
    <div style={{ 
      padding: isFullPage ? "12px 16px" : "10px 14px", 
      borderRadius: "16px", 
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      display: "flex", 
      gap: "8px", 
      alignItems: "center"
    }}>
      <div className="typing-dot" style={{ animationDelay: "0s" }}></div>
      <div className="typing-dot" style={{ animationDelay: "0.2s" }}></div>
      <div className="typing-dot" style={{ animationDelay: "0.4s" }}></div>
      <span style={{ fontSize: isFullPage ? "13px" : "11px", color: "#64748b", marginLeft: "4px" }}>
        ZUCA AI is thinking...
      </span>
    </div>
  </div>
);

// ==================== ATTACHMENT PREVIEW ====================
const AttachmentPreviewComponent = ({ attachments, removeAttachment, isFullPage }) => {
  if (attachments.length === 0) return null;
  return (
    <div style={{ padding: "8px 16px", display: "flex", gap: "8px", flexWrap: "wrap", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
      {attachments.map(att => (
        <div key={att.id} style={{ background: "white", borderRadius: "20px", padding: "4px 12px", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", border: "1px solid #e2e8f0" }}>
          📎 {att.name.length > 20 ? att.name.substring(0, 20) + '...' : att.name}
          <button onClick={() => removeAttachment(att.id)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "14px" }}>×</button>
        </div>
      ))}
    </div>
  );
};

// ==================== STYLES ====================

// Full Page Styles
const fullPageContainerStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "#f8fafc",
  zIndex: 999999,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const fullPageHeaderStyle = {
  padding: "16px 24px",
  background: "white",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexShrink: 0,
  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
};

const backButtonStyle = {
  padding: "8px 16px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  color: "#475569",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "500",
  transition: "all 0.2s",
};

const fullPageTitleStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const fullPageLogoStyle = {
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  background: "#f8fafc",
  padding: "8px",
  objectFit: "contain",
};

const userBadgeStyle = {
  background: "#eff6ff",
  color: "#3b82f6",
  padding: "4px 12px",
  borderRadius: "20px",
  fontSize: "11px",
  fontWeight: "600",
  marginLeft: "12px",
};

const iconBtnStyle = {
  width: "38px",
  height: "38px",
  borderRadius: "10px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#64748b",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  transition: "all 0.2s",
};

const fullPageMessagesStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "24px",
};

const fullPageInputStyle = {
  padding: "16px 24px",
  borderTop: "1px solid #e2e8f0",
  background: "white",
  display: "flex",
  gap: "12px",
  alignItems: "flex-end",
  flexShrink: 0,
};

const fullPageActionBtn = (isListening) => ({
  width: "44px",
  height: "44px",
  borderRadius: "22px",
  background: isListening ? "#fef2f2" : "#f8fafc",
  border: isListening ? "1px solid #ef4444" : "1px solid #e2e8f0",
  color: isListening ? "#ef4444" : "#64748b",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s",
});

const fullPageTextareaStyle = {
  flex: 1,
  padding: "12px 16px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "24px",
  color: "#1e293b",
  fontSize: "14px",
  resize: "none",
  fontFamily: "inherit",
  minHeight: "48px",
  maxHeight: "120px",
  outline: "none",
  transition: "all 0.2s",
};

const fullPageSendBtnStyle = {
  width: "44px",
  height: "44px",
  borderRadius: "22px",
  background: "#3b82f6",
  border: "none",
  color: "white",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s",
};

const fullPageQuickActionsStyle = {
  padding: "12px 24px",
  borderTop: "1px solid #e2e8f0",
  background: "white",
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  flexShrink: 0,
};

const quickActionBtnStyle = {
  padding: "6px 14px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  color: "#475569",
  fontSize: "12px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  transition: "all 0.2s",
};

// Widget Styles
const widgetContainerStyle = {
  position: "fixed",
  bottom: "20px",
  right: "20px",
  width: "400px",
  height: "550px",
  background: "white",
  borderRadius: "20px",
  boxShadow: "0 20px 40px -12px rgba(0,0,0,0.25)",
  zIndex: 10000,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const widgetHeaderStyle = {
  padding: "12px 16px",
  background: "white",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexShrink: 0,
};

const widgetHeaderLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const widgetLogoStyle = {
  width: "32px",
  height: "32px",
  borderRadius: "10px",
  background: "#f8fafc",
  padding: "6px",
  objectFit: "contain",
};

const widgetTitleStyle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: "600",
};

const widgetStatusStyle = {
  margin: 0,
  color: "#10b981",
  fontSize: "10px",
  fontWeight: "500",
};

const widgetHeaderActionsStyle = {
  display: "flex",
  gap: "6px",
};

const widgetIconBtnStyle = {
  width: "28px",
  height: "28px",
  borderRadius: "8px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#64748b",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  transition: "all 0.2s",
};

const widgetMessagesStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "16px",
  background: "#f8fafc",
};

const widgetInputStyle = {
  padding: "12px 16px",
  borderTop: "1px solid #e2e8f0",
  background: "white",
  display: "flex",
  gap: "8px",
  alignItems: "flex-end",
  flexShrink: 0,
};

const widgetActionBtn = (isListening) => ({
  width: "34px",
  height: "34px",
  borderRadius: "17px",
  background: isListening ? "#fef2f2" : "#f8fafc",
  border: isListening ? "1px solid #ef4444" : "1px solid #e2e8f0",
  color: isListening ? "#ef4444" : "#64748b",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const widgetTextareaStyle = {
  flex: 1,
  padding: "8px 12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  color: "#1e293b",
  fontSize: "12px",
  resize: "none",
  fontFamily: "inherit",
  minHeight: "36px",
  maxHeight: "80px",
  outline: "none",
};

const widgetSendBtnStyle = {
  width: "34px",
  height: "34px",
  borderRadius: "17px",
  background: "#3b82f6",
  border: "none",
  color: "white",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const widgetQuickActionsStyle = {
  padding: "8px 12px",
  borderTop: "1px solid #e2e8f0",
  background: "white",
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  flexShrink: 0,
};

const widgetQuickBtnStyle = {
  padding: "4px 10px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  color: "#475569",
  fontSize: "10px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "4px",
};

// CSS Animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes typingWave {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    30% {
      transform: translateY(-8px);
      opacity: 1;
    }
  }
  
  .typing-dot {
    width: 8px;
    height: 8px;
    background: #3b82f6;
    border-radius: 50%;
    animation: typingWave 1.4s infinite ease-in-out;
  }
  
  button:hover {
    transform: translateY(-1px);
  }
  
  textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
  }
  
  @media (max-width: 768px) {
    .widget-container {
      width: 95% !important;
      right: 2.5% !important;
      bottom: 10px !important;
      left: 2.5% !important;
    }
  }
`;
if (!document.querySelector("#ai-typing-animation")) {
  styleSheet.id = "ai-typing-animation";
  document.head.appendChild(styleSheet);
}