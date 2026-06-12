const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/reports/dashboard
router.get('/dashboard', authMiddleware, adminOnly, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);

    const [[todaySales]] = await db.execute(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE DATE(created_at) = ? AND status NOT IN ('refunded', 'cancelled')`,
      [today]
    );

    const [[monthSales]] = await db.execute(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE DATE_FORMAT(created_at, '%Y-%m') = ? AND status NOT IN ('refunded', 'cancelled')`,
      [thisMonth]
    );

    const [[todayExpenses]] = await db.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date = ?`,
      [today]
    );

    const [[monthExpenses]] = await db.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE DATE_FORMAT(date, '%Y-%m') = ?`,
      [thisMonth]
    );

    const [[productsCount]] = await db.execute(
      `SELECT COUNT(*) as count FROM products WHERE active=1`
    );

    const [[lowStock]] = await db.execute(
      `SELECT COUNT(*) as count FROM products WHERE stock <= min_stock AND active=1`
    );

    const [[customersCount]] = await db.execute(`SELECT COUNT(*) as count FROM customers`);

    // Last 7 days sales
    const [last7Days] = await db.execute(
      `SELECT DATE(created_at) as date, COALESCE(SUM(total), 0) as total, COUNT(*) as count
       FROM sales WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND status NOT IN ('refunded', 'cancelled')
       GROUP BY DATE(created_at) ORDER BY date`
    );

    // Top products
    const [topProducts] = await db.execute(
      `SELECT p.name, SUM(si.quantity) as qty, SUM(si.total) as total
       FROM sale_items si JOIN products p ON si.product_id = p.id
       JOIN sales s ON si.sale_id = s.id
       WHERE DATE_FORMAT(s.created_at, '%Y-%m') = ? AND s.status NOT IN ('refunded', 'cancelled')
       GROUP BY si.product_id ORDER BY total DESC LIMIT 5`,
      [thisMonth]
    );

    res.json({
      today: { sales: todaySales, expenses: todayExpenses.total },
      month: { sales: monthSales, expenses: monthExpenses.total },
      products: productsCount.count,
      low_stock: lowStock.count,
      customers: customersCount.count,
      last7Days,
      topProducts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// GET /api/reports/sales - Detailed sales report
router.get('/sales', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { date_from, date_to, group_by } = req.query;
    const from = date_from || new Date().toISOString().split('T')[0];
    const to = date_to || from;

    let groupFormat = '%Y-%m-%d';
    if (group_by === 'month') groupFormat = '%Y-%m';
    if (group_by === 'year') groupFormat = '%Y';

    const [rows] = await db.execute(
      `SELECT 
        DATE_FORMAT(created_at, ?) as period,
        COUNT(*) as invoices,
        SUM(subtotal) as subtotal,
        SUM(discount) as discount,
        SUM(tax) as tax,
        SUM(total) as total
       FROM sales 
       WHERE DATE(created_at) BETWEEN ? AND ? AND status NOT IN ('refunded', 'cancelled')
       GROUP BY period ORDER BY period`,
      [groupFormat, from, to]
    );

    const [[summary]] = await db.execute(
      `SELECT COUNT(*) as invoices, COALESCE(SUM(total), 0) as total, COALESCE(SUM(discount), 0) as total_discount 
       FROM sales WHERE DATE(created_at) BETWEEN ? AND ? AND status NOT IN ('refunded', 'cancelled')`,
      [from, to]
    );

    const [paymentMethods] = await db.execute(
      `SELECT payment_method, COALESCE(SUM(total), 0) as total 
       FROM sales WHERE DATE(created_at) BETWEEN ? AND ? AND status NOT IN ('refunded', 'cancelled')
       GROUP BY payment_method`,
      [from, to]
    );

    res.json({ rows, summary, paymentMethods });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// GET /api/reports/profit - Profit report
router.get('/profit', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const from = date_from || new Date().toISOString().split('T')[0];
    const to = date_to || from;

    const [[salesData]] = await db.execute(
      `SELECT COALESCE(SUM(s.total),0) as revenue FROM sales s WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status NOT IN ('refunded', 'cancelled')`,
      [from, to]
    );

    const [[costData]] = await db.execute(
      `SELECT COALESCE(SUM(si.quantity * p.cost_price),0) as cost
       FROM sale_items si 
       JOIN sales s ON si.sale_id = s.id
       JOIN products p ON si.product_id = p.id
       WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status NOT IN ('refunded', 'cancelled')`,
      [from, to]
    );

    const [[expensesData]] = await db.execute(
      `SELECT COALESCE(SUM(amount),0) as expenses FROM expenses WHERE date BETWEEN ? AND ?`,
      [from, to]
    );

    const revenue = parseFloat(salesData.revenue);
    const cost = parseFloat(costData.cost);
    const expenses = parseFloat(expensesData.expenses);
    const grossProfit = revenue - cost;
    const netProfit = grossProfit - expenses;

    res.json({ revenue, cost, grossProfit, expenses, netProfit });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// GET /api/reports/inventory
router.get('/inventory', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT p.*, c.name as category_name, 
        (p.stock * p.cost_price) as stock_value,
        (p.stock * p.sell_price) as sell_value
       FROM products p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.active=1 ORDER BY p.name`
    );

    const [[summary]] = await db.execute(
      `SELECT COUNT(*) as products, SUM(stock) as total_units, SUM(stock * cost_price) as total_value
       FROM products WHERE active=1`
    );

    res.json({ rows, summary });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// GET /api/reports/attendance
router.get('/attendance', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const from = date_from || new Date().toISOString().split('T')[0];
    const to = date_to || from;

    const [rows] = await db.execute(
      `SELECT 
        e.id, 
        e.name as employee_name, 
        COUNT(a.id) as present_days,
        COALESCE(SUM(
          IF(a.check_in IS NOT NULL AND a.check_out IS NOT NULL, 
            TIME_TO_SEC(TIMEDIFF(a.check_out, a.check_in)) / 3600, 
            0
          )
        ), 0) as total_hours
       FROM employees e
       LEFT JOIN attendance a ON e.id = a.employee_id AND a.date BETWEEN ? AND ?
       WHERE e.active = 1
       GROUP BY e.id, e.name
       ORDER BY e.name`,
      [from, to]
    );

    res.json({ rows });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

module.exports = router;
