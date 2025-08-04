const { pool } = require('../config/database');

async function migrateSensorIdToSensorPort() {
    try {
        console.log('Starting sensor_id to sensor_port migration (clean version)...');

        // Check if sensor_port column already exists
        const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'plants' AND column_name = 'sensor_port'
    `);

        if (checkColumn.rows.length > 0) {
            console.log('sensor_port column already exists. Migration may have already been run.');
            return;
        }

        // Step 1: Drop old sensor_id index
        console.log('Dropping old sensor_id index...');
        await pool.query(`
      DROP INDEX IF EXISTS idx_plants_sensor_id
    `);

        // Step 2: Drop old sensor_id column
        console.log('Dropping sensor_id column...');
        await pool.query(`
      ALTER TABLE plants DROP COLUMN IF EXISTS sensor_id
    `);

        // Step 3: Add new sensor_port column
        console.log('Adding sensor_port column...');
        await pool.query(`
      ALTER TABLE plants ADD COLUMN sensor_port VARCHAR(100)
    `);

        // Step 4: Create new index on sensor_port
        console.log('Creating sensor_port index...');
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_plants_sensor_port ON plants(sensor_port)
    `);

        console.log('✅ Migration completed successfully!');
        console.log('- sensor_id column deleted');
        console.log('- sensor_port column added');
        console.log('- Index updated to use sensor_port');
        console.log('- No data was copied (clean start)');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

migrateSensorIdToSensorPort();