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
const db = require('./config/db');

// Helper to add columns safely without IF NOT EXISTS (not supported in all MySQL versions)
async function addColumn(table, column, definition) {
    try {
        await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch (err) {
        // Ignore "Duplicate column name" error (ER_DUP_COLUMN_NAME)
        if (err.code !== 'ER_DUP_COLUMN_NAME' && err.errno !== 1060) {
            console.warn(`Note: Could not add ${column} to ${table}:`, err.message);
        }
    }
}

// Database initialization
async function initDb() {
    console.log('🚀 Initializing database schema...');

    // Create tables if they don't exist
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS message_reactions (
                message_id INT NOT NULL,
                user_id INT NOT NULL,
                reaction VARCHAR(20) NOT NULL,
                PRIMARY KEY (message_id, user_id),
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
    } catch (err) {
        console.warn('Note: Could not initialize tables:', err.message);
    }

    await addColumn('chats', 'name', 'VARCHAR(255) NULL');
    await addColumn('chats', 'type', 'ENUM("dm", "group", "public") DEFAULT "dm"');
    await addColumn('messages', 'is_read', 'BOOLEAN DEFAULT FALSE');
    await addColumn('users', 'avatar_url', 'TEXT NULL');
    await addColumn('users', 'last_active', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

    console.log('✅ Database schema initialized');
}
initDb();



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
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 XAIE Server is live at http://0.0.0.0:${PORT}`);
    console.log(`🔌 Accessible on your network at http://192.168.1.64:${PORT}`);
});
