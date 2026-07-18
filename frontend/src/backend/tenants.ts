import { Hono } from 'hono'
import type { Bindings, JWTPayload } from './types'
import { requireSuperAdmin, hashPassword } from './utils'

export const tenantsRouter = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

// Dashboard Stats
tenantsRouter.get('/dashboard', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny

  const [total, active, suspended, users, expiredCount, planDist, monthlyGrowth, expiringSoon, recentTenants] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as n FROM tenants").first(),
    c.env.DB.prepare("SELECT COUNT(*) as n FROM tenants WHERE status = 'active'").first(),
    c.env.DB.prepare("SELECT COUNT(*) as n FROM tenants WHERE status = 'suspended'").first(),
    c.env.DB.prepare("SELECT COUNT(*) as n FROM users WHERE tenant_id IS NOT NULL").first(),
    c.env.DB.prepare("SELECT COUNT(*) as n FROM tenants t JOIN subscriptions s ON s.tenant_id = t.id WHERE s.end_date < datetime('now') AND t.status = 'active'").first(),
    c.env.DB.prepare("SELECT s.plan_name, COUNT(*) as count FROM subscriptions s JOIN tenants t ON t.id = s.tenant_id WHERE t.status = 'active' GROUP BY s.plan_name").all(),
    c.env.DB.prepare("SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count FROM tenants WHERE created_at >= datetime('now','-6 months') GROUP BY month ORDER BY month ASC").all(),
    c.env.DB.prepare("SELECT t.id, t.store_name, t.owner_name, s.plan_name, s.end_date FROM tenants t JOIN subscriptions s ON s.tenant_id = t.id WHERE s.end_date BETWEEN datetime('now') AND datetime('now','+14 days') AND t.status = 'active' ORDER BY s.end_date ASC LIMIT 10").all(),
    c.env.DB.prepare("SELECT t.id, t.store_name, t.owner_name, t.email, t.status, t.created_at, s.plan_name, s.end_date FROM tenants t LEFT JOIN subscriptions s ON s.tenant_id = t.id ORDER BY t.created_at DESC LIMIT 8").all(),
  ])

  return c.json({
    stats: {
      totalTenants: (total as any)?.n || 0,
      activeTenants: (active as any)?.n || 0,
      suspendedTenants: (suspended as any)?.n || 0,
      totalUsers: (users as any)?.n || 0,
      expiredSubscriptions: (expiredCount as any)?.n || 0,
    },
    planDistribution: planDist.results || [],
    monthlyGrowth: monthlyGrowth.results || [],
    expiringSoon: expiringSoon.results || [],
    recentTenants: recentTenants.results || [],
  })
})

// ─── Plans CRUD ────────────────────────────────────────────────────────────────

tenantsRouter.get('/plans', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  const plans = await c.env.DB.prepare(`
    SELECT p.*, 
           (SELECT COUNT(*) FROM subscriptions s JOIN tenants t ON t.id = s.tenant_id WHERE s.plan_name = p.name AND t.status = 'active') as subscriber_count
    FROM plans p ORDER BY p.sort_order ASC, p.price_monthly ASC
  `).all()
  return c.json(plans.results || [])
})

tenantsRouter.post('/plans', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  const b = await c.req.json()
  if (!b.name) return c.json({ error: 'اسم الباقة مطلوب' }, 400)
  const id = `plan-${crypto.randomUUID()}`
  await c.env.DB.prepare(
    'INSERT INTO plans (id, name, description, price_monthly, max_employees, max_cashiers, max_products, max_sales_per_month, features, color, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(id, b.name, b.description || '', b.price_monthly || 0, b.max_employees || 5, b.max_cashiers || 2, b.max_products || 500, b.max_sales_per_month || 1000, JSON.stringify(b.features || []), b.color || '#3B82F6', b.sort_order || 0).run()
  return c.json({ success: true, id })
})

tenantsRouter.put('/plans/:id', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  const b = await c.req.json()
  await c.env.DB.prepare(
    'UPDATE plans SET name=?, description=?, price_monthly=?, max_employees=?, max_cashiers=?, max_products=?, max_sales_per_month=?, features=?, color=?, sort_order=?, is_active=? WHERE id=?'
  ).bind(b.name, b.description || '', b.price_monthly || 0, b.max_employees || 5, b.max_cashiers || 2, b.max_products || 500, b.max_sales_per_month || 1000, JSON.stringify(b.features || []), b.color || '#3B82F6', b.sort_order || 0, b.is_active !== undefined ? (b.is_active ? 1 : 0) : 1, c.req.param('id')).run()
  return c.json({ success: true })
})

