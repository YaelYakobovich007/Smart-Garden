const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

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

async function updateUserName(email, newName) {
    const result = await pool.query(
        'UPDATE users SET full_name = $1 WHERE email = $2 RETURNING full_name',
        [newName, email]
    );
    return result.rows[0]?.full_name || null;
}

async function updateUserLocation(email, country, city) {
    const result = await pool.query(
        'UPDATE users SET country = $1, city = $2 WHERE email = $3 RETURNING country, city',
        [country, city, email]
    );
    return result.rows[0] || null;
}

async function updateUserPassword(email, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
        'UPDATE users SET password = $1 WHERE email = $2 RETURNING id',
        [hashedPassword, email]
    );
    return result.rows.length > 0;
}

module.exports = {
    createUser,
    getUser,
    updateUserName,
    updateUserLocation,
    updateUserPassword,
};