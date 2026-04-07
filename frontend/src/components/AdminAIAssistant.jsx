// frontend/src/components/AdminAIAssistant.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import BASE_URL from "../api";
import logoImg from "../assets/zuca-logo.png";
import { 
  FiSend, FiX, FiMinimize2, FiMaximize2, 
  FiTrash, FiMic, FiMicOff, FiCopy, FiCheck,
  FiDownload, FiPaperclip, FiShield, FiUsers, 
  FiDollarSign, FiBell, FiVideo, FiBarChart2
} from "react-icons/fi";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AdminAIAssistant({ user, onClose, isOpen, isFullPage, onBack, navigate }) {
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

  // Load chat history (separate for admin)
  useEffect(() => {
    const savedHistory = localStorage.getItem('admin_ai_history');
    if (savedHistory && !isFullPage) {
      try {
        const history = JSON.parse(savedHistory);
        if (history.length > 0) {
          setMessages(history.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp) })));
        }
      } catch (e) {}
    }
  }, [isFullPage]);

  // Save chat history
  useEffect(() => {
    if (!isFullPage && messages.length > 0) {
      const toSave = messages.slice(-100).map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString()
      }));
      localStorage.setItem('admin_ai_history', JSON.stringify(toSave));
    }
  }, [messages, isFullPage]);

  // Welcome message for Admin
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: Date.now(),
        role: "assistant",
        content: `👑 **ADMIN AI ASSISTANT**\n\nTumsifu Yesu Kristu! 🙏\n\nHello **${user?.fullName?.split(" ")[0] || "Admin"}**! I'm your **ZUCA Admin AI** with full management capabilities.\n\n### 🔧 ADMIN COMMANDS:\n\n| Category | Commands |\n|----------|----------|\n| 👥 **Users** | "List all users", "Find user [name]", "Delete user [email]", "Make [name] admin" |\n| 💰 **Campaigns** | "Create campaign 'Title' with target 50000", "List campaigns", "Delete campaign [title]" |\n| 📢 **Announcements** | "Create announcement: [message]", "List announcements", "Delete announcement [title]" |\n| 📸 **Gallery** | "List media", "Delete media [title]" |\n| 📺 **YouTube** | "YouTube stats", "Channel analytics" |\n| 📊 **System** | "System stats", "Jumuia stats", "Admin help" |\n\n**Try saying "List all users" or "Admin help"** 🙏`,
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

  const sendMessage = async () => {
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
      
const response = await axios.post(`${BASE_URL}/api/admin/ai/assistant`, {        message: userMessage
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      });
      
      const aiResponse = response.data.response;
      
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
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now(),
      role: "assistant",
      content: `Chat cleared! 👑 Admin AI ready. What would you like to manage? Tumsifu Yesu Kristu! 🙏`,
      timestamp: new Date()
    }]);
    localStorage.removeItem('admin_ai_history');
  };

  const exportChat = () => {
    const chatText = messages.map(msg => {
      const role = msg.role === 'user' ? 'Admin' : 'Admin AI';
      const time = msg.timestamp.toLocaleString();
      return `[${time}] ${role}:\n${msg.content}\n`;
    }).join('\n---\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-chat-${new Date().toISOString().slice(0,19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const MessageBubble = ({ msg, isUser }) => (
    <div style={{ 
      display: "flex", gap: "12px", 
      flexDirection: isUser ? "row-reverse" : "row", 
      alignItems: "flex-start", marginBottom: "16px" 
    }}>
      <div style={{ 
        width: isFullPage ? "40px" : "32px", 
        height: isFullPage ? "40px" : "32px", 
        borderRadius: "50%", 
        background: isUser 
          ? "linear-gradient(135deg, #ef4444, #dc2626)" 
          : "linear-gradient(135deg, #ef4444, #dc2626)",
        border: "2px solid rgba(255,255,255,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center", 
        fontSize: isFullPage ? "18px" : "14px", flexShrink: 0,
        overflow: "hidden"
      }}>
        {isUser ? (
          "👤"
        ) : (
          <img 
            src={logoImg} 
            alt="ZUCA Admin" 
            style={{ 
              width: "100%", 
              height: "100%", 
              borderRadius: "50%", 
              objectFit: "cover",
              background: "white",
              padding: isFullPage ? "4px" : "3px"
            }} 
          />
        )}
      </div>
      
      <div style={{ 
        maxWidth: isFullPage ? "70%" : "75%", 
        padding: isFullPage ? "12px 18px" : "10px 14px", 
        borderRadius: "20px", 
        background: isUser ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.08)", 
        color: "rgba(255,255,255,0.9)", 
        fontSize: isFullPage ? "15px" : "13px", 
        lineHeight: "1.5", 
        position: "relative" 
      }}>
        {isUser ? (
          <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: "#ef4444" }} />,
            table: ({node, ...props}) => <table {...props} style={{ borderCollapse: "collapse", width: "100%", margin: "8px 0" }} />,
            th: ({node, ...props}) => <th {...props} style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "6px", textAlign: "left" }} />,
            td: ({node, ...props}) => <td {...props} style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "6px" }} />
          }}>
            {msg.content}
          </ReactMarkdown>
        )}
        
        <div style={{ 
          fontSize: isFullPage ? "10px" : "9px", 
          color: "rgba(255,255,255,0.4)", 
          marginTop: "8px", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center" 
        }}>
          <span>{formatTime(msg.timestamp)}</span>
          <button 
            onClick={() => copyToClipboard(msg.content, msg.id)} 
            style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
          >
            {copiedId === msg.id ? <FiCheck size={isFullPage ? 12 : 10} /> : <FiCopy size={isFullPage ? 12 : 10} />}
          </button>
        </div>
      </div>
    </div>
  );

  const TypingIndicator = () => (
    <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
      <div style={{ 
        width: isFullPage ? "40px" : "32px", 
        height: isFullPage ? "40px" : "32px", 
        borderRadius: "50%", 
        border: "2px solid rgba(255,255,255,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden"
      }}>
        <img 
          src={logoImg} 
          alt="ZUCA Admin" 
          style={{ 
            width: "100%", 
            height: "100%", 
            borderRadius: "50%", 
            objectFit: "cover",
            background: "white",
            padding: isFullPage ? "4px" : "3px"
          }} 
        />
      </div>
      
      <div style={{ 
        padding: isFullPage ? "12px 18px" : "10px 14px", 
        borderRadius: "20px", 
        background: "rgba(255,255,255,0.08)",
        display: "flex",
        gap: "8px",
        alignItems: "center"
      }}>
        <div className="typing-dot" style={{ animationDelay: "0s" }}></div>
        <div className="typing-dot" style={{ animationDelay: "0.2s" }}></div>
        <div className="typing-dot" style={{ animationDelay: "0.4s" }}></div>
        <span style={{ fontSize: isFullPage ? "13px" : "11px", color: "rgba(255,255,255,0.5)", marginLeft: "4px" }}>
          Admin AI is thinking...
        </span>
      </div>
      
      <style>{`
        .typing-dot {
          width: ${isFullPage ? "10px" : "8px"};
          height: ${isFullPage ? "10px" : "8px"};
          background: rgba(239,68,68,0.6);
          border-radius: 50%;
          animation: typingWave 1.4s infinite ease-in-out;
        }
        
        @keyframes typingWave {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );

  const AttachmentPreview = () => {
    if (attachments.length === 0) return null;
    return (
      <div style={{ padding: "8px 12px", display: "flex", gap: "8px", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {attachments.map(att => (
          <div key={att.id} style={{ background: "rgba(255,255,255,0.1)", borderRadius: "16px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            📎 {att.name.substring(0, 20)}{att.name.length > 20 ? '...' : ''}
            <button onClick={() => removeAttachment(att.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>✕</button>
          </div>
        ))}
      </div>
    );
  };

  const quickActions = [
    { emoji: "👥", label: "List Users", action: "List all users" },
    { emoji: "💰", label: "Campaigns", action: "List campaigns" },
    { emoji: "📢", label: "Announcements", action: "List announcements" },
    { emoji: "📸", label: "Gallery", action: "List media" },
    { emoji: "📺", label: "YouTube Stats", action: "YouTube stats" },
    { emoji: "📊", label: "System Stats", action: "System stats" },
    { emoji: "👑", label: "Admin Help", action: "Admin help" },
  ];

  // Full page mode
  if (isFullPage) {
    return (
      <div style={fullPageContainerStyle}>
        <div style={{...fullPageHeaderStyle, background: "linear-gradient(135deg, #dc2626, #991b1b)"}}>
          <button onClick={onBack} style={backButtonStyle}>← Back to Dashboard</button>
          <div style={fullPageTitleStyle}>
            <img src={logoImg} alt="ZUCA Admin" style={fullPageLogoStyle} />
            <h2 style={{ margin: 0, color: "white" }}>ZUCA Admin AI</h2>
            <span style={{ background: "#ef4444", padding: "2px 8px", borderRadius: "20px", fontSize: "12px", marginLeft: "8px" }}>ADMIN</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={exportChat} style={closeButtonStyle} title="Export chat">📥</button>
            <button onClick={clearChat} style={closeButtonStyle} title="Clear chat">🗑️</button>
            <button onClick={onClose} style={closeButtonStyle}>✕</button>
          </div>
        </div>
        
        <div style={fullPageMessagesStyle}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} isUser={msg.role === "user"} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        <AttachmentPreview />
        
        <div style={fullPageInputStyle}>
          <input type="file" ref={fileInputRef} onChange={handleFileAttach} multiple style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()} style={fullPageMicStyle(false)} title="Attach file">
            <FiPaperclip size={20} />
          </button>
          <button 
            onClick={isListening ? stopVoiceInput : startVoiceInput} 
            style={fullPageMicStyle(isListening)}
          >
            {isListening ? <FiMicOff size={20} /> : <FiMic size={20} />}
          </button>
          <textarea 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyPress={handleKeyPress} 
            placeholder="Admin commands: List all users, Create campaign, Delete user, etc." 
            style={fullPageTextareaStyle}
            rows={1}
          />
          <button 
            onClick={sendMessage} 
            disabled={loading || (!input.trim() && attachments.length === 0)} 
            style={fullPageSendStyle}
          >
            <FiSend size={20} />
          </button>
        </div>
        
        <div style={{ padding: "8px 24px 16px", display: "flex", gap: "8px", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {quickActions.map((action, idx) => (
            <button key={idx} onClick={() => setInput(action.action)} style={{ 
              padding: "6px 12px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", 
              borderRadius: "20px", color: "#fca5a5", fontSize: "12px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px"
            }}>
              {action.emoji} {action.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Widget mode
  return (
    <div style={widgetContainerStyle}>
      <div style={{...widgetHeaderStyle, background: "linear-gradient(135deg, #dc2626, #991b1b)"}}>
        <div style={widgetHeaderLeftStyle}>
          <img src={logoImg} alt="ZUCA Admin" style={widgetLogoStyle} />
          <div>
            <h3 style={widgetTitleStyle}>ZUCA Admin AI</h3>
            <p style={widgetStatusStyle}><strong>● Admin Mode</strong></p>
          </div>
        </div>
        <div style={widgetHeaderActionsStyle}>
          <button onClick={() => window.dispatchEvent(new CustomEvent('openAIFullPage'))} style={iconButtonStyle} title="Expand">
            <FiMaximize2 size={14} />
          </button>
          <button onClick={exportChat} style={iconButtonStyle} title="Export chat">
            <FiDownload size={14} />
          </button>
          <button onClick={clearChat} style={iconButtonStyle} title="Clear chat">
            <FiTrash size={14} />
          </button>
          <button onClick={onClose} style={iconButtonStyle} title="Close">
            <FiX size={14} />
          </button>
        </div>
      </div>

      <div style={widgetMessagesStyle}>
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} isUser={msg.role === "user"} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <AttachmentPreview />

      <div style={widgetInputStyle}>
        <input type="file" ref={fileInputRef} onChange={handleFileAttach} multiple style={{ display: "none" }} />
        <button onClick={() => fileInputRef.current?.click()} style={widgetMicStyle(false)} title="Attach">
          <FiPaperclip size={14} />
        </button>
        <button onClick={isListening ? stopVoiceInput : startVoiceInput} style={widgetMicStyle(isListening)}>
          {isListening ? <FiMicOff size={14} /> : <FiMic size={14} />}
        </button>
        <textarea 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyPress={handleKeyPress} 
          placeholder="Admin commands..." 
          style={widgetTextareaStyle}
          rows={1}
        />
        <button onClick={sendMessage} disabled={loading || (!input.trim() && attachments.length === 0)} style={widgetSendStyle}>
          <FiSend size={14} />
        </button>
      </div>

      <div style={widgetSuggestionsStyle}>
        {quickActions.slice(0, 4).map((action, idx) => (
          <button key={idx} onClick={() => setInput(action.action)} style={suggestionBtnStyle}>
            {action.emoji} {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== STYLES ====================

const fullPageContainerStyle = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
  background: "linear-gradient(135deg, #1a1a2e, #16213e)", zIndex: 99999999999999,
  display: "flex", flexDirection: "column", overflow: "hidden"
};

const fullPageHeaderStyle = {
  padding: "20px 24px", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(10px)",
  borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex",
  justifyContent: "space-between", alignItems: "center", flexShrink: 0
};

const backButtonStyle = {
  padding: "10px 20px", background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.2)", borderRadius: "40px",
  color: "white", cursor: "pointer", fontSize: "14px"
};

const fullPageTitleStyle = { display: "flex", alignItems: "center", gap: "12px" };
const fullPageLogoStyle = { width: "40px", height: "40px", borderRadius: "50%", background: "white", padding: "6px", objectFit: "contain" };
const closeButtonStyle = { width: "40px", height: "40px", borderRadius: "20px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" };
const fullPageMessagesStyle = { flex: 1, overflowY: "auto", padding: "24px" };
const fullPageInputStyle = { padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "12px", alignItems: "flex-end", flexShrink: 0 };
const fullPageMicStyle = (isListening) => ({ width: "44px", height: "44px", borderRadius: "22px", background: isListening ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)", border: isListening ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" });
const fullPageTextareaStyle = { flex: 1, padding: "12px 16px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", color: "white", fontSize: "14px", resize: "none", fontFamily: "inherit", minHeight: "48px", maxHeight: "120px" };
const fullPageSendStyle = { width: "44px", height: "44px", borderRadius: "22px", background: "linear-gradient(135deg, #ef4444, #dc2626)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

const widgetContainerStyle = {
  position: "fixed", bottom: "20px", right: "20px", width: "380px", height: "550px",
  background: "linear-gradient(135deg, #1a1a2e, #16213e)", borderRadius: "20px",
  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", zIndex: 10000,
  display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)"
};

const widgetHeaderStyle = { padding: "14px 16px", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 };
const widgetHeaderLeftStyle = { display: "flex", alignItems: "center", gap: "10px" };
const widgetLogoStyle = { width: "32px", height: "32px", borderRadius: "50%", background: "white", padding: "5px", objectFit: "contain" };
const widgetTitleStyle = { margin: 0, color: "white", fontSize: "14px", fontWeight: "600" };
const widgetStatusStyle = { margin: 0, color: "#ef4444", fontSize: "10px" };
const widgetHeaderActionsStyle = { display: "flex", gap: "6px" };
const iconButtonStyle = { width: "28px", height: "28px", borderRadius: "14px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

const widgetMessagesStyle = { flex: 1, overflowY: "auto", padding: "16px" };
const widgetInputStyle = { padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "8px", alignItems: "flex-end", flexShrink: 0 };
const widgetMicStyle = (isListening) => ({ width: "32px", height: "32px", borderRadius: "16px", background: isListening ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)", border: isListening ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" });
const widgetTextareaStyle = { flex: 1, padding: "8px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", color: "white", fontSize: "12px", resize: "none", fontFamily: "inherit", minHeight: "34px", maxHeight: "80px" };
const widgetSendStyle = { width: "32px", height: "32px", borderRadius: "16px", background: "linear-gradient(135deg, #ef4444, #dc2626)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

const widgetSuggestionsStyle = { padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexWrap: "wrap", gap: "6px", flexShrink: 0 };
const suggestionBtnStyle = { padding: "4px 10px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "16px", color: "#fca5a5", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" };

// Add CSS animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes typingWave {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    30% {
      transform: translateY(-10px);
      opacity: 1;
    }
  }
`;
if (!document.querySelector("#ai-typing-animation")) {
  styleSheet.id = "ai-typing-animation";
  document.head.appendChild(styleSheet);
}