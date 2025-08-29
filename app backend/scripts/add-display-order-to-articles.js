const { pool } = require('../config/database');

async function addDisplayOrderToArticles() {
    try {
        console.log('🔄 Adding display_order column to articles table...');

        // Add display_order column
        await pool.query(`
            ALTER TABLE articles 
            ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999
        `);

        console.log('✅ Added display_order column');

        // Set the "10 Organic..." article to be first (order 1)
        const result = await pool.query(`
            UPDATE articles 
            SET display_order = 1 
            WHERE title LIKE '%10 Organic%' OR title LIKE '%organic%'
            RETURNING article_id, title, display_order
        `);

        console.log('✅ Updated display_order for organic article:', result.rows);

        // Set other articles to have higher order numbers
        await pool.query(`
            UPDATE articles 
            SET display_order = article_id + 10 
            WHERE display_order = 999
        `);

        console.log('✅ Set display_order for remaining articles');

        // Show final result
        const finalResult = await pool.query(`
            SELECT article_id, title, display_order 
            FROM articles 
            ORDER BY display_order ASC
        `);

        console.log('📋 Final article order:');
        finalResult.rows.forEach((row, index) => {
            console.log(`${index + 1}. ID: ${row.article_id} - "${row.title}" (order: ${row.display_order})`);
        });

    } catch (error) {
        console.error('❌ Error adding display_order:', error);
    } finally {
        await pool.end();
    }
}

addDisplayOrderToArticles();
