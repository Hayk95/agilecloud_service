// Socket.io event emitter utility
// Import this in routes to emit real-time updates

let ioInstance = null;

export function setIO(io) {
  ioInstance = io;
}

export function getIO() {
  return ioInstance;
}

/**
 * Emit quote update to a specific user
 * @param {string} userId - The user ID to notify
 * @param {object} quote - The updated quote data
 */
export function emitQuoteUpdate(userId, quote) {
  if (!ioInstance) {
    console.warn('Socket.io not initialized');
    return;
  }
  if (userId) {
    // Send to specific user's room
    ioInstance.to(`user:${userId}`).emit('quote-updated', quote);
    console.log(`Emitted quote-updated to user:${userId}`);
  }
  // Also broadcast to admin notifications room
  ioInstance.to('admin-notifications').emit('quote-updated', quote);
  // Also broadcast to all connected clients (for admin dashboard)
  ioInstance.emit('quote-updated-all', quote);
}

/**
 * Emit new quote notification (for admin)
 * @param {object} quote - The new quote data
 */
export function emitNewQuote(quote) {
  if (!ioInstance) {
    console.warn('Socket.io not initialized');
    return;
  }
  ioInstance.to('admin-notifications').emit('new-quote', quote);
  ioInstance.emit('new-quote', quote);
  console.log('Emitted new-quote to admin-notifications');
}

/**
 * Emit new task notification
 * @param {object} task - The new task data
 */
export function emitNewTask(task) {
  if (!ioInstance) {
    console.warn('Socket.io not initialized');
    return;
  }
  ioInstance.to('admin-notifications').emit('new-task', task);
  ioInstance.emit('new-task', task);
  console.log('Emitted new-task to admin-notifications');
}

/**
 * Emit task update notification
 * @param {object} task - The updated task data
 */
export function emitTaskUpdate(task) {
  if (!ioInstance) {
    console.warn('Socket.io not initialized');
    return;
  }
  ioInstance.to('admin-notifications').emit('task-updated', task);
  ioInstance.emit('task-updated', task);
  console.log('Emitted task-updated to admin-notifications');
}

/**
 * Emit chat message notification
 * @param {string} conversationId - The conversation ID
 * @param {object} message - The message data
 */
export function emitChatMessage(conversationId, message) {
  if (!ioInstance) {
    console.warn('Socket.io not initialized');
    return;
  }
  ioInstance.to(`chat:${conversationId}`).emit('chat-message', { conversationId, message });
  ioInstance.to('admin-notifications').emit('chat-message', { conversationId, message });
  console.log(`Emitted chat-message to chat:${conversationId} and admin-notifications`);
}

/**
 * Emit refresh notifications event
 */
export function emitRefreshNotifications() {
  if (!ioInstance) {
    console.warn('Socket.io not initialized');
    return;
  }
  ioInstance.to('admin-notifications').emit('refresh-notifications', {});
  console.log('Emitted refresh-notifications');
}
