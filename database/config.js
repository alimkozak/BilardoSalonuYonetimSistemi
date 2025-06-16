const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bilardo_salonu',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Connection pool oluştur
const pool = mysql.createPool(dbConfig);

// Bağlantıyı test et
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Veritabanı bağlantısı başarılı!');
    connection.release();
  } catch (error) {
    console.error('Veritabanı bağlantı hatası:', error);
    throw error;
  }
}

module.exports = {
  pool,
  testConnection
}; 