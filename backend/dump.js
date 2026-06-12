const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function dump() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pos'
  });

  const [tables] = await conn.execute('SHOW TABLES');
  let sql = 'SET FOREIGN_KEY_CHECKS=0;\n\n';

  for (const row of tables) {
    const tableName = Object.values(row)[0];
    const [createTable] = await conn.execute(`SHOW CREATE TABLE ${tableName}`);
    sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
    sql += createTable[0]['Create Table'] + ';\n\n';
  }

  sql += 'SET FOREIGN_KEY_CHECKS=1;\n';
  fs.writeFileSync('database.sql', sql);
  console.log('Schema dumped to database.sql');
  process.exit(0);
}

dump().catch(console.error);
