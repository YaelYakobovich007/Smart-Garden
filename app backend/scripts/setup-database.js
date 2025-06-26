const { pool } = require('../config/database');

async function setupDatabase() {
    try {
        console.log('Creating database tables...');

        // Users table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        full_name VARCHAR(255),
        country VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('Users table created');

        // Create index on email for faster lookups
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

        // Plants table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS plants (
        plant_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        ideal_moisture DECIMAL(3,2),
        water_limit DECIMAL(5,2) NOT NULL,
        irrigation_schedule VARCHAR(255),
        plant_type VARCHAR(100),
        sensor_id VARCHAR(100),
        valve_id VARCHAR(100),
        last_watered TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
        console.log('Plants table created');

        // Create indexes for better performance
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_plants_user_id ON plants(user_id)
    `);
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_plants_sensor_id ON plants(sensor_id)
    `);
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_plants_valve_id ON plants(valve_id)
    `);

        // User sessions table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
        console.log('User sessions table created');

        // Create indexes for sessions
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)
    `);
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at)
    `);

        // Sensor readings table with JSONB for flexible data
        await pool.query(`
      CREATE TABLE IF NOT EXISTS sensor_readings (
        sensor_id SERIAL PRIMARY KEY,
        plant_id INTEGER NOT NULL,
        moisture_level DECIMAL(3,2),
        temperature DECIMAL(4,2),
        reading_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plant_id) REFERENCES plants(plant_id) ON DELETE CASCADE
      )
    `);
        console.log('Sensor readings table created');

        // Create indexes for sensor readings
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_readings_plant_timestamp ON sensor_readings(plant_id, reading_timestamp)
    `);
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON sensor_readings(reading_timestamp)
    `);

        // Irrigation events table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS irrigation_events (
        id SERIAL PRIMARY KEY,
        plant_id INTEGER NOT NULL,
        valve_id VARCHAR(100),
        duration_seconds INTEGER,
        water_amount_ml INTEGER,
        event_data JSONB, -- For additional event metadata
        event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plant_id) REFERENCES plants(plant_id) ON DELETE CASCADE
      )
    `);
        console.log('Irrigation events table created');

        // Create indexes for irrigation events
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_irrigation_plant_timestamp ON irrigation_events(plant_id, event_timestamp)
    `);

        // Create updated_at trigger function
        await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

        // Create trigger for plants table
        await pool.query(`
      CREATE TRIGGER update_plants_updated_at 
        BEFORE UPDATE ON plants 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column()
    `);

        console.log('Database setup completed successfully!');
        console.log('Tables created: users, plants, user_sessions, sensor_readings, irrigation_events');

    } catch (error) {
        console.error('Database setup failed:', error);
    } finally {
        await pool.end();
    }
}

setupDatabase();