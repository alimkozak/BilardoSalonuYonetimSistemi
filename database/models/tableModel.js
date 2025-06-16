const { pool } = require('../connection');

class TableModel {
    // Tüm masaları getir
    static async getAll() {
        const [rows] = await pool.execute(
            'SELECT * FROM tables ORDER BY number'
        );
        return rows;
    }

    // Masa güncelle
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
            `UPDATE tables SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        if (result.affectedRows > 0) {
            const [rows] = await pool.execute(
                'SELECT * FROM tables WHERE id = ?',
                [id]
            );
            return rows[0];
        }
        return null;
    }

    // Masa durumunu güncelle
    static async updateStatus(id, status, additionalData = {}) {
        const data = { status, ...additionalData };
        return await this.update(id, data);
    }
}

module.exports = TableModel;