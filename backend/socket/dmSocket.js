// backend/socket/dmSocket.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Store online users and their socket IDs
const onlineUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId
const typingUsers = new Map(); // conversationId -> Set of userIds

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 New socket connected:', socket.id);

    // ==================== USER AUTH & ONLINE STATUS ====================
    
    // User joins with their userId
    socket.on('dm:join', async (userId) => {
      if (!userId) return;
      
      // Store mappings
      onlineUsers.set(userId, socket.id);
      userSockets.set(socket.id, userId);
      
      // Join user to their personal room
      socket.join(`user:${userId}`);
      
      // Update user's online status in database
      await prisma.user.update({
        where: { id: userId },
        data: { lastActive: new Date() }
      });
      
      console.log(`✅ User ${userId} joined DM system`);
      
      // Broadcast online status to all connected users
      io.emit('dm:user_online', { userId, online: true });
      
      // Send list of online users to the new user
      const onlineUsersList = Array.from(onlineUsers.keys());
      socket.emit('dm:online_users', { users: onlineUsersList });
    });
    
    // Handle user disconnect
    socket.on('disconnect', async () => {
      const userId = userSockets.get(socket.id);
      if (userId) {
        onlineUsers.delete(userId);
        userSockets.delete(socket.id);
        
        // Remove from typing statuses
        for (const [convId, users] of typingUsers.entries()) {
          if (users.has(userId)) {
            users.delete(userId);
            io.to(`conversation:${convId}`).emit('dm:typing_stop', { 
              conversationId: convId, 
              userId 
            });
          }
        }
        
        console.log(`🔴 User ${userId} disconnected`);
        io.emit('dm:user_offline', { userId, online: false });
      }
    });
    
    // ==================== REAL-TIME MESSAGES ====================
    
    // Send new message
    socket.on('dm:send_message', async (data) => {
      try {
        const { conversationId, content, files, replyToId, tempId } = data;
        const userId = userSockets.get(socket.id);
        
        if (!userId) {
          socket.emit('dm:error', { error: 'Not authenticated' });
          return;
        }
        
        // Verify user is in conversation
        const conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [
              { participant1Id: userId },
              { participant2Id: userId }
            ]
          }
        });
        
        if (!conversation) {
          socket.emit('dm:error', { error: 'Access denied' });
          return;
        }
        
        // Create message in database
        const message = await prisma.directMessage.create({
          data: {
            content: content || null,
            senderId: userId,
            conversationId: conversationId,
            replyToId: replyToId || null
          },
          include: {
            sender: {
              select: { id: true, fullName: true, profileImage: true, role: true }
            },
            files: true
          }
        });
        
        // If files were uploaded, link them to message
        if (files && files.length > 0) {
          for (const file of files) {
            await prisma.directMessageFile.create({
              data: {
                name: file.name,
                type: file.type,
                size: file.size,
                data: file.url,
                thumbnail: file.thumbnail,
                userId: userId,
                messageId: message.id
              }
            });
          }
          // Fetch message with files
          const updatedMessage = await prisma.directMessage.findUnique({
            where: { id: message.id },
            include: {
              sender: { select: { id: true, fullName: true, profileImage: true, role: true } },
              files: true
            }
          });
          Object.assign(message, updatedMessage);
        }
        
        // Update conversation last message
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessage: content?.substring(0, 100) || "📎 File attached",
            lastMessageAt: new Date(),
            lastMessageBy: userId
          }
        });
        
        // Get recipient ID
        const recipientId = conversation.participant1Id === userId 
          ? conversation.participant2Id 
          : conversation.participant1Id;
        
        // Increment unread count for recipient
        const isSenderParticipant1 = conversation.participant1Id === userId;
        const unreadField = isSenderParticipant1 ? 'unreadCount2' : 'unreadCount1';
        
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { [unreadField]: { increment: 1 } }
        });
        
        // Send to recipient in real-time
        io.to(`user:${recipientId}`).emit('dm:new_message', {
          ...message,
          conversationId,
          tempId
        });
        
        // Confirm to sender
        socket.emit('dm:message_sent', {
          ...message,
          conversationId,
          tempId
        });
        
        // Send notification to recipient
        const recipient = await prisma.user.findUnique({
          where: { id: recipientId },
          select: { fullName: true, email: true }
        });
        
        socket.to(`user:${recipientId}`).emit('dm:notification', {
          title: `New message from ${message.sender.fullName}`,
          body: content?.substring(0, 100) || "Sent a file",
          messageId: message.id,
          conversationId
        });
        
      } catch (err) {
        console.error('Send message error:', err);
        socket.emit('dm:error', { error: err.message });
      }
    });
    
    // ==================== TYPING INDICATORS ====================
    
    // User started typing
    socket.on('dm:typing_start', async ({ conversationId }) => {
      const userId = userSockets.get(socket.id);
      if (!userId) return;
      
      if (!typingUsers.has(conversationId)) {
        typingUsers.set(conversationId, new Set());
      }
      
      typingUsers.get(conversationId).add(userId);
      
      // Get recipient(s) in conversation
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });
      
      if (conversation) {
        const recipientId = conversation.participant1Id === userId 
          ? conversation.participant2Id 
          : conversation.participant1Id;
        
        io.to(`user:${recipientId}`).emit('dm:typing_start', {
          conversationId,
          userId
        });
      }
    });
    
    // User stopped typing
    socket.on('dm:typing_stop', async ({ conversationId }) => {
      const userId = userSockets.get(socket.id);
      if (!userId) return;
      
      if (typingUsers.has(conversationId)) {
        typingUsers.get(conversationId).delete(userId);
      }
      
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });
      
      if (conversation) {
        const recipientId = conversation.participant1Id === userId 
          ? conversation.participant2Id 
          : conversation.participant1Id;
        
        io.to(`user:${recipientId}`).emit('dm:typing_stop', {
          conversationId,
          userId
        });
      }
    });
    
    // ==================== READ RECEIPTS ====================
    
    // Mark message as read
    socket.on('dm:mark_read', async ({ messageId, conversationId }) => {
      const userId = userSockets.get(socket.id);
      if (!userId) return;
      
      try {
        // Create read receipt
        await prisma.directMessageReadReceipt.upsert({
          where: {
            messageId_userId: { messageId, userId }
          },
          update: { readAt: new Date() },
          create: {
            messageId,
            userId,
            readAt: new Date()
          }
        });
        
        // Update message isRead flag
        await prisma.directMessage.update({
          where: { id: messageId },
          data: { isRead: true, readAt: new Date() }
        });
        
        // Notify sender that message was read
        const message = await prisma.directMessage.findUnique({
          where: { id: messageId },
          select: { senderId: true }
        });
        
        if (message && message.senderId !== userId) {
          io.to(`user:${message.senderId}`).emit('dm:message_read', {
            messageId,
            conversationId,
            userId,
            readAt: new Date()
          });
        }
        
      } catch (err) {
        console.error('Mark read error:', err);
      }
    });
    
    // Mark all messages in conversation as read
    socket.on('dm:mark_conversation_read', async ({ conversationId }) => {
      const userId = userSockets.get(socket.id);
      if (!userId) return;
      
      try {
        // Get all unread messages from other user
        const unreadMessages = await prisma.directMessage.findMany({
          where: {
            conversationId,
            senderId: { not: userId },
            isRead: false
          },
          select: { id: true, senderId: true }
        });
        
        // Create read receipts
        for (const msg of unreadMessages) {
          await prisma.directMessageReadReceipt.upsert({
            where: {
              messageId_userId: { messageId: msg.id, userId }
            },
            update: { readAt: new Date() },
            create: {
              messageId: msg.id,
              userId,
              readAt: new Date()
            }
          });
          
          // Notify each sender
          io.to(`user:${msg.senderId}`).emit('dm:message_read', {
            messageId: msg.id,
            conversationId,
            userId,
            readAt: new Date()
          });
        }
        
        // Update messages as read
        await prisma.directMessage.updateMany({
          where: {
            conversationId,
            senderId: { not: userId },
            isRead: false
          },
          data: { isRead: true, readAt: new Date() }
        });
        
        // Reset unread count
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId }
        });
        
        if (conversation) {
          const isParticipant1 = conversation.participant1Id === userId;
          await prisma.conversation.update({
            where: { id: conversationId },
            data: isParticipant1 ? { unreadCount1: 0 } : { unreadCount2: 0 }
          });
        }
        
        socket.emit('dm:conversation_read', { conversationId });
        
      } catch (err) {
        console.error('Mark conversation read error:', err);
      }
    });
    
    // ==================== MESSAGE ACTIONS ====================
    
    // Delete message
    socket.on('dm:delete_message', async ({ messageId, conversationId }) => {
      const userId = userSockets.get(socket.id);
      if (!userId) return;
      
      try {
        const message = await prisma.directMessage.findUnique({
          where: { id: messageId }
        });
        
        if (!message || message.senderId !== userId) {
          socket.emit('dm:error', { error: 'Not authorized' });
          return;
        }
        
        await prisma.directMessage.update({
          where: { id: messageId },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: userId,
            content: "[Message deleted]"
          }
        });
        
        // Notify conversation participants
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId }
        });
        
        if (conversation) {
          io.to(`user:${conversation.participant1Id}`).emit('dm:message_deleted', { messageId });
          io.to(`user:${conversation.participant2Id}`).emit('dm:message_deleted', { messageId });
        }
        
      } catch (err) {
        console.error('Delete message error:', err);
      }
    });
    
    // Edit message
    socket.on('dm:edit_message', async ({ messageId, content, conversationId }) => {
      const userId = userSockets.get(socket.id);
      if (!userId) return;
      
      try {
        const message = await prisma.directMessage.findUnique({
          where: { id: messageId }
        });
        
        if (!message || message.senderId !== userId) {
          socket.emit('dm:error', { error: 'Not authorized' });
          return;
        }
        
        const updated = await prisma.directMessage.update({
          where: { id: messageId },
          data: {
            content,
            isEdited: true,
            editedAt: new Date()
          }
        });
        
        // Notify conversation participants
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId }
        });
        
        if (conversation) {
          io.to(`user:${conversation.participant1Id}`).emit('dm:message_edited', updated);
          io.to(`user:${conversation.participant2Id}`).emit('dm:message_edited', updated);
        }
        
      } catch (err) {
        console.error('Edit message error:', err);
      }
    });
    
    // Add reaction
    socket.on('dm:add_reaction', async ({ messageId, reaction, conversationId }) => {
      const userId = userSockets.get(socket.id);
      if (!userId) return;
      
      try {
        const existing = await prisma.directMessageReaction.findUnique({
          where: {
            messageId_userId_reaction: { messageId, userId, reaction }
          }
        });
        
        if (existing) {
          await prisma.directMessageReaction.delete({ where: { id: existing.id } });
        } else {
          await prisma.directMessageReaction.create({
            data: { messageId, userId, reaction }
          });
        }
        
        // Get updated counts
        const counts = await prisma.directMessageReaction.groupBy({
          by: ['reaction'],
          where: { messageId },
          _count: true
        });
        
        const reactionCounts = {};
        counts.forEach(c => { reactionCounts[c.reaction] = c._count; });
        
        // Notify conversation participants
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId }
        });
        
        if (conversation) {
          io.to(`user:${conversation.participant1Id}`).emit('dm:reaction_updated', {
            messageId,
            reaction,
            counts: reactionCounts,
            userId
          });
          io.to(`user:${conversation.participant2Id}`).emit('dm:reaction_updated', {
            messageId,
            reaction,
            counts: reactionCounts,
            userId
          });
        }
        
      } catch (err) {
        console.error('Add reaction error:', err);
      }
    });
  });
};