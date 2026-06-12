const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/settings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM settings WHERE id=1');
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// PUT /api/settings
router.put('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { store_name, store_phone, store_address, currency, tax_rate, receipt_footer, thermal_width } = req.body;
    await db.execute(
      `UPDATE settings SET store_name=?, store_phone=?, store_address=?, currency=?, tax_rate=?, receipt_footer=?, thermal_width=? WHERE id=1`,
      [store_name || 'متجر POS', store_phone || '', store_address || '', currency || 'ج.م', tax_rate || 0, receipt_footer || 'شكراً لزيارتكم', thermal_width || 80]
    );
    res.json({ message: 'تم حفظ الإعدادات' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

module.exports = router;
