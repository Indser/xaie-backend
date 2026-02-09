const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const socketHandler = require('./sockets/chat.socket');

const userRoutes = require('./routes/user.routes');
const updateRoutes = require('./routes/update.routes');
const path = require('path');


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
app.use('/update', updateRoutes);
console.log('Update routes registered');

// Serve APKs from uploads/apks directory
app.use('/apks', express.static(path.join(__dirname, '../uploads/apks')));


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
