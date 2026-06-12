const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../public/uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// GET /api/products
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, category_id, low_stock } = req.query;
    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.active = 1
    `;
    const params = [];

    if (search) {
      query += ' AND (p.name LIKE ? OR p.barcode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(category_id);
    }
    if (low_stock === '1') {
      query += ' AND p.stock <= p.min_stock';
    }

    query += ' ORDER BY p.name';
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// GET /api/products/barcode/:barcode
router.get('/barcode/:barcode', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.barcode = ? AND p.active = 1',
      [req.params.barcode]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'المنتج غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// GET /api/products/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'المنتج غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// POST /api/products
router.post('/', authMiddleware, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { category_id, name, barcode, description, cost_price, sell_price, stock, min_stock, unit } = req.body;
    if (!name || !sell_price) {
      return res.status(400).json({ message: 'اسم المنتج والسعر مطلوبان' });
    }
    let image = '';
    if (req.file) image = `/uploads/products/${req.file.filename}`;

    const [result] = await db.execute(
      `INSERT INTO products (category_id, name, barcode, description, cost_price, sell_price, stock, min_stock, unit, image) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [category_id || null, name, barcode || null, description || '', cost_price || 0, sell_price, stock || 0, min_stock || 0, unit || 'قطعة', image]
    );
    res.status(201).json({ id: result.insertId, message: 'تم إضافة المنتج' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'الباركود موجود بالفعل' });
    }
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// PUT /api/products/:id
router.put('/:id', authMiddleware, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { category_id, name, barcode, description, cost_price, sell_price, stock, min_stock, unit, active } = req.body;
    
    let imageQuery = '';
    let params = [category_id || null, name, barcode || null, description || '', cost_price || 0, sell_price, stock || 0, min_stock || 0, unit || 'قطعة', active !== undefined ? active : 1];
    
    if (req.file) {
      imageQuery = ', image=?';
      params.push(`/uploads/products/${req.file.filename}`);
    }
    params.push(req.params.id);

    await db.execute(
      `UPDATE products SET category_id=?, name=?, barcode=?, description=?, cost_price=?, sell_price=?, stock=?, min_stock=?, unit=?, active=?${imageQuery} WHERE id=?`,
      params
    );
    res.json({ message: 'تم تحديث المنتج' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'الباركود موجود بالفعل' });
    }
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.execute('UPDATE products SET active=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'تم حذف المنتج' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

module.exports = router;