tenantsRouter.delete('/plans/:id', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  await c.env.DB.prepare('DELETE FROM plans WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// ─── Tenants CRUD (Enhanced) ──────────────────────────────────────────────────

tenantsRouter.get('/tenants', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  const search = c.req.query('search') || ''
  const status = c.req.query('status') || ''
  const plan = c.req.query('plan') || ''
  const expiry = c.req.query('expiry') || '' // 'expiring7', 'expiring30', 'expired'

  let conds: string[] = []
  let params: any[] = []
  if (status) { conds.push(`t.status = ?`); params.push(status) }
  if (plan) { conds.push(`s.plan_name = ?`); params.push(plan) }
  if (search) { conds.push(`(t.store_name LIKE ? OR t.owner_name LIKE ? OR t.email LIKE ?)`); params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  if (expiry === 'expiring7') conds.push(`s.end_date BETWEEN datetime('now') AND datetime('now','+7 days')`)
  else if (expiry === 'expiring30') conds.push(`s.end_date BETWEEN datetime('now') AND datetime('now','+30 days')`)
  else if (expiry === 'expired') conds.push(`s.end_date < datetime('now')`)

  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''

  const tenants = await c.env.DB.prepare(`
    SELECT t.*,
           u.username as admin_username,
           s.plan_name, s.end_date, s.start_date as sub_start,
           s.max_employees, s.max_cashiers, s.max_products, s.max_sales_per_month,
           (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND role != 'admin') as cashier_count,
           (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count,
           (SELECT COUNT(*) FROM products WHERE tenant_id = t.id AND active = 1) as product_count,
           (SELECT COUNT(*) FROM employees WHERE tenant_id = t.id AND active = 1) as employee_count,
           (SELECT COUNT(*) FROM sales WHERE tenant_id = t.id) as sales_count,
           (SELECT COALESCE(SUM(total),0) FROM sales WHERE tenant_id = t.id AND status != 'refunded') as total_revenue
    FROM tenants t
    LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
    LEFT JOIN subscriptions s ON s.tenant_id = t.id
    ${where}
    ORDER BY t.created_at DESC
  `).bind(...params).all()
  return c.json(tenants.results || [])
})

tenantsRouter.post('/tenants', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  const b = await c.req.json()
  const { store_name, owner_name, email, admin_username, admin_password, plan_name, months, max_employees, max_cashiers, max_products, max_sales_per_month } = b
  if (!store_name || !owner_name || !admin_username || !admin_password)
    return c.json({ error: 'البيانات الأساسية مطلوبة' }, 400)

  const tenantId = crypto.randomUUID()
  const userId = crypto.randomUUID()
  const subId = crypto.randomUUID()
  const settingsId = crypto.randomUUID()
  const hashedPass = await hashPassword(admin_password)
  const endDate = new Date(); endDate.setMonth(endDate.getMonth() + parseInt(months || '1'))

  // Look up plan limits if plan_name provided
  let limits = { max_employees: max_employees || 5, max_cashiers: max_cashiers || 2, max_products: max_products || 500, max_sales_per_month: max_sales_per_month || 1000 }
  if (plan_name) {
    const plan: any = await c.env.DB.prepare('SELECT * FROM plans WHERE name = ? AND is_active = 1').bind(plan_name).first()
    if (plan) limits = { max_employees: plan.max_employees, max_cashiers: plan.max_cashiers, max_products: plan.max_products, max_sales_per_month: plan.max_sales_per_month }
  }

  try {
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO tenants (id, store_name, owner_name, email) VALUES (?, ?, ?, ?)').bind(tenantId, store_name, owner_name, email || ''),
      c.env.DB.prepare('INSERT INTO users (id, tenant_id, name, username, password, role) VALUES (?, ?, ?, ?, ?, ?)').bind(userId, tenantId, owner_name, admin_username, hashedPass, 'admin'),
      c.env.DB.prepare('INSERT INTO subscriptions (id, tenant_id, plan_name, start_date, end_date, max_employees, max_cashiers, max_products, max_sales_per_month) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(subId, tenantId, plan_name || 'Basic', new Date().toISOString(), endDate.toISOString(), limits.max_employees, limits.max_cashiers, limits.max_products, limits.max_sales_per_month),
      c.env.DB.prepare('INSERT INTO settings (id, tenant_id, store_name) VALUES (?, ?, ?)').bind(settingsId, tenantId, store_name),
    ])
    return c.json({ success: true, tenant_id: tenantId, admin_username })
  } catch (e: any) {
    return c.json({ error: 'فشل إنشاء المتجر', details: e.message }, 500)
  }
})

