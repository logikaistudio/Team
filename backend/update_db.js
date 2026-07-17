const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'epcs_db'
});

async function run() {
  try {
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_percent DECIMAL(5,2) DEFAULT 0.00');
    console.log('Added progress_percent to projects table.');
    await pool.query('ALTER TABLE wbs ADD COLUMN IF NOT EXISTS progress_percent DECIMAL(5,2) DEFAULT 0.00');
    console.log('Added progress_percent to wbs table.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
