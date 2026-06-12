const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/categories
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// POST /api/categories
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name) return res.status(400).json({ message: 'اسم التصنيف مطلوب' });
    const [result] = await db.execute(
      'INSERT INTO categories (name, description, color) VALUES (?, ?, ?)',
      [name, description || '', color || '#3B82F6']
    );
    res.status(201).json({ id: result.insertId, message: 'تم إضافة التصنيف' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// PUT /api/categories/:id
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    await db.execute(
      'UPDATE categories SET name=?, description=?, color=? WHERE id=?',
      [name, description || '', color || '#3B82F6', req.params.id]
    );
    res.json({ message: 'تم تحديث التصنيف' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.execute('DELETE FROM categories WHERE id=?', [req.params.id]);
    res.json({ message: 'تم حذف التصنيف' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

module.exports = router;
