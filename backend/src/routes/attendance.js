const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/attendance
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { employee_id, date_from, date_to, date } = req.query;
    let query = `
      SELECT a.*, e.name as employee_name, e.position 
      FROM attendance a 
      JOIN employees e ON a.employee_id = e.id 
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role !== 'admin') {
      let [emp] = await db.execute('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
      if (emp.length === 0) {
        const [res] = await db.execute(
          'INSERT INTO employees (user_id, name, position, salary, active) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, req.user.name || req.user.username, 'كاشير', 0, 1]
        );
        emp = [{ id: res.insertId }];
      }
      query += ' AND a.employee_id = ?';
      params.push(emp[0].id);
    }

    if (employee_id) {
      query += ' AND a.employee_id = ?';
      params.push(employee_id);
    }
    if (date) {
      query += ' AND a.date = ?';
      params.push(date);
    }
    if (date_from) {
      query += ' AND a.date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      query += ' AND a.date <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY a.date DESC, e.name';
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// POST /api/attendance - Check In
router.post('/checkin', authMiddleware, async (req, res) => {
  try {
    const { employee_id } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0];

    const [existing] = await db.execute(
      'SELECT * FROM attendance WHERE employee_id=? AND date=?',
      [employee_id, today]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'تم تسجيل الحضور مسبقاً لهذا اليوم' });
    }

    await db.execute(
      'INSERT INTO attendance (employee_id, date, check_in) VALUES (?, ?, ?)',
      [employee_id, today, now]
    );
    res.status(201).json({ message: 'تم تسجيل الحضور بنجاح', time: now });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// POST /api/attendance/me/checkin
router.post('/me/checkin', authMiddleware, async (req, res) => {
  try {
    let [emp] = await db.execute('SELECT id FROM employees WHERE user_id = ? AND active = 1', [req.user.id]);
    if (emp.length === 0) {
      const [res] = await db.execute(
        'INSERT INTO employees (user_id, name, position, salary, active) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, req.user.name || req.user.username, 'كاشير', 0, 1]
      );
      emp = [{ id: res.insertId }];
    }
    const employee_id = emp[0].id;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0];

    const [existing] = await db.execute('SELECT * FROM attendance WHERE employee_id=? AND date=?', [employee_id, today]);
    if (existing.length > 0) return res.status(400).json({ message: 'تم تسجيل الحضور مسبقاً' });

    await db.execute('INSERT INTO attendance (employee_id, date, check_in) VALUES (?, ?, ?)', [employee_id, today, now]);
    res.status(201).json({ message: 'تم تسجيل الحضور بنجاح' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// POST /api/attendance/me/checkout
router.post('/me/checkout', authMiddleware, async (req, res) => {
  try {
    let [emp] = await db.execute('SELECT id FROM employees WHERE user_id = ? AND active = 1', [req.user.id]);
    if (emp.length === 0) return res.status(404).json({ message: 'لا يوجد ملف موظف مرتبط بحسابك' });
    const employee_id = emp[0].id;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0];

    const [existing] = await db.execute('SELECT * FROM attendance WHERE employee_id=? AND date=?', [employee_id, today]);
    if (existing.length === 0) return res.status(400).json({ message: 'لم تقم بتسجيل الحضور بعد' });
    if (existing[0].check_out) return res.status(400).json({ message: 'تم تسجيل الانصراف مسبقاً' });

    await db.execute('UPDATE attendance SET check_out=? WHERE employee_id=? AND date=?', [now, employee_id, today]);
    res.json({ message: 'تم تسجيل الانصراف بنجاح' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// POST /api/attendance - Check In (admin or specific emp)
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const { employee_id } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0];

    const [existing] = await db.execute(
      'SELECT * FROM attendance WHERE employee_id=? AND date=?',
      [employee_id, today]
    );

    if (existing.length === 0) {
      return res.status(400).json({ message: 'لم يتم تسجيل الحضور بعد' });
    }
    if (existing[0].check_out) {
      return res.status(400).json({ message: 'تم تسجيل الانصراف مسبقاً' });
    }

    await db.execute(
      'UPDATE attendance SET check_out=? WHERE employee_id=? AND date=?',
      [now, employee_id, today]
    );
    res.json({ message: 'تم تسجيل الانصراف بنجاح', time: now });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// POST /api/attendance - Manual entry (admin)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { employee_id, date, check_in, check_out, notes } = req.body;
    await db.execute(
      `INSERT INTO attendance (employee_id, date, check_in, check_out, notes) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE check_in=VALUES(check_in), check_out=VALUES(check_out), notes=VALUES(notes)`,
      [employee_id, date, check_in || null, check_out || null, notes || '']
    );
    res.status(201).json({ message: 'تم حفظ الحضور' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.execute('DELETE FROM attendance WHERE id=?', [req.params.id]);
    res.json({ message: 'تم حذف السجل' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

module.exports = router;
