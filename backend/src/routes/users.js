const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/users - Admin only
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, username, role, active, created_at, max_discount_percent FROM users ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// POST /api/users - Admin only
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, username, password, role } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }

    const [existing] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'اسم المستخدم موجود بالفعل' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (name, username, password, role, max_discount_percent) VALUES (?, ?, ?, ?, ?)',
      [name, username, hashed, role || 'cashier', req.body.max_discount_percent || 0]
    );
    res.status(201).json({ id: result.insertId, message: 'تم إنشاء المستخدم بنجاح' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// PUT /api/users/:id - Admin only
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, username, password, role, active, max_discount_percent } = req.body;
    const { id } = req.params;

    let query = 'UPDATE users SET name=?, username=?, role=?, active=?, max_discount_percent=?';
    let params = [name, username, role, active, max_discount_percent !== undefined ? max_discount_percent : 0];

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      query += ', password=?';
      params.push(hashed);
    }

    query += ' WHERE id=?';
    params.push(id);

    await db.execute(query, params);
    res.json({ message: 'تم تحديث المستخدم بنجاح' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// DELETE /api/users/:id - Admin only
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    if (req.params.id == req.user.id) {
      return res.status(400).json({ message: 'لا يمكنك حذف حسابك الخاص' });
    }
    await db.execute('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ message: 'تم حذف المستخدم' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

module.exports = router;
