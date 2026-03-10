// frontend/src/pages/Chat.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import BASE_URL from "../api";
import backgroundImg from "../assets/background.webp";

function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showOnlineList, setShowOnlineList] = useState(false);
  
  // Chat input states
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [showMediaPreview, setShowMediaPreview] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // Check authentication
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const userData = JSON.parse(localStorage.getItem("user"));
    setUser(userData);
  }, [token, navigate]);

  // Show notification
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
  };

  // Parse attachments
  const parseAttachments = (attachments) => {
    if (!attachments) return [];
    try {
      if (Array.isArray(attachments)) return attachments;
      if (typeof attachments === 'string') {
        const parsed = JSON.parse(attachments);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
      return [];
    } catch (e) {
      console.error("Error parsing attachments:", e);
      return [];
    }
  };

  // Fetch messages with scroll position preservation
  const fetchMessages = async () => {
    try {
      const container = chatContainerRef.current;
      const scrollPosition = container?.scrollTop || 0;
      const scrollHeight = container?.scrollHeight || 0;
      const clientHeight = container?.clientHeight || 0;
      const wasNearBottom = scrollHeight - scrollPosition - clientHeight < 50;
      
      const response = await axios.get(`${BASE_URL}/api/chat`, { headers });
      
      const parsedMessages = response.data.map(msg => ({
        ...msg,
        attachments: parseAttachments(msg.attachments),
        isOwn: msg.userId === user?.id
      }));
      
      setMessages(parsedMessages);
      
      // Restore scroll position - WhatsApp logic
      setTimeout(() => {
        if (container) {
          if (wasNearBottom) {
            container.scrollTop = container.scrollHeight;
          } else {
            container.scrollTop = scrollPosition;
          }
        }
      }, 0);
      
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch online users
  const fetchOnlineCount = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/chat/online`, { headers });
      setOnlineUsers(response.data);
      setOnlineCount(response.data.length);
    } catch (err) {
      console.error("Error fetching online users:", err);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchMessages();
      fetchOnlineCount();
    }

    refreshTimerRef.current = setInterval(() => {
      if (user) {
        fetchMessages();
        fetchOnlineCount();
      }
    }, 3000);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [user]);

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  // Remove file from selection
  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload file
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("files", file);
    
    const uploadId = Date.now().toString();
    setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));

    try {
      const response = await axios.post(`${BASE_URL}/api/chat/upload`, formData, {
        headers: {
          ...headers,
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => ({ ...prev, [uploadId]: percentCompleted }));
        },
      });

      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[uploadId];
        return newProgress;
      });

      return response.data[0];
    } catch (error) {
      console.error("Upload failed:", error);
      showNotification("Failed to upload file", "error");
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[uploadId];
        return newProgress;
      });
      return null;
    }
  };

  // Send message - FIXED to work with updated backend
  const handleSendMessage = async () => {
    if (selectedFiles.length === 0 && !newMessage.trim()) return;
    if (sending) return;

    setSending(true);

    try {
      const attachments = [];
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const uploaded = await uploadFile(selectedFiles[i]);
          if (uploaded) {
            attachments.push(uploaded);
          }
        }
      }

      const payload = {
        content: newMessage.trim() || "",
        replyToId: replyTo?.id,
        attachments: attachments.length > 0 ? attachments : undefined
      };

      console.log("Sending payload:", payload);

      const response = await axios.post(`${BASE_URL}/api/chat`, payload, { headers });
      
      const newMsg = {
        ...response.data,
        attachments: parseAttachments(response.data.attachments),
        isOwn: true,
        user: {
          ...response.data.user,
          fullName: "You"
        }
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage("");
      setReplyTo(null);
      setSelectedFiles([]);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Auto-scroll to new message
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);

      showNotification("Message sent", "success");
    } catch (error) {
      console.error("Failed to send message:", error);
      showNotification(error.response?.data?.error || "Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  // Handle typing
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format time
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const diffHours = diff / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(msg => {
      const date = new Date(msg.createdAt).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  // Get file preview
  const getFilePreview = (file) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const messageGroups = groupMessagesByDate();

  if (loading) {
    return (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.spinner} />
        <p style={loadingStyles.text}>Loading chat...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            style={{
              ...styles.notification,
              ...(notification.type === "success" ? styles.notificationSuccess : styles.notificationError),
            }}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Preview Modal */}
      <AnimatePresence>
        {showMediaPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => setShowMediaPreview(null)}
          >
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <img src={showMediaPreview} alt="preview" style={styles.modalImage} />
              <button style={styles.modalClose} onClick={() => setShowMediaPreview(null)}>×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backButton} onClick={() => navigate(-1)}>
            ←
          </button>
          <div style={styles.headerInfo}>
            <h1 style={styles.headerTitle}>ZUCA Community</h1>
            <div style={styles.headerStatus} onClick={() => setShowOnlineList(!showOnlineList)}>
              <span style={styles.onlineDot}></span>
              <span style={styles.onlineText}>{onlineCount} online</span>
            </div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.headerIcon} onClick={() => setShowOnlineList(!showOnlineList)}>
            👥
          </button>
        </div>
      </div>

      {/* Online Users Dropdown */}
      <AnimatePresence>
        {showOnlineList && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={styles.onlineDropdown}
          >
            <div style={styles.onlineDropdownHeader}>
              <h3>Online Members</h3>
              <button onClick={() => setShowOnlineList(false)}>×</button>
            </div>
            <div style={styles.onlineList}>
              {onlineUsers.length === 0 ? (
                <p style={styles.noOnline}>No one online</p>
              ) : (
                onlineUsers.map(u => (
                  <div key={u.id} style={styles.onlineItem}>
                    <div style={styles.onlineItemAvatar}>
                      {u.fullName?.charAt(0).toUpperCase()}
                      <span style={styles.onlineItemDot}></span>
                    </div>
                    <span style={styles.onlineItemName}>{u.fullName}</span>
                    {u.role === 'admin' && <span style={styles.adminChip}>Admin</span>}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area - ONLY THIS SCROLLS */}
      <div style={styles.messagesWrapper}>
        <div style={styles.messagesContainer} ref={chatContainerRef}>
          {messages.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>💬</div>
              <h3>Welcome to ZUCA Chat</h3>
              <p>Send a message to start the conversation</p>
            </div>
          ) : (
            Object.entries(messageGroups).map(([date, msgs]) => (
              <div key={date}>
                <div style={styles.dateHeader}>
                  <span style={styles.dateText}>{date}</span>
                </div>

                {msgs.map((msg) => {
                  const isOwn = msg.userId === user?.id;
                  const isAdmin = msg.user?.role === "admin" || msg.user?.role === "ADMIN";
                  const attachments = msg.attachments || [];

                  return (
                    <div
                      key={msg.id}
                      style={{
                        ...styles.messageRow,
                        ...(isOwn ? styles.messageRowOwn : {}),
                      }}
                    >
                      {/* Avatar for others */}
                      {!isOwn && (
                        <div style={styles.messageAvatar}>
                          {msg.user?.fullName?.charAt(0).toUpperCase()}
                          {isAdmin && <span style={styles.adminCrown}>👑</span>}
                        </div>
                      )}

                      <div style={{
                        ...styles.messageBubbleWrapper,
                        ...(isOwn ? styles.messageBubbleWrapperOwn : {}),
                      }}>
                        {/* Sender name */}
                        {!isOwn && (
                          <span style={styles.messageSenderName}>
                            {msg.user?.fullName}
                          </span>
                        )}
                        {isOwn && (
                          <span style={{...styles.messageSenderName, textAlign: 'right', color: '#00a884'}}>
                            You
                          </span>
                        )}

                        {/* Reply indicator */}
                        {msg.replyTo && (
                          <div style={styles.replyPreview}>
                            <span style={styles.replyIcon}>↪️</span>
                            <span style={styles.replyText}>
                              {msg.replyTo.user?.fullName}: {msg.replyTo.content?.substring(0, 30)}
                            </span>
                          </div>
                        )}

                        {/* Message bubble */}
                        <div style={{
                          ...styles.messageBubble,
                          ...(isOwn ? styles.messageBubbleOwn : {}),
                        }}>
                          {/* Text content */}
                          {msg.content && (
                            <p style={styles.messageText}>{msg.content}</p>
                          )}

                          {/* Attachments - FIXED to show images properly */}
                          {attachments.length > 0 && (
                            <div style={styles.attachments}>
                              {attachments.map((att, i) => {
                                const imageUrl = att.url || att;
                                const isImage = att.type?.startsWith('image/') || 
                                               att.mimetype?.startsWith('image/') ||
                                               /\.(jpg|jpeg|png|gif|webp)$/i.test(imageUrl);
                                
                                return isImage ? (
                                  <div 
                                    key={i} 
                                    style={styles.imageWrapper}
                                    onClick={() => setShowMediaPreview(imageUrl)}
                                  >
                                    <img 
                                      src={imageUrl} 
                                      alt="attachment" 
                                      style={styles.attachmentImage}
                                      onError={(e) => {
                                        console.error("Image failed to load:", imageUrl);
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <a
                                    key={i}
                                    href={imageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={styles.fileAttachment}
                                  >
                                    <span style={styles.fileIcon}>📎</span>
                                    <span style={styles.fileName}>{att.name || 'File'}</span>
                                  </a>
                                );
                              })}
                            </div>
                          )}

                          {/* Time */}
                          <div style={styles.messageFooter}>
                            <span style={styles.messageTime}>
                              {formatMessageTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Reply button */}
                        <button 
                          style={styles.replyButton}
                          onClick={() => setReplyTo(msg)}
                        >
                          ↩️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* File Previews */}
      {selectedFiles.length > 0 && (
        <div style={styles.previewContainer}>
          <div style={styles.previewScroller}>
            {selectedFiles.map((file, index) => {
              const preview = getFilePreview(file);
              return (
                <div key={index} style={styles.previewItem}>
                  {preview ? (
                    <img src={preview} alt="preview" style={styles.previewImage} />
                  ) : (
                    <div style={styles.previewIcon}>📎</div>
                  )}
                  <button style={styles.previewRemove} onClick={() => removeFile(index)}>×</button>
                  <div style={styles.previewName}>{file.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reply Bar */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            style={styles.replyBar}
          >
            <div style={styles.replyBarContent}>
              <span style={styles.replyBarLabel}>
                Replying to {replyTo.user?.fullName}
              </span>
              <span style={styles.replyBarText}>
                {replyTo.content || (replyTo.attachments?.length > 0 ? '📎 Attachment' : '')}
              </span>
            </div>
            <button style={styles.replyBarClose} onClick={() => setReplyTo(null)}>×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area - Fixed at bottom */}
      <div style={styles.inputWrapper}>
        <div style={styles.inputContainer}>
          <button style={styles.attachButton} onClick={() => fileInputRef.current?.click()}>
            📎
          </button>
          
          <button style={styles.emojiButton} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
            😊
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />

          <textarea
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            placeholder="Type a message"
            style={styles.messageInput}
            rows="1"
          />

          <button
            onClick={handleSendMessage}
            disabled={sending || (selectedFiles.length === 0 && !newMessage.trim())}
            style={{
              ...styles.sendButton,
              ...((sending || (selectedFiles.length === 0 && !newMessage.trim())) && styles.sendButtonDisabled),
            }}
          >
            {sending ? "..." : "Send"}
          </button>
        </div>

        {/* Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              style={styles.emojiPicker}
            >
              {["😊", "😂", "❤️", "👍", "🙏", "🎉", "🔥", "✨", "💯", "👏", "🥳", "😢", "😍", "🤔", "👀"].map(emoji => (
                <button
                  key={emoji}
                  style={styles.emoji}
                  onClick={() => {
                    setNewMessage(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Progress */}
      {Object.entries(uploadProgress).map(([id, progress]) => (
        <div key={id} style={styles.progressOverlay}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            <span style={styles.progressText}>{progress}%</span>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .message-row:hover .reply-button {
          opacity: 1 !important;
        }
        
        .attach-button:hover, .emoji-button:hover {
          background: #2a3942 !important;
          color: #fff !important;
        }
        
        .emoji:hover {
          transform: scale(1.1);
          background: #374248 !important;
        }
        
        .send-button:hover:not(:disabled) {
          background: #008f72 !important;
        }
        
        @media (max-width: 768px) {
          .message-bubble-wrapper {
            max-width: 85%;
          }
        }
      `}</style>
    </div>
  );
}

