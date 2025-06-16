const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../connection');

// Electron app yerine manual path kullan
const getDataPath = () => {
    // Windows için
    if (process.platform === 'win32') {
        return path.join(process.env.APPDATA, 'bilardo-salonu-yonetim', 'data');
    }
    // Mac için
    else if (process.platform === 'darwin') {
        return path.join(process.env.HOME, 'Library', 'Application Support', 'bilardo-salonu-yonetim', 'data');
    }
    // Linux için
    else {
        return path.join(process.env.HOME, '.config', 'bilardo-salonu-yonetim', 'data');
    }
};

async function migrateData() {
    console.log('Migration başlatılıyor...');
    
    try {
        // Veri klasörü yolu
        const dataFolder = getDataPath();
        console.log('Veri klasörü:', dataFolder);
        
        // Klasör var mı kontrol et
        try {
            await fs.access(dataFolder);
        } catch (error) {
            console.log('Veri klasörü bulunamadı. Muhtemelen uygulama henüz çalıştırılmamış.');
            console.log('Önce uygulamayı çalıştırıp bazı veriler oluşturun.');
            return;
        }
        
        // 1. Müşterileri aktar
        console.log('\n1. Müşteriler aktarılıyor...');
        try {
            const customersData = await fs.readFile(
                path.join(dataFolder, 'customers.json'), 
                'utf8'
            );
            const customers = JSON.parse(customersData);
            
            for (const customer of customers) {
                await pool.execute(
                    `INSERT INTO customers (id, name, phone, total_spent, visit_count, last_visit) 
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        name = VALUES(name),
                        phone = VALUES(phone),
                        total_spent = VALUES(total_spent),
                        visit_count = VALUES(visit_count),
                        last_visit = VALUES(last_visit)`,
                    [
                        customer.id, 
                        customer.name, 
                        customer.phone || null, 
                        customer.totalSpent || 0, 
                        customer.visitCount || 0, 
                        customer.lastVisit || null
                    ]
                );
            }
            console.log(`✓ ${customers.length} müşteri aktarıldı`);
        } catch (error) {
            console.log('✗ Müşteri verisi bulunamadı veya hata oluştu:', error.message);
        }

        // 2. Ürünleri aktar
        console.log('\n2. Ürünler aktarılıyor...');
        try {
            const productsData = await fs.readFile(
                path.join(dataFolder, 'products.json'), 
                'utf8'
            );
            const products = JSON.parse(productsData);
            
            for (const product of products) {
                await pool.execute(
                    `INSERT INTO products (id, name, price) 
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        name = VALUES(name),
                        price = VALUES(price)`,
                    [product.id, product.name, product.price]
                );
            }
            console.log(`✓ ${products.length} ürün aktarıldı`);
        } catch (error) {
            console.log('✗ Ürün verisi bulunamadı veya hata oluştu:', error.message);
        }

        // 3. Masaları aktar
        console.log('\n3. Masalar aktarılıyor...');
        try {
            const tablesData = await fs.readFile(
                path.join(dataFolder, 'tables.json'), 
                'utf8'
            );
            const tables = JSON.parse(tablesData);
            
            for (const table of tables) {
                await pool.execute(
                    `INSERT INTO tables (id, number, status, start_time, end_time, player_count, total_price, customer_id, customer_name) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        status = VALUES(status),
                        start_time = VALUES(start_time),
                        end_time = VALUES(end_time),
                        player_count = VALUES(player_count),
                        total_price = VALUES(total_price),
                        customer_id = VALUES(customer_id),
                        customer_name = VALUES(customer_name)`,
                    [
                        table.id, 
                        table.number, 
                        table.status, 
                        table.startTime || null, 
                        table.endTime || null, 
                        table.playerCount || 0, 
                        table.totalPrice || 0,
                        table.customerId || null,
                        table.customerName || null
                    ]
                );
            }
            console.log(`✓ ${tables.length} masa aktarıldı`);
        } catch (error) {
            console.log('✗ Masa verisi bulunamadı veya hata oluştu:', error.message);
        }

        // 4. Satışları aktar
        console.log('\n4. Satışlar aktarılıyor...');
        try {
            const salesData = await fs.readFile(
                path.join(dataFolder, 'sales.json'), 
                'utf8'
            );
            const sales = JSON.parse(salesData);
            
            for (const sale of sales) {
                await pool.execute(
                    `INSERT INTO sales 
                    (id, table_id, table_number, billiard_fee, product_total, total_amount, 
                     start_time, end_time, duration, customer_id, customer_name, timestamp) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        billiard_fee = VALUES(billiard_fee),
                        product_total = VALUES(product_total),
                        total_amount = VALUES(total_amount)`,
                    [
                        sale.id,
                        sale.tableId,
                        sale.tableNumber,
                        sale.billiardFee,
                        sale.productTotal || 0,
                        sale.totalAmount,
                        sale.startTime,
                        sale.endTime,
                        sale.duration,
                        sale.customerId || null,
                        sale.customerName || null,
                        sale.timestamp
                    ]
                );
            }
            console.log(`✓ ${sales.length} satış aktarıldı`);
        } catch (error) {
            console.log('✗ Satış verisi bulunamadı veya hata oluştu:', error.message);
        }

        // 5. Siparişleri aktar
        console.log('\n5. Siparişler aktarılıyor...');
        try {
            const ordersData = await fs.readFile(
                path.join(dataFolder, 'orders.json'), 
                'utf8'
            );
            const orders = JSON.parse(ordersData);
            
            for (const order of orders) {
                // Ürün ID'sini bul
                let productId = null;
                if (order.productId) {
                    productId = order.productId;
                } else if (order.productName && order.productName !== 'Masa Ücreti') {
                    // Ürün adına göre ID bul
                    const [productRows] = await pool.execute(
                        'SELECT id FROM products WHERE name = ? LIMIT 1',
                        [order.productName]
                    );
                    if (productRows.length > 0) {
                        productId = productRows[0].id;
                    }
                }

                await pool.execute(
                    `INSERT INTO orders 
                    (id, table_id, table_number, product_id, product_name, quantity, 
                     price, duration, paid, sale_id, customer_id, timestamp) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        quantity = VALUES(quantity),
                        price = VALUES(price),
                        paid = VALUES(paid)`,
                    [
                        order.id,
                        order.tableId,
                        order.tableNumber || 0,
                        productId,
                        order.productName,
                        order.quantity || 1,
                        order.price,
                        order.duration || null,
                        order.paid || false,
                        order.saleId || null,
                        order.customerId || null,
                        order.timestamp
                    ]
                );
            }
            console.log(`✓ ${orders.length} sipariş aktarıldı`);
        } catch (error) {
            console.log('✗ Sipariş verisi bulunamadı veya hata oluştu:', error.message);
        }

        // 6. Rezervasyonları aktar
        console.log('\n6. Rezervasyonlar aktarılıyor...');
        try {
            const reservationsData = await fs.readFile(
                path.join(dataFolder, 'reservations.json'), 
                'utf8'
            );
            const reservations = JSON.parse(reservationsData);
            
            for (const reservation of reservations) {
                await pool.execute(
                    `INSERT INTO reservations 
                    (id, table_id, customer_id, customer_name, customer_phone, 
                     date, time, player_count, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        table_id = VALUES(table_id),
                        date = VALUES(date),
                        time = VALUES(time),
                        player_count = VALUES(player_count)`,
                    [
                        reservation.id,
                        reservation.tableId || null,
                        reservation.customerId,
                        reservation.customerName,
                        reservation.customerPhone || null,
                        reservation.date,
                        reservation.time,
                        reservation.playerCount || 2,
                        'pending'
                    ]
                );
            }
            console.log(`✓ ${reservations.length} rezervasyon aktarıldı`);
        } catch (error) {
            console.log('✗ Rezervasyon verisi bulunamadı veya hata oluştu:', error.message);
        }

        // 7. Ayarları aktar
        console.log('\n7. Ayarlar aktarılıyor...');
        try {
            const settingsData = await fs.readFile(
                path.join(dataFolder, 'settings.json'), 
                'utf8'
            );
            const settings = JSON.parse(settingsData);
            
            if (settings.pricing) {
                await pool.execute(
                    `INSERT INTO settings (setting_key, setting_value) 
                    VALUES ('pricing.oneOrTwoPeople', ?)
                    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                    [settings.pricing.oneOrTwoPeople.toString()]
                );
                
                await pool.execute(
                    `INSERT INTO settings (setting_key, setting_value) 
                    VALUES ('pricing.threeOrFourPeople', ?)
                    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                    [settings.pricing.threeOrFourPeople.toString()]
                );
                
                await pool.execute(
                    `INSERT INTO settings (setting_key, setting_value) 
                    VALUES ('pricing.additionalPersonFee', ?)
                    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                    [settings.pricing.additionalPersonFee.toString()]
                );
            }
            console.log('✓ Ayarlar aktarıldı');
        } catch (error) {
            console.log('✗ Ayar verisi bulunamadı veya hata oluştu:', error.message);
        }

        console.log('\n✅ Migration tamamlandı!');
        console.log('Tüm veriler başarıyla MySQL veritabanına aktarıldı.');
        
    } catch (error) {
        console.error('\n❌ Migration sırasında genel hata:', error);
    } finally {
        // Bağlantıyı kapat
        await pool.end();
        console.log('\nVeritabanı bağlantısı kapatıldı.');
    }
}

// Script'i çalıştır
migrateData();