const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pos'
  });

  try {
    console.log('Adding remaining column...');
    await conn.query('ALTER TABLE sales ADD COLUMN remaining DECIMAL(10,2) DEFAULT 0.00 AFTER paid;');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') console.error(err);
  }

  try {
    console.log('Updating status enum...');
    await conn.query("ALTER TABLE sales MODIFY COLUMN status ENUM('completed','refunded','cancelled','paid','credit') DEFAULT 'completed';");
  } catch (err) {
    console.error(err);
  }

  try {
    console.log('Populating remaining for credit sales...');
    await conn.query("UPDATE sales SET remaining = total - paid WHERE payment_method = 'credit';");
  } catch (err) {
    console.error(err);
  }

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch(console.error);
