const { pool } = require('../config/database');

/**
 * Setup Articles Table Script
 * 
 * This script creates the articles table and its indexes.
 * It should be run separately from the main database setup.
 */

async function setupArticlesTable() {
    try {
        console.log('Creating articles table...');

        // Articles table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        article_id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        read_time VARCHAR(50) NOT NULL,
        image_url VARCHAR(2000),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('Articles table created');

        // Create indexes for articles table
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category)
    `);
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at)
    `);
        console.log('Articles table indexes created');

        // Create updated_at trigger for articles table
        try {
            await pool.query(`DROP TRIGGER IF EXISTS update_articles_updated_at ON articles`);
        } catch (error) {
            // Ignore errors if trigger doesn't exist
        }

        await pool.query(`
      CREATE TRIGGER update_articles_updated_at 
        BEFORE UPDATE ON articles 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column()
    `);
        console.log('Articles table trigger created');

        console.log('✅ Articles table setup completed successfully!');

    } catch (error) {
        console.error('❌ Articles table setup failed:', error);
    } finally {
        await pool.end();
    }
}

// Run setup if this script is executed directly
if (require.main === module) {
    setupArticlesTable();
}

module.exports = { setupArticlesTable };
