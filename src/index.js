import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import quotesRoutes from './routes/quotes.js';
import authRoutes from './routes/auth.js';
import { setIO } from './lib/socket.js';

const PORT = process.env.PORT || 4000;
const app = express();
const httpServer = createServer(app);

// Socket.io setup with CORS (allow mobile app + web)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
});

// Export io for use in other files
export { io };

// Set io instance for socket utility
setIO(io);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'midas-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/quotes', quotesRoutes);

// Endpoint for Next.js API to emit socket events
app.post('/api/socket/emit', (req, res) => {
  const { event, userId, conversationId, data } = req.body;
  if (!event) {
    return res.status(400).json({ error: 'event is required' });
  }
  
  // Quote events
  if (event === 'quote-updated' && userId) {
    io.to(`user:${userId}`).emit('quote-updated', data);
    console.log(`Emitted quote-updated to user:${userId}`);
  }
  
  if (event === 'new-quote') {
    io.to('admin-notifications').emit('new-quote', data);
    io.emit('new-quote', data);
    console.log('Emitted new-quote to admin-notifications');
    return res.json({ ok: true });
  }
  
  // Task events
  if (event === 'new-task') {
    io.to('admin-notifications').emit('new-task', data);
    io.emit('new-task', data);
    console.log('Emitted new-task to admin-notifications');
    return res.json({ ok: true });
  }
  
  if (event === 'task-updated') {
    io.to('admin-notifications').emit('task-updated', data);
    io.emit('task-updated', data);
    console.log('Emitted task-updated to admin-notifications');
    return res.json({ ok: true });
  }
  
  // Chat message to specific conversation
  if (event === 'chat-message' && conversationId) {
    io.to(`chat:${conversationId}`).emit('chat-message', data);
    // Also emit to admin notifications for unread count
    io.to('admin-notifications').emit('chat-message', { conversationId, ...data });
    console.log(`Emitted chat-message to chat:${conversationId}`);
    return res.json({ ok: true });
  }
  
  // Chat notification (new message in any conversation)
  if (event === 'chat-notification') {
    io.to('admin-notifications').emit('chat-notification', data);
    io.emit('chat-notification', data);
    console.log('Emitted chat-notification to all');
    return res.json({ ok: true });
  }
  
  // Chat read event
  if (event === 'chat-read') {
    io.to('admin-notifications').emit('chat-read', data);
    console.log('Emitted chat-read to admin-notifications');
    return res.json({ ok: true });
  }
  
  // Task read event
  if (event === 'task-read') {
    io.to('admin-notifications').emit('task-read', data);
    console.log('Emitted task-read to admin-notifications');
    return res.json({ ok: true });
  }

  // Refresh notifications event
  if (event === 'refresh-notifications') {
    io.to('admin-notifications').emit('refresh-notifications', data);
    console.log('Emitted refresh-notifications');
    return res.json({ ok: true });
  }
  
  // Always broadcast to all for admin dashboard
  io.emit(event, data);
  console.log(`Emitted ${event} to all`);
  
  res.json({ ok: true });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join admin notifications room (for sidebar counts)
  socket.on('join-admin-notifications', () => {
    socket.join('admin-notifications');
    console.log(`Socket ${socket.id} joined admin-notifications room`);
  });

  // Join user-specific room for targeted updates
  socket.on('join-user', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined room user:${userId}`);
    }
  });

  // Chat: Join conversation room
  socket.on('join-conversation', (conversationId) => {
    if (conversationId) {
      socket.join(`chat:${conversationId}`);
      console.log(`Socket ${socket.id} joined chat:${conversationId}`);
    }
  });

  // Chat: Leave conversation room
  socket.on('leave-conversation', (conversationId) => {
    if (conversationId) {
      socket.leave(`chat:${conversationId}`);
      console.log(`Socket ${socket.id} left chat:${conversationId}`);
    }
  });

  // Chat: Send message (real-time broadcast)
  socket.on('chat-message', (data) => {
    const { conversationId, message } = data;
    if (conversationId && message) {
      // Broadcast to everyone in the conversation except sender
      socket.to(`chat:${conversationId}`).emit('chat-message', {
        conversationId,
        message,
      });
      console.log(`Chat message in ${conversationId} from ${message.senderName}`);
    }
  });

  // Chat: Typing indicator
  socket.on('typing', (data) => {
    const { conversationId, odId, userName, isTyping } = data;
    if (conversationId) {
      socket.to(`chat:${conversationId}`).emit('typing', {
        conversationId,
        odId,
        userName,
        isTyping,
      });
    }
  });

  // Chat: Messages read - notify others to update their counts and show read receipts
  socket.on('chat-read', (data) => {
    const { conversationId, userId, userName } = data;
    console.log(`Messages read in ${conversationId} by ${userId} (${userName})`);
    // Broadcast to conversation room so other participants see read receipts
    socket.to(`chat:${conversationId}`).emit('chat-read', { conversationId, userId, userName });
    // Broadcast to admin-notifications room to update counts
    io.to('admin-notifications').emit('chat-read', { conversationId, userId, userName });
  });

  // Task: Tasks read - notify others to update their counts
  socket.on('task-read', (data) => {
    const { userId, userName } = data;
    console.log(`Tasks read by ${userId} (${userName})`);
    // Broadcast to admin-notifications room to update counts for all users
    io.to('admin-notifications').emit('task-read', { userId, userName });
  });

  // Chat: Join all conversations for a user (for notifications)
  socket.on('join-all-chats', (conversationIds) => {
    if (Array.isArray(conversationIds)) {
      conversationIds.forEach(id => {
        socket.join(`chat:${id}`);
      });
      console.log(`Socket ${socket.id} joined ${conversationIds.length} chat rooms`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err?.message || 'Server error' });
});

async function start() {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Start failed:', err);
  process.exit(1);
});
