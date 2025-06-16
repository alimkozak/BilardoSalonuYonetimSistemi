const mysql = require('mysql2/promise');
require('dotenv').config();

// Bağlantı havuzu oluştur
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Bağlantıyı test et
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL veritabanına başarıyla bağlanıldı!');
        connection.release();
        return true;
    } catch (error) {
        console.error('Veritabanı bağlantı hatası:', error);
        return false;
    }
}

module.exports = { pool, testConnection };