const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const { testConnection } = require('./database/config');
const { 
  orderOperations, 
  tableOperations, 
  customerOperations, 
  saleOperations,
  productOperations,
  reservationOperations 
} = require('./database/db');
const mysql = require('mysql2/promise');

let mainWindow;

// MySQL bağlantı havuzu
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'bilardo_salonu',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// JSON veri dosyaları
const dataFolder = path.join(app.getPath('userData'), 'data');
const tablesFile = path.join(dataFolder, 'tables.json');
const ordersFile = path.join(dataFolder, 'orders.json');
const productsFile = path.join(dataFolder, 'products.json'); // Ürünler için yeni dosya
const settingsFile = path.join(dataFolder, 'settings.json'); // Ayarlar için yeni dosya
const reservationsFile = path.join(dataFolder, 'reservations.json'); // Rezervasyonlar için yeni dosya
const customersFile = path.join(dataFolder, 'customers.json');
const salesFile = path.join(dataFolder, 'sales.json'); // Satışlar için yeni dosya

// Veri dosyalarının varlığını kontrol et, yoksa oluştur
function setupDataFiles() {
  if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
  }
  
  if (!fs.existsSync(tablesFile)) {
    // Tam olarak 3 masa oluştur
    const initialTables = [
      { 
        id: 1, 
        number: 1, 
        status: 'available',
        startTime: null,
        endTime: null,
        playerCount: 0,
        totalPrice: 0
      },
      { 
        id: 2, 
        number: 2, 
        status: 'available',
        startTime: null,
        endTime: null,
        playerCount: 0,
        totalPrice: 0
      },
      { 
        id: 3, 
        number: 3, 
        status: 'available',
        startTime: null,
        endTime: null,
        playerCount: 0,
        totalPrice: 0
      }
    ];
    fs.writeFileSync(tablesFile, JSON.stringify(initialTables, null, 2));
  }
  
  if (!fs.existsSync(ordersFile)) {
    fs.writeFileSync(ordersFile, JSON.stringify([], null, 2));
  }
  
  if (!fs.existsSync(productsFile)) {
    // Varsayılan ürünler
    const initialProducts = [
      { id: 1, name: 'Kola', price: 30 },
      { id: 2, name: 'Su', price: 15 },
      { id: 3, name: 'Çay', price: 15 },
      { id: 4, name: 'Kahve', price: 35 },
      { id: 5, name: 'Tost', price: 50 },
      { id: 6, name: 'Sandviç', price: 65 }
    ];
    fs.writeFileSync(productsFile, JSON.stringify(initialProducts, null, 2));
  }
  
  if (!fs.existsSync(settingsFile)) {
    // Bilardo ücretlendirme ayarları
    const initialSettings = {
      pricing: {
        oneOrTwoPeople: 140, // 1-2 kişi saatlik ücreti
        threeOrFourPeople: 180, // 3-4 kişi saatlik ücreti
        additionalPersonFee: 45 // 4 kişi üzeri ek ücret
      }
    };
    fs.writeFileSync(settingsFile, JSON.stringify(initialSettings, null, 2));
  }
  
  if (!fs.existsSync(reservationsFile)) {
    fs.writeFileSync(reservationsFile, JSON.stringify([], null, 2));
  }
  
  // Müşteri veri dosyasını oluştur
  if (!fs.existsSync(customersFile)) {
    fs.writeFileSync(customersFile, JSON.stringify([], null, 2));
  }
  
  // Satış veri dosyasını oluştur
  if (!fs.existsSync(salesFile)) {
    fs.writeFileSync(salesFile, JSON.stringify([], null, 2));
  }
}

function createWindow() {
  setupDataFiles();
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  
  // Geliştirme araçlarını açmak için (isteğe bağlı)
  // mainWindow.webContents.openDevTools();
}

// Uygulama başlatılırken eski JSON verilerindeki customerId'leri kontrol et ve yoksa null yap
async function cleanUpCustomerIds() {
  // Müşterileri oku
  let customers = [];
  if (fs.existsSync(customersFile)) {
    customers = JSON.parse(fs.readFileSync(customersFile, 'utf8'));
  }
  const customerIds = customers.map(c => c.id);

  // Masalar
  if (fs.existsSync(tablesFile)) {
    const tables = JSON.parse(fs.readFileSync(tablesFile, 'utf8'));
    let changed = false;
    tables.forEach(table => {
      if (table.customerId && !customerIds.includes(table.customerId)) {
        table.customerId = null;
        table.customerName = null;
        changed = true;
      }
    });
    if (changed) fs.writeFileSync(tablesFile, JSON.stringify(tables, null, 2));
  }

  // Siparişler
  if (fs.existsSync(ordersFile)) {
    const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
    let changed = false;
    orders.forEach(order => {
      if (order.customerId && !customerIds.includes(order.customerId)) {
        order.customerId = null;
        changed = true;
      }
    });
    if (changed) fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
  }

  // Satışlar
  if (fs.existsSync(salesFile)) {
    const sales = JSON.parse(fs.readFileSync(salesFile, 'utf8'));
    let changed = false;
    sales.forEach(sale => {
      if (sale.customerId && !customerIds.includes(sale.customerId)) {
        sale.customerId = null;
        sale.customerName = null;
        changed = true;
      }
    });
    if (changed) fs.writeFileSync(salesFile, JSON.stringify(sales, null, 2));
  }
}

// Veritabanını oluştur
async function createDatabase() {
  try {
    console.log('Veritabanı oluşturuluyor...');
    
    // Önce veritabanı olmadan bağlantı kur
    const tempPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    
    // Veritabanını oluştur
    await tempPool.query('CREATE DATABASE IF NOT EXISTS bilardo_salonu');
    console.log('Veritabanı oluşturuldu!');
    
    // Geçici bağlantıyı kapat
    await tempPool.end();
  } catch (error) {
    console.error('Veritabanı oluşturulurken hata:', error);
    throw error;
  }
}

