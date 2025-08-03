const { pool } = require('../config/database');

async function createPasswordResetTable() {
    try {
        // Create password_reset_tokens table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used BOOLEAN DEFAULT FALSE
      )
    `);

        // Create index for faster token lookups
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token 
      ON password_reset_tokens(token)
    `);

        // Create index for user_id lookups
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
      ON password_reset_tokens(user_id)
    `);

        console.log('✅ Password reset tokens table created successfully');
    } catch (error) {
        console.error('❌ Error creating password reset tokens table:', error);
        throw error;
    }
}

// Run the migration if this file is executed directly
if (require.main === module) {
    createPasswordResetTable()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { createPasswordResetTable }; 