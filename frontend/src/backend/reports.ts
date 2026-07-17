import { Hono } from 'hono'
import type { Bindings, JWTPayload } from './types'

export const reportsRouter = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

reportsRouter.get('/dashboard', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  
  const [
    todaySales, todayExpenses, monthSales,
    productCount, lowStockCount, customerCount,
    last7DaysData, topProductsData
  ] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE tenant_id=? AND date(created_at) = date('now') AND status!='refunded'").bind(p.tenantId).first(),
    c.env.DB.prepare("SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE tenant_id=? AND date(date) = date('now')").bind(p.tenantId).first(),
    c.env.DB.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE tenant_id=? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') AND status!='refunded'").bind(p.tenantId).first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM products WHERE tenant_id=? AND active=1").bind(p.tenantId).first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM products WHERE tenant_id=? AND active=1 AND stock <= min_stock").bind(p.tenantId).first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM customers WHERE tenant_id=?").bind(p.tenantId).first(),
    c.env.DB.prepare("SELECT date(created_at) as date, COALESCE(SUM(total),0) as total FROM sales WHERE tenant_id=? AND created_at >= date('now', '-6 days') AND status!='refunded' GROUP BY date(created_at) ORDER BY date(created_at) ASC").bind(p.tenantId).all(),
    c.env.DB.prepare("SELECT product_name as name, SUM(quantity) as qty, SUM(i.total) as total FROM sale_items i JOIN sales s ON i.sale_id = s.id WHERE i.tenant_id=? AND s.status!='refunded' GROUP BY product_name ORDER BY qty DESC LIMIT 5").bind(p.tenantId).all()
  ])

  return c.json({
    today: {
      sales: { total: (todaySales as any)?.total || 0, count: (todaySales as any)?.count || 0 },
      expenses: (todayExpenses as any)?.total || 0
    },
    month: {
      sales: { total: (monthSales as any)?.total || 0, count: (monthSales as any)?.count || 0 }
    },
    products: (productCount as any)?.count || 0,
    low_stock: (lowStockCount as any)?.count || 0,
    customers: (customerCount as any)?.count || 0,
    last7Days: last7DaysData.results || [],
    topProducts: topProductsData.results || []
  })
})

reportsRouter.get('/sales', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const from = c.req.query('date_from') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const to = c.req.query('date_to') || new Date().toISOString().split('T')[0]
  const [summary, rows, methods] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as invoices, COALESCE(SUM(total),0) as total, COALESCE(SUM(discount),0) as discount FROM sales WHERE tenant_id=? AND date(created_at) BETWEEN ? AND ? AND status!='refunded'").bind(p.tenantId, from, to).first(),
    c.env.DB.prepare("SELECT date(created_at) as period, COALESCE(SUM(total),0) as total, COUNT(*) as count FROM sales WHERE tenant_id=? AND date(created_at) BETWEEN ? AND ? AND status!='refunded' GROUP BY period ORDER BY period").bind(p.tenantId, from, to).all(),
    c.env.DB.prepare("SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE tenant_id=? AND date(created_at) BETWEEN ? AND ? AND status!='refunded' GROUP BY payment_method").bind(p.tenantId, from, to).all(),
  ])
  return c.json({ summary, rows: rows.results || [], paymentMethods: methods.results || [] })
})

reportsRouter.get('/profit', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const from = c.req.query('date_from') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const to = c.req.query('date_to') || new Date().toISOString().split('T')[0]
  const [salesData, costData, expData] = await Promise.all([
    c.env.DB.prepare("SELECT COALESCE(SUM(total),0) as revenue FROM sales WHERE tenant_id=? AND date(created_at) BETWEEN ? AND ? AND status!='refunded'").bind(p.tenantId, from, to).first(),
    c.env.DB.prepare("SELECT COALESCE(SUM(si.quantity * si.cost_price),0) as cost FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE si.tenant_id=? AND date(s.created_at) BETWEEN ? AND ?").bind(p.tenantId, from, to).first(),
    c.env.DB.prepare("SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE tenant_id=? AND date BETWEEN ? AND ?").bind(p.tenantId, from, to).first(),
  ])
  const revenue = (salesData as any)?.revenue || 0
  const cost = (costData as any)?.cost || 0
  const expenses = (expData as any)?.total || 0
  return c.json({ revenue, cost, grossProfit: revenue - cost, expenses, netProfit: revenue - cost - expenses })
})

reportsRouter.get('/inventory', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const rows = await c.env.DB.prepare("SELECT p.*, c.name as category_name, (p.stock * p.cost_price) as stock_value FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.tenant_id=? AND p.active=1 ORDER BY stock_value DESC").bind(p.tenantId).all()
  const summary: any = await c.env.DB.prepare("SELECT COUNT(*) as products, COALESCE(SUM(stock),0) as total_units, COALESCE(SUM(stock*cost_price),0) as total_value FROM products WHERE tenant_id=? AND active=1").bind(p.tenantId).first()
  return c.json({ rows: rows.results || [], summary })
})

reportsRouter.get('/attendance', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const from = c.req.query('date_from') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const to = c.req.query('date_to') || new Date().toISOString().split('T')[0]
  const rows = await c.env.DB.prepare("SELECT e.id, e.name as employee_name, COUNT(a.id) as present_days, COALESCE(SUM(CASE WHEN a.check_in IS NOT NULL AND a.check_out IS NOT NULL THEN (strftime('%H',a.check_out)*60+strftime('%M',a.check_out)) - (strftime('%H',a.check_in)*60+strftime('%M',a.check_in)) ELSE 0 END) / 60.0, 0) as total_hours FROM employees e LEFT JOIN attendance a ON a.employee_id=e.id AND a.date BETWEEN ? AND ? WHERE e.tenant_id=? GROUP BY e.id ORDER BY e.name").bind(from, to, p.tenantId).all()
  return c.json({ rows: rows.results || [] })
})
