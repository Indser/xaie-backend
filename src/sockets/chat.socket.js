const { verifyToken } = require('../utils/jwt');

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

        socket.on('send_message', (data) => {
            const { chatId, message } = data;
            console.log(`Socket message [Room ${chatId}]: ${message}`);

            // In a real app, you would save to DB here as well
            io.to(chatId).emit('receive_message', {
                chatId,
                content: message,
                senderId: user ? user.id : 0,
                senderName: user ? user.username : 'User',
                timestamp: new Date().toISOString()
            });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};
