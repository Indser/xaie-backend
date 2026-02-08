const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabase() {
    console.log('--- Database Diagnostic ---');
    console.log('Connecting to:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    console.log('Database:', process.env.DB_NAME || 'xaie_chat');

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
        });

        console.log('✅ Connection to MySQL successful!');

        const [dbCheck] = await connection.query(`SHOW DATABASES LIKE 'xaie_chat'`);
        if (dbCheck.length === 0) {
            console.log('❌ Database "xaie_chat" DOES NOT EXIST.');
            console.log('   Please run backend/schema.sql in your MySQL Workbench.');
        } else {
            console.log('✅ Database "xaie_chat" exists.');

            await connection.query('USE xaie_chat');
            const [tables] = await connection.query('SHOW TABLES');
            const tableNames = tables.map(t => Object.values(t)[0]);

            console.log('Tables found:', tableNames.length > 0 ? tableNames.join(', ') : 'None');

            const requiredTables = ['users', 'chats', 'chat_members', 'messages'];
            const missing = requiredTables.filter(t => !tableNames.includes(t));

            if (missing.length === 0) {
                console.log('✅ All required tables are present.');
            } else {
                console.log('❌ Missing tables:', missing.join(', '));
            }
        }

        await connection.end();
    } catch (err) {
        console.error('❌ Failed to connect to MySQL:', err.message);
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('   Check if your DB_PASS in .env matches your local MySQL password.');
        }
    }
}

checkDatabase();
