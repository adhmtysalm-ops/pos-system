const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');



// GET /api/purchases
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT po.*, s.name as supplier_name, u.name as user_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN users u ON po.user_id = u.id
       ORDER BY po.created_at DESC LIMIT 500`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// GET /api/purchases/:id
router.get('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [order] = await db.execute(
      `SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE po.id=?`,
      [req.params.id]
    );
    if (order.length === 0) return res.status(404).json({ message: 'الأمر غير موجود' });
    const [items] = await db.execute(
      'SELECT * FROM purchase_items WHERE order_id=?',
      [req.params.id]
    );
    res.json({ ...order[0], items });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// POST /api/purchases
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { supplier_id, items, discount, paid, notes, status } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'يجب إضافة منتجات' });
    }

    let subtotal = 0;
    for (const item of items) subtotal += parseFloat(item.total);

    const discountAmt = parseFloat(discount || 0);
    const total = subtotal - discountAmt;
    const paidAmt = parseFloat(paid || total);
    const remaining = total - paidAmt;

    const [result] = await conn.execute(
      `INSERT INTO purchase_orders (supplier_id, user_id, order_number, subtotal, discount, total, paid, remaining, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [supplier_id || null, req.user.id, null, subtotal, discountAmt, total, paidAmt, remaining, status || 'received', notes || '']
    );

    const orderId = result.insertId;
    const orderNumber = `PO-${orderId.toString().padStart(6, '0')}`;
    
    // Update order number after insertion to avoid race conditions
    await conn.execute('UPDATE purchase_orders SET order_number = ? WHERE id = ?', [orderNumber, orderId]);

    for (const item of items) {
      await conn.execute(
        'INSERT INTO purchase_items (order_id, product_id, product_name, quantity, cost_price, total) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, item.product_id || null, item.product_name, item.quantity, item.cost_price, item.total]
      );

      if (item.product_id && status !== 'pending') {
        let updateQuery = 'UPDATE products SET stock = stock + ?, cost_price = ?';
        let updateParams = [item.quantity, item.cost_price];
        if (item.sell_price !== undefined && item.sell_price !== '') {
          updateQuery += ', sell_price = ?';
          updateParams.push(item.sell_price);
        }
        updateQuery += ' WHERE id = ?';
        updateParams.push(item.product_id);
        
        await conn.execute(updateQuery, updateParams);
      }
    }

    await conn.commit();
    res.status(201).json({ id: orderId, order_number: orderNumber, message: 'تم إنشاء أمر الشراء' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'خطأ في إنشاء أمر الشراء' });
  } finally {
    conn.release();
  }
});

// PUT /api/purchases/:id
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    const [oldOrder] = await conn.execute('SELECT status FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!oldOrder.length) return res.status(404).json({ message: 'الأمر غير موجود' });

    const [oldItems] = await conn.execute('SELECT product_id, quantity FROM purchase_items WHERE order_id = ?', [req.params.id]);
    
    if (oldOrder[0].status !== 'pending') {
      for (const oldItem of oldItems) {
        if (oldItem.product_id) {
          await conn.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [oldItem.quantity, oldItem.product_id]);
        }
      }
    }
    
    await conn.execute('DELETE FROM purchase_items WHERE order_id = ?', [req.params.id]);

    const { supplier_id, items, discount, paid, notes, status } = req.body;
    
    let subtotal = 0;
    for (const item of items) subtotal += parseFloat(item.total);
    
    const discountAmt = parseFloat(discount || 0);
    const total = subtotal - discountAmt;
    const paidAmt = parseFloat(paid || total);
    const remaining = total - paidAmt;

    await conn.execute(
      `UPDATE purchase_orders SET supplier_id=?, subtotal=?, discount=?, total=?, paid=?, remaining=?, status=?, notes=? WHERE id=?`,
      [supplier_id || null, subtotal, discountAmt, total, paidAmt, remaining, status || 'received', notes || '', req.params.id]
    );

    for (const item of items) {
      await conn.execute(
        'INSERT INTO purchase_items (order_id, product_id, product_name, quantity, cost_price, total) VALUES (?, ?, ?, ?, ?, ?)',
        [req.params.id, item.product_id || null, item.product_name, item.quantity, item.cost_price, item.total]
      );

      if (item.product_id && status !== 'pending') {
        let updateQuery = 'UPDATE products SET stock = stock + ?, cost_price = ?';
        let updateParams = [item.quantity, item.cost_price];
        if (item.sell_price !== undefined && item.sell_price !== '') {
          updateQuery += ', sell_price = ?';
          updateParams.push(item.sell_price);
        }
        updateQuery += ' WHERE id = ?';
        updateParams.push(item.product_id);
        
        await conn.execute(updateQuery, updateParams);
      }
    }

    await conn.commit();
    res.json({ message: 'تم تحديث أمر الشراء' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'خطأ في تحديث أمر الشراء' });
  } finally {
    conn.release();
  }
});

module.exports = router;
