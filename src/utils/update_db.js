const db = require('../config/db');

async function updateDatabase() {
    console.log('--- STARTING DATABASE UPDATE ---');

    try {
        // 1. Update Users Table
        console.log('Checking users table for avatar_url and last_active...');
        try {
            await db.execute('ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL');
            console.log('Added avatar_url to users.');
        } catch (e) { console.log('avatar_url already exists or error:', e.message); }

        try {
            await db.execute('ALTER TABLE users ADD COLUMN last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            console.log('Added last_active to users.');
        } catch (e) { console.log('last_active already exists or error:', e.message); }

        // 2. Update Chats Table
        console.log('Checking chats table for name and type...');
        try {
            await db.execute('ALTER TABLE chats ADD COLUMN name VARCHAR(255) DEFAULT NULL');
            console.log('Added name to chats.');
        } catch (e) { console.log('name already exists or error:', e.message); }

        try {
            await db.execute("ALTER TABLE chats ADD COLUMN type ENUM('dm', 'group', 'public') DEFAULT 'dm'");
            console.log('Added type to chats.');
        } catch (e) { console.log('type already exists or error:', e.message); }

        // 3. Update Messages Table
        console.log('Checking messages table for is_read...');
        try {
            await db.execute('ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE');
            console.log('Added is_read to messages.');
        } catch (e) { console.log('is_read already exists or error:', e.message); }

        console.log('--- DATABASE UPDATE COMPLETE ---');
        process.exit(0);
    } catch (error) {
        console.error('Database update failed:', error);
        process.exit(1);
    }
}

updateDatabase();
