const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/expenses
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { date_from, date_to, category } = req.query;
    let query = `SELECT e.*, u.name as user_name FROM expenses e LEFT JOIN users u ON e.user_id = u.id WHERE 1=1`;
    const params = [];
    if (category) { query += ' AND e.category=?'; params.push(category); }
    if (date_from) { query += ' AND e.date >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND e.date <= ?'; params.push(date_to); }
    query += ' ORDER BY e.date DESC, e.created_at DESC';
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { category, amount, description, date } = req.body;
    if (!amount || !date) return res.status(400).json({ message: 'المبلغ والتاريخ مطلوبان' });
    const [result] = await db.execute(
      'INSERT INTO expenses (category, amount, description, user_id, date) VALUES (?, ?, ?, ?, ?)',
      [category || 'عام', amount, description || '', req.user.id, date]
    );
    res.status(201).json({ id: result.insertId, message: 'تم إضافة المصروف' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { category, amount, description, date } = req.body;
    await db.execute(
      'UPDATE expenses SET category=?, amount=?, description=?, date=? WHERE id=?',
      [category || 'عام', amount, description || '', date, req.params.id]
    );
    res.json({ message: 'تم تحديث المصروف' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.execute('DELETE FROM expenses WHERE id=?', [req.params.id]);
    res.json({ message: 'تم حذف المصروف' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

module.exports = router;
