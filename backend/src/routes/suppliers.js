const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/suppliers
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM suppliers WHERE 1=1';
    const params = [];
    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY name';
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'اسم المورد مطلوب' });
    const [result] = await db.execute(
      'INSERT INTO suppliers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)',
      [name, phone || '', email || '', address || '', notes || '']
    );
    res.status(201).json({ id: result.insertId, message: 'تم إضافة المورد' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    await db.execute(
      'UPDATE suppliers SET name=?, phone=?, email=?, address=?, notes=? WHERE id=?',
      [name, phone || '', email || '', address || '', notes || '', req.params.id]
    );
    res.json({ message: 'تم تحديث المورد' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.execute('DELETE FROM suppliers WHERE id=?', [req.params.id]);
    res.json({ message: 'تم حذف المورد' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

module.exports = router;
