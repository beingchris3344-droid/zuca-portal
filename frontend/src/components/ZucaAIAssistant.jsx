// frontend/src/components/ZucaAIAssistant.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import BASE_URL from "../api";
import logoImg from "../assets/zuca-logo.png";
import { 
  FiSend, FiX, FiMinimize2, FiMaximize2, 
  FiTrash, FiMic, FiMicOff, FiCopy, FiCheck
} from "react-icons/fi";

export default function ZucaAIAssistant({ user, onClose, isOpen, isFullPage, onBack }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const lastRequestTime = useRef(0);

  // Welcome message when component mounts
  useEffect(() => {
    setMessages([{
      id: Date.now(),
      role: "assistant",
      content: `Tumsifu Yesu Kristu! 🙏\n\nHello ${user?.fullName?.split(" ")[0] || "there"}! I'm your ZUCA AI Assistant.\n\nWhat would you like to do today?\n\n• Check my pledges\n• Find a hymn\n• Send a message to chat\n• Ask me anything!`,
      timestamp: new Date()
    }]);
  }, [user]);

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

  // Send message to AI
  const sendMessage = async () => {
    if (!input.trim()) return;
    if (loading) return;
    
    // Rate limit: prevent more than 1 request per 2 seconds
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
    
    // Add user message to chat
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: "user",
      content: userMessage,
      timestamp: new Date()
    }]);
    setInput("");
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
      
      // Add AI response to chat
      let aiResponse = response.data.response;
      // Remove any markdown asterisks
      aiResponse = aiResponse.replace(/\*\*/g, '');
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        content: aiResponse,
        timestamp: new Date()
      }]);
      
    } catch (err) {
      console.error("AI error:", err);
      
      let errorMessage = "Sorry, I'm having trouble right now. Please try again in a moment. Tumsifu Yesu Kristu! 🙏";
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = "The request took too long. Please try again. 🙏";
      } else if (err.response?.status === 429) {
        errorMessage = "Too many requests. Please wait a moment and try again. 🙏";
      } else if (err.response?.status === 401) {
        errorMessage = "Your session expired. Please refresh the page. 🙏";
      }
      
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: "assistant",
        content: errorMessage,
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
      content: `Chat cleared! 👋 Hello again! I'm still here for you. What would you like to do? Tumsifu Yesu Kristu! 🙏`,
      timestamp: new Date()
    }]);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Format message content (remove markdown)
  const formatContent = (content) => {
    // Remove any ** markdown
    let cleanContent = content.replace(/\*\*/g, '');
    
    return cleanContent.split('\n').map((line, i) => (
      <div key={i}>{line || <br />}</div>
    ));
  };

  // Full page mode
  if (isFullPage) {
    return (
      <div style={fullPageContainerStyle}>
        <div style={fullPageHeaderStyle}>
          <button onClick={onBack} style={backButtonStyle}>← Back to Dashboard</button>
          <div style={fullPageTitleStyle}>
            <img src={logoImg} alt="ZUCA" style={fullPageLogoStyle} />
            <h2 style={{ margin: 0, color: "white" }}>ZUCA AI Assistant</h2>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>
        
        <div style={fullPageMessagesStyle}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ 
              display: "flex", gap: "12px", 
              flexDirection: msg.role === "user" ? "row-reverse" : "row", 
              alignItems: "flex-start", marginBottom: "16px" 
            }}>
              <div style={{ 
                width: "40px", height: "40px", borderRadius: "50%", 
                background: msg.role === "user" 
                  ? "linear-gradient(135deg, #10b981, #059669)" 
                  : "linear-gradient(135deg, #8b5cf6, #6366f1)", 
                display: "flex", alignItems: "center", justifyContent: "center", 
                fontSize: "18px", flexShrink: 0 
              }}>
                {msg.role === "user" ? "👤" : 
                  <img src={logoImg} alt="ZUCA" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "contain" }} />
                }
              </div>
              <div style={{ 
                maxWidth: "70%", padding: "12px 18px", borderRadius: "20px", 
                background: msg.role === "user" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.08)", 
                color: "rgba(255,255,255,0.9)", fontSize: "15px", lineHeight: "1.5", 
                position: "relative" 
              }}>
                <div style={{ whiteSpace: "pre-wrap" }}>{formatContent(msg.content)}</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "8px" }}>
                  {formatTime(msg.timestamp)}
                </div>
                <button 
                  onClick={() => copyToClipboard(msg.content, msg.id)} 
                  style={{ position: "absolute", bottom: "8px", right: "12px", 
                    background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", 
                    cursor: "pointer" }}
                >
                  {copiedId === msg.id ? <FiCheck size={12} /> : <FiCopy size={12} />}
                </button>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", 
                background: "linear-gradient(135deg, #8b5cf6, #6366f1)", 
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={logoImg} alt="ZUCA" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "contain" }} />
              </div>
              <div style={{ padding: "12px 18px", borderRadius: "20px", background: "rgba(255,255,255,0.08)", display: "flex", gap: "6px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.5)", animation: "typing 1.4s infinite ease-in-out" }}></div>
                <div style={{ width: "8px", height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.5)", animation: "typing 1.4s infinite ease-in-out", animationDelay: "0.2s" }}></div>
                <div style={{ width: "8px", height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.5)", animation: "typing 1.4s infinite ease-in-out", animationDelay: "0.4s" }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={fullPageInputStyle}>
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
            placeholder="Ask me anything... (Example: What do I owe? Find Amazing Grace)" 
            style={fullPageTextareaStyle}
            rows={1}
          />
          <button 
            onClick={sendMessage} 
            disabled={loading || !input.trim()} 
            style={fullPageSendStyle}
          >
            <FiSend size={20} />
          </button>
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
          <button onClick={() => window.dispatchEvent(new CustomEvent('openAIFullPage'))} style={iconButtonStyle} title="Expand">
            <FiMaximize2 size={14} />
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
          <div key={msg.id} style={{ display: "flex", gap: "10px", flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-start", marginBottom: "12px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: msg.role === "user" ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #8b5cf6, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
              {msg.role === "user" ? "👤" : <img src={logoImg} alt="ZUCA" style={{ width: "26px", height: "26px", borderRadius: "50%", objectFit: "contain" }} />}
            </div>
            <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: "16px", background: msg.role === "user" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.9)", fontSize: "13px", lineHeight: "1.5" }}>
              <div style={{ whiteSpace: "pre-wrap" }}>{formatContent(msg.content)}</div>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", marginTop: "4px", textAlign: "right" }}>{formatTime(msg.timestamp)}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={logoImg} alt="ZUCA" style={{ width: "26px", height: "26px", borderRadius: "50%", objectFit: "contain" }} />
            </div>
            <div style={{ padding: "10px 14px", borderRadius: "16px", background: "rgba(255,255,255,0.08)", display: "flex", gap: "5px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.5)", animation: "typing 1.4s infinite ease-in-out" }}></div>
              <div style={{ width: "6px", height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.5)", animation: "typing 1.4s infinite ease-in-out", animationDelay: "0.2s" }}></div>
              <div style={{ width: "6px", height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.5)", animation: "typing 1.4s infinite ease-in-out", animationDelay: "0.4s" }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={widgetInputStyle}>
        <button onClick={isListening ? stopVoiceInput : startVoiceInput} style={widgetMicStyle(isListening)}>
          {isListening ? <FiMicOff size={14} /> : <FiMic size={14} />}
        </button>
        <textarea 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyPress={handleKeyPress} 
          placeholder="Ask me anything..." 
          style={widgetTextareaStyle}
          rows={1}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()} style={widgetSendStyle}>
          <FiSend size={14} />
        </button>
      </div>

      <div style={widgetSuggestionsStyle}>
        <button onClick={() => setInput("What do I owe?")} style={suggestionBtnStyle}>💰 My pledges</button>
        <button onClick={() => setInput("Find Amazing Grace")} style={suggestionBtnStyle}>🎵 Find hymn</button>
        <button onClick={() => setInput("Tell everyone mass is at 10am tomorrow")} style={suggestionBtnStyle}>💬 Send to chat</button>
        <button onClick={() => setInput("Who am I?")} style={suggestionBtnStyle}>👤 My profile</button>
        <button onClick={() => setInput("I want to give 5000")} style={suggestionBtnStyle}>💸 Make pledge</button>
        <button onClick={() => setInput("What campaigns are available?")} style={suggestionBtnStyle}>📋 Campaigns</button>
      </div>
    </div>
  );
}

// ==================== STYLES ====================
const fullPageContainerStyle = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
  background: "linear-gradient(135deg, #1a1a2e, #16213e)", zIndex: 20000,
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
const closeButtonStyle = { width: "40px", height: "40px", borderRadius: "20px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", fontSize: "18px" };
const fullPageMessagesStyle = { flex: 1, overflowY: "auto", padding: "24px" };
const fullPageInputStyle = { padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "12px", alignItems: "flex-end", flexShrink: 0 };
const fullPageMicStyle = (isListening) => ({ width: "44px", height: "44px", borderRadius: "22px", background: isListening ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)", border: isListening ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" });
const fullPageTextareaStyle = { flex: 1, padding: "12px 16px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", color: "white", fontSize: "14px", resize: "none", fontFamily: "inherit", minHeight: "48px", maxHeight: "120px" };
const fullPageSendStyle = { width: "44px", height: "44px", borderRadius: "22px", background: "linear-gradient(135deg, #8b5cf6, #6366f1)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

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
const widgetStatusStyle = { margin: 0, color: "rgba(255,255,255,0.7)", fontSize: "10px" };
const widgetHeaderActionsStyle = { display: "flex", gap: "6px" };
const iconButtonStyle = { width: "28px", height: "28px", borderRadius: "14px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

const widgetMessagesStyle = { flex: 1, overflowY: "auto", padding: "16px" };
const widgetInputStyle = { padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "8px", alignItems: "flex-end", flexShrink: 0 };
const widgetMicStyle = (isListening) => ({ width: "32px", height: "32px", borderRadius: "16px", background: isListening ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)", border: isListening ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" });
const widgetTextareaStyle = { flex: 1, padding: "8px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", color: "white", fontSize: "12px", resize: "none", fontFamily: "inherit", minHeight: "34px", maxHeight: "80px" };
const widgetSendStyle = { width: "32px", height: "32px", borderRadius: "16px", background: "linear-gradient(135deg, #8b5cf6, #6366f1)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

const widgetSuggestionsStyle = { padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexWrap: "wrap", gap: "6px", flexShrink: 0 };
const suggestionBtnStyle = { padding: "4px 10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", color: "rgba(255,255,255,0.7)", fontSize: "11px", cursor: "pointer" };

// Add CSS animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes typing {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-8px); }
  }
`;
if (!document.querySelector("#ai-typing-animation")) {
  styleSheet.id = "ai-typing-animation";
  document.head.appendChild(styleSheet);
}