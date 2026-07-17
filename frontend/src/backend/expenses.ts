import { Hono } from 'hono'
import type { Bindings, JWTPayload } from './types'

export const expensesRouter = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

expensesRouter.get('/', async (c) => {
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

expensesRouter.post('/', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const b = await c.req.json(); if (!b.amount) return c.json({ error: 'Amount required' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO expenses (id, tenant_id, category, amount, description, user_id, date) VALUES (?,?,?,?,?,?,?)').bind(id, p.tenantId, b.category || 'عام', b.amount, b.description || '', p.userId, b.date || new Date().toISOString().split('T')[0]).run()
  return c.json({ success: true, id })
})

expensesRouter.put('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json()
  await c.env.DB.prepare('UPDATE expenses SET category=?, amount=?, description=?, date=? WHERE id=? AND tenant_id=?').bind(b.category || 'عام', b.amount, b.description || '', b.date, c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

expensesRouter.delete('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  await c.env.DB.prepare('DELETE FROM expenses WHERE id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})
