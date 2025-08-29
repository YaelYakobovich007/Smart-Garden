const { pool } = require('../config/database');

async function addIrrigationStateColumns() {
  try {
    console.log('🔄 Starting migration: add irrigation state columns to plants...');

    await pool.query(`
      ALTER TABLE plants
        ADD COLUMN IF NOT EXISTS irrigation_mode TEXT DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS irrigation_start_at TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS irrigation_end_at TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS irrigation_session_id TEXT NULL
    `);
    console.log('✅ Columns added (or already existed).');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_plants_irrigation_mode ON plants (irrigation_mode)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_plants_irrigation_end_at ON plants (irrigation_end_at)
    `);
    console.log('✅ Indexes created.');

    console.log('🎉 Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    try { await pool.end(); } catch {}
  }
}

addIrrigationStateColumns();


