import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { handle } from 'hono/cloudflare-pages'

import type { Bindings, JWTPayload } from '../../src/backend/types'
import { authRouter } from '../../src/backend/auth'
import { tenantsRouter } from '../../src/backend/tenants'
import { settingsRouter } from '../../src/backend/settings'
import { usersRouter } from '../../src/backend/users'
import { categoriesRouter, productsRouter } from '../../src/backend/products'
import { customersRouter } from '../../src/backend/customers'
import { employeesRouter } from '../../src/backend/employees'
import { attendanceRouter } from '../../src/backend/attendance'
import { expensesRouter } from '../../src/backend/expenses'
import { salesRouter } from '../../src/backend/sales'
import { suppliersRouter } from '../../src/backend/suppliers'
import { purchasesRouter } from '../../src/backend/purchases'
import { reportsRouter } from '../../src/backend/reports'

const app = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

app.use('*', cors({
  origin: (origin) => origin || '*', // Restrict this in production to ['https://yourdomain.com']
  credentials: true
}))

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ status: 'ok', version: '2.0' }))

// ─── Public API ────────────────────────────────────────────────────────────────

app.route('/api', authRouter)

// ─── JWT Middleware ────────────────────────────────────────────────────────────

app.use('/api/protected/*', async (c, next) => {
  if (!c.env.JWT_SECRET) return c.json({ error: 'Server configuration error' }, 500)
  return jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' })(c, next)
})

// ─── Revocation Check Middleware ───────────────────────────────────────────────
app.use('/api/protected/*', async (c, next) => {
  const p = c.get('jwtPayload');
  if (p) {
    const user: any = await c.env.DB.prepare('SELECT active FROM users WHERE id = ?').bind(p.userId).first();
    if (!user || user.active !== 1) return c.json({ error: 'حساب المستخدم موقوف أو غير موجود' }, 403);
    
    if (p.tenantId) {
      const tenant: any = await c.env.DB.prepare('SELECT status FROM tenants WHERE id = ?').bind(p.tenantId).first();
      if (!tenant || tenant.status !== 'active') return c.json({ error: 'حساب المتجر موقوف' }, 403);
      
      const sub: any = await c.env.DB.prepare('SELECT end_date FROM subscriptions WHERE tenant_id = ? ORDER BY end_date DESC LIMIT 1').bind(p.tenantId).first();
      if (!sub || new Date(sub.end_date) < new Date()) return c.json({ error: 'انتهى الاشتراك' }, 403);
    }
  }
  await next();
})

app.get('/api/protected/auth/me', async (c) => {
  const p = c.get('jwtPayload')
  const user = await c.env.DB.prepare('SELECT id, tenant_id as tenantId, name, role, max_discount_percent as maxDiscount, can_edit_customers as canEditCustomers, can_edit_invoices as canEditInvoices FROM users WHERE id = ? AND active = 1').bind(p.userId).first()
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json(user)
})

// ─── Protected Routes ─────────────────────────────────────────────────────────

app.route('/api/protected/admin', tenantsRouter)
app.route('/api/protected/settings', settingsRouter)
app.route('/api/protected/users', usersRouter)
app.route('/api/protected/categories', categoriesRouter)
app.route('/api/protected/products', productsRouter)
app.route('/api/protected/customers', customersRouter)
app.route('/api/protected/employees', employeesRouter)
app.route('/api/protected/attendance', attendanceRouter)
app.route('/api/protected/expenses', expensesRouter)
app.route('/api/protected/sales', salesRouter)
app.route('/api/protected/suppliers', suppliersRouter)
app.route('/api/protected/purchases', purchasesRouter)
app.route('/api/protected/reports', reportsRouter)

export const onRequest = handle(app)
