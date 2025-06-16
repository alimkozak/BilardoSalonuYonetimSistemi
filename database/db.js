const { pool } = require('./config');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Tarih formatını MySQL'e uygun hale getir
function formatDate(date) {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
}

// Müşteri ID'sinin varlığını kontrol et
async function checkCustomerExists(customerId) {
  if (!customerId) return null;
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT id FROM customers WHERE id = ?',
      [customerId]
    );
    return rows.length > 0 ? customerId : null;
  } finally {
    connection.release();
  }
}

// Sipariş işlemleri
const orderOperations = {
  async save(order) {
    const connection = await pool.getConnection();
    try {
      const validCustomerId = await checkCustomerExists(order.customerId);
      const [result] = await connection.execute(
        'INSERT INTO orders (table_id, table_number, product_id, product_name, quantity, price, duration, paid, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          order.tableId || null,
          order.tableNumber || null,
          order.productId || null,
          order.productName || null,
          order.quantity || 1,
          order.price || 0,
          order.duration || null,
          order.paid || false,
          validCustomerId
        ]
      );
      return { ...order, id: result.insertId };
    } finally {
      connection.release();
    }
  },

  async update(order) {
    const connection = await pool.getConnection();
    try {
      const validCustomerId = await checkCustomerExists(order.customerId);
      await connection.execute(
        'UPDATE orders SET table_id = ?, table_number = ?, product_id = ?, product_name = ?, quantity = ?, price = ?, duration = ?, paid = ?, customer_id = ? WHERE id = ?',
        [
          order.tableId || null,
          order.tableNumber || null,
          order.productId || null,
          order.productName || null,
          order.quantity || 1,
          order.price || 0,
          order.duration || null,
          order.paid || false,
          validCustomerId,
          order.id
        ]
      );
      return order;
    } finally {
      connection.release();
    }
  },

  async getByTableId(tableId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM orders WHERE table_id = ? AND product_name != ?',
        [tableId, 'Masa Ücreti']
      );
      return rows;
    } finally {
      connection.release();
    }
  }
};

// Masa işlemleri
const tableOperations = {
  async save(table) {
    try {
      const [result] = await pool.execute(
        'INSERT INTO tables (number, status, start_time, end_time, player_count, total_price, customer_id, customer_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          table.number,
          table.status || 'available',
          table.start_time,
          table.end_time,
          table.player_count || 0,
          table.total_price || 0,
          table.customer_id,
          table.customer_name
        ]
      );
      
      const [savedTable] = await pool.execute(
        'SELECT * FROM tables WHERE id = ?',
        [result.insertId]
      );
      
      return savedTable[0];
    } catch (error) {
      console.error('Masa kaydedilirken hata:', error);
      throw error;
    }
  },

  async update(table) {
    try {
      if (!table.id) {
        throw new Error('Masa ID\'si gerekli');
      }

      const [existingTable] = await pool.execute(
        'SELECT * FROM tables WHERE id = ?',
        [table.id]
      );

      if (!existingTable[0]) {
        throw new Error('Masa bulunamadı');
      }

      await pool.execute(
        'UPDATE tables SET status = ?, start_time = ?, end_time = ?, player_count = ?, total_price = ?, customer_id = ?, customer_name = ? WHERE id = ?',
        [
          table.status,
          table.start_time,
          table.end_time,
          table.player_count || 0,
          table.total_price || 0,
          table.customer_id,
          table.customer_name,
          table.id
        ]
      );

      const [updatedTable] = await pool.execute(
        'SELECT * FROM tables WHERE id = ?',
        [table.id]
      );

      return updatedTable[0];
    } catch (error) {
      console.error('Masa güncellenirken hata:', error);
      throw error;
    }
  },

  async getById(id) {
    try {
      if (!id) {
        throw new Error('Masa ID\'si gerekli');
      }

      const [tables] = await pool.execute(
        'SELECT * FROM tables WHERE id = ?',
        [id]
      );

      return tables[0];
    } catch (error) {
      console.error('Masa getirilirken hata:', error);
      throw error;
    }
  },

  async getAll() {
    try {
      const [tables] = await pool.execute('SELECT * FROM tables ORDER BY number');
      return tables;
    } catch (error) {
      console.error('Masalar getirilirken hata:', error);
      throw error;
    }
  }
};

// Müşteri işlemleri
const customerOperations = {
  save: async (customer) => {
    try {
      console.log('Müşteri kaydediliyor:', customer);
      const [result] = await pool.query(
        'INSERT INTO customers (name, phone, total_spent, visit_count, last_visit, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [customer.name, customer.phone, customer.totalSpent || 0, customer.visitCount || 0, customer.lastVisit || new Date(), customer.createdAt || new Date()]
      );
      
      // Yeni eklenen müşteriyi getir
      const [savedCustomer] = await pool.query(
        'SELECT * FROM customers WHERE id = ?',
        [result.insertId]
      );
      
      console.log('Kaydedilen müşteri:', savedCustomer[0]);
      return savedCustomer[0];
    } catch (error) {
      console.error('Müşteri kaydedilirken hata:', error);
      throw error;
    }
  },
  
  update: async (customer) => {
    try {
      console.log('Müşteri güncelleniyor:', customer);
      
      // Müşterinin var olup olmadığını kontrol et
      const [existing] = await pool.query(
        'SELECT * FROM customers WHERE id = ?',
        [customer.id]
      );
      
      if (existing.length === 0) {
        throw new Error('Güncellenecek müşteri bulunamadı');
      }
      
      await pool.query(
        'UPDATE customers SET name = ?, phone = ?, total_spent = ?, visit_count = ?, last_visit = ? WHERE id = ?',
        [customer.name, customer.phone, customer.totalSpent || 0, customer.visitCount || 0, customer.lastVisit || new Date(), customer.id]
      );
      
      // Güncellenmiş müşteriyi getir
      const [updatedCustomer] = await pool.query(
        'SELECT * FROM customers WHERE id = ?',
        [customer.id]
      );
      
      console.log('Güncellenen müşteri:', updatedCustomer[0]);
      return updatedCustomer[0];
    } catch (error) {
      console.error('Müşteri güncellenirken hata:', error);
      throw error;
    }
  },

  async getAll() {
    const connection = await pool.getConnection();
    try {
      console.log('Tüm müşteriler getiriliyor');
      
      const [rows] = await connection.execute('SELECT * FROM customers');
      
      console.log('Müşteriler getirildi:', rows.length);
      return rows;
    } catch (error) {
      console.error('Müşteriler getirilirken veritabanı hatası:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async getById(id) {
    const connection = await pool.getConnection();
    try {
      console.log('Müşteri getiriliyor, ID:', id);
      
      if (!id) {
        throw new Error('Müşteri ID\'si gerekli');
      }

      const [rows] = await connection.execute(
        'SELECT * FROM customers WHERE id = ?',
        [id]
      );
      
      console.log('Müşteri bulundu:', rows[0] || null);
      return rows[0] || null;
    } catch (error) {
      console.error('Müşteri getirilirken veritabanı hatası:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async delete(id) {
    const connection = await pool.getConnection();
    try {
      console.log('Müşteri siliniyor, ID:', id);
      
      await connection.execute('DELETE FROM customers WHERE id = ?', [id]);
      
      console.log('Müşteri silindi');
      return true;
    } catch (error) {
      console.error('Müşteri silinirken veritabanı hatası:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
};

// Satış işlemleri
const saleOperations = {
  async save(sale) {
    const connection = await pool.getConnection();
    try {
      const validCustomerId = await checkCustomerExists(sale.customerId);
      const [result] = await connection.execute(
        'INSERT INTO sales (table_id, table_number, billiard_fee, product_total, total_amount, start_time, end_time, duration, customer_id, customer_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          sale.tableId || null,
          sale.tableNumber || null,
          sale.billiardFee || 0,
          sale.productTotal || 0,
          sale.totalAmount || 0,
          formatDate(sale.startTime),
          formatDate(sale.endTime),
          sale.duration || 0,
          validCustomerId,
          validCustomerId ? sale.customerName : null
        ]
      );
      return { ...sale, id: result.insertId };
    } finally {
      connection.release();
    }
  },

  async getByDate(date) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM sales WHERE DATE(timestamp) = ?',
        [date]
      );
      return rows;
    } finally {
      connection.release();
    }
  }
};

// Ürün işlemleri
const productOperations = {
  async save(product) {
    const connection = await pool.getConnection();
    try {
      console.log('Veritabanına ürün kaydediliyor:', product);
      
      const [result] = await connection.execute(
        'INSERT INTO products (name, price) VALUES (?, ?)',
        [
          product.name || null,
          parseFloat(product.price) || 0
        ]
      );
      
      // Yeni eklenen ürünü getir
      const [rows] = await connection.execute(
        'SELECT * FROM products WHERE id = ?',
        [result.insertId]
      );
      
      console.log('Ürün kaydedildi:', rows[0]);
      return rows[0];
    } catch (error) {
      console.error('Ürün kaydedilirken veritabanı hatası:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async update(product) {
    const connection = await pool.getConnection();
    try {
      console.log('Veritabanında ürün güncelleniyor:', product);
      
      if (!product.id) {
        throw new Error('Ürün ID\'si gerekli');
      }

      // Önce ürünün var olup olmadığını kontrol et
      const [existing] = await connection.execute(
        'SELECT id FROM products WHERE id = ?',
        [product.id]
      );

      if (existing.length === 0) {
        throw new Error('Güncellenecek ürün bulunamadı');
      }
      
      await connection.execute(
        'UPDATE products SET name = ?, price = ? WHERE id = ?',
        [
          product.name || null,
          parseFloat(product.price) || 0,
          product.id
        ]
      );
      
      // Güncellenmiş ürünü getir
      const [updated] = await connection.execute(
        'SELECT * FROM products WHERE id = ?',
        [product.id]
      );
      
      console.log('Ürün güncellendi:', updated[0]);
      return updated[0];
    } catch (error) {
      console.error('Ürün güncellenirken veritabanı hatası:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async getById(id) {
    const connection = await pool.getConnection();
    try {
      console.log('Ürün getiriliyor, ID:', id);
      
      if (!id) {
        throw new Error('Ürün ID\'si gerekli');
      }

      const [rows] = await connection.execute(
        'SELECT * FROM products WHERE id = ?',
        [id]
      );
      
      console.log('Ürün bulundu:', rows[0] || null);
      return rows[0] || null;
    } catch (error) {
      console.error('Ürün getirilirken veritabanı hatası:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async getAll() {
    const connection = await pool.getConnection();
    try {
      console.log('Tüm ürünler getiriliyor');
      
      const [rows] = await connection.execute('SELECT * FROM products');
      
      console.log('Ürünler getirildi:', rows.length);
      return rows;
    } catch (error) {
      console.error('Ürünler getirilirken veritabanı hatası:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
};

// Rezervasyon işlemleri
const reservationOperations = {
  async save(reservation) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'INSERT INTO reservations (table_id, customer_id, customer_name, player_count, reservation_time, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          reservation.tableId || null,
          reservation.customerId || null,
          reservation.customerName || null,
          reservation.playerCount || 0,
          formatDate(reservation.reservationTime),
          formatDate(reservation.createdAt || new Date())
        ]
      );
      return { ...reservation, id: result.insertId };
    } finally {
      connection.release();
    }
  },
  async update(reservation) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'UPDATE reservations SET table_id = ?, customer_id = ?, customer_name = ?, player_count = ?, reservation_time = ? WHERE id = ?',
        [
          reservation.tableId || null,
          reservation.customerId || null,
          reservation.customerName || null,
          reservation.playerCount || 0,
          formatDate(reservation.reservationTime),
          reservation.id
        ]
      );
      return reservation;
    } finally {
      connection.release();
    }
  },
  async delete(id) {
    const connection = await pool.getConnection();
    try {
      await connection.execute('DELETE FROM reservations WHERE id = ?', [id]);
      return true;
    } finally {
      connection.release();
    }
  }
};

// Veritabanı bağlantısını test et
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Veritabanı bağlantısı başarılı!');
    connection.release();
  } catch (error) {
    console.error('Veritabanı bağlantısı başarısız:', error);
    throw error;
  }
}

module.exports = {
  pool,
  testConnection,
  orderOperations,
  tableOperations,
  customerOperations,
  saleOperations,
  productOperations,
  reservationOperations
}; 