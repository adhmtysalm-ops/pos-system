const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/employees
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT e.*, u.username FROM employees e LEFT JOIN users u ON e.user_id = u.id ORDER BY e.name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { user_id, name, phone, email, address, position, salary, hire_date } = req.body;
    if (!name) return res.status(400).json({ message: 'اسم الموظف مطلوب' });
    const [result] = await db.execute(
      'INSERT INTO employees (user_id, name, phone, email, address, position, salary, hire_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id || null, name, phone || '', email || '', address || '', position || '', salary || 0, hire_date || null]
    );
    res.status(201).json({ id: result.insertId, message: 'تم إضافة الموظف' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { user_id, name, phone, email, address, position, salary, hire_date, active } = req.body;
    await db.execute(
      'UPDATE employees SET user_id=?, name=?, phone=?, email=?, address=?, position=?, salary=?, hire_date=?, active=? WHERE id=?',
      [user_id || null, name, phone || '', email || '', address || '', position || '', salary || 0, hire_date || null, active !== undefined ? active : 1, req.params.id]
    );
    res.json({ message: 'تم تحديث الموظف' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.execute('UPDATE employees SET active=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'تم حذف الموظف' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

module.exports = router;
