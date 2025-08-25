const { pool } = require('../config/database');

async function testOptimisticLocking() {
    try {
        console.log('🧪 Testing optimistic locking implementation...');

        // First, let's check if version column exists
        const versionCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'plants' AND column_name = 'version'
    `);

        if (versionCheck.rows.length === 0) {
            console.log('❌ Version column not found. Please run the migration first:');
            console.log('   node "app backend/scripts/add-version-column.js"');
            return;
        }

        console.log('✅ Version column exists');

        // Get a sample plant to test with
        const samplePlant = await pool.query('SELECT plant_id, name, version FROM plants LIMIT 1');

        if (samplePlant.rows.length === 0) {
            console.log('❌ No plants found in database. Please add a plant first.');
            return;
        }

        const plant = samplePlant.rows[0];
        console.log(`📝 Testing with plant: ${plant.name} (ID: ${plant.plant_id}, Version: ${plant.version})`);

        // Simulate concurrent updates
        console.log('\n🔄 Simulating concurrent updates...');

        // Update 1: Should succeed
        const update1 = await pool.query(`
      UPDATE plants 
      SET name = $1, version = version + 1, updated_at = CURRENT_TIMESTAMP
      WHERE plant_id = $2 AND version = $3
      RETURNING plant_id, name, version
    `, [`${plant.name}_updated`, plant.plant_id, plant.version]);

        if (update1.rows.length > 0) {
            console.log(`✅ First update succeeded: ${update1.rows[0].name} (Version: ${update1.rows[0].version})`);
        } else {
            console.log('❌ First update failed');
        }

        // Update 2: Should fail (using old version)
        const update2 = await pool.query(`
      UPDATE plants 
      SET name = $1, version = version + 1, updated_at = CURRENT_TIMESTAMP
      WHERE plant_id = $2 AND version = $3
      RETURNING plant_id, name, version
    `, [`${plant.name}_concurrent`, plant.plant_id, plant.version]);

        if (update2.rows.length === 0) {
            console.log('✅ Second update correctly failed (optimistic locking working)');
        } else {
            console.log('❌ Second update should have failed but succeeded');
        }

        // Update 3: Should succeed (using new version)
        const newVersion = plant.version + 1;
        const update3 = await pool.query(`
      UPDATE plants 
      SET name = $1, version = version + 1, updated_at = CURRENT_TIMESTAMP
      WHERE plant_id = $2 AND version = $3
      RETURNING plant_id, name, version
    `, [`${plant.name}_final`, plant.plant_id, newVersion]);

        if (update3.rows.length > 0) {
            console.log(`✅ Third update succeeded: ${update3.rows[0].name} (Version: ${update3.rows[0].version})`);
        } else {
            console.log('❌ Third update failed');
        }

        // Test delete functionality
        console.log('\n🗑️ Testing delete with optimistic locking...');

        // Get another plant for delete test
        const deleteTestPlant = await pool.query('SELECT plant_id, name, version FROM plants LIMIT 1 OFFSET 1');

        if (deleteTestPlant.rows.length === 0) {
            console.log('⚠️ No second plant found for delete test');
        } else {
            const plantToDelete = deleteTestPlant.rows[0];
            console.log(`📝 Testing delete with plant: ${plantToDelete.name} (ID: ${plantToDelete.plant_id}, Version: ${plantToDelete.version})`);

            // Simulate concurrent delete
            const delete1 = await pool.query(`
        DELETE FROM plants 
        WHERE plant_id = $1 AND version = $2
        RETURNING plant_id, name, version
      `, [plantToDelete.plant_id, plantToDelete.version]);

            if (delete1.rows.length > 0) {
                console.log(`✅ First delete succeeded: ${delete1.rows[0].name}`);
            } else {
                console.log('❌ First delete failed');
            }

            // Try to delete the same plant again (should fail)
            const delete2 = await pool.query(`
        DELETE FROM plants 
        WHERE plant_id = $1 AND version = $2
        RETURNING plant_id, name, version
      `, [plantToDelete.plant_id, plantToDelete.version]);

            if (delete2.rows.length === 0) {
                console.log('✅ Second delete correctly failed (optimistic locking working)');
            } else {
                console.log('❌ Second delete should have failed but succeeded');
            }
        }

        console.log('\n🎉 Optimistic locking test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

testOptimisticLocking();
