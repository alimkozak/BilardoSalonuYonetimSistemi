const { pool } = require('../connection');

class OrderModel {
    // Yeni sipariş ekle
    static async create(orderData) {
        const {
            table_id,
            table_number,
            product_id,
            product_name,
            quantity,
            price,
            duration,
            paid,
            sale_id,
            customer_id
        } = orderData;

        const [result] = await pool.execute(
            `INSERT INTO orders 
            (table_id, table_number, product_id, product_name, quantity, price, duration, paid, sale_id, customer_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [table_id, table_number, product_id, product_name, quantity, price, duration, paid || false, sale_id, customer_id]
        );

        return { id: result.insertId, ...orderData };
    }

    // Masa siparişlerini getir
    static async getByTableId(tableId) {
        const [rows] = await pool.execute(
            `SELECT * FROM orders 
            WHERE table_id = ? AND product_name != 'Masa Ücreti' AND paid = FALSE 
            ORDER BY timestamp DESC`,
            [tableId]
        );
        return rows;
    }

    // Sipariş güncelle
    static async update(id, data) {
        const fields = [];
        const values = [];

        Object.keys(data).forEach(key => {
            if (key !== 'id') {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        });

        values.push(id);

        const [result] = await pool.execute(
            `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        return result.affectedRows > 0;
    }

    // Sipariş sil
    static async delete(id) {
        const [result] = await pool.execute(
            'DELETE FROM orders WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    // Tarihe göre siparişleri getir
    static async getByDate(date) {
        const [rows] = await pool.execute(
            `SELECT * FROM orders 
            WHERE DATE(timestamp) = ? 
            ORDER BY timestamp DESC`,
            [date]
        );
        return rows;
    }
}

module.exports = OrderModel;