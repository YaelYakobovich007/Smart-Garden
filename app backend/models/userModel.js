/**
 * User Model
 *
 * Database access layer for users and password-reset flow.
 */
const { pool } = require('../config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/** Create a user if email not taken; returns true if created */
async function createUser(email, hashedPassword, fullName, country, city) {
    // Normalize email to lowercase
    const normalizedEmail = (email || '').toLowerCase().trim();

    // Check if user already exists (case-insensitive)
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
    if (existing.rows.length > 0) return false;
    await pool.query(
        'INSERT INTO users (email, password, full_name, country, city) VALUES ($1, $2, $3, $4, $5)',
        [normalizedEmail, hashedPassword, fullName, country, city]
    );
    return true;
}

/** Get a user by email (case-insensitive) */
async function getUser(email) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
    return result.rows[0] || null;
}

/** Get a user by id */
async function getUserById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
}

/** Update full_name by email and return the new name */
async function updateUserName(email, newName) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const result = await pool.query(
        'UPDATE users SET full_name = $1 WHERE LOWER(email) = LOWER($2) RETURNING full_name',
        [newName, normalizedEmail]
    );
    return result.rows[0]?.full_name || null;
}

/** Update location by email and return updated fields */
async function updateUserLocation(email, country, city) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const result = await pool.query(
        'UPDATE users SET country = $1, city = $2 WHERE LOWER(email) = LOWER($3) RETURNING country, city',
        [country, city, normalizedEmail]
    );
    return result.rows[0] || null;
}

/** Hash and update password for email */
async function updateUserPassword(email, newPassword) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
        'UPDATE users SET password = $1 WHERE LOWER(email) = LOWER($2) RETURNING id',
        [hashedPassword, normalizedEmail]
    );
    return result.rows.length > 0;
}

/** Create a 6-digit reset code for a user; returns token info */
async function createPasswordResetToken(email) {
    try {
        // Check if user exists (case-insensitive)
        const user = await getUser(email);
        if (!user) {
            return null;
        }

        // Generate 6-digit numeric code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Set expiration (1 hour from now)
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Delete any existing tokens for this user
        await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

        // Insert new code
        await pool.query(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, resetCode, expiresAt]
        );

        return {
            token: resetCode, // Keep token field name for compatibility
            email: user.email,
            fullName: user.full_name
        };
    } catch (error) {
        console.error('Error creating password reset code:', error);
        return null;
    }
}

/** Validate reset code and return joined token+user row if valid */
async function validatePasswordResetToken(token) {
    try {
        const result = await pool.query(`
            SELECT prt.*, u.email, u.full_name 
            FROM password_reset_tokens prt
            JOIN users u ON prt.user_id = u.id
            WHERE prt.token = $1 AND prt.used = FALSE AND prt.expires_at > NOW()
        `, [token]);

        return result.rows[0] || null;
    } catch (error) {
        console.error('Error validating password reset code:', error);
        return null;
    }
}

/** Use a valid reset code to set a new password and mark token used */
async function usePasswordResetToken(token, newPassword) {
    try {
        // Get token info
        const tokenInfo = await validatePasswordResetToken(token);
        if (!tokenInfo) {
            return false;
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await pool.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hashedPassword, tokenInfo.user_id]
        );

        // Mark token as used
        await pool.query(
            'UPDATE password_reset_tokens SET used = TRUE WHERE token = $1',
            [token]
        );

        return true;
    } catch (error) {
        console.error('Error using password reset token:', error);
        return false;
    }
}

/** Delete expired or used password reset tokens */
async function cleanupExpiredTokens() {
    try {
        await pool.query('DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = TRUE');
        console.log('Expired password reset tokens cleaned up');
    } catch (error) {
        console.error('Error cleaning up expired tokens:', error);
    }
}

module.exports = {
    createUser,
    getUser,
    getUserById,
    updateUserName,
    updateUserLocation,
    updateUserPassword,
    createPasswordResetToken,
    validatePasswordResetToken,
    usePasswordResetToken,
    cleanupExpiredTokens,
};