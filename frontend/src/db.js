import Dexie from 'dexie';

export const db = new Dexie('POS_LocalDB');

db.version(1).stores({
  // --- Core Local Tables (mirrors Cloudflare D1 for the logged-in tenant) ---
  products: 'id, category_id, barcode, name, sell_price, stock, active, updated_at',
  categories: 'id, name',
  sales: 'id, invoice_number, customer_id, user_id, total, created_at, status',
  sale_items: 'id, sale_id, product_id',
  customers: 'id, name, phone',
  employees: 'id, name, user_id',
  attendance: 'id, employee_id, date',
  settings: 'id, store_name, currency',
  
  // --- Sync Queue (Stores offline operations to be pushed to Cloudflare) ---
  sync_queue: '++id, table_name, action, timestamp, synced'
});

// Helper to add an operation to the sync queue
export async function queueSyncOperation(tableName, action, data) {
  await db.sync_queue.add({
    table_name: tableName,
    action: action, // 'insert', 'update', 'delete'
    data: data,
    timestamp: new Date().toISOString(),
    synced: 0
  });
}
