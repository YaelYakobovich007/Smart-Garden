const { pool } = require('../config/database');

async function addVersionColumn() {
    try {
        console.log('🔄 Starting database migration: Adding version column to plants table...');

        // Add version column if it doesn't exist
        await pool.query(`
      ALTER TABLE plants ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1
    `);

        console.log('✅ Version column added successfully to plants table');

        // Update existing plants to have version = 1
        const updateResult = await pool.query(`
      UPDATE plants SET version = 1 WHERE version IS NULL
    `);

        console.log(`✅ Updated ${updateResult.rowCount} existing plants with version = 1`);

        // Verify the migration
        const verifyResult = await pool.query(`
      SELECT COUNT(*) as total_plants, 
             COUNT(CASE WHEN version IS NOT NULL THEN 1 END) as plants_with_version
      FROM plants
    `);

        const { total_plants, plants_with_version } = verifyResult.rows[0];
        console.log(`📊 Migration verification:`);
        console.log(`   - Total plants: ${total_plants}`);
        console.log(`   - Plants with version: ${plants_with_version}`);

        if (total_plants == plants_with_version) {
            console.log('✅ Migration completed successfully!');
        } else {
            console.log('⚠️ Warning: Some plants may not have version column set');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error during migration:', error);
        console.error('Migration failed. Please check the database connection and try again.');
        process.exit(1);
    }
}

// Run the migration
addVersionColumn();
