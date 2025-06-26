const { pool } = require('../config/database');

async function createUser(email, hashedPassword, fullName, country, city) {
    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return false;
    await pool.query(
        'INSERT INTO users (email, password, full_name, country, city) VALUES ($1, $2, $3, $4, $5)',
        [email, hashedPassword, fullName, country, city]
    );
    return true;
}

async function getUser(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
}

module.exports = {
    createUser,
    getUser,
};