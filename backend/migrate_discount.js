const db = require('./src/config/db');

async function migrate() {
  const conn = await db.getConnection();
  try {
    console.log('Adding max_discount_percent to users table...');
    await conn.execute('ALTER TABLE users ADD COLUMN max_discount_percent DECIMAL(5,2) DEFAULT 0.00;');
    console.log('Done!');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists.');
    } else {
      console.error(err);
    }
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