tenantsRouter.put('/tenants/:id', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  const { store_name, owner_name, email } = await c.req.json()
  await c.env.DB.prepare('UPDATE tenants SET store_name=?, owner_name=?, email=? WHERE id=?').bind(store_name, owner_name, email || '', c.req.param('id')).run()
  return c.json({ success: true })
})

tenantsRouter.put('/tenants/:id/status', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  const { status } = await c.req.json()
  if (!['active', 'suspended'].includes(status)) return c.json({ error: 'Invalid status' }, 400)
  await c.env.DB.prepare('UPDATE tenants SET status = ? WHERE id = ?').bind(status, c.req.param('id')).run()
  return c.json({ success: true })
})

tenantsRouter.delete('/tenants/:id', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  await c.env.DB.prepare('DELETE FROM tenants WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// Tenant Detail Stats
tenantsRouter.get('/tenants/:id/stats', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  const id = c.req.param('id')

  const [tenant, sub, users, products, employees, salesStats, recentSales, monthlySales] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first(),
    c.env.DB.prepare('SELECT * FROM subscriptions WHERE tenant_id = ? ORDER BY end_date DESC LIMIT 1').bind(id).first(),
    c.env.DB.prepare("SELECT id, name, username, role, active, created_at FROM users WHERE tenant_id = ? ORDER BY role ASC, name ASC").bind(id).all(),
    c.env.DB.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN active=1 THEN 1 ELSE 0 END) as active FROM products WHERE tenant_id = ?').bind(id).first(),
    c.env.DB.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN active=1 THEN 1 ELSE 0 END) as active FROM employees WHERE tenant_id = ?').bind(id).first(),
    c.env.DB.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total),0) as revenue FROM sales WHERE tenant_id = ? AND status != 'refunded'").bind(id).first(),
    c.env.DB.prepare("SELECT invoice_number, total, payment_method, status, created_at FROM sales WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 10").bind(id).all(),
    c.env.DB.prepare("SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count, COALESCE(SUM(total),0) as revenue FROM sales WHERE tenant_id = ? AND created_at >= datetime('now','-6 months') GROUP BY month ORDER BY month ASC").bind(id).all(),
  ])

  return c.json({ tenant, subscription: sub, users: users.results || [], products, employees, sales: salesStats, recentSales: recentSales.results || [], monthlySales: monthlySales.results || [] })
})

// Renew / Change Subscription Plan
tenantsRouter.post('/tenants/:id/renew', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  const b = await c.req.json()
  const { months, plan_name, max_employees, max_cashiers, max_products, max_sales_per_month, notes } = b
  if (!months || parseInt(months) < 1) return c.json({ error: 'عدد الأشهر غير صحيح' }, 400)

  const sub: any = await c.env.DB.prepare('SELECT * FROM subscriptions WHERE tenant_id = ? ORDER BY end_date DESC LIMIT 1').bind(c.req.param('id')).first()
  const base = sub && new Date(sub.end_date) > new Date() ? new Date(sub.end_date) : new Date()
  base.setMonth(base.getMonth() + parseInt(months))

  // Resolve plan limits
  let limits = { max_employees: max_employees || sub?.max_employees || 5, max_cashiers: max_cashiers || sub?.max_cashiers || 2, max_products: max_products || sub?.max_products || 500, max_sales_per_month: max_sales_per_month || sub?.max_sales_per_month || 1000 }
  const resolvedPlan = plan_name || sub?.plan_name || 'Basic'
  if (plan_name) {
    const plan: any = await c.env.DB.prepare('SELECT * FROM plans WHERE name = ?').bind(plan_name).first()
    if (plan && !max_employees) limits = { max_employees: plan.max_employees, max_cashiers: plan.max_cashiers, max_products: plan.max_products, max_sales_per_month: plan.max_sales_per_month }
  }

  if (sub) {
    await c.env.DB.prepare('UPDATE subscriptions SET end_date=?, plan_name=?, max_employees=?, max_cashiers=?, max_products=?, max_sales_per_month=?, notes=? WHERE id=?')
      .bind(base.toISOString(), resolvedPlan, limits.max_employees, limits.max_cashiers, limits.max_products, limits.max_sales_per_month, notes || '', sub.id).run()
  } else {
    await c.env.DB.prepare('INSERT INTO subscriptions (id, tenant_id, plan_name, start_date, end_date, max_employees, max_cashiers, max_products, max_sales_per_month, notes) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), c.req.param('id'), resolvedPlan, new Date().toISOString(), base.toISOString(), limits.max_employees, limits.max_cashiers, limits.max_products, limits.max_sales_per_month, notes || '').run()
  }
  return c.json({ success: true, new_end_date: base.toISOString(), plan: resolvedPlan })
})
