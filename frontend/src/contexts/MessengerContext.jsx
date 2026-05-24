// frontend/src/contexts/MessengerContext.jsx
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import BASE_URL, { api } from '../api';
import { io } from 'socket.io-client';

const MessengerContext = createContext();

export const useMessenger = () => useContext(MessengerContext);

export const MessengerProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  
  // ✅ Caching states
  const [messageCache, setMessageCache] = useState({}); // { conversationId: messages[] }
  const [conversationsCache, setConversationsCache] = useState(null); // cached conversations
  const [userCache, setUserCache] = useState(null); // cached user data
  const [isInitialized, setIsInitialized] = useState(false);
  
  const socketRef = useRef(null);

  // ✅ Load cached data from localStorage on mount
  useEffect(() => {
    const loadCachedData = () => {
      try {
        const cachedUser = localStorage.getItem('messenger_user');
        const cachedConversations = localStorage.getItem('messenger_conversations');
        const cachedMessages = localStorage.getItem('messenger_messages_cache');
        
        if (cachedUser) {
          const userData = JSON.parse(cachedUser);
          setUser(userData);
          setUserCache(userData);
          initSocket(userData.id);
        }
        
        if (cachedConversations) {
          const convData = JSON.parse(cachedConversations);
          setConversations(convData);
          setConversationsCache(convData);
        }
        
        if (cachedMessages) {
          setMessageCache(JSON.parse(cachedMessages));
        }
        
        setIsInitialized(true);
      } catch (err) {
        console.error('Error loading cached data:', err);
      }
    };
    
    loadCachedData();
  }, []);

  // ✅ Save conversations to localStorage when they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('messenger_conversations', JSON.stringify(conversations));
      setConversationsCache(conversations);
    }
  }, [conversations]);

  // ✅ Save user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('messenger_user', JSON.stringify(user));
      setUserCache(user);
    }
  }, [user]);

  // ✅ Save message cache to localStorage
  useEffect(() => {
    if (Object.keys(messageCache).length > 0) {
      localStorage.setItem('messenger_messages_cache', JSON.stringify(messageCache));
    }
  }, [messageCache]);

  // Initialize socket connection
  const initSocket = (userId) => {
    if (socketRef.current?.connected) return;
    
    socketRef.current = io(BASE_URL, {
      transports: ['websocket'],
      auth: { userId }
    });

    socketRef.current.on('connect', () => {
      console.log('🔌 Socket connected');
      socketRef.current.emit('dm:join', userId);
    });

    socketRef.current.on('dm:user_online', ({ userId }) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
    });

    socketRef.current.on('dm:user_offline', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    socketRef.current.on('dm:online_users', ({ users }) => {
      setOnlineUsers(users);
    });

    socketRef.current.on('dm:new_message', (message) => {
      // Update cache when new message arrives
      setMessageCache(prev => ({
        ...prev,
        [message.conversationId]: [...(prev[message.conversationId] || []), message]
      }));
      
      // Update messages if this is the active conversation
      setMessages(prev => {
        if (message.conversationId === activeConversation?.id) {
          return [...prev, message];
        }
        return prev;
      });
      
      // Update conversations list (last message)
      setConversations(prev => prev.map(conv => 
        conv.id === message.conversationId 
          ? { ...conv, lastMessage: message.content, lastMessageAt: new Date() }
          : conv
      ));
    });

    socketRef.current.on('dm:typing_start', ({ conversationId, userId }) => {
      if (conversationId === activeConversation?.id) {
        setTypingUsers(prev => ({ ...prev, [userId]: true }));
      }
    });

    socketRef.current.on('dm:typing_stop', ({ conversationId, userId }) => {
      if (conversationId === activeConversation?.id) {
        setTypingUsers(prev => ({ ...prev, [userId]: false }));
      }
    });

    socketRef.current.on('dm:message_read', ({ messageId, conversationId }) => {
      setMessageCache(prev => ({
        ...prev,
        [conversationId]: prev[conversationId]?.map(msg => 
          msg.id === messageId ? { ...msg, isRead: true } : msg
        ) || []
      }));
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isRead: true } : msg
      ));
    });

    socketRef.current.on('dm:message_deleted', ({ messageId, conversationId }) => {
      setMessageCache(prev => ({
        ...prev,
        [conversationId]: prev[conversationId]?.filter(msg => msg.id !== messageId) || []
      }));
      
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    });

    socketRef.current.on('dm:message_edited', (updatedMessage) => {
      setMessageCache(prev => ({
        ...prev,
        [updatedMessage.conversationId]: prev[updatedMessage.conversationId]?.map(msg => 
          msg.id === updatedMessage.id ? updatedMessage : msg
        ) || []
      }));
      
      setMessages(prev => prev.map(msg => 
        msg.id === updatedMessage.id ? updatedMessage : msg
      ));
    });
  };

  // Fetch user data (with cache)
  const fetchUser = async () => {
    // Return cached user if available
    if (userCache) {
      setUser(userCache);
      return userCache;
    }
    
    try {
      const res = await api.get('/api/me');
      setUser(res.data);
      setUserCache(res.data);
      initSocket(res.data.id);
      return res.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  };

  // Fetch conversations (with cache)
  const fetchConversations = async () => {
    // Return cached conversations immediately
    if (conversationsCache) {
      setConversations(conversationsCache);
      setLoading(false);
      // Still fetch in background to update
      fetchConversationsInBackground();
      return conversationsCache;
    }
    
    setLoading(true);
    try {
      const res = await api.get('/api/messenger/conversations');
      const convData = res.data.conversations || [];
      setConversations(convData);
      setConversationsCache(convData);
      localStorage.setItem('messenger_conversations', JSON.stringify(convData));
      return convData;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  // Background fetch for conversations (updates cache silently)
  const fetchConversationsInBackground = async () => {
    try {
      const res = await api.get('/api/messenger/conversations');
      const convData = res.data.conversations || [];
      setConversations(convData);
      setConversationsCache(convData);
      localStorage.setItem('messenger_conversations', JSON.stringify(convData));
    } catch (error) {
      console.error('Background fetch error:', error);
    }
  };

  // Fetch messages for a conversation (with cache)
  const fetchMessages = async (conversationId) => {
    // Return cached messages immediately if available
    if (messageCache[conversationId]) {
      setMessages(messageCache[conversationId]);
      // Still fetch in background to update
      fetchMessagesInBackground(conversationId);
      return messageCache[conversationId];
    }
    
    try {
      const res = await api.get(`/api/messenger/messages/${conversationId}`);
      const newMessages = res.data.messages || [];
      
      // Store in cache
      setMessageCache(prev => ({
        ...prev,
        [conversationId]: newMessages
      }));
      setMessages(newMessages);
      localStorage.setItem('messenger_messages_cache', JSON.stringify(messageCache));
      
      // Mark as read in background
      api.put(`/api/messenger/conversations/${conversationId}/read`).catch(console.error);
      
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ));
      
      return newMessages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };
  
  // Background fetch for messages (updates cache silently)
  const fetchMessagesInBackground = async (conversationId) => {
    try {
      const res = await api.get(`/api/messenger/messages/${conversationId}`);
      const newMessages = res.data.messages || [];
      
      setMessageCache(prev => ({
        ...prev,
        [conversationId]: newMessages
      }));
      localStorage.setItem('messenger_messages_cache', JSON.stringify(messageCache));
      
      // Only update messages if this is the active conversation
      if (activeConversation?.id === conversationId) {
        setMessages(newMessages);
      }
    } catch (error) {
      console.error('Background message fetch error:', error);
    }
  };

  // Send a message
  const sendMessage = async (conversationId, content, files = []) => {
    if (!content && files.length === 0) return null;
    
    try {
      const res = await api.post('/api/messenger/messages', {
        conversationId,
        content,
        files
      });
      
      const newMessage = res.data;
      
      // Update cache
      setMessageCache(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), newMessage]
      }));
      setMessages(prev => [...prev, newMessage]);
      
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId 
          ? { ...conv, lastMessage: content, lastMessageAt: new Date() }
          : conv
      ));
      
      // Save to localStorage
      localStorage.setItem('messenger_messages_cache', JSON.stringify(messageCache));
      localStorage.setItem('messenger_conversations', JSON.stringify(conversations));
      
      socketRef.current?.emit('dm:send_message', {
        conversationId,
        content,
        files,
        tempId: newMessage.id
      });
      
      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  };

  // Start new conversation
  const startConversation = async (userId) => {
    try {
      const res = await api.post(`/api/messenger/conversations/${userId}`);
      const newConversation = res.data.conversation;
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation);
      localStorage.setItem('messenger_conversations', JSON.stringify(conversations));
      return newConversation;
    } catch (error) {
      console.error('Error starting conversation:', error);
      return null;
    }
  };

  // Send typing indicator
  const sendTyping = (conversationId, isTyping) => {
    socketRef.current?.emit(isTyping ? 'dm:typing_start' : 'dm:typing_stop', { conversationId });
  };

  // Mark message as read
  const markAsRead = async (messageId, conversationId) => {
    try {
      await api.put(`/api/messenger/read-receipts/messages/${messageId}`);
      socketRef.current?.emit('dm:mark_read', { messageId, conversationId });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Delete message
  const deleteMessage = async (messageId, conversationId) => {
    try {
      await api.delete(`/api/messenger/messages/${messageId}`);
      
      setMessageCache(prev => ({
        ...prev,
        [conversationId]: prev[conversationId]?.filter(msg => msg.id !== messageId) || []
      }));
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      localStorage.setItem('messenger_messages_cache', JSON.stringify(messageCache));
      
      socketRef.current?.emit('dm:delete_message', { messageId, conversationId });
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  // Add reaction
  const addReaction = async (messageId, reaction, conversationId) => {
    try {
      await api.post(`/api/messenger/reactions/${messageId}`, { reaction });
      socketRef.current?.emit('dm:add_reaction', { messageId, reaction, conversationId });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Search users
  const searchUsers = async (query) => {
    if (query.length < 2) return [];
    try {
      const res = await api.get(`/api/messenger/search/users?q=${query}`);
      return res.data.users || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  };

  // Fetch all users
  const fetchAllUsers = async () => {
    try {
      const res = await api.get('/api/messenger/search/all-users');
      return res.data.users || [];
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  };

  // Upload file
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/api/messenger/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.file;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  // Clear all cache (for logout)
  const clearCache = () => {
    localStorage.removeItem('messenger_user');
    localStorage.removeItem('messenger_conversations');
    localStorage.removeItem('messenger_messages_cache');
    setMessageCache({});
    setConversationsCache(null);
    setUserCache(null);
  };

  const value = {
    user,
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    onlineUsers,
    loading,
    typingUsers,
    darkMode,
    setDarkMode,
    socket: socketRef,
    fetchUser,
    fetchConversations,
    fetchMessages,
    sendMessage,
    startConversation,
    sendTyping,
    markAsRead,
    deleteMessage,
    addReaction,
    searchUsers,
    uploadFile,
    fetchAllUsers,
    clearCache,
    isInitialized,
  };

  return (
    <MessengerContext.Provider value={value}>
      {children}
    </MessengerContext.Provider>
  );
};

export default MessengerProvider;