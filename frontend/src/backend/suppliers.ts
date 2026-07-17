import { Hono } from 'hono'
import type { Bindings, JWTPayload } from './types'

export const suppliersRouter = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

suppliersRouter.get('/', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json([])
  const rows = await c.env.DB.prepare('SELECT * FROM suppliers WHERE tenant_id = ? ORDER BY name ASC').bind(p.tenantId).all()
  return c.json(rows.results || [])
})

suppliersRouter.post('/', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json(); if (!b.name) return c.json({ error: 'Name required' }, 400)

  if (b.phone && b.phone.trim() !== '') {
    const existing: any = await c.env.DB.prepare('SELECT id FROM suppliers WHERE phone = ? AND tenant_id = ?').bind(b.phone.trim(), p.tenantId).first()
    if (existing) return c.json({ error: 'رقم الهاتف مسجل لمورد آخر' }, 400)
  }
  
  if (b.email && b.email.trim() !== '') {
    const existing: any = await c.env.DB.prepare('SELECT id FROM suppliers WHERE email = ? AND tenant_id = ?').bind(b.email.trim(), p.tenantId).first()
    if (existing) return c.json({ error: 'البريد الإلكتروني مسجل لمورد آخر' }, 400)
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO suppliers (id, tenant_id, name, phone, email, address, notes, balance) VALUES (?,?,?,?,?,?,?,?)').bind(id, p.tenantId, b.name, b.phone || '', b.email || '', b.address || '', b.notes || '', b.balance || 0).run()
  return c.json({ success: true, id })
})

suppliersRouter.put('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json()

  if (b.phone && b.phone.trim() !== '') {
    const existing: any = await c.env.DB.prepare('SELECT id FROM suppliers WHERE phone = ? AND tenant_id = ? AND id != ?').bind(b.phone.trim(), p.tenantId, c.req.param('id')).first()
    if (existing) return c.json({ error: 'رقم الهاتف مسجل لمورد آخر' }, 400)
  }
  
  if (b.email && b.email.trim() !== '') {
    const existing: any = await c.env.DB.prepare('SELECT id FROM suppliers WHERE email = ? AND tenant_id = ? AND id != ?').bind(b.email.trim(), p.tenantId, c.req.param('id')).first()
    if (existing) return c.json({ error: 'البريد الإلكتروني مسجل لمورد آخر' }, 400)
  }

  await c.env.DB.prepare('UPDATE suppliers SET name=?, phone=?, email=?, address=?, notes=? WHERE id=? AND tenant_id=?').bind(b.name, b.phone || '', b.email || '', b.address || '', b.notes || '', c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

suppliersRouter.delete('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const supplier: any = await c.env.DB.prepare('SELECT balance FROM suppliers WHERE id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).first()
  if (!supplier) return c.json({ error: 'المورد غير موجود' }, 404)
  if (supplier.balance !== 0) return c.json({ error: 'لا يمكن حذف مورد له حساب مالي معلق (دائن أو مدين)' }, 400)

  await c.env.DB.prepare('DELETE FROM suppliers WHERE id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})
