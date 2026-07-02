import { db, queueSyncOperation } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { broadcastLocalMutation } from '../utils/webrtcManager';
import axios from 'axios';

// Fallback user for offline mock
const getCurrentUser = () => {
    const u = localStorage.getItem('pos_user');
    return u ? JSON.parse(u) : { id: 'cashier-1', role: 'cashier', tenantId: 'tenant-1' };
};

// Fire global event on mutations to trigger React re-renders if needed
const notifyChange = (table) => {
    window.dispatchEvent(new CustomEvent('db_changed', { detail: { table } }));
};

const offlineApi = {
  get: async (url, config = {}) => {
    try {
      if (url === '/auth/me') {
          return { data: getCurrentUser() };
      }
      
      const parts = url.split('/').filter(Boolean);
      const table = parts[0];
      const id = parts[1];
      const params = config.params || {};

      if (table === 'reports') {
        // Implement basic aggregations for reports
        if (id === 'dashboard') {
            const sales = await db.sales.toArray();
            const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
            
            const customersCount = db.customers ? await db.customers.count() : 0;
            const productsCount = db.products ? await db.products.count() : 0;

            return { 
                data: { 
                    today: { sales: { total: totalRevenue, count: sales.length }, expenses: 0 },
                    month: { sales: { total: totalRevenue, count: sales.length }, expenses: 0 },
                    products: productsCount,
                    low_stock: 0,
                    customers: customersCount,
                    last7Days: [{ date: 'اليوم', total: totalRevenue }],
                    topProducts: []
                } 
            };
        }
        return { data: null };
      }

      if (!db[table]) return { data: [] }; // Mock empty for unhandled tables

      if (id) {
          if (id === 'barcode') {
             const barcode = parts[2];
             const product = await db.products.where('barcode').equals(barcode).first();
             return { data: product || null };
          }
          const record = await db[table].get(id);
          // Load relationships for sales
          if (table === 'sales' && record) {
             const items = await db.sale_items.where('sale_id').equals(id).toArray();
             record.items = items;
          }
          return { data: record };
      }

      // Basic filtering
      let collection = db[table].toCollection();
      if (params.category_id) {
          collection = db[table].where('category_id').equals(params.category_id);
      }
      
      const records = await collection.toArray();
      return { data: records };
    } catch (e) {
      console.error('Dexie GET error:', e);
      return { data: [] };
    }
  },

  post: async (url, payload) => {
    if (url === '/login' || url === '/auth/login') {
        try {
            // Mock offline super admin login for easy testing
            if (payload.username === 'superadmin' && payload.password === '123456') {
                const superUser = { id: 'super-1', role: 'superadmin', name: 'Super Admin', tenantId: null };
                localStorage.setItem('pos_token', 'super-mock-token');
                localStorage.setItem('pos_user', JSON.stringify(superUser));
                return { data: { token: 'super-mock-token', user: superUser } };
            }

            // Attempt to login using the real Cloudflare Worker API
            const response = await axios.post('https://pos-saas-backend.adhomatya.workers.dev/api/login', payload);
            
            // Cache the token and user info for future offline use
            localStorage.setItem('pos_token', response.data.token);
            localStorage.setItem('pos_user', JSON.stringify(response.data.user));
            
            return { data: response.data };
        } catch (error) {
            // If offline, check if they have cached credentials (basic offline mock)
            console.error('Login error (might be offline):', error);
            const cachedUser = getCurrentUser();
            if (cachedUser) {
                return { data: { token: localStorage.getItem('pos_token') || 'offline-token', user: cachedUser } };
            }
            throw error;
        }
    }

    const parts = url.split('/').filter(Boolean);
    const table = parts[0];
    if (!db[table]) return { data: {} };

    const newId = uuidv4();
    const newRecord = { ...payload, id: newId, created_at: new Date().toISOString() };
    
    // Handle complex inserts like Sales + Sale Items
    if (table === 'sales') {
        await db.transaction('rw', db.sales, db.sale_items, db.products, async () => {
            const items = newRecord.items || [];
            delete newRecord.items;
            newRecord.invoice_number = `INV-${Date.now()}`;
            await db.sales.add(newRecord);
            for (let item of items) {
                await db.sale_items.add({ ...item, id: uuidv4(), sale_id: newId });
                // Decrease stock
                const product = await db.products.get(item.product_id);
                if (product) await db.products.update(item.product_id, { stock: product.stock - item.quantity });
            }
        });
    } else {
        await db[table].add(newRecord);
    }

    await queueSyncOperation(table, 'insert', newRecord);
    broadcastLocalMutation(table, 'insert', newRecord);
    notifyChange(table);
    
    return { data: newRecord };
  },

  put: async (url, payload) => {
    const parts = url.split('/').filter(Boolean);
    const table = parts[0];
    const id = parts[1];
    
    if (!db[table] || !id) return { data: {} };
    await db[table].update(id, payload);
    
    const updated = await db[table].get(id);
    await queueSyncOperation(table, 'update', updated);
    broadcastLocalMutation(table, 'update', updated);
    notifyChange(table);

    return { data: updated };
  },

  delete: async (url) => {
    const parts = url.split('/').filter(Boolean);
    const table = parts[0];
    const id = parts[1];
    
    if (!db[table] || !id) return { data: {} };
    await db[table].delete(id);
    
    await queueSyncOperation(table, 'delete', { id });
    broadcastLocalMutation(table, 'delete', { id });
    notifyChange(table);

    return { data: { success: true } };
  }
};

export default offlineApi;
