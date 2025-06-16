const { testConnection } = require('./config');

async function main() {
  try {
    await testConnection();
    console.log('Veritabanı bağlantısı başarılı!');
    process.exit(0);
  } catch (error) {
    console.error('Veritabanı bağlantı hatası:', error);
    process.exit(1);
  }
}

main(); 