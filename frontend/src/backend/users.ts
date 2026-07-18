import { Hono } from 'hono'
import type { Bindings, JWTPayload } from './types'
import { hashPassword } from './utils'

export const usersRouter = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

usersRouter.get('/', async (c) => {
  const p = c.get('jwtPayload')
  if (!p.tenantId) return c.json([], 200)
  const users = await c.env.DB.prepare("SELECT id, name, username, role, active, max_discount_percent, can_edit_customers, can_edit_invoices, created_at FROM users WHERE tenant_id = ? ORDER BY role ASC, name ASC").bind(p.tenantId).all()
  return c.json(users.results || [])
})

usersRouter.post('/', async (c) => {
  const p = c.get('jwtPayload')
  if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json()
  if (!b.name || !b.username || !b.password) return c.json({ error: 'البيانات مطلوبة' }, 400)
  if (b.role === 'superadmin') return c.json({ error: 'Unauthorized role' }, 403)
  
  const existingUser: any = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(b.username).first()
  if (existingUser) return c.json({ error: 'اسم المستخدم مسجل مسبقاً لموظف آخر' }, 400)

  const id = crypto.randomUUID()
  const hashedPass = await hashPassword(b.password)
  try {
    await c.env.DB.prepare('INSERT INTO users (id, tenant_id, name, username, password, role, active, max_discount_percent, can_edit_customers, can_edit_invoices) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id, p.tenantId, b.name, b.username, hashedPass, b.role || 'cashier', b.active !== undefined ? b.active : 1, b.max_discount_percent || 0, b.can_edit_customers ? 1 : 0, b.can_edit_invoices ? 1 : 0).run()
    return c.json({ success: true, id })
  } catch (e: any) {
    return c.json({ error: 'اسم المستخدم مستخدم بالفعل', details: e.message }, 409)
  }
})

usersRouter.put('/:id', async (c) => {
  const p = c.get('jwtPayload')
  if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json()
  if (b.role === 'superadmin') return c.json({ error: 'Unauthorized role' }, 403)

  const existingUser: any = await c.env.DB.prepare('SELECT id FROM users WHERE username = ? AND id != ?').bind(b.username, c.req.param('id')).first()
  if (existingUser) return c.json({ error: 'اسم المستخدم مسجل مسبقاً لموظف آخر' }, 400)

  if (b.password && b.password.trim()) {
    const hashedPass = await hashPassword(b.password)
    await c.env.DB.prepare('UPDATE users SET name=?, username=?, password=?, role=?, active=?, max_discount_percent=?, can_edit_customers=?, can_edit_invoices=? WHERE id=? AND tenant_id=?').bind(b.name, b.username, hashedPass, b.role, b.active, b.max_discount_percent || 0, b.can_edit_customers ? 1 : 0, b.can_edit_invoices ? 1 : 0, c.req.param('id'), p.tenantId).run()
  } else {
    await c.env.DB.prepare('UPDATE users SET name=?, username=?, role=?, active=?, max_discount_percent=?, can_edit_customers=?, can_edit_invoices=? WHERE id=? AND tenant_id=?').bind(b.name, b.username, b.role, b.active, b.max_discount_percent || 0, b.can_edit_customers ? 1 : 0, b.can_edit_invoices ? 1 : 0, c.req.param('id'), p.tenantId).run()
  }
  return c.json({ success: true })
})

usersRouter.delete('/:id', async (c) => {
  const p = c.get('jwtPayload')
  if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  await c.env.DB.prepare('DELETE FROM users WHERE id = ? AND tenant_id = ?').bind(c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})
