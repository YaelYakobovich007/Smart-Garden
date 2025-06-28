const { pool } = require('../config/database');

async function updateImageUrlColumn() {
  try {
    console.log('Updating image_url column size...');
    
    // Update the column size to accommodate longer signed URLs
    await pool.query(`
      ALTER TABLE plants 
      ALTER COLUMN image_url TYPE VARCHAR(2000)
    `);
    
    console.log('✅ image_url column updated to VARCHAR(2000)');
    console.log('This will accommodate the longer signed URLs from Google Cloud Storage');
    
  } catch (error) {
    console.error('❌ Failed to update image_url column:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

updateImageUrlColumn(); 