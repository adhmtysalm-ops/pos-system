const db = require('./src/config/db');

async function resetData() {
  const conn = await db.getConnection();
  try {
    console.log('🔄 جاري مسح البيانات التجريبية وتنظيف قاعدة البيانات...');
    
    // Disable foreign key checks to allow truncating
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // 1. Clear Sales & Items
    await conn.execute('TRUNCATE TABLE sale_items');
    await conn.execute('TRUNCATE TABLE sales');
    
    // 2. Clear HR & Expenses
    await conn.execute('TRUNCATE TABLE expenses');
    await conn.execute('TRUNCATE TABLE attendance');
    await conn.execute('TRUNCATE TABLE employees');
    
    // 3. Clear Users (Keep Admin id=1)
    await conn.execute('DELETE FROM users WHERE id > 1');
    await conn.execute('ALTER TABLE users AUTO_INCREMENT = 2');
    
    // 4. Clear Customers (Keep default customer id=1)
    await conn.execute('DELETE FROM customers WHERE id > 1');
    await conn.execute('ALTER TABLE customers AUTO_INCREMENT = 2');
    
    // 5. Clear Inventory
    await conn.execute('TRUNCATE TABLE products');
    await conn.execute('TRUNCATE TABLE categories');
    await conn.execute('TRUNCATE TABLE suppliers');
    
    // Re-enable foreign key checks
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ تم مسح جميع البيانات التجريبية بنجاح!');
    console.log('✨ النظام الآن نظيف تماماً وجاهز للعمل الفعلي (تم الإبقاء على حساب الإدارة والإعدادات الأساسية فقط).');
  } catch (err) {
    console.error('❌ حدث خطأ أثناء مسح البيانات:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

resetData();
