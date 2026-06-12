const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { body, validationResult, param } = require('express-validator');

// Validation middleware
const validateSaleInput = [
  body('items').isArray({ min: 1 }).withMessage('يجب إضافة منتجات للفاتورة'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('الكمية يجب أن تكون أكبر من صفر'),
  body('items.*.unit_price').isFloat({ min: 0.01 }).withMessage('السعر يجب أن يكون أكبر من صفر'),
  body('items.*.total').isFloat({ min: 0.01 }).withMessage('الإجمالي يجب أن يكون أكبر من صفر'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('الخصم يجب أن يكون موجب'),
  body('tax').optional().isFloat({ min: 0 }).withMessage('الضريبة يجب أن تكون موجبة'),
  body('paid').optional().isFloat({ min: 0 }).withMessage('المبلغ المدفوع يجب أن يكون موجب')
];

const validateIdParam = param('id').isInt().withMessage('معرّف غير صالح');

// GET /api/sales - Get sales list with pagination
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date_from, date_to, customer_id, status, search, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 per page
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT s.*, c.name as customer_name, u.name as cashier_name
      FROM sales s 
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Cashier only sees their own sales
    if (req.user.role === 'cashier') {
      query += ' AND s.user_id = ?';
      params.push(req.user.id);
    }

    if (search && search.trim()) {
      query += ' AND (s.invoice_number LIKE ? OR c.name LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    
    if (customer_id && parseInt(customer_id)) {
      query += ' AND s.customer_id = ?';
      params.push(parseInt(customer_id));
    }
    
    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }
    
    if (date_from) {
      query += ' AND DATE(s.created_at) >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      query += ' AND DATE(s.created_at) <= ?';
      params.push(date_to);
    }

    // Get total count
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/i, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await db.execute(countQuery, params);
    const total = (countResult[0] && countResult[0].total) ? countResult[0].total : 0;

    // Get paginated results
    query += ` ORDER BY s.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
    const [rows] = await db.execute(query, params);
    
    res.json({
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ 
      message: 'خطأ في الخادم',
      ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
  }
});

// GET /api/sales/:id - Get single sale by ID
router.get('/:id', 
  authMiddleware,
  validateIdParam,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const [sale] = await db.execute(
        `SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.name as cashier_name
         FROM sales s 
         LEFT JOIN customers c ON s.customer_id = c.id 
         LEFT JOIN users u ON s.user_id = u.id 
         WHERE s.id = ?`,
        [req.params.id]
      );
      
      if (sale.length === 0) {
        return res.status(404).json({ message: 'الفاتورة غير موجودة' });
      }

      const [items] = await db.execute(
        'SELECT si.*, p.barcode FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?',
        [req.params.id]
      );

      res.json({ ...sale[0], items });
    } catch (err) {
      console.error('Error fetching sale:', err);
      res.status(500).json({ 
        message: 'خطأ في الخادم',
        ...(process.env.NODE_ENV === 'development' && { error: err.message })
      });
    }
  }
);

// POST /api/sales - Create new sale
router.post('/',
  authMiddleware,
  validateSaleInput,
  async (req, res) => {
    const conn = await db.getConnection();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await conn.beginTransaction();

      const { customer_id, items, discount, discount_type, tax, paid, payment_method, notes } = req.body;

      // Validate items
      if (!items || items.length === 0) {
        await conn.rollback();
        return res.status(400).json({ message: 'يجب إضافة منتجات للفاتورة' });
      }

      // Validate each item
      for (const item of items) {
        if (!item.product_id) {
          await conn.rollback();
          return res.status(400).json({ message: 'كل منتج يجب أن يكون له معرّف' });
        }
        if (item.quantity <= 0) {
          await conn.rollback();
          return res.status(400).json({ message: 'الكمية يجب أن تكون أكبر من صفر' });
        }
        if (item.unit_price < 0) {
          await conn.rollback();
          return res.status(400).json({ message: 'السعر يجب أن يكون موجب' });
        }
      }

      // Check stock availability
      for (const item of items) {
        const [product] = await conn.execute('SELECT stock FROM products WHERE id = ?', [item.product_id]);
        if (product.length === 0) {
          await conn.rollback();
          return res.status(404).json({ message: `المنتج ${item.product_id} غير موجود` });
        }
        if (product[0].stock < item.quantity) {
          await conn.rollback();
          return res.status(400).json({ message: `المخزون غير كافي للمنتج ${item.product_name}` });
        }
      }

      // Calculate totals
      let subtotal = 0;
      for (const item of items) {
        subtotal += parseFloat(item.total) || 0;
      }

      const discountAmt = discount_type === 'percent' 
        ? (subtotal * (parseFloat(discount) || 0)) / 100 
        : (parseFloat(discount) || 0);

      // Validate cashier discount limit
      if (req.user.role === 'cashier' && discountAmt > 0) {
        const [uRows] = await conn.execute('SELECT max_discount_percent FROM users WHERE id=?', [req.user.id]);
        const maxDiscount = parseFloat(uRows[0].max_discount_percent || 0);
        const discountPercent = (discountAmt / subtotal) * 100;
        if (discountPercent > maxDiscount) {
          await conn.rollback();
          return res.status(400).json({ message: `تجاوزت الحد المسموح لك للخصم (${maxDiscount}%)` });
        }
      }
      
      const taxAmt = parseFloat(tax) || 0;
      const total = subtotal - discountAmt + taxAmt;
      
      // Validate total is positive
      if (total < 0) {
        await conn.rollback();
        return res.status(400).json({ message: 'الإجمالي لا يمكن أن يكون سالب' });
      }

      let paidAmt = (paid !== undefined && paid !== null && paid !== '') ? parseFloat(paid) : total;
      if (payment_method === 'credit' && (!paid || paid === '')) {
        paidAmt = 0;
      }

      // Validate payment method
      const validPaymentMethods = ['cash', 'card', 'credit', 'mixed'];
      const paymentMethod = validPaymentMethods.includes(payment_method) ? payment_method : 'cash';
      
      const change = Math.max(0, paidAmt - total);
      const remainingAmt = payment_method === 'credit' ? (total - paidAmt) : 0;
      const saleStatus = payment_method === 'credit' ? 'credit' : 'completed';

      const [saleResult] = await conn.execute(
        `INSERT INTO sales (invoice_number, customer_id, user_id, subtotal, discount, discount_type, tax, total, paid, remaining, change_amount, payment_method, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [null, customer_id || 1, req.user.id, subtotal, discountAmt, discount_type || 'fixed', taxAmt, total, paidAmt, remainingAmt, change, paymentMethod, saleStatus, notes || '']
      );

      const saleId = saleResult.insertId;
      const invoiceNumber = `INV-${saleId.toString().padStart(6, '0')}`;
      
      // Update invoice number after insertion
      await conn.execute('UPDATE sales SET invoice_number = ? WHERE id = ?', [invoiceNumber, saleId]);

      // Insert items and update stock
      for (const item of items) {
        await conn.execute(
          'INSERT INTO sale_items (sale_id, product_id, product_name, barcode, quantity, unit_price, discount, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [saleId, item.product_id, item.product_name, item.barcode || '', item.quantity, item.unit_price, item.discount || 0, item.total]
        );

        if (item.product_id) {
          await conn.execute(
            'UPDATE products SET stock = stock - ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }

      // Update customer balance if applicable
      if (customer_id && remainingAmt > 0) {
        await conn.execute(
          'UPDATE customers SET balance = balance + ? WHERE id = ?',
          [remainingAmt, customer_id]
        );
      }

      await conn.commit();
      res.status(201).json({ 
        id: saleId, 
        invoice_number: invoiceNumber, 
        subtotal,
        discount: discountAmt,
        tax: taxAmt,
        total, 
        change, 
        remaining: remainingAmt,
        message: 'تم إنشاء الفاتورة بنجاح' 
      });
    } catch (err) {
      await conn.rollback();
      console.error('Error creating sale:', err);
      res.status(500).json({ 
        message: 'خطأ في إنشاء الفاتورة',
        ...(process.env.NODE_ENV === 'development' && { error: err.message })
      });
    } finally {
      conn.release();
    }
  }
);

// PUT /api/sales/:id/refund - Refund sale
router.put('/:id/refund',
  authMiddleware,
  validateIdParam,
  async (req, res) => {
    const conn = await db.getConnection();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await conn.beginTransaction();
      const [sale] = await conn.execute('SELECT * FROM sales WHERE id=?', [req.params.id]);
      
      if (sale.length === 0) {
        await conn.rollback();
        return res.status(404).json({ message: 'الفاتورة غير موجودة' });
      }

      if (sale[0].status === 'refunded') {
        await conn.rollback();
        return res.status(400).json({ message: 'تم استرجاع هذه الفاتورة مسبقاً' });
      }

      // Restore stock
      const [items] = await conn.execute('SELECT * FROM sale_items WHERE sale_id=?', [req.params.id]);
      for (const item of items) {
        if (item.product_id) {
          await conn.execute('UPDATE products SET stock = stock + ? WHERE id=?', [item.quantity, item.product_id]);
        }
      }

      // Restore customer balance
      if (sale[0].customer_id && sale[0].remaining > 0) {
        await conn.execute(
          'UPDATE customers SET balance = balance - ? WHERE id = ?',
          [sale[0].remaining, sale[0].customer_id]
        );
      }

      await conn.execute('UPDATE sales SET status=? WHERE id=?', ['refunded', req.params.id]);
      await conn.commit();
      res.json({ message: 'تم استرجاع الفاتورة وإعادة المخزون بنجاح' });
    } catch (err) {
      await conn.rollback();
      console.error('Error refunding sale:', err);
      res.status(500).json({ 
        message: 'خطأ في استرجاع الفاتورة',
        ...(process.env.NODE_ENV === 'development' && { error: err.message })
      });
    } finally {
      conn.release();
    }
  }
);

// DELETE /api/sales/:id - Hard delete sale
router.delete('/:id',
  authMiddleware,
  adminOnly,
  validateIdParam,
  async (req, res) => {
    const conn = await db.getConnection();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await conn.beginTransaction();
      const [sale] = await conn.execute('SELECT * FROM sales WHERE id=?', [req.params.id]);
      
      if (sale.length === 0) {
        await conn.rollback();
        return res.status(404).json({ message: 'الفاتورة غير موجودة' });
      }

      // Restore stock if not already refunded
      if (sale[0].status !== 'refunded') {
        const [items] = await conn.execute('SELECT * FROM sale_items WHERE sale_id=?', [req.params.id]);
        for (const item of items) {
          if (item.product_id) {
            await conn.execute('UPDATE products SET stock = stock + ? WHERE id=?', [item.quantity, item.product_id]);
          }
        }
      }

      // Restore customer balance
      if (sale[0].customer_id && sale[0].remaining > 0) {
        await conn.execute(
          'UPDATE customers SET balance = balance - ? WHERE id = ?',
          [sale[0].remaining, sale[0].customer_id]
        );
      }

      await conn.execute('DELETE FROM sale_items WHERE sale_id=?', [req.params.id]);
      await conn.execute('DELETE FROM sales WHERE id=?', [req.params.id]);
      
      await conn.commit();
      res.json({ message: 'تم حذف الفاتورة نهائياً وإعادة المخزون بنجاح' });
    } catch (err) {
      await conn.rollback();
      console.error('Error deleting sale:', err);
      res.status(500).json({ 
        message: 'خطأ في حذف الفاتورة',
        ...(process.env.NODE_ENV === 'development' && { error: err.message })
      });
    } finally {
      conn.release();
    }
  }
);

module.exports = router;
