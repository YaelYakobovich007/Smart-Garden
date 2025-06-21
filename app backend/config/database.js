const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // 5 seconds
  ssl: {
    rejectUnauthorized: false
  }
};

const pool = new Pool(dbConfig);

// Function to test the database connection
async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Database connected successfully to GCP Cloud SQL!');
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (client) {
      client.release();
    }
    // Exit the process if we can't connect to the database
    process.exit(1);
  }
}

module.exports = {
  pool,
  testConnection
};