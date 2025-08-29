require('dotenv').config();
const { pool } = require('../config/database');

async function checkArticleContent() {
    try {
        console.log('🔍 Checking article content in database...\n');

        // Get article details including content
        const result = await pool.query(`
      SELECT 
        article_id,
        title,
        category,
        LENGTH(content) as content_length,
        LEFT(content, 100) as content_preview
      FROM articles 
      ORDER BY article_id
    `);

        if (result.rows.length === 0) {
            console.log('❌ No articles found in database');
            return;
        }

        console.log(`📚 Found ${result.rows.length} articles:\n`);

        result.rows.forEach(article => {
            console.log(`📄 Article ID: ${article.article_id}`);
            console.log(`   Title: ${article.title}`);
            console.log(`   Category: ${article.category}`);
            console.log(`   Content Length: ${article.content_length} characters`);
            console.log(`   Content Preview: ${article.content_preview}...`);
            console.log('');
        });

        // Check if content column exists
        const columnCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'articles' AND column_name = 'content'
    `);

        if (columnCheck.rows.length > 0) {
            console.log('✅ Content column exists in articles table');
            console.log(`   Data type: ${columnCheck.rows[0].data_type}`);
        } else {
            console.log('❌ Content column does not exist in articles table');
        }

    } catch (error) {
        console.error('❌ Error checking article content:', error);
    } finally {
        await pool.end();
    }
}

checkArticleContent();