// Veritabanı şemasını oluştur
async function createDatabaseSchema() {
  let connection;
  try {
    connection = await pool.getConnection();

    // Önce mevcut tabloları temizle (foreign key kısıtlamalarına dikkat ederek)
    await connection.execute('DROP TABLE IF EXISTS order_items');
    await connection.execute('DROP TABLE IF EXISTS orders');
    await connection.execute('DROP TABLE IF EXISTS sales');
    await connection.execute('DROP TABLE IF EXISTS reservations');
    await connection.execute('DROP TABLE IF EXISTS tables');
    await connection.execute('DROP TABLE IF EXISTS products');
    await connection.execute('DROP TABLE IF EXISTS customers');

    // Tabloları oluştur
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tables (
        id INT AUTO_INCREMENT PRIMARY KEY,
        number INT NOT NULL,
        status ENUM('available', 'occupied', 'reserved') DEFAULT 'available',
        start_time DATETIME,
        end_time DATETIME,
        player_count INT DEFAULT 0,
        total_price DECIMAL(10,2) DEFAULT 0.00,
        customer_id INT,
        customer_name VARCHAR(100),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(50),
        stock INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_id INT,
        customer_id INT,
        customer_name VARCHAR(100),
        total_amount DECIMAL(10,2) NOT NULL,
        payment_method ENUM('cash', 'credit_card') DEFAULT 'cash',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (table_id) REFERENCES tables(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reservations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_id INT,
        customer_id INT,
        customer_name VARCHAR(100),
        player_count INT DEFAULT 0,
        reservation_time DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (table_id) REFERENCES tables(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_id INT,
        product_id INT,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (table_id) REFERENCES tables(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT,
        product_id INT,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Masaları yeniden oluştur
    for (let i = 1; i <= 3; i++) {
      await connection.execute(
        'INSERT INTO tables (number, status) VALUES (?, ?)',
        [i, 'available']
      );
    }

    // Masaların oluşturulduğunu kontrol et
    const [tables] = await connection.execute('SELECT * FROM tables');
    if (tables.length !== 3) {
      throw new Error('Masalar doğru şekilde oluşturulamadı');
    }

  } catch (error) {
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Tüm açık masaları kapat
async function closeAllTables() {
  let connection;
  try {
    console.log('Tüm açık masalar kapatılıyor...');
    connection = await pool.getConnection();
    
    // Tüm masaları getir
    const [tables] = await connection.execute('SELECT * FROM tables');
    
    // Açık olan masaları kapat
    for (const table of tables) {
      if (table.status !== 'available') {
        await connection.execute(
          `UPDATE tables SET 
            status = 'available',
            start_time = NULL,
            end_time = NULL,
            player_count = 0,
            total_price = 0,
            customer_id = NULL,
            customer_name = NULL
          WHERE id = ?`,
          [table.id]
        );
        console.log(`Masa ${table.number} kapatıldı`);
      }
    }
    
    return { success: true, message: 'Tüm masalar kapatıldı' };
  } catch (error) {
    console.error('Masalar kapatılırken hata oluştu:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Uygulama başlatıldığında
app.whenReady().then(async () => {
  try {
    await createDatabase();
    await createDatabaseSchema();
    await closeAllTables();
    createWindow();
  } catch (error) {
    console.error('Uygulama başlatılırken hata:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Veri işlemleri
ipcMain.handle('get-tables', async () => {
  const data = fs.readFileSync(tablesFile, 'utf8');
  return JSON.parse(data);
});

ipcMain.handle('get-orders', async () => {
  const data = fs.readFileSync(ordersFile, 'utf8');
  return JSON.parse(data);
});

ipcMain.handle('get-orders-for-table', async (event, tableId) => {
  const data = fs.readFileSync(ordersFile, 'utf8');
  const orders = JSON.parse(data);
  
  return orders.filter(order => order.tableId === tableId && order.productName !== 'Masa Ücreti');
});

ipcMain.handle('get-products', async () => {
  const data = fs.readFileSync(productsFile, 'utf8');
  return JSON.parse(data);
});

ipcMain.handle('get-settings', async () => {
  const data = fs.readFileSync(settingsFile, 'utf8');
  return JSON.parse(data);
});

ipcMain.handle('get-reservations', async () => {
  const data = fs.readFileSync(reservationsFile, 'utf8');
  return JSON.parse(data);
});

ipcMain.handle('get-sales', async () => {
  // Satış dosyasını kontrol et
  if (!fs.existsSync(salesFile)) {
    fs.writeFileSync(salesFile, JSON.stringify([], null, 2));
    return [];
  }
  
  const data = fs.readFileSync(salesFile, 'utf8');
  return JSON.parse(data);
});

ipcMain.handle('get-sales-by-date', async (event, date) => {
  try {
    // Satış dosyasını kontrol et
    if (!fs.existsSync(salesFile)) {
      fs.writeFileSync(salesFile, JSON.stringify([], null, 2));
      return [];
    }
    
    const data = fs.readFileSync(salesFile, 'utf8');
    const sales = JSON.parse(data);
    
    return sales.filter(sale => sale.timestamp.startsWith(date));
  } catch (error) {
    console.error('Satışlar alınırken hata oluştu:', error);
    throw error;
  }
});

// update-table, create-sale, save-order, update-order, update-table-orders, save-customer, update-customer fonksiyonlarında customerId'yi kontrol et
function safeCustomerId(id, customers) {
  if (!id) return null;
  if (!customers) return id;
  return customers.some(c => c.id === id) ? id : null;
}

ipcMain.handle('save-order', async (event, order) => {
  try {
    const customers = JSON.parse(fs.readFileSync(customersFile, 'utf8'));
    const data = fs.readFileSync(ordersFile, 'utf8');
    const orders = JSON.parse(data);
    const newId = orders.length > 0 
      ? Math.max(...orders.map(o => o.id)) + 1 
      : 1;
    const newOrder = { 
      ...order, 
      id: newId, 
      customerId: safeCustomerId(order.customerId, customers),
      timestamp: new Date().toISOString() 
    };
    orders.push(newOrder);
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
    const savedOrder = await orderOperations.save(newOrder);
    return savedOrder;
  } catch (error) {
    console.error('Sipariş kaydedilirken hata oluştu:', error);
    throw error;
  }
});

ipcMain.handle('update-order', async (event, updatedOrder) => {
  try {
    const customers = JSON.parse(fs.readFileSync(customersFile, 'utf8'));
    const data = fs.readFileSync(ordersFile, 'utf8');
    const orders = JSON.parse(data);
    const orderIndex = orders.findIndex(o => o.id === updatedOrder.id);
    if (orderIndex !== -1) {
      orders[orderIndex] = {
        ...orders[orderIndex],
        ...updatedOrder,
        customerId: safeCustomerId(updatedOrder.customerId, customers),
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
      await orderOperations.update(orders[orderIndex]);
      return orders[orderIndex];
    }
    return null;
  } catch (error) {
    console.error('Sipariş güncellenirken hata oluştu:', error);
    throw error;
  }
});

ipcMain.handle('update-table', async (event, tableData) => {
  let connection;
  try {
    if (!tableData.id) {
      throw new Error('Masa ID\'si gerekli');
    }
    
    connection = await pool.getConnection();
    
    // Önce masanın var olduğunu kontrol et
    const [tables] = await connection.execute(
      'SELECT * FROM tables WHERE id = ?',
      [tableData.id]
    );
    
    if (tables.length === 0) {
      throw new Error('Masa bulunamadı');
    }
    
    const table = tables[0];
    
    // Müşteri bilgilerini kontrol et
    let customerName = tableData.customerName;
    let customerId = tableData.customerId;
    
    if (customerId) {
      const [customers] = await connection.execute(
        'SELECT * FROM customers WHERE id = ?',
        [customerId]
      );
      if (customers.length > 0) {
        customerName = customers[0].name;
      }
    }
    
    // Masayı güncelle
    await connection.execute(
      `UPDATE tables SET 
        status = ?,
        start_time = ?,
        end_time = ?,
        player_count = ?,
        total_price = ?,
        customer_id = ?,
        customer_name = ?
      WHERE id = ?`,
      [
        tableData.status,
        tableData.startTime,
        tableData.endTime,
        tableData.playerCount || 0,
        tableData.totalPrice || 0,
        customerId,
        customerName,
        tableData.id
      ]
    );
    
    // Güncellenmiş masayı getir
    const [updatedTables] = await connection.execute(
      'SELECT * FROM tables WHERE id = ?',
      [tableData.id]
    );
    
    return updatedTables[0];
  } catch (error) {
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

ipcMain.handle('save-product', async (event, product) => {
  try {
    console.log('Yeni ürün kaydediliyor:', product);
    
    // Önce veritabanına kaydet
    const savedProduct = await productOperations.save({
      ...product,
      price: parseFloat(product.price) || 0
    });

    console.log('Veritabanına kaydedilen ürün:', savedProduct);

    // JSON dosyasını güncelle
    if (!fs.existsSync(productsFile)) {
      fs.writeFileSync(productsFile, JSON.stringify([], null, 2));
    }
    
    const data = fs.readFileSync(productsFile, 'utf8');
    const products = JSON.parse(data);
    
    // Eğer aynı ID'ye sahip ürün varsa güncelle, yoksa ekle
    const index = products.findIndex(p => p.id === savedProduct.id);
    if (index !== -1) {
      products[index] = savedProduct;
    } else {
      products.push(savedProduct);
    }
    
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
    console.log('JSON dosyası güncellendi');
    
    return savedProduct;
  } catch (error) {
    console.error('Ürün kaydedilirken hata oluştu:', error);
    throw error;
  }
});

ipcMain.handle('update-product', async (event, updatedProduct) => {
  try {
    console.log('Ürün güncelleniyor:', updatedProduct);
    
    if (!updatedProduct.id) {
      throw new Error('Güncellenecek ürün ID\'si gerekli');
    }

    // Önce veritabanında güncelle
    const dbProduct = await productOperations.update({
      ...updatedProduct,
      price: parseFloat(updatedProduct.price) || 0
    });
    
    console.log('Veritabanında güncellenen ürün:', dbProduct);
    
    // JSON dosyasını güncelle
    if (!fs.existsSync(productsFile)) {
      fs.writeFileSync(productsFile, JSON.stringify([], null, 2));
    }
    
    const data = fs.readFileSync(productsFile, 'utf8');
    const products = JSON.parse(data);
    
    const index = products.findIndex(p => p.id === updatedProduct.id);
    if (index !== -1) {
      products[index] = dbProduct;
      fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
      console.log('JSON dosyası güncellendi');
    } else {
      console.log('JSON dosyasında ürün bulunamadı, yeni ürün olarak ekleniyor');
      products.push(dbProduct);
      fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
    }
    
    return dbProduct;
  } catch (error) {
    console.error('Ürün güncellenirken hata oluştu:', error);
    throw error;
  }
});

ipcMain.handle('delete-product', async (event, productId) => {
  try {
    const data = fs.readFileSync(productsFile, 'utf8');
    const products = JSON.parse(data);
    
    const updatedProducts = products.filter(p => p.id !== productId);
    fs.writeFileSync(productsFile, JSON.stringify(updatedProducts, null, 2));
    
    // Veritabanından sil
    await productOperations.delete(productId);
    
    return updatedProducts;
  } catch (error) {
    console.error('Ürün silinirken hata oluştu:', error);
    throw error;
  }
});

ipcMain.handle('update-settings', async (event, settings) => {
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
  return settings;
});

ipcMain.handle('calculate-table-price', async (event, { startTime, playerCount }) => {
  const settingsData = fs.readFileSync(settingsFile, 'utf8');
  const settings = JSON.parse(settingsData);
  
  const now = new Date();
  const start = new Date(startTime);
  const durationMs = now - start;
  
  // Toplam dakikayı hesapla
  const totalMinutes = Math.floor(durationMs / (1000 * 60));
  
  // İlk 1 saat için tam ücret
  let basePrice = 0;
  if (playerCount <= 2) {
    basePrice = settings.pricing.oneOrTwoPeople;
  } else if (playerCount <= 4) {
    basePrice = settings.pricing.threeOrFourPeople;
  } else {
    basePrice = settings.pricing.threeOrFourPeople + 
               (playerCount - 4) * settings.pricing.additionalPersonFee;
  }
  
  // 60 dakikadan sonra ek 15 dakika ücretleri - 5dk tolerans ile
  let additionalFee = 0;
  if (totalMinutes > 65) {
    // 65 dakikadan sonra her 15 dakika için ek ücret
    const extraMinutesAfter65 = totalMinutes - 65; // 65 dakikadan sonraki süre
    const additionalQuarters = Math.ceil(extraMinutesAfter65 / 15); // Her 15 dakikalık dilim için ücret
    
    // Ek süre için kişi sayısına göre saat ücretinin 1/4'ü
    const quarterHourFee = basePrice / 4;
    additionalFee = additionalQuarters * quarterHourFee;
  }
  
  return {
    basePrice,
    additionalFee,
    totalPrice: basePrice + additionalFee,
    duration: {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      totalMinutes
    }
  };
});

// Sipariş silme
ipcMain.handle('delete-order', async (event, orderId) => {
  const data = fs.readFileSync(ordersFile, 'utf8');
  const orders = JSON.parse(data);
  
  const updatedOrders = orders.filter(o => o.id !== orderId);
  fs.writeFileSync(ordersFile, JSON.stringify(updatedOrders, null, 2));
  
  return updatedOrders;
});

// Masa bitiş hesabını detaylı getir
ipcMain.handle('get-table-bill', async (event, { tableId, startTime, playerCount }) => {
  // Ürün siparişlerini al
  const ordersData = fs.readFileSync(ordersFile, 'utf8');
  const orders = JSON.parse(ordersData);
  const tableOrders = orders.filter(o => o.tableId === tableId && o.productName !== 'Masa Ücreti' && !o.paid);
  
  // Masa ücretini hesapla
  const settingsData = fs.readFileSync(settingsFile, 'utf8');
  const settings = JSON.parse(settingsData);
  
  const now = new Date();
  const start = new Date(startTime);
  const durationMs = now - start;
  
  // Toplam dakikayı hesapla
  const totalMinutes = Math.floor(durationMs / (1000 * 60));
  
  // İlk 1 saat için tam ücret
  let basePrice = 0;
  if (playerCount <= 2) {
    basePrice = settings.pricing.oneOrTwoPeople;
  } else if (playerCount <= 4) {
    basePrice = settings.pricing.threeOrFourPeople;
  } else {
    basePrice = settings.pricing.threeOrFourPeople + 
               (playerCount - 4) * settings.pricing.additionalPersonFee;
  }
  
  // 60 dakikadan sonra ek 15 dakika ücretleri - 5dk tolerans ile
  let additionalFee = 0;
  if (totalMinutes > 65) {
    // 65 dakikadan sonra her 15 dakika için ek ücret
    const extraMinutesAfter65 = totalMinutes - 65; // 65 dakikadan sonraki süre
    const additionalQuarters = Math.ceil(extraMinutesAfter65 / 15); // Her 15 dakikalık dilim için ücret
    
    // Ek süre için kişi sayısına göre saat ücretinin 1/4'ü
    const quarterHourFee = basePrice / 4;
    additionalFee = additionalQuarters * quarterHourFee;
  }
  
  const billiardFee = basePrice + additionalFee;
  
  // Ürün siparişlerinin toplamını hesapla
  let productTotal = 0;
  tableOrders.forEach(order => {
    productTotal += order.price * order.quantity;
  });
  
  return {
    billiardFee,
    productTotal,
    totalBill: billiardFee + productTotal,
    duration: {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      totalMinutes
    }
  };
});

// Rezervasyon oluşturma
ipcMain.handle('create-reservation', async (event, reservationData) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    if (!reservationData.tableId) {
      throw new Error('Masa ID\'si gerekli');
    }
    
    // Masayı kontrol et
    const [tables] = await connection.execute(
      'SELECT * FROM tables WHERE id = ?',
      [reservationData.tableId]
    );
    
    if (tables.length === 0) {
      throw new Error('Masa bulunamadı');
    }
    
    const table = tables[0];
    
    // Rezervasyon zamanını oluştur
    const reservationTime = new Date(`${reservationData.date}T${reservationData.time}`);
    
    // Rezervasyonu oluştur
    const [result] = await connection.execute(
      `INSERT INTO reservations 
        (table_id, customer_id, customer_name, player_count, reservation_time) 
      VALUES (?, ?, ?, ?, ?)`,
      [
        reservationData.tableId,
        reservationData.customerId,
        reservationData.customerName,
        reservationData.playerCount,
        reservationTime
      ]
    );
    
    // Masayı rezerve olarak işaretle
    await connection.execute(
      `UPDATE tables SET 
        status = 'reserved',
        customer_id = ?,
        customer_name = ?,
        player_count = ?
      WHERE id = ?`,
      [
        reservationData.customerId,
        reservationData.customerName,
        reservationData.playerCount,
        reservationData.tableId
      ]
    );
    
    console.log('Rezervasyon oluşturuldu:', {
      id: result.insertId,
      tableId: reservationData.tableId,
      customerName: reservationData.customerName,
      reservationTime
    });
    
    return { 
      success: true, 
      message: 'Rezervasyon başarıyla oluşturuldu',
      reservationId: result.insertId
    };
  } catch (error) {
    console.error('Rezervasyon oluşturulurken hata:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Rezervasyon silme
ipcMain.handle('delete-reservation', async (event, reservationId) => {
  try {
    const data = fs.readFileSync(reservationsFile, 'utf8');
    const reservations = JSON.parse(data);
    
    const reservationToDelete = reservations.find(r => r.id === reservationId);
    
    // Eğer rezervasyona masa atanmışsa, masayı serbest bırak
    if (reservationToDelete && reservationToDelete.tableId) {
      const tablesData = fs.readFileSync(tablesFile, 'utf8');
      const tables = JSON.parse(tablesData);
      
      const tableIndex = tables.findIndex(t => t.id === reservationToDelete.tableId);
      if (tableIndex !== -1 && tables[tableIndex].status === 'reserved') {
        tables[tableIndex].status = 'available';
        fs.writeFileSync(tablesFile, JSON.stringify(tables, null, 2));
        await tableOperations.update(tables[tableIndex]);
      }
    }
    
    const updatedReservations = reservations.filter(r => r.id !== reservationId);
    fs.writeFileSync(reservationsFile, JSON.stringify(updatedReservations, null, 2));
    
    // Veritabanından sil
    await reservationOperations.delete(reservationId);
    
    return updatedReservations;
  } catch (error) {
    console.error('Rezervasyon silinirken hata oluştu:', error);
    throw error;
  }
});

// Rezervasyon güncelleme
ipcMain.handle('update-reservation', async (event, updatedReservation) => {
  try {
    const data = fs.readFileSync(reservationsFile, 'utf8');
    const reservations = JSON.parse(data);
    
    const reservationIndex = reservations.findIndex(r => r.id === updatedReservation.id);
    if (reservationIndex !== -1) {
      reservations[reservationIndex] = {
        ...reservations[reservationIndex],
        ...updatedReservation
      };
      
      fs.writeFileSync(reservationsFile, JSON.stringify(reservations, null, 2));
      
      // Veritabanını güncelle
      await reservationOperations.update(reservations[reservationIndex]);
      return reservations[reservationIndex];
    }
    
    return null;
  } catch (error) {
    console.error('Rezervasyon güncellenirken hata oluştu:', error);
    throw error;
  }
});

// Rezervasyona masa atama
ipcMain.handle('assign-table-to-reservation', async (event, { reservationId, tableId }) => {
  const reservationsData = fs.readFileSync(reservationsFile, 'utf8');
  const reservations = JSON.parse(reservationsData);
  
  const reservationIndex = reservations.findIndex(r => r.id === reservationId);
  if (reservationIndex === -1) {
    return { success: false, message: 'Rezervasyon bulunamadı.' };
  }
  
  reservations[reservationIndex].tableId = tableId;
  fs.writeFileSync(reservationsFile, JSON.stringify(reservations, null, 2));
  
  return { success: true, reservation: reservations[reservationIndex] };
});

// Rezervasyon başlatma (masayı aktif et)
ipcMain.handle('start-reservation', async (event, { reservationId, tableId, playerCount }) => {
  // Rezervasyonu bul ve sil
  const reservationsData = fs.readFileSync(reservationsFile, 'utf8');
  const reservations = JSON.parse(reservationsData);
  
  const reservation = reservations.find(r => r.id === reservationId);
  if (!reservation) {
    return { success: false, message: 'Rezervasyon bulunamadı.' };
  }
  
  const updatedReservations = reservations.filter(r => r.id !== reservationId);
  fs.writeFileSync(reservationsFile, JSON.stringify(updatedReservations, null, 2));
  
  // Masayı aktif et
  const tablesData = fs.readFileSync(tablesFile, 'utf8');
  const tables = JSON.parse(tablesData);
  
  const tableIndex = tables.findIndex(t => t.id === tableId);
  if (tableIndex === -1) {
    return { success: false, message: 'Masa bulunamadı.' };
  }
  
  // Müşteri bilgilerini kontrol et
  const customers = JSON.parse(fs.readFileSync(customersFile, 'utf8'));
  const validCustomerId = safeCustomerId(reservation.customerId, customers);
  
  tables[tableIndex].status = 'active';
  tables[tableIndex].startTime = new Date().toISOString();
  tables[tableIndex].playerCount = playerCount;
  tables[tableIndex].customerId = validCustomerId;
  tables[tableIndex].customerName = validCustomerId ? reservation.customerName : null;
  
  fs.writeFileSync(tablesFile, JSON.stringify(tables, null, 2));
  
  // Veritabanını güncelle
  await tableOperations.update(tables[tableIndex]);
  
  return { success: true, table: tables[tableIndex] };
});

// Yeni satış oluşturma
ipcMain.handle('create-sale', async (event, saleData) => {
  try {
    console.log('Satış oluşturuluyor:', saleData);
    
    if (!saleData.tableId) {
      throw new Error('Masa ID\'si gerekli');
    }
    
    // Önce masanın var olduğunu kontrol et
    const table = await tableOperations.getById(saleData.tableId);
    if (!table) {
      throw new Error('Masa bulunamadı');
    }
    
    // Satışı oluştur
    const sale = await saleOperations.save({
      table_id: saleData.tableId,
      table_number: table.number,
      billiard_fee: saleData.billiardFee || 0,
      product_total: saleData.productTotal || 0,
      total_amount: saleData.totalAmount,
      start_time: saleData.startTime,
      end_time: saleData.endTime,
      duration: saleData.duration,
      customer_id: saleData.customerId,
      customer_name: saleData.customerName
    });
    
    // Masayı güncelle
    await tableOperations.update({
      id: saleData.tableId,
      status: 'available',
      start_time: null,
      end_time: null,
      player_count: 0,
      total_price: 0,
      customer_id: null,
      customer_name: null
    });
    
    return sale;
  } catch (error) {
    console.error('Satış oluşturulurken hata oluştu:', error);
    throw error;
  }
});

// Masa siparişlerini güncelle (satış ID bağla ve ödendi olarak işaretle)
ipcMain.handle('update-table-orders', async (event, { tableId, saleId, paid, customerId }) => {
  try {
    const customers = JSON.parse(fs.readFileSync(customersFile, 'utf8'));
    const data = fs.readFileSync(ordersFile, 'utf8');
    const orders = JSON.parse(data);
    const tableOrders = orders.filter(o => o.tableId === tableId && !o.paid);
    tableOrders.forEach(order => {
      order.saleId = saleId;
      order.paid = paid;
      order.customerId = safeCustomerId(customerId, customers);
    });
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
    return tableOrders;
  } catch (error) {
    console.error('Masa siparişleri güncellenirken hata oluştu:', error);
    throw error;
  }
});

// Satış silme
ipcMain.handle('delete-sale', async (event, saleId) => {
  try {
    // Satış kaydını sil
    if (fs.existsSync(salesFile)) {
      const salesData = fs.readFileSync(salesFile, 'utf8');
      const sales = JSON.parse(salesData);
      
      const updatedSales = sales.filter(s => s.id !== saleId);
      fs.writeFileSync(salesFile, JSON.stringify(updatedSales, null, 2));
    }
    
    // İlişkili siparişleri sil
    const ordersData = fs.readFileSync(ordersFile, 'utf8');
    const orders = JSON.parse(ordersData);
    
    const updatedOrders = orders.filter(o => o.saleId !== saleId);
    fs.writeFileSync(ordersFile, JSON.stringify(updatedOrders, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('Satış silinirken hata oluştu:', error);
    throw error;
  }
});
// Satış güncelleme
ipcMain.handle('update-sale', async (event, updatedSale) => {
  try {
    // Satış verisini yükle
    const salesData = fs.readFileSync(salesFile, 'utf8');
    const sales = JSON.parse(salesData);
    
    // Satışı bul ve güncelle
    const saleIndex = sales.findIndex(s => s.id === updatedSale.id);
    if (saleIndex === -1) {
      return { success: false, message: 'Satış bulunamadı.' };
    }
    
    // Yeni alanları mevcut satışa ekle, ama tüm alanları değiştirme
    sales[saleIndex] = { 
      ...sales[saleIndex], 
      ...updatedSale 
    };
    
    // Dosyaya kaydet
    fs.writeFileSync(salesFile, JSON.stringify(sales, null, 2));
    
    return { success: true, sale: sales[saleIndex] };
  } catch (error) {
    console.error('Satış güncellenirken hata oluştu:', error);
    throw error;
  }
});
// Belirli bir tarih için istatistikleri getir
ipcMain.handle('get-stats-by-date', async (event, date) => {
  // Seçilen tarihin siparişlerini al
  const ordersData = fs.readFileSync(ordersFile, 'utf8');
  const orders = JSON.parse(ordersData);
  
  const dateOrders = orders.filter(order => 
    order.timestamp.startsWith(date)
  );
  
  // Toplam gelir
  let totalIncome = 0;
  let productIncome = 0;
  let tableIncome = 0;
  
  dateOrders.forEach(order => {
    const orderTotal = order.price * order.quantity;
    totalIncome += orderTotal;
    
    // Masa ücreti mi yoksa ürün mü?
    if (order.productName === 'Masa Ücreti') {
      tableIncome += orderTotal;
    } else {
      productIncome += orderTotal;
    }
  });
  
  // Tamamlanan masaların süreleri (masa ücretleri kaydedilmiş olanlar)
  const completedTableOrders = dateOrders.filter(o => o.productName === 'Masa Ücreti');
  let totalTableMinutes = 0;
  
  completedTableOrders.forEach(order => {
    // Her masa ücreti siparişinde ek veri olarak süresi de kaydedilmiş
    if (order.duration) {
      totalTableMinutes += order.duration;
    }
  });
  
  const hours = Math.floor(totalTableMinutes / 60);
  const minutes = totalTableMinutes % 60;
  
  return {
    totalIncome,
    productIncome,
    tableIncome,
    tableUsage: {
      hours,
      minutes,
      totalMinutes: totalTableMinutes
    }
  };
});

// Müşteri işlemleri
ipcMain.handle('get-customers', async () => {
  try {
    const data = fs.readFileSync(customersFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Müşteriler alınırken hata oluştu:', error);
    throw error;
  }
});

ipcMain.handle('save-customer', async (event, customer) => {
  try {
    console.log('Yeni müşteri kaydediliyor:', customer);
    
    // Önce veritabanına kaydet
    const savedCustomer = await customerOperations.save({
      name: customer.name,
      phone: customer.phone,
      totalSpent: 0,
      visitCount: 0,
      lastVisit: new Date().toISOString().slice(0, 19).replace('T', ' '),
      createdAt: new Date().toISOString()
    });

    console.log('Veritabanına kaydedilen müşteri:', savedCustomer);

    // JSON dosyasını güncelle
    if (!fs.existsSync(customersFile)) {
      fs.writeFileSync(customersFile, JSON.stringify([], null, 2));
    }
    
    const data = fs.readFileSync(customersFile, 'utf8');
    const customers = JSON.parse(data);
    customers.push(savedCustomer);
    fs.writeFileSync(customersFile, JSON.stringify(customers, null, 2));
    
    return savedCustomer;
  } catch (error) {
    console.error('Müşteri kaydedilirken hata oluştu:', error);
    throw error;
  }
});

// Eski müşterileri veritabanına topluca ekle
ipcMain.handle('sync-customers-to-db', async () => {
  try {
    if (!fs.existsSync(customersFile)) {
      return { success: false, message: 'customers.json bulunamadı' };
    }

    const data = fs.readFileSync(customersFile, 'utf8');
    const customers = JSON.parse(data);
    let count = 0;
    let errors = [];

    for (const customer of customers) {
      try {
        // Veritabanında var mı kontrol et
        const dbCustomer = await customerOperations.getById(customer.id);
        if (!dbCustomer) {
          const savedCustomer = await customerOperations.save(customer);
          console.log('Müşteri veritabanına aktarıldı:', savedCustomer);
          count++;
        }
      } catch (error) {
        console.error(`Müşteri aktarılırken hata (ID: ${customer.id}):`, error);
        errors.push({ id: customer.id, error: error.message });
      }
    }

    return {
      success: true,
      message: `${count} müşteri veritabanına aktarıldı.`,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Müşteriler veritabanına aktarılırken hata oluştu:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('update-customer', async (event, customer) => {
  try {
    console.log('Müşteri güncelleniyor:', customer);
    
    if (!customer.id) {
      // ID yoksa yeni müşteri olarak kaydet
      const newCustomer = await customerOperations.save({
        name: customer.name,
        phone: customer.phone,
        totalSpent: 0,
        visitCount: 0,
        lastVisit: new Date().toISOString().slice(0, 19).replace('T', ' ')
      });
      
      // JSON dosyasını güncelle
      if (!fs.existsSync(customersFile)) {
        fs.writeFileSync(customersFile, JSON.stringify([], null, 2));
      }
      
      const data = fs.readFileSync(customersFile, 'utf8');
      const customers = JSON.parse(data);
      customers.push(newCustomer);
      fs.writeFileSync(customersFile, JSON.stringify(customers, null, 2));
      
      return newCustomer;
    }
    
    // Önce veritabanında güncelle
    const dbCustomer = await customerOperations.update({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      totalSpent: customer.totalSpent || 0,
      visitCount: customer.visitCount || 0,
      lastVisit: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
    
    // JSON dosyasını güncelle
    if (!fs.existsSync(customersFile)) {
      fs.writeFileSync(customersFile, JSON.stringify([], null, 2));
    }
    
    const data = fs.readFileSync(customersFile, 'utf8');
    const customers = JSON.parse(data);
    
    const index = customers.findIndex(c => c.id === customer.id);
    if (index !== -1) {
      customers[index] = dbCustomer;
      fs.writeFileSync(customersFile, JSON.stringify(customers, null, 2));
    }
    
    return dbCustomer;
  } catch (error) {
    console.error('Müşteri güncellenirken hata oluştu:', error);
    throw error;
  }
});

ipcMain.handle('delete-customer', async (event, customerId) => {
  try {
    console.log('Müşteri siliniyor:', customerId);
    
    const data = fs.readFileSync(customersFile, 'utf8');
    const customers = JSON.parse(data);
    
    const updatedCustomers = customers.filter(c => c.id !== customerId);
    fs.writeFileSync(customersFile, JSON.stringify(updatedCustomers, null, 2));
    
    // Veritabanından sil
    await customerOperations.delete(customerId);
    
    return updatedCustomers;
  } catch (error) {
    console.error('Müşteri silinirken hata oluştu:', error);
    throw error;
  }
});

// Bir müşteriyi telefon numarasına göre bul
ipcMain.handle('find-customer-by-phone', async (event, phone) => {
  const data = fs.readFileSync(customersFile, 'utf8');
  const customers = JSON.parse(data);
  
  return customers.find(c => c.phone === phone) || null;
});

// Müşteri bilgisini güncelle (özellikle harcama miktarı)
ipcMain.handle('update-customer-spending', async (event, { customerId, amount, date, updateSpendingOnly = false }) => {
  if (!customerId) return null;
  
  const data = fs.readFileSync(customersFile, 'utf8');
  const customers = JSON.parse(data);
  
  const customerIndex = customers.findIndex(c => c.id === customerId);
  if (customerIndex === -1) return null;
  
  // Toplam harcama miktarını güncelle
  customers[customerIndex].totalSpent = (customers[customerIndex].totalSpent || 0) + amount;
  
  // Sadece harcama güncellenmesi isteniyorsa diğer bilgileri güncelleme
  if (!updateSpendingOnly) {
      // Son ziyaret tarihini güncelle
      customers[customerIndex].lastVisit = date || new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      // Ziyaret sayısını güncelle
      customers[customerIndex].visitCount = (customers[customerIndex].visitCount || 0) + 1;
  }
  
  fs.writeFileSync(customersFile, JSON.stringify(customers, null, 2));
  return customers[customerIndex];
});

// Veritabanı yedekleme
ipcMain.handle('backup-database', async () => {
  try {
    // Kullanıcıdan bir klasör seçmesini iste
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    
    if (result.canceled) {
      return { success: false, message: 'İşlem iptal edildi.' };
    }
    
    const backupFolder = result.filePaths[0];
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const backupPath = path.join(backupFolder, `bilardo-backup-${timestamp}`);
    
    // Yedekleme klasörünü oluştur
    fs.mkdirSync(backupPath, { recursive: true });
    
    // Tüm veri dosyalarını yedekle
    const files = [
      { source: tablesFile, dest: path.join(backupPath, 'tables.json') },
      { source: ordersFile, dest: path.join(backupPath, 'orders.json') },
      { source: productsFile, dest: path.join(backupPath, 'products.json') },
      { source: settingsFile, dest: path.join(backupPath, 'settings.json') },
      { source: reservationsFile, dest: path.join(backupPath, 'reservations.json') },
      { source: customersFile, dest: path.join(backupPath, 'customers.json') },
      { source: salesFile, dest: path.join(backupPath, 'sales.json') }
    ];
    
    for (const file of files) {
      if (fs.existsSync(file.source)) {
        fs.copyFileSync(file.source, file.dest);
      }
    }
    
    return { 
      success: true, 
      message: 'Veritabanı başarıyla yedeklendi.', 
      filePath: backupPath 
    };
  } catch (error) {
    console.error('Veritabanı yedeklenirken hata oluştu:', error);
    return { 
      success: false, 
      message: 'Veritabanı yedeklenirken bir hata oluştu.' 
    };
  }
});

// Veritabanı geri yükleme
ipcMain.handle('restore-database', async (event, backupPath) => {
  try {
    // Kullanıcıdan bir klasör seçmesini iste (eğer parametre olarak gelmemişse)
    let selectedPath = backupPath;
    
    if (!selectedPath) {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Yedek Klasörünü Seçin'
      });
      
      if (result.canceled) {
        return { success: false, message: 'İşlem iptal edildi.' };
      }
      
      selectedPath = result.filePaths[0];
    }
    
    // Yedek dosyalarını kontrol et
    const requiredFiles = [
      'tables.json',
      'orders.json',
      'products.json',
      'settings.json',
      'reservations.json'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(selectedPath, file);
      if (!fs.existsSync(filePath)) {
        return { 
          success: false, 
          message: `${file} dosyası bulunamadı. Geçerli bir yedek klasörü seçin.` 
        };
      }
    }
    
    // Mevcut verileri yedekle
    const tempBackupFolder = path.join(app.getPath('temp'), `bilardo-temp-backup-${Date.now()}`);
    fs.mkdirSync(tempBackupFolder, { recursive: true });
    
    const currentFiles = [
      { source: tablesFile, dest: path.join(tempBackupFolder, 'tables.json') },
      { source: ordersFile, dest: path.join(tempBackupFolder, 'orders.json') },
      { source: productsFile, dest: path.join(tempBackupFolder, 'products.json') },
      { source: settingsFile, dest: path.join(tempBackupFolder, 'settings.json') },
      { source: reservationsFile, dest: path.join(tempBackupFolder, 'reservations.json') },
      { source: customersFile, dest: path.join(tempBackupFolder, 'customers.json') },
      { source: salesFile, dest: path.join(tempBackupFolder, 'sales.json') }
    ];
    
    for (const file of currentFiles) {
      if (fs.existsSync(file.source)) {
        fs.copyFileSync(file.source, file.dest);
      }
    }
    
    // Yedek dosyalarını geri yükle
    const restoreFiles = [
      { source: path.join(selectedPath, 'tables.json'), dest: tablesFile },
      { source: path.join(selectedPath, 'orders.json'), dest: ordersFile },
      { source: path.join(selectedPath, 'products.json'), dest: productsFile },
      { source: path.join(selectedPath, 'settings.json'), dest: settingsFile },
      { source: path.join(selectedPath, 'reservations.json'), dest: reservationsFile }
    ];
    
    // Müşteri ve satış dosyasını da geri yükle (eğer varsa)
    const customersBackup = path.join(selectedPath, 'customers.json');
    if (fs.existsSync(customersBackup)) {
      restoreFiles.push({ source: customersBackup, dest: customersFile });
    }
    
    const salesBackup = path.join(selectedPath, 'sales.json');
    if (fs.existsSync(salesBackup)) {
      restoreFiles.push({ source: salesBackup, dest: salesFile });
    }
    
    for (const file of restoreFiles) {
      if (fs.existsSync(file.source)) {
        fs.copyFileSync(file.source, file.dest);
      }
    }
    
    return { success: true, message: 'Veritabanı başarıyla geri yüklendi.' };
  } catch (error) {
    console.error('Veritabanı geri yüklenirken hata oluştu:', error);
    return { 
      success: false, 
      message: 'Veritabanı geri yüklenirken bir hata oluştu.' 
    };
  }
});

// Gelişmiş raporlama fonksiyonları
ipcMain.handle('get-stats-by-date-range', async (event, startDate, endDate) => {
  // Seçilen tarih aralığındaki tüm siparişleri al
  const ordersData = fs.readFileSync(ordersFile, 'utf8');
  const orders = JSON.parse(ordersData);
  
  // Tarih aralığındaki siparişleri filtrele
  const dateRangeOrders = orders.filter(order => {
    const orderDate = order.timestamp.split('T')[0];
    return orderDate >= startDate && orderDate <= endDate;
  });
  
  // Günlük raporlar için tarihleri ayır
  const dates = [];
  const currentDate = new Date(startDate);
  const lastDate = new Date(endDate);
  
  while (currentDate <= lastDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Her gün için gelirleri hesapla
  const dailyStats = dates.map(date => {
    // O günün siparişlerini filtrele
    const dayOrders = dateRangeOrders.filter(order => 
      order.timestamp.startsWith(date)
    );
    
    // Toplam gelir
    let totalIncome = 0;
    let productIncome = 0;
    let tableIncome = 0;
    
    dayOrders.forEach(order => {
      const orderTotal = order.price * order.quantity;
      totalIncome += orderTotal;
      
      // Masa ücreti mi yoksa ürün mü?
      if (order.productName === 'Masa Ücreti') {
        tableIncome += orderTotal;
      } else {
        productIncome += orderTotal;
      }
    });
    
    // Tamamlanan masaların süreleri
    const completedTableOrders = dayOrders.filter(o => o.productName === 'Masa Ücreti');
    let totalTableMinutes = 0;
    
    completedTableOrders.forEach(order => {
      if (order.duration) {
        totalTableMinutes += order.duration;
      }
    });
    
    return {
      date,
      totalIncome,
      productIncome,
      tableIncome,
      tableUsage: {
        hours: Math.floor(totalTableMinutes / 60),
        minutes: totalTableMinutes % 60,
        totalMinutes: totalTableMinutes
      },
      orderCount: dayOrders.length,
      tableOrderCount: completedTableOrders.length
    };
  });
  
  // Toplam gelir hesapla
  const totalStats = {
    totalIncome: dailyStats.reduce((sum, day) => sum + day.totalIncome, 0),
    productIncome: dailyStats.reduce((sum, day) => sum + day.productIncome, 0),
    tableIncome: dailyStats.reduce((sum, day) => sum + day.tableIncome, 0),
    tableUsage: {
      totalMinutes: dailyStats.reduce((sum, day) => sum + day.tableUsage.totalMinutes, 0)
    },
    orderCount: dailyStats.reduce((sum, day) => sum + day.orderCount, 0),
    tableOrderCount: dailyStats.reduce((sum, day) => sum + day.tableOrderCount, 0)
  };
  
  // Saat ve dakika hesapla
  totalStats.tableUsage.hours = Math.floor(totalStats.tableUsage.totalMinutes / 60);
  totalStats.tableUsage.minutes = totalStats.tableUsage.totalMinutes % 60;
  
  // Grafik verileri
  const chartData = {
    dates: dates.map(date => {
      // Tarihi daha okunabilir formata dönüştür
      const d = new Date(date);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    }),
    totalIncomes: dailyStats.map(day => day.totalIncome),
    tableIncomes: dailyStats.map(day => day.tableIncome),
    productIncomes: dailyStats.map(day => day.productIncome)
  };
  
  return {
    dailyStats,
    totalStats,
    chartData
  };
});

// Ürün satış raporu
ipcMain.handle('get-product-sales-report', async (event, startDate, endDate) => {
  // Tüm siparişleri ve ürünleri al
  const ordersData = fs.readFileSync(ordersFile, 'utf8');
  const productsData = fs.readFileSync(productsFile, 'utf8');

  const orders = JSON.parse(ordersData);
  const products = JSON.parse(productsData);

  // Tarih aralığındaki ürün siparişlerini filtrele (masa ücreti hariç)
  const productOrders = orders.filter(order => 
    order.timestamp.split('T')[0] >= startDate && 
    order.timestamp.split('T')[0] <= endDate &&
    order.productName !== 'Masa Ücreti'
  );

  // Ürünlere göre satışları grupla
  const productSales = {};

  productOrders.forEach(order => {
    const productName = order.productName;
    const orderTotal = order.price * order.quantity;
    
    if (!productSales[productName]) {
      productSales[productName] = {
        totalAmount: 0,
        quantity: 0,
        orders: 0
      };
    }
    
    productSales[productName].totalAmount += orderTotal;
    productSales[productName].quantity += order.quantity;
    productSales[productName].orders += 1;
  });

  // Rapor için düzenle
  const productReportData = Object.keys(productSales).map(productName => {
    return {
      productName,
      totalAmount: productSales[productName].totalAmount,
      quantity: productSales[productName].quantity,
      orders: productSales[productName].orders
    };
  });

  // Toplam satış miktarına göre sırala
  productReportData.sort((a, b) => b.totalAmount - a.totalAmount);

  // Grafik verileri
  const chartData = {
    productNames: productReportData.map(item => item.productName),
    productSales: productReportData.map(item => item.totalAmount),
    productQuantities: productReportData.map(item => item.quantity)
  };

  return {
    productReportData,
    chartData,
    totalProductSales: productReportData.reduce((sum, item) => sum + item.totalAmount, 0),
    totalProductQuantity: productReportData.reduce((sum, item) => sum + item.quantity, 0),
    orderCount: productOrders.length
  };
});

// Müşteri bazlı satış raporu - Düzeltilmiş
ipcMain.handle('get-customer-sales-report', async (event, startDate, endDate) => {
  try {
    // Müşteri ve sipariş verilerini al
    const customersData = fs.readFileSync(customersFile, 'utf8');
    const salesData = fs.readFileSync(salesFile, 'utf8');
    const ordersData = fs.readFileSync(ordersFile, 'utf8');
    
    const customers = JSON.parse(customersData);
    const sales = JSON.parse(salesData);
    const orders = JSON.parse(ordersData);
    
    // Tarih aralığındaki satışları filtrele
    const dateRangeSales = sales.filter(sale => {
      const saleDate = sale.timestamp.split('T')[0];
      return saleDate >= startDate && saleDate <= endDate;
    });
    
    // Müşteri bazlı rapor verisi
    const customerStats = [];
    
    // Tüm müşteriler için istatistikleri hesapla
    customers.forEach(customer => {
      // Bu müşterinin satışlarını bul
      const customerSales = dateRangeSales.filter(sale => sale.customerId === customer.id);
      
      if (customerSales.length > 0) {
        let totalSpent = 0;
        let tableSpent = 0;
        let productSpent = 0;
        
        customerSales.forEach(sale => {
          totalSpent += sale.totalAmount || 0;
          tableSpent += sale.billiardFee || 0;
          productSpent += sale.productTotal || 0;
        });
        
        // Bu müşterinin siparişlerini bul
        const customerOrders = orders.filter(order => 
          order.customerId === customer.id && 
          order.timestamp.split('T')[0] >= startDate && 
          order.timestamp.split('T')[0] <= endDate
        );
        
        customerStats.push({
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone || '',
          totalSpent,
          tableSpent,
          productSpent,
          orderCount: customerOrders.length,
          lastVisit: customer.lastVisit || ''
        });
      }
    });
    
    // Toplam harcamaya göre sırala
    customerStats.sort((a, b) => b.totalSpent - a.totalSpent);
    
    // En çok harcama yapan ilk 10 müşteri
    const topCustomers = customerStats.slice(0, 10);
    
    return {
      customerStats,
      topCustomers,
      totalCustomers: customerStats.length,
      totalSpent: customerStats.reduce((sum, customer) => sum + customer.totalSpent, 0)
    };
    
  } catch (error) {
    console.error('Müşteri satış raporu alınırken hata oluştu:', error);
    return {
      error: true,
      message: 'Müşteri satış raporu alınırken bir hata oluştu.'
    };
  }
});

// Eski ürünleri veritabanına topluca ekle
ipcMain.handle('sync-products-to-db', async () => {
  try {
    if (!fs.existsSync(productsFile)) {
      return { success: false, message: 'products.json bulunamadı' };
    }

    const data = fs.readFileSync(productsFile, 'utf8');
    const products = JSON.parse(data);
    let count = 0;
    let errors = [];

    for (const product of products) {
      try {
        // Veritabanında var mı kontrol et
        const dbProduct = await productOperations.getById(product.id);
        if (!dbProduct) {
          const savedProduct = await productOperations.save({
            ...product,
            price: parseFloat(product.price) || 0
          });
          console.log('Ürün veritabanına aktarıldı:', savedProduct);
          count++;
        }
      } catch (error) {
        console.error(`Ürün aktarılırken hata (ID: ${product.id}):`, error);
        errors.push({ id: product.id, error: error.message });
      }
    }

    return {
      success: true,
      message: `${count} ürün veritabanına aktarıldı.`,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Ürünler veritabanına aktarılırken hata oluştu:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('close-table', async (event, tableId) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Masayı bul
    const [tables] = await connection.execute(
      'SELECT * FROM tables WHERE id = ?',
      [tableId]
    );
    
    if (tables.length === 0) {
      throw new Error('Masa bulunamadı');
    }
    
    const table = tables[0];
    
    // Masayı kapat
    await connection.execute(
      `UPDATE tables SET 
        status = 'available',
        start_time = NULL,
        end_time = NULL,
        player_count = 0,
        total_price = 0,
        customer_id = NULL,
        customer_name = NULL
      WHERE id = ?`,
      [tableId]
    );
    
    console.log(`Masa ${table.number} kapatıldı`);
    return { success: true, message: `Masa ${table.number} kapatıldı` };
  } catch (error) {
    console.error('Masa kapatılırken hata:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// IPC handler'ı
ipcMain.handle('close-all-tables', async () => {
  return await closeAllTables();
});