const bcrypt = require('bcryptjs');
const db = require('./src/config/db');
require('dotenv').config();

const fs = require('fs');
const path = require('path');

async function seed() {
  console.log('🌱 Starting database seed...');
  
  try {
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'src/config/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema.split(';').filter(s => s.trim().length > 0);
    
    for (const stmt of statements) {
      const cleaned = stmt.trim();
      if (cleaned) {
        try {
          await db.execute(cleaned);
        } catch (err) {
          if (!err.message.includes('already exists') && !err.message.includes('Duplicate entry')) {
            console.warn('Warning:', err.message.substring(0, 100));
          }
        }
      }
    }
    
    console.log('✅ Schema created successfully');

    // Create default admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    try {
      await db.execute(
        `INSERT INTO users (id, name, username, password, role) VALUES (1, 'مدير النظام', 'admin', ?, 'admin')
         ON DUPLICATE KEY UPDATE password = ?`,
        [adminPassword, adminPassword]
      );
      console.log('✅ Admin user created: username=admin, password=admin123');
    } catch (err) {
      console.log('ℹ️  Admin user already exists');
    }

    // Create sample cashier
    const cashierPassword = await bcrypt.hash('cashier123', 10);
    try {
      await db.execute(
        `INSERT IGNORE INTO users (name, username, password, role) VALUES ('كاشير', 'cashier', ?, 'cashier')`,
        [cashierPassword]
      );
      console.log('✅ Cashier user created: username=cashier, password=cashier123');
    } catch (err) {
      console.log('ℹ️  Cashier user already exists');
    }

    console.log('\n🎉 Database seeded successfully!');
    console.log('📋 Login credentials:');
    console.log('   Admin: admin / admin123');
    console.log('   Cashier: cashier / cashier123');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();
