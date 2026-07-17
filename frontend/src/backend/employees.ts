import { Hono } from 'hono'
import type { Bindings, JWTPayload } from './types'

export const employeesRouter = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

employeesRouter.get('/', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json([])
  const rows = await c.env.DB.prepare('SELECT e.*, u.username FROM employees e LEFT JOIN users u ON u.id = e.user_id WHERE e.tenant_id = ? ORDER BY e.name ASC').bind(p.tenantId).all()
  return c.json(rows.results || [])
})

employeesRouter.post('/', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json(); if (!b.name) return c.json({ error: 'Name required' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO employees (id, tenant_id, user_id, name, phone, email, address, position, salary, hire_date) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id, p.tenantId, b.user_id || null, b.name, b.phone || '', b.email || '', b.address || '', b.position || '', b.salary || 0, b.hire_date || null).run()
  return c.json({ success: true, id })
})

employeesRouter.put('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json()
  await c.env.DB.prepare('UPDATE employees SET user_id=?, name=?, phone=?, email=?, address=?, position=?, salary=?, hire_date=?, active=? WHERE id=? AND tenant_id=?').bind(b.user_id || null, b.name, b.phone || '', b.email || '', b.address || '', b.position || '', b.salary || 0, b.hire_date || null, b.active !== undefined ? b.active : 1, c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})
