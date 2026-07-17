import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt, sign } from 'hono/jwt'
import { handle } from 'hono/cloudflare-pages'

type Bindings = { DB: D1Database; JWT_SECRET: string }
type JWTPayload = { userId: string; tenantId: string; role: string; exp: number }

const app = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

app.use('*', cors())

// ─── Utilities ───────────────────────────────────────────────────────────────

async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const enc = new TextEncoder();
  let salt: Uint8Array;
  if (saltHex) {
    salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  } else {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  const currentSaltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${currentSaltHex}:${hashHex}`;
}

function requireSuperAdmin(c: any) {
  const p = c.get('jwtPayload')
  if (p.role !== 'superadmin') return c.json({ error: 'Unauthorized – superadmin only' }, 403)
  return null
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ status: 'ok', version: '2.0' }))

// ─── Authentication ────────────────────────────────────────────────────────────

app.post('/api/login', async (c) => {
  const { username, password } = await c.req.json()
  if (!username || !password) return c.json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' }, 400)

  const userRecord: any = await c.env.DB.prepare(
    'SELECT id, tenant_id, name, role, max_discount_percent, password FROM users WHERE username = ? AND active = 1'
  ).bind(username).first()

  if (!userRecord) return c.json({ error: 'بيانات الدخول غير صحيحة أو الحساب غير نشط' }, 401)
  
  const [storedSalt] = (userRecord.password || '').split(':')
  if (!storedSalt) return c.json({ error: 'بيانات الدخول غير صحيحة' }, 401)
  
  const hashedAttempt = await hashPassword(password, storedSalt)
  if (hashedAttempt !== userRecord.password) return c.json({ error: 'بيانات الدخول غير صحيحة' }, 401)
  
  const user = userRecord

  if (user.tenant_id) {
    const tenant: any = await c.env.DB.prepare('SELECT status FROM tenants WHERE id = ?').bind(user.tenant_id).first()
    if (!tenant || tenant.status !== 'active')
      return c.json({ error: 'حساب المتجر موقوف. تواصل مع الإدارة.' }, 403)

    const sub: any = await c.env.DB.prepare(
      'SELECT end_date FROM subscriptions WHERE tenant_id = ? ORDER BY end_date DESC LIMIT 1'
    ).bind(user.tenant_id).first()
    if (!sub || new Date(sub.end_date) < new Date())
      return c.json({ error: 'انتهى الاشتراك. تواصل مع الإدارة للتجديد.' }, 403)
  }

  if (!c.env.JWT_SECRET) return c.json({ error: 'خطأ في إعدادات الخادم: JWT_SECRET غير مُعيَّن' }, 500)

  const token = await sign({
    userId: user.id, tenantId: user.tenant_id, role: user.role,
    maxDiscount: user.max_discount_percent,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  }, c.env.JWT_SECRET)

  return c.json({ token, user: { id: user.id, name: user.name, role: user.role, tenantId: user.tenant_id, maxDiscount: user.max_discount_percent } })
})

// ─── JWT Middleware ────────────────────────────────────────────────────────────

app.use('/api/protected/*', async (c, next) => {
  if (!c.env.JWT_SECRET) return c.json({ error: 'Server configuration error' }, 500)
  return jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' })(c, next)
})

app.get('/api/protected/auth/me', async (c) => {
  const p = c.get('jwtPayload')
  const user = await c.env.DB.prepare('SELECT id, tenant_id as tenantId, name, role, max_discount_percent as maxDiscount FROM users WHERE id = ? AND active = 1').bind(p.userId).first()
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json(user)
})

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SUPER ADMIN ENDPOINTS ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Dashboard Stats
app.get('/api/protected/admin/dashboard', async (c) => {
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

app.get('/api/protected/admin/plans', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  const plans = await c.env.DB.prepare(`
    SELECT p.*, 
           (SELECT COUNT(*) FROM subscriptions s JOIN tenants t ON t.id = s.tenant_id WHERE s.plan_name = p.name AND t.status = 'active') as subscriber_count
    FROM plans p ORDER BY p.sort_order ASC, p.price_monthly ASC
  `).all()
  return c.json(plans.results || [])
})

app.post('/api/protected/admin/plans', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  const b = await c.req.json()
  if (!b.name) return c.json({ error: 'اسم الباقة مطلوب' }, 400)
  const id = `plan-${crypto.randomUUID()}`
  await c.env.DB.prepare(
    'INSERT INTO plans (id, name, description, price_monthly, max_employees, max_cashiers, max_products, max_sales_per_month, features, color, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(id, b.name, b.description || '', b.price_monthly || 0, b.max_employees || 5, b.max_cashiers || 2, b.max_products || 500, b.max_sales_per_month || 1000, JSON.stringify(b.features || []), b.color || '#3B82F6', b.sort_order || 0).run()
  return c.json({ success: true, id })
})

app.put('/api/protected/admin/plans/:id', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  const b = await c.req.json()
  await c.env.DB.prepare(
    'UPDATE plans SET name=?, description=?, price_monthly=?, max_employees=?, max_cashiers=?, max_products=?, max_sales_per_month=?, features=?, color=?, sort_order=?, is_active=? WHERE id=?'
  ).bind(b.name, b.description || '', b.price_monthly || 0, b.max_employees || 5, b.max_cashiers || 2, b.max_products || 500, b.max_sales_per_month || 1000, JSON.stringify(b.features || []), b.color || '#3B82F6', b.sort_order || 0, b.is_active !== undefined ? (b.is_active ? 1 : 0) : 1, c.req.param('id')).run()
  return c.json({ success: true })
})

app.delete('/api/protected/admin/plans/:id', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  await c.env.DB.prepare('DELETE FROM plans WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// ─── Tenants CRUD (Enhanced) ──────────────────────────────────────────────────

app.get('/api/protected/admin/tenants', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  const search = c.req.query('search') || ''
  const status = c.req.query('status') || ''
  const plan = c.req.query('plan') || ''
  const expiry = c.req.query('expiry') || '' // 'expiring7', 'expiring30', 'expired'

  let conds: string[] = []
  if (status) conds.push(`t.status = '${status}'`)
  if (plan) conds.push(`s.plan_name = '${plan}'`)
  if (search) conds.push(`(t.store_name LIKE '%${search}%' OR t.owner_name LIKE '%${search}%' OR t.email LIKE '%${search}%')`)
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
  `).all()
  return c.json(tenants.results || [])
})

app.post('/api/protected/admin/tenants', async (c) => {
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

app.put('/api/protected/admin/tenants/:id', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  const { store_name, owner_name, email } = await c.req.json()
  await c.env.DB.prepare('UPDATE tenants SET store_name=?, owner_name=?, email=? WHERE id=?').bind(store_name, owner_name, email || '', c.req.param('id')).run()
  return c.json({ success: true })
})

app.put('/api/protected/admin/tenants/:id/status', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  const { status } = await c.req.json()
  if (!['active', 'suspended'].includes(status)) return c.json({ error: 'Invalid status' }, 400)
  await c.env.DB.prepare('UPDATE tenants SET status = ? WHERE id = ?').bind(status, c.req.param('id')).run()
  return c.json({ success: true })
})

app.delete('/api/protected/admin/tenants/:id', async (c) => {
  const deny = requireSuperAdmin(c); if (deny) return deny
  await c.env.DB.prepare('DELETE FROM tenants WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// Tenant Detail Stats
app.get('/api/protected/admin/tenants/:id/stats', async (c) => {
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
app.post('/api/protected/admin/tenants/:id/renew', async (c) => {
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

// ─── Tenant-Side: Settings ────────────────────────────────────────────────────

app.get('/api/protected/settings', async (c) => {
  const p = c.get('jwtPayload')
  if (!p.tenantId) return c.json({ store_name: 'Super Admin', currency: 'ج.م' })
  const s: any = await c.env.DB.prepare('SELECT * FROM settings WHERE tenant_id = ?').bind(p.tenantId).first()
  return c.json(s || {})
})

app.put('/api/protected/settings', async (c) => {
  const p = c.get('jwtPayload')
  if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json()
  await c.env.DB.prepare(
    'UPDATE settings SET store_name=?, store_phone=?, store_address=?, currency=?, tax_rate=?, receipt_footer=?, thermal_width=?, updated_at=datetime(\'now\') WHERE tenant_id=?'
  ).bind(b.store_name || '', b.store_phone || '', b.store_address || '', b.currency || 'ج.م', b.tax_rate || 0, b.receipt_footer || '', b.thermal_width || 80, p.tenantId).run()
  return c.json({ success: true })
})

// ─── Tenant-Side: Users ───────────────────────────────────────────────────────

app.get('/api/protected/users', async (c) => {
  const p = c.get('jwtPayload')
  if (!p.tenantId) return c.json([], 200)
  const users = await c.env.DB.prepare("SELECT id, name, username, role, active, max_discount_percent, created_at FROM users WHERE tenant_id = ? ORDER BY role ASC, name ASC").bind(p.tenantId).all()
  return c.json(users.results || [])
})

app.post('/api/protected/users', async (c) => {
  const p = c.get('jwtPayload')
  if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json()
  if (!b.name || !b.username || !b.password) return c.json({ error: 'البيانات مطلوبة' }, 400)
  if (b.role === 'superadmin') return c.json({ error: 'Unauthorized role' }, 403)
  const id = crypto.randomUUID()
  const hashedPass = await hashPassword(b.password)
  try {
    await c.env.DB.prepare('INSERT INTO users (id, tenant_id, name, username, password, role, active, max_discount_percent) VALUES (?,?,?,?,?,?,?,?)').bind(id, p.tenantId, b.name, b.username, hashedPass, b.role || 'cashier', b.active !== undefined ? b.active : 1, b.max_discount_percent || 0).run()
    return c.json({ success: true, id })
  } catch (e: any) {
    return c.json({ error: 'اسم المستخدم مستخدم بالفعل', details: e.message }, 409)
  }
})

app.put('/api/protected/users/:id', async (c) => {
  const p = c.get('jwtPayload')
  if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json()
  if (b.role === 'superadmin') return c.json({ error: 'Unauthorized role' }, 403)
  if (b.password && b.password.trim()) {
    const hashedPass = await hashPassword(b.password)
    await c.env.DB.prepare('UPDATE users SET name=?, username=?, password=?, role=?, active=?, max_discount_percent=? WHERE id=? AND tenant_id=?').bind(b.name, b.username, hashedPass, b.role, b.active, b.max_discount_percent || 0, c.req.param('id'), p.tenantId).run()
  } else {
    await c.env.DB.prepare('UPDATE users SET name=?, username=?, role=?, active=?, max_discount_percent=? WHERE id=? AND tenant_id=?').bind(b.name, b.username, b.role, b.active, b.max_discount_percent || 0, c.req.param('id'), p.tenantId).run()
  }
  return c.json({ success: true })
})

app.delete('/api/protected/users/:id', async (c) => {
  const p = c.get('jwtPayload')
  if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  await c.env.DB.prepare('DELETE FROM users WHERE id = ? AND tenant_id = ?').bind(c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

// ─── Tenant-Side: Categories ──────────────────────────────────────────────────

app.get('/api/protected/categories', async (c) => {
  const p = c.get('jwtPayload')
  if (!p.tenantId) return c.json([])
  const rows = await c.env.DB.prepare('SELECT * FROM categories WHERE tenant_id = ? ORDER BY name ASC').bind(p.tenantId).all()
  return c.json(rows.results || [])
})

app.post('/api/protected/categories', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json(); if (!b.name) return c.json({ error: 'Name required' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO categories (id, tenant_id, name, description, color) VALUES (?,?,?,?,?)').bind(id, p.tenantId, b.name, b.description || '', b.color || '#3B82F6').run()
  return c.json({ success: true, id })
})

app.put('/api/protected/categories/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json()
  await c.env.DB.prepare('UPDATE categories SET name=?, description=?, color=? WHERE id=? AND tenant_id=?').bind(b.name, b.description || '', b.color || '#3B82F6', c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

app.delete('/api/protected/categories/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  await c.env.DB.prepare('DELETE FROM categories WHERE id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

// ─── Tenant-Side: Products ────────────────────────────────────────────────────

app.get('/api/protected/products', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json([])
  const search = c.req.query('search') || ''; const catId = c.req.query('category_id') || ''
  let q = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.tenant_id = ? AND p.active = 1'
  const params: any[] = [p.tenantId]
  if (search) { q += ' AND (p.name LIKE ? OR p.barcode LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
  if (catId) { q += ' AND p.category_id = ?'; params.push(catId) }
  q += ' ORDER BY p.name ASC'
  const rows = await c.env.DB.prepare(q).bind(...params).all()
  return c.json(rows.results || [])
})

app.post('/api/protected/products', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json(); if (!b.name) return c.json({ error: 'Name required' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO products (id, tenant_id, category_id, name, barcode, description, cost_price, sell_price, stock, min_stock, unit) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id, p.tenantId, b.category_id || null, b.name, b.barcode || null, b.description || '', b.cost_price || 0, b.sell_price || 0, b.stock || 0, b.min_stock || 0, b.unit || 'قطعة').run()
  return c.json({ success: true, id })
})

app.put('/api/protected/products/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json()
  await c.env.DB.prepare('UPDATE products SET category_id=?, name=?, barcode=?, description=?, cost_price=?, sell_price=?, stock=?, min_stock=?, unit=?, active=?, updated_at=datetime(\'now\') WHERE id=? AND tenant_id=?').bind(b.category_id || null, b.name, b.barcode || null, b.description || '', b.cost_price || 0, b.sell_price || 0, b.stock || 0, b.min_stock || 0, b.unit || 'قطعة', b.active !== undefined ? b.active : 1, c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

app.delete('/api/protected/products/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  await c.env.DB.prepare('UPDATE products SET active=0 WHERE id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

// ─── Tenant-Side: Customers ───────────────────────────────────────────────────

app.get('/api/protected/customers', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json([])
  const rows = await c.env.DB.prepare('SELECT * FROM customers WHERE tenant_id = ? ORDER BY name ASC').bind(p.tenantId).all()
  return c.json(rows.results || [])
})

app.post('/api/protected/customers', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json(); if (!b.name) return c.json({ error: 'Name required' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO customers (id, tenant_id, name, phone, email, address, notes, balance) VALUES (?,?,?,?,?,?,?,?)').bind(id, p.tenantId, b.name, b.phone || '', b.email || '', b.address || '', b.notes || '', b.balance || 0).run()
  return c.json({ success: true, id })
})

app.put('/api/protected/customers/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json()
  await c.env.DB.prepare('UPDATE customers SET name=?, phone=?, email=?, address=?, notes=?, balance=? WHERE id=? AND tenant_id=?').bind(b.name, b.phone || '', b.email || '', b.address || '', b.notes || '', b.balance || 0, c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

app.delete('/api/protected/customers/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  await c.env.DB.prepare('DELETE FROM customers WHERE id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

app.get('/api/protected/customers/:id/credit', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({}, 403)
  const customerId = c.req.param('id')
  
  const customer: any = await c.env.DB.prepare('SELECT balance as totalDebt FROM customers WHERE id = ? AND tenant_id = ?').bind(customerId, p.tenantId).first()
  if (!customer) return c.json({ error: 'Not found' }, 404)

  const sales = await c.env.DB.prepare("SELECT * FROM sales WHERE customer_id = ? AND tenant_id = ? AND (payment_method = 'credit' OR remaining > 0) ORDER BY created_at DESC").bind(customerId, p.tenantId).all()
  
  const saleIds = sales.results?.map(s => `'${s.id}'`).join(',') || "''"
  let payments = { results: [] }
  if (sales.results?.length > 0) {
    payments = await c.env.DB.prepare(`SELECT * FROM customer_payments WHERE sale_id IN (${saleIds}) AND tenant_id = ? ORDER BY created_at ASC`).bind(p.tenantId).all()
  }

  const salesWithPayments = sales.results?.map(s => ({
    ...s,
    payments: payments.results?.filter((pmt: any) => pmt.sale_id === s.id) || []
  }))

  return c.json({ totalDebt: customer.totalDebt || 0, sales: salesWithPayments || [] })
})

app.post('/api/protected/customers/sale/:id/pay', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const saleId = c.req.param('id')
  const { amount } = await c.req.json()
  
  const sale: any = await c.env.DB.prepare('SELECT * FROM sales WHERE id = ? AND tenant_id = ?').bind(saleId, p.tenantId).first()
  if (!sale) return c.json({ error: 'Sale not found' }, 404)
  if (sale.remaining < amount) return c.json({ error: 'المبلغ أكبر من المتبقي' }, 400)

  const pmtId = crypto.randomUUID()
  const newRemaining = sale.remaining - amount
  const newPaid = sale.paid + amount
  const newStatus = newRemaining <= 0 ? 'paid' : sale.status

  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO customer_payments (id, tenant_id, customer_id, sale_id, amount) VALUES (?,?,?,?,?)').bind(pmtId, p.tenantId, sale.customer_id, saleId, amount),
    c.env.DB.prepare('UPDATE sales SET paid = ?, remaining = ?, status = ? WHERE id = ? AND tenant_id = ?').bind(newPaid, newRemaining, newStatus, saleId, p.tenantId),
    c.env.DB.prepare('UPDATE customers SET balance = balance - ? WHERE id = ? AND tenant_id = ?').bind(amount, sale.customer_id, p.tenantId)
  ])

  return c.json({ success: true })
})

// ─── Tenant-Side: Employees ───────────────────────────────────────────────────

app.get('/api/protected/employees', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json([])
  const rows = await c.env.DB.prepare('SELECT e.*, u.username FROM employees e LEFT JOIN users u ON u.id = e.user_id WHERE e.tenant_id = ? ORDER BY e.name ASC').bind(p.tenantId).all()
  return c.json(rows.results || [])
})

app.post('/api/protected/employees', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json(); if (!b.name) return c.json({ error: 'Name required' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO employees (id, tenant_id, user_id, name, phone, email, address, position, salary, hire_date) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id, p.tenantId, b.user_id || null, b.name, b.phone || '', b.email || '', b.address || '', b.position || '', b.salary || 0, b.hire_date || null).run()
  return c.json({ success: true, id })
})

app.put('/api/protected/employees/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json()
  await c.env.DB.prepare('UPDATE employees SET user_id=?, name=?, phone=?, email=?, address=?, position=?, salary=?, hire_date=?, active=? WHERE id=? AND tenant_id=?').bind(b.user_id || null, b.name, b.phone || '', b.email || '', b.address || '', b.position || '', b.salary || 0, b.hire_date || null, b.active !== undefined ? b.active : 1, c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

// ─── Tenant-Side: Attendance ──────────────────────────────────────────────────

app.get('/api/protected/attendance', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json([])
  const date = c.req.query('date') || new Date().toISOString().split('T')[0]
  const rows = await c.env.DB.prepare('SELECT a.*, e.name as employee_name FROM attendance a JOIN employees e ON e.id = a.employee_id WHERE a.tenant_id = ? AND a.date = ? ORDER BY a.created_at DESC').bind(p.tenantId, date).all()
  return c.json(rows.results || [])
})

app.post('/api/protected/attendance/checkin', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const { employee_id } = await c.req.json()
  const emp: any = await c.env.DB.prepare('SELECT id FROM employees WHERE id = ? AND tenant_id = ?').bind(employee_id, p.tenantId).first()
  if (!emp) return c.json({ error: 'الموظف غير موجود' }, 404)
  const today = new Date().toISOString().split('T')[0]
  const time = new Date().toTimeString().split(' ')[0].slice(0, 5)
  const id = crypto.randomUUID()
  try {
    await c.env.DB.prepare('INSERT INTO attendance (id, tenant_id, employee_id, date, check_in) VALUES (?,?,?,?,?)').bind(id, p.tenantId, employee_id, today, time).run()
    return c.json({ success: true })
  } catch (_) {
    return c.json({ error: 'سجل الحضور موجود مسبقاً لهذا اليوم' }, 409)
  }
})

app.post('/api/protected/attendance/checkout', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const { employee_id } = await c.req.json()
  const emp: any = await c.env.DB.prepare('SELECT id FROM employees WHERE id = ? AND tenant_id = ?').bind(employee_id, p.tenantId).first()
  if (!emp) return c.json({ error: 'الموظف غير موجود' }, 404)
  const today = new Date().toISOString().split('T')[0]
  const time = new Date().toTimeString().split(' ')[0].slice(0, 5)
  await c.env.DB.prepare("UPDATE attendance SET check_out=? WHERE tenant_id=? AND employee_id=? AND date=? AND check_out IS NULL").bind(time, p.tenantId, employee_id, today).run()
  return c.json({ success: true })
})

app.post('/api/protected/attendance', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role === 'cashier') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json()
  const emp: any = await c.env.DB.prepare('SELECT id FROM employees WHERE id = ? AND tenant_id = ?').bind(b.employee_id, p.tenantId).first()
  if (!emp) return c.json({ error: 'الموظف غير موجود' }, 404)
  const id = crypto.randomUUID()
  try {
    await c.env.DB.prepare('INSERT OR REPLACE INTO attendance (id, tenant_id, employee_id, date, check_in, check_out, notes) VALUES (?,?,?,?,?,?,?)').bind(id, p.tenantId, b.employee_id, b.date, b.check_in || null, b.check_out || null, b.notes || '').run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.delete('/api/protected/attendance/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role === 'cashier') return c.json({ error: 'Unauthorized' }, 403)
  await c.env.DB.prepare('DELETE FROM attendance WHERE id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

// ─── Tenant-Side: Expenses ────────────────────────────────────────────────────

app.get('/api/protected/expenses', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json([])
  const params: any[] = [p.tenantId]
  let q = 'SELECT e.*, u.name as user_name FROM expenses e LEFT JOIN users u ON u.id = e.user_id WHERE e.tenant_id = ?'
  const df = c.req.query('date_from'), dt = c.req.query('date_to'), cat = c.req.query('category')
  if (df) { q += ' AND e.date >= ?'; params.push(df) }
  if (dt) { q += ' AND e.date <= ?'; params.push(dt) }
  if (cat) { q += ' AND e.category = ?'; params.push(cat) }
  q += ' ORDER BY e.date DESC'
  const rows = await c.env.DB.prepare(q).bind(...params).all()
  return c.json(rows.results || [])
})

app.post('/api/protected/expenses', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json(); if (!b.amount) return c.json({ error: 'Amount required' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO expenses (id, tenant_id, category, amount, description, user_id, date) VALUES (?,?,?,?,?,?,?)').bind(id, p.tenantId, b.category || 'عام', b.amount, b.description || '', p.userId, b.date || new Date().toISOString().split('T')[0]).run()
  return c.json({ success: true, id })
})

app.put('/api/protected/expenses/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json()
  await c.env.DB.prepare('UPDATE expenses SET category=?, amount=?, description=?, date=? WHERE id=? AND tenant_id=?').bind(b.category || 'عام', b.amount, b.description || '', b.date, c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

app.delete('/api/protected/expenses/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  await c.env.DB.prepare('DELETE FROM expenses WHERE id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

// ─── Tenant-Side: Sales ───────────────────────────────────────────────────────

app.get('/api/protected/sales', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json([])
  const params: any[] = [p.tenantId]
  let q = 'SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON c.id = s.customer_id WHERE s.tenant_id = ?'
  const df = c.req.query('date_from'), dt = c.req.query('date_to'), status = c.req.query('status')
  if (df) { q += ' AND date(s.created_at) >= ?'; params.push(df) }
  if (dt) { q += ' AND date(s.created_at) <= ?'; params.push(dt) }
  if (status) { q += ' AND s.status = ?'; params.push(status) }
  q += ' ORDER BY s.created_at DESC LIMIT 200'
  const rows = await c.env.DB.prepare(q).bind(...params).all()
  return c.json(rows.results || [])
})

app.get('/api/protected/sales/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({}, 403)
  const sale: any = await c.env.DB.prepare('SELECT s.*, c.name as customer_name, c.phone as customer_phone FROM sales s LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = ? AND s.tenant_id = ?').bind(c.req.param('id'), p.tenantId).first()
  if (!sale) return c.json({ error: 'Not found' }, 404)
  const items = await c.env.DB.prepare('SELECT * FROM sale_items WHERE sale_id = ? AND tenant_id = ?').bind(c.req.param('id'), p.tenantId).all()
  return c.json({ ...sale, items: items.results || [] })
})

app.post('/api/protected/sales', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json()
  if (!b.items || !b.items.length) return c.json({ error: 'لا توجد عناصر في الفاتورة' }, 400)

  // Discount enforcement
  if (p.role === 'cashier' && b.discount > 0) {
    const discountPct = b.discount_type === 'percent' ? b.discount : (b.discount / b.subtotal * 100)
    const userData: any = await c.env.DB.prepare('SELECT max_discount_percent FROM users WHERE id = ?').bind(p.userId).first()
    if (userData && discountPct > (userData.max_discount_percent || 0))
      return c.json({ error: `الخصم المسموح به لك ${userData.max_discount_percent}% فقط` }, 403)
  }

  const saleId = crypto.randomUUID()
  const invoiceNum = `INV-${Date.now()}-${Math.floor(Math.random()*1000)}`
  const statements: any[] = [
    c.env.DB.prepare('INSERT INTO sales (id, tenant_id, invoice_number, customer_id, user_id, subtotal, discount, discount_type, tax, total, paid, remaining, change_amount, payment_method, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(saleId, p.tenantId, invoiceNum, b.customer_id || null, p.userId, b.subtotal || 0, b.discount || 0, b.discount_type || 'fixed', b.tax || 0, b.total || 0, b.paid || 0, b.remaining || 0, b.change_amount || 0, b.payment_method || 'cash', b.payment_method === 'credit' ? 'credit' : 'completed', b.notes || '')
  ]

  for (const item of b.items) {
    const itemId = crypto.randomUUID()
    statements.push(c.env.DB.prepare('INSERT INTO sale_items (id, tenant_id, sale_id, product_id, product_name, barcode, quantity, cost_price, unit_price, discount, total) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(itemId, p.tenantId, saleId, item.product_id || null, item.name, item.barcode || '', item.quantity, item.cost_price || 0, item.price, item.discount || 0, item.quantity * item.price))
    if (item.product_id) {
      statements.push(c.env.DB.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND tenant_id = ?').bind(item.quantity, item.product_id, p.tenantId))
    }
  }

  if (b.customer_id && b.remaining > 0) {
    statements.push(c.env.DB.prepare('UPDATE customers SET balance = balance + ? WHERE id = ? AND tenant_id = ?').bind(b.remaining, b.customer_id, p.tenantId))
  }

  await c.env.DB.batch(statements)
  return c.json({ success: true, id: saleId, invoice_number: invoiceNum })
})

app.put('/api/protected/sales/:id/status', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role === 'cashier') return c.json({ error: 'Unauthorized' }, 403)
  const { status } = await c.req.json()

  if (status === 'refunded') {
    const sale: any = await c.env.DB.prepare('SELECT status FROM sales WHERE id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).first()
    if (sale && sale.status !== 'refunded') {
      const items = await c.env.DB.prepare('SELECT product_id, quantity FROM sale_items WHERE sale_id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).all()
      const stmts = items.results?.filter((i: any) => i.product_id).map((i: any) => 
        c.env.DB.prepare('UPDATE products SET stock = stock + ? WHERE id = ? AND tenant_id = ?').bind(i.quantity, i.product_id, p.tenantId)
      ) || []
      stmts.push(c.env.DB.prepare('UPDATE sales SET status=? WHERE id=? AND tenant_id=?').bind(status, c.req.param('id'), p.tenantId))
      await c.env.DB.batch(stmts)
      return c.json({ success: true })
    }
  }

  await c.env.DB.prepare('UPDATE sales SET status=? WHERE id=? AND tenant_id=?').bind(status, c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

// ─── Tenant-Side: Suppliers ───────────────────────────────────────────────────

app.get('/api/protected/suppliers', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json([])
  const rows = await c.env.DB.prepare('SELECT * FROM suppliers WHERE tenant_id = ? ORDER BY name ASC').bind(p.tenantId).all()
  return c.json(rows.results || [])
})

app.post('/api/protected/suppliers', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json(); if (!b.name) return c.json({ error: 'Name required' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO suppliers (id, tenant_id, name, phone, email, address, notes, balance) VALUES (?,?,?,?,?,?,?,?)').bind(id, p.tenantId, b.name, b.phone || '', b.email || '', b.address || '', b.notes || '', b.balance || 0).run()
  return c.json({ success: true, id })
})

app.put('/api/protected/suppliers/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json()
  await c.env.DB.prepare('UPDATE suppliers SET name=?, phone=?, email=?, address=?, notes=?, balance=? WHERE id=? AND tenant_id=?').bind(b.name, b.phone || '', b.email || '', b.address || '', b.notes || '', b.balance || 0, c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

app.delete('/api/protected/suppliers/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  await c.env.DB.prepare('DELETE FROM suppliers WHERE id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

// ─── Tenant-Side: Purchases ───────────────────────────────────────────────────

app.get('/api/protected/purchases', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json([])
  const rows = await c.env.DB.prepare('SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id WHERE po.tenant_id = ? ORDER BY po.created_at DESC').bind(p.tenantId).all()
  return c.json(rows.results || [])
})

app.post('/api/protected/purchases', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role === 'cashier') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json(); if (!b.items || !b.items.length) return c.json({ error: 'لا توجد عناصر' }, 400)
  const orderId = crypto.randomUUID(); const orderNum = `PO-${Date.now()}`
  const stmts: any[] = [
    c.env.DB.prepare('INSERT INTO purchase_orders (id, tenant_id, supplier_id, user_id, order_number, subtotal, discount, total, paid, remaining, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(orderId, p.tenantId, b.supplier_id || null, p.userId, orderNum, b.subtotal || 0, b.discount || 0, b.total || 0, b.paid || 0, b.remaining || 0, b.status || 'received', b.notes || '')
  ]
  for (const item of b.items) {
    stmts.push(c.env.DB.prepare('INSERT INTO purchase_items (id, tenant_id, order_id, product_id, product_name, quantity, cost_price, total) VALUES (?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), p.tenantId, orderId, item.product_id || null, item.product_name, item.quantity, item.cost_price, item.total))
    if (item.product_id && b.status === 'received') stmts.push(c.env.DB.prepare('UPDATE products SET stock = stock + ?, cost_price = ? WHERE id = ? AND tenant_id = ?').bind(item.quantity, item.cost_price, item.product_id, p.tenantId))
  }
  if (b.supplier_id && b.remaining > 0) stmts.push(c.env.DB.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ? AND tenant_id = ?').bind(b.remaining, b.supplier_id, p.tenantId))
  await c.env.DB.batch(stmts)
  return c.json({ success: true, id: orderId, order_number: orderNum })
})

// ─── Tenant-Side: Reports ─────────────────────────────────────────────────────

app.get('/api/protected/reports/dashboard', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({})
  
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
    c.env.DB.prepare("SELECT COUNT(*) as count FROM customers WHERE tenant_id=? AND active=1").bind(p.tenantId).first(),
    c.env.DB.prepare("SELECT date(created_at) as date, COALESCE(SUM(total),0) as total FROM sales WHERE tenant_id=? AND created_at >= date('now', '-6 days') AND status!='refunded' GROUP BY date(created_at) ORDER BY date(created_at) ASC").bind(p.tenantId).all(),
    c.env.DB.prepare("SELECT product_name as name, SUM(quantity) as qty, SUM(total) as total FROM sale_items i JOIN sales s ON i.sale_id = s.id WHERE i.tenant_id=? AND s.status!='refunded' GROUP BY product_name ORDER BY qty DESC LIMIT 5").bind(p.tenantId).all()
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
app.get('/api/protected/reports/sales', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({})
  const from = c.req.query('date_from') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const to = c.req.query('date_to') || new Date().toISOString().split('T')[0]
  const [summary, rows, methods] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as invoices, COALESCE(SUM(total),0) as total, COALESCE(SUM(discount),0) as discount FROM sales WHERE tenant_id=? AND date(created_at) BETWEEN ? AND ? AND status!='refunded'").bind(p.tenantId, from, to).first(),
    c.env.DB.prepare("SELECT date(created_at) as period, COALESCE(SUM(total),0) as total, COUNT(*) as count FROM sales WHERE tenant_id=? AND date(created_at) BETWEEN ? AND ? AND status!='refunded' GROUP BY period ORDER BY period").bind(p.tenantId, from, to).all(),
    c.env.DB.prepare("SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE tenant_id=? AND date(created_at) BETWEEN ? AND ? AND status!='refunded' GROUP BY payment_method").bind(p.tenantId, from, to).all(),
  ])
  return c.json({ summary, rows: rows.results || [], paymentMethods: methods.results || [] })
})

app.get('/api/protected/reports/profit', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({})
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

app.get('/api/protected/reports/inventory', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({})
  const rows = await c.env.DB.prepare("SELECT p.*, c.name as category_name, (p.stock * p.cost_price) as stock_value FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.tenant_id=? AND p.active=1 ORDER BY stock_value DESC").bind(p.tenantId).all()
  const summary: any = await c.env.DB.prepare("SELECT COUNT(*) as products, COALESCE(SUM(stock),0) as total_units, COALESCE(SUM(stock*cost_price),0) as total_value FROM products WHERE tenant_id=? AND active=1").bind(p.tenantId).first()
  return c.json({ rows: rows.results || [], summary })
})

app.get('/api/protected/reports/attendance', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({})
  const from = c.req.query('date_from') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const to = c.req.query('date_to') || new Date().toISOString().split('T')[0]
  const rows = await c.env.DB.prepare("SELECT e.id, e.name as employee_name, COUNT(a.id) as present_days, COALESCE(SUM(CASE WHEN a.check_in IS NOT NULL AND a.check_out IS NOT NULL THEN (strftime('%H',a.check_out)*60+strftime('%M',a.check_out)) - (strftime('%H',a.check_in)*60+strftime('%M',a.check_in)) ELSE 0 END) / 60.0, 0) as total_hours FROM employees e LEFT JOIN attendance a ON a.employee_id=e.id AND a.date BETWEEN ? AND ? WHERE e.tenant_id=? GROUP BY e.id ORDER BY e.name").bind(from, to, p.tenantId).all()
  return c.json({ rows: rows.results || [] })
})

export const onRequest = handle(app)