// WhatsApp-like Styles - PERFECT PHONE LAYOUT
const styles = {
  container: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#0b141a",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#fff",
  },
  notification: {
    position: "fixed",
    top: "60px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "10px 20px",
    borderRadius: "30px",
    zIndex: 2000,
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  },
  notificationSuccess: {
    background: "#00a884",
  },
  notificationError: {
    background: "#ea0038",
  },
  // Header - Fixed at top
  header: {
    padding: "8px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#202c33",
    borderBottom: "1px solid #2a3942",
    height: "60px",
    flexShrink: 0,
    width: "100%",
    boxSizing: "border-box",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: 1,
    minWidth: 0,
  },
  backButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    flexShrink: 0,
  },
  headerInfo: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: "16px",
    fontWeight: "600",
    margin: 0,
    color: "#fff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  headerStatus: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    cursor: "pointer",
  },
  onlineDot: {
    width: "8px",
    height: "8px",
    background: "#00a884",
    borderRadius: "50%",
    animation: "pulse 2s infinite",
  },
  onlineText: {
    fontSize: "13px",
    color: "#8696a0",
  },
  headerRight: {
    display: "flex",
    gap: "8px",
    flexShrink: 0,
  },
  headerIcon: {
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    flexShrink: 0,
  },
  // Online Users Dropdown
  onlineDropdown: {
    position: "absolute",
    top: "68px",
    right: "16px",
    width: "280px",
    background: "#202c33",
    borderRadius: "12px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
    border: "1px solid #2a3942",
    zIndex: 100,
    overflow: "hidden",
  },
  onlineDropdownHeader: {
    padding: "16px",
    borderBottom: "1px solid #2a3942",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    "& h3": {
      fontSize: "16px",
      fontWeight: "600",
      margin: 0,
      color: "#fff",
    },
    "& button": {
      background: "none",
      border: "none",
      fontSize: "18px",
      cursor: "pointer",
      padding: "4px 8px",
      color: "#8696a0",
    },
  },
  onlineList: {
    maxHeight: "300px",
    overflowY: "auto",
    padding: "8px",
  },
  onlineItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 12px",
    borderRadius: "8px",
    "&:hover": {
      background: "#2a3942",
    },
  },
  onlineItemAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#00a884",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "600",
    color: "#fff",
    position: "relative",
    flexShrink: 0,
  },
  onlineItemDot: {
    position: "absolute",
    bottom: "0",
    right: "0",
    width: "10px",
    height: "10px",
    background: "#00a884",
    borderRadius: "50%",
    border: "2px solid #202c33",
  },
  onlineItemName: {
    flex: 1,
    fontSize: "14px",
    fontWeight: "500",
    color: "#fff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  adminChip: {
    fontSize: "11px",
    background: "rgba(255,215,0,0.2)",
    color: "#ffd700",
    padding: "2px 8px",
    borderRadius: "12px",
    flexShrink: 0,
  },
  noOnline: {
    textAlign: "center",
    color: "#8696a0",
    padding: "20px",
    fontSize: "14px",
  },
  // Messages Wrapper - Takes remaining height
  messagesWrapper: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  messagesContainer: {
    height: "100%",
    width: "100%",
    overflowY: "auto",
    padding: "12px",
    boxSizing: "border-box",
    background: `url(${backgroundImg}) no-repeat center center`,
    backgroundSize: "cover",
  },
  emptyState: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "20px",
    color: "#8696a0",
    background: "rgba(11, 20, 26, 0.7)",
    borderRadius: "12px",
  },
  emptyIcon: {
    fontSize: "64px",
    marginBottom: "16px",
    opacity: 0.7,
  },
  dateHeader: {
    display: "flex",
    justifyContent: "center",
    margin: "16px 0",
  },
  dateText: {
    background: "#202c33",
    padding: "6px 16px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#d1d7db",
    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  },
  messageRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "12px",
    position: "relative",
    width: "100%",
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  messageAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#00a884",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "600",
    color: "#fff",
    flexShrink: 0,
    position: "relative",
  },
  adminCrown: {
    position: "absolute",
    top: "-4px",
    right: "-4px",
    fontSize: "10px",
  },
  messageBubbleWrapper: {
    maxWidth: "75%",
    position: "relative",
  },
  messageBubbleWrapperOwn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  messageSenderName: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#00a884",
    marginBottom: "2px",
    marginLeft: "4px",
    display: "block",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "200px",
  },
  replyPreview: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    color: "#8696a0",
    marginBottom: "2px",
    marginLeft: "4px",
    background: "#2a3942",
    padding: "4px 8px",
    borderRadius: "8px",
    maxWidth: "200px",
  },
  replyIcon: {
    fontSize: "10px",
  },
  replyText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  messageBubble: {
    background: "#202c33",
    borderRadius: "12px",
    padding: "8px 12px",
    position: "relative",
    wordWrap: "break-word",
    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  },
  messageBubbleOwn: {
    background: "#005d4b",
  },
  messageText: {
    fontSize: "14px",
    lineHeight: "1.5",
    margin: "0 0 4px 0",
    color: "#fff",
    wordBreak: "break-word",
  },
  attachments: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "4px",
  },
  imageWrapper: {
    maxWidth: "200px",
    cursor: "pointer",
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  attachmentImage: {
    width: "100%",
    height: "auto",
    maxHeight: "150px",
    objectFit: "cover",
    display: "block",
  },
  fileAttachment: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    background: "#2a3942",
    borderRadius: "8px",
    color: "#fff",
    textDecoration: "none",
    fontSize: "13px",
    maxWidth: "200px",
  },
  fileIcon: {
    fontSize: "16px",
  },
  fileName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  messageFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: "4px",
  },
  messageTime: {
    fontSize: "10px",
    color: "rgba(255,255,255,0.6)",
  },
  replyButton: {
    position: "absolute",
    bottom: "0",
    right: "-30px",
    background: "none",
    border: "none",
    fontSize: "16px",
    cursor: "pointer",
    padding: "4px",
    opacity: 0,
    transition: "opacity 0.2s",
    color: "#8696a0",
  },
  // Preview Container
  previewContainer: {
    background: "#202c33",
    borderTop: "1px solid #2a3942",
    padding: "12px",
    overflowX: "auto",
    width: "100%",
    boxSizing: "border-box",
  },
  previewScroller: {
    display: "flex",
    gap: "12px",
  },
  previewItem: {
    position: "relative",
    width: "70px",
    height: "70px",
    borderRadius: "8px",
    overflow: "hidden",
    flexShrink: 0,
    background: "#2a3942",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  previewIcon: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    background: "#374248",
    color: "#fff",
  },
  previewRemove: {
    position: "absolute",
    top: "2px",
    right: "2px",
    width: "20px",
    height: "20px",
    borderRadius: "10px",
    background: "#ff4d6d",
    color: "#fff",
    border: "none",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  previewName: {
    position: "absolute",
    bottom: "0",
    left: "0",
    right: "0",
    background: "rgba(0,0,0,0.7)",
    color: "#fff",
    fontSize: "9px",
    padding: "2px 4px",
    textAlign: "center",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  // Reply Bar
  replyBar: {
    background: "#202c33",
    borderTop: "1px solid #2a3942",
    padding: "8px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    boxSizing: "border-box",
  },
  replyBarContent: {
    flex: 1,
    minWidth: 0,
  },
  replyBarLabel: {
    fontSize: "11px",
    color: "#00a884",
    display: "block",
    marginBottom: "2px",
    fontWeight: "500",
  },
  replyBarText: {
    fontSize: "12px",
    color: "#8696a0",
    fontStyle: "italic",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "block",
  },
  replyBarClose: {
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    padding: "4px 8px",
    color: "#fff",
    flexShrink: 0,
  },
  // Input Area - Fixed at bottom
  inputWrapper: {
    background: "#202c33",
    borderTop: "1px solid #2a3942",
    padding: "8px 12px",
    position: "relative",
    flexShrink: 0,
    width: "100%",
    boxSizing: "border-box",
  },
  inputContainer: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    width: "100%",
  },
  attachButton: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "none",
    background: "transparent",
    color: "#8696a0",
    fontSize: "22px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emojiButton: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "none",
    background: "transparent",
    color: "#8696a0",
    fontSize: "22px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emojiPicker: {
    position: "absolute",
    bottom: "70px",
    left: "12px",
    background: "#202c33",
    borderRadius: "12px",
    padding: "12px",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
    border: "1px solid #2a3942",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    zIndex: 100,
    maxWidth: "calc(100% - 24px)",
  },
  emoji: {
    width: "40px",
    height: "40px",
    borderRadius: "8px",
    border: "none",
    background: "#2a3942",
    color: "#fff",
    fontSize: "20px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  messageInput: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: "24px",
    border: "1px solid #2a3942",
    background: "#2a3942",
    color: "#fff",
    fontSize: "15px",
    minHeight: "20px",
    maxHeight: "100px",
    fontFamily: "inherit",
    minWidth: 0,
    "::placeholder": {
      color: "#8696a0",
    },
    "&:focus": {
      outline: "none",
      borderColor: "#00a884",
    },
  },
  sendButton: {
    padding: "0 16px",
    height: "40px",
    borderRadius: "24px",
    border: "none",
    background: "#00a884",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  sendButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  progressOverlay: {
    position: "absolute",
    bottom: "80px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 100,
  },
  progressBar: {
    width: "200px",
    height: "40px",
    background: "#202c33",
    borderRadius: "20px",
    overflow: "hidden",
    border: "1px solid #2a3942",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    background: "#00a884",
    transition: "width 0.3s ease",
  },
  progressText: {
    position: "relative",
    color: "#fff",
    fontSize: "12px",
    fontWeight: "600",
    zIndex: 1,
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: "20px",
  },
  modalContent: {
    position: "relative",
    maxWidth: "90vw",
    maxHeight: "90vh",
  },
  modalImage: {
    maxWidth: "100%",
    maxHeight: "90vh",
    objectFit: "contain",
    borderRadius: "8px",
  },
  modalClose: {
    position: "absolute",
    top: "-40px",
    right: "0",
    width: "40px",
    height: "40px",
    borderRadius: "20px",
    border: "none",
    background: "#ea0038",
    color: "#fff",
    fontSize: "24px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

const loadingStyles = {
  container: {
    height: "100vh",
    width: "100vw",
    background: "#0b141a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #2a3942",
    borderTopColor: "#00a884",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px",
  },
  text: {
    color: "#fff",
    fontSize: "16px",
  },
};

export default Chat;