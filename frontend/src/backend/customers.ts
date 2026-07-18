import { Hono } from 'hono'
import type { Bindings, JWTPayload } from './types'

export const customersRouter = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

customersRouter.get('/', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ data: [], total: 0 })
  const search = c.req.query('search') || ''
  const hasDebt = c.req.query('has_debt') === 'true'
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = (page - 1) * limit

  let q = 'SELECT *, balance as total_debt FROM customers WHERE tenant_id = ?'
  let countQ = 'SELECT COUNT(*) as total FROM customers WHERE tenant_id = ?'
  const params: any[] = [p.tenantId]

  if (search) {
    q += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)'
    countQ += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  if (hasDebt) {
    q += ' AND balance > 0'
    countQ += ' AND balance > 0'
  }

  q += ' ORDER BY name ASC LIMIT ? OFFSET ?'
  const dataParams = [...params, limit, offset]

  const [countRes, rowsRes] = await Promise.all([
    c.env.DB.prepare(countQ).bind(...params).first(),
    c.env.DB.prepare(q).bind(...dataParams).all()
  ])

  return c.json({
    data: rowsRes.results || [],
    total: (countRes as any)?.total || 0
  })
})

customersRouter.post('/', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json(); if (!b.name) return c.json({ error: 'Name required' }, 400)

  if (b.phone && b.phone.trim() !== '') {
    const existing: any = await c.env.DB.prepare('SELECT id FROM customers WHERE phone = ? AND tenant_id = ?').bind(b.phone.trim(), p.tenantId).first()
    if (existing) return c.json({ error: 'رقم الهاتف مسجل لعميل آخر' }, 400)
  }
  
  if (b.email && b.email.trim() !== '') {
    const existing: any = await c.env.DB.prepare('SELECT id FROM customers WHERE email = ? AND tenant_id = ?').bind(b.email.trim(), p.tenantId).first()
    if (existing) return c.json({ error: 'البريد الإلكتروني مسجل لعميل آخر' }, 400)
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO customers (id, tenant_id, name, phone, email, address, notes, balance) VALUES (?,?,?,?,?,?,?,?)').bind(id, p.tenantId, b.name, b.phone || '', b.email || '', b.address || '', b.notes || '', b.balance || 0).run()
  return c.json({ success: true, id })
})

customersRouter.put('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  if (p.role !== 'admin' && p.canEditCustomers !== 1) return c.json({ error: 'ليس لديك صلاحية لتعديل بيانات العملاء' }, 403)
  const b = await c.req.json()

  if (b.phone && b.phone.trim() !== '') {
    const existing: any = await c.env.DB.prepare('SELECT id FROM customers WHERE phone = ? AND tenant_id = ? AND id != ?').bind(b.phone.trim(), p.tenantId, c.req.param('id')).first()
    if (existing) return c.json({ error: 'رقم الهاتف مسجل لعميل آخر' }, 400)
  }
  
  if (b.email && b.email.trim() !== '') {
    const existing: any = await c.env.DB.prepare('SELECT id FROM customers WHERE email = ? AND tenant_id = ? AND id != ?').bind(b.email.trim(), p.tenantId, c.req.param('id')).first()
    if (existing) return c.json({ error: 'البريد الإلكتروني مسجل لعميل آخر' }, 400)
  }

  await c.env.DB.prepare('UPDATE customers SET name=?, phone=?, email=?, address=?, notes=?, balance=? WHERE id=? AND tenant_id=?').bind(b.name, b.phone || '', b.email || '', b.address || '', b.notes || '', b.balance || 0, c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

customersRouter.delete('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  if (p.role !== 'admin' && p.canEditCustomers !== 1) return c.json({ error: 'ليس لديك صلاحية لحذف العملاء' }, 403)
  const customer: any = await c.env.DB.prepare('SELECT balance FROM customers WHERE id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).first()
  if (!customer) return c.json({ error: 'العميل غير موجود' }, 404)
  if (customer.balance !== 0) return c.json({ error: 'لا يمكن حذف عميل عليه حساب مالي معلق (دائن أو مدين)' }, 400)

  await c.env.DB.prepare('DELETE FROM customers WHERE id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

customersRouter.get('/:id/credit', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({}, 403)
  const customerId = c.req.param('id')
  
  const customer: any = await c.env.DB.prepare('SELECT balance as totalDebt FROM customers WHERE id = ? AND tenant_id = ?').bind(customerId, p.tenantId).first()
  if (!customer) return c.json({ error: 'Customer not found' }, 404)
    
  const payments = await c.env.DB.prepare('SELECT * FROM customer_payments WHERE customer_id = ? AND tenant_id = ? ORDER BY date DESC').bind(customerId, p.tenantId).all()
  
  return c.json({
    totalDebt: customer.totalDebt || 0,
    payments: payments.results || []
  })
})

customersRouter.post('/:id/payments', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const customerId = c.req.param('id')
  const { amount, method, notes } = await c.req.json()
  
  if (!amount || amount <= 0) return c.json({ error: 'المبلغ غير صحيح' }, 400)
    
  const paymentId = crypto.randomUUID()
  
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO customer_payments (id, tenant_id, customer_id, amount, method, notes) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(paymentId, p.tenantId, customerId, amount, method || 'cash', notes || ''),
    c.env.DB.prepare('UPDATE customers SET balance = balance - ? WHERE id = ? AND tenant_id = ?')
      .bind(amount, customerId, p.tenantId)
  ])
  
  return c.json({ success: true, paymentId })
})
