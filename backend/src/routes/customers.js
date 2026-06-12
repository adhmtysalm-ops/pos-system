const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/customers
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, has_debt, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let baseQuery = `
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id AND s.status != 'refunded'
      WHERE 1=1
    `;
    const params = [];
    
    if (search) {
      baseQuery += ' AND (c.name LIKE ? OR c.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    let query = `
      SELECT c.*, COALESCE(SUM(s.remaining), 0) as total_debt
      ${baseQuery}
      GROUP BY c.id
    `;
    
    if (has_debt === 'true') {
      query += ' HAVING total_debt > 0';
    }
    
    const [countRows] = await db.execute(`
      SELECT COUNT(*) as total FROM (
        ${query}
      ) as sub
    `, params);
    
    const totalCount = countRows[0].total;

    query += ` ORDER BY c.name LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const [rows] = await db.execute(query, params);

    res.json({
      data: rows,
      total: totalCount,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'اسم العميل مطلوب' });
    const [result] = await db.execute(
      'INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)',
      [name, phone || '', email || '', address || '', notes || '']
    );
    res.status(201).json({ id: result.insertId, message: 'تم إضافة العميل' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    await db.execute(
      'UPDATE customers SET name=?, phone=?, email=?, address=?, notes=? WHERE id=?',
      [name, phone || '', email || '', address || '', notes || '', req.params.id]
    );
    res.json({ message: 'تم تحديث العميل' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    if (req.params.id == 1) return res.status(400).json({ message: 'لا يمكن حذف العميل الافتراضي' });
    await db.execute('DELETE FROM customers WHERE id=?', [req.params.id]);
    res.json({ message: 'تم حذف العميل' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});


// GET /api/customers/:id/credit - Get all credit sales for a customer
router.get('/:id/credit', authMiddleware, async (req, res) => {
  try {
    const [sales] = await db.execute(
      `SELECT s.id, s.invoice_number, s.total, s.paid, s.remaining,
              s.created_at, s.status, s.notes
       FROM sales s
       WHERE s.customer_id = ? AND s.payment_method = 'credit'
       ORDER BY s.created_at DESC`,
      [req.params.id]
    );
    const [payments] = await db.execute(
      `SELECT p.id, p.sale_id, p.amount, p.created_at 
       FROM customer_payments p 
       WHERE p.customer_id = ? 
       ORDER BY p.created_at DESC`,
      [req.params.id]
    );
    const salesWithPayments = sales.map(s => ({
      ...s,
      payments: payments.filter(p => p.sale_id === s.id)
    }));
    const totalDebt = sales
      .filter(s => s.status !== 'refunded')
      .reduce((sum, s) => sum + parseFloat(s.remaining || 0), 0);
    res.json({ sales: salesWithPayments, totalDebt });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// POST /api/customers/sale/:saleId/pay - Record a payment on a credit sale
router.post('/sale/:saleId/pay', authMiddleware, adminOnly, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { amount } = req.body;
    const payAmt = parseFloat(amount || 0);
    if (payAmt <= 0) return res.status(400).json({ message: 'المبلغ يجب أن يكون أكبر من صفر' });

    const [saleRows] = await conn.execute('SELECT * FROM sales WHERE id = ?', [req.params.saleId]);
    if (!saleRows.length) return res.status(404).json({ message: 'الفاتورة غير موجودة' });
    const sale = saleRows[0];

    const newPaid = parseFloat(sale.paid) + payAmt;
    const newRemaining = Math.max(0, parseFloat(sale.remaining) - payAmt);
    const newStatus = newRemaining <= 0 ? 'paid' : 'credit';

    await conn.execute(
      'UPDATE sales SET paid = ?, remaining = ?, status = ? WHERE id = ?',
      [newPaid, newRemaining, newStatus, req.params.saleId]
    );
    await conn.execute(
      'INSERT INTO customer_payments (customer_id, sale_id, amount) VALUES (?, ?, ?)',
      [sale.customer_id, sale.id, payAmt]
    );
    await conn.commit();
    res.json({ message: 'تم تسجيل الدفعة بنجاح', remaining: newRemaining });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'خطأ في الخادم' });
  } finally {
    conn.release();
  }
});

module.exports = router;
