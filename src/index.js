const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const socketHandler = require('./sockets/chat.socket');

const userRoutes = require('./routes/user.routes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
console.log('Auth routes registered');
app.use('/chat', chatRoutes);
console.log('Chat routes registered');
app.use('/users', userRoutes);
console.log('User routes registered');

// Socket.io
try {
    socketHandler(io);
} catch (e) {
    console.error("Socket handler error:", e);
}

app.get('/', (req, res) => {
    res.send('XAIE Chat Server is running');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
