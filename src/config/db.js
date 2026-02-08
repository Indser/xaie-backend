const mysql = require('mysql2/promise');
require('dotenv').config();

const poolConfig = process.env.MYSQL_URL || process.env.DATABASE_URL ? {
    uri: process.env.MYSQL_URL || process.env.DATABASE_URL,
    multipleStatements: true
} : {
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASS || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
};

const pool = (() => {
    const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
    if (url) {
        // Correctly append query parameter regardless of existing ones
        const separator = url.includes('?') ? '&' : '?';
        return mysql.createPool(url + separator + 'multipleStatements=true');
    }
    return mysql.createPool(poolConfig);
})();

console.log('Database Config Host:', poolConfig.host || 'Using URL');
console.log('Database Config DB:', poolConfig.database || 'Using URL');

pool.getConnection()
    .then(connection => {
        console.log('Successfully connected to MySQL database');
        connection.release();
    })
    .catch(error => {
        console.error('Database connection failed:', error);
    });

module.exports = pool;
