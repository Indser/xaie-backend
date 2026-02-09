const { verifyToken } = require('../utils/jwt');
const db = require('../config/db');

module.exports = (io) => {
    io.on('connection', (socket) => {
        let user = null;
        try {
            const token = socket.handshake.auth.token;
            if (token) {
                user = verifyToken(token);
            }
        } catch (e) {
            console.log('Socket authentication failed for', socket.id);
        }

        console.log('User connected:', socket.id, user ? `(user: ${user.username})` : '(guest)');

        socket.on('join_chat', (chatId) => {
            socket.join(chatId);
            console.log(`Socket ${socket.id} joined room ${chatId}`);
        });

        socket.on('send_message', async (data) => {
            const { chatId, message } = data;
            console.log(`Socket message [Room ${chatId}]: ${message}`);

            if (!user) return;

            try {
                // Save to Database
                const [result] = await db.execute(
                    'INSERT INTO messages (chat_id, sender_id, message) VALUES (?, ?, ?)',
                    [chatId, user.id, message]
                );

                // Broadcast to Room
                io.to(chatId).emit('receive_message', {
                    id: result.insertId,
                    chatId: parseInt(chatId),
                    message: message, // Standardize naming to match Message.fromJson
                    senderId: user.id,
                    senderName: user.username,
                    createdAt: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error saving socket message:', error);
            }
        });

        socket.on('mark_as_read', async (data) => {
            const { chatId } = data;
            if (!user) return;
            try {
                await db.execute(
                    'UPDATE messages SET is_read = 1 WHERE chat_id = ? AND sender_id != ?',
                    [chatId, user.id]
                );
                io.to(chatId).emit('messages_read', { chatId, userId: user.id });
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        });

        socket.on('react_message', async (data) => {
            const { messageId, reaction, chatId } = data;
            if (!user) return;
            try {
                await db.execute(
                    'INSERT INTO message_reactions (message_id, user_id, reaction) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reaction = ?',
                    [messageId, user.id, reaction, reaction]
                );
                io.to(chatId).emit('receive_reaction', { messageId, userId: user.id, reaction });
            } catch (error) {
                console.error('Error reacting to message via socket:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};
