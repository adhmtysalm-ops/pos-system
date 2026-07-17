import { Hono } from 'hono'
import type { Bindings, JWTPayload } from './types'

export const attendanceRouter = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

attendanceRouter.get('/', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json([])
  const date = c.req.query('date') || new Date().toISOString().split('T')[0]
  const rows = await c.env.DB.prepare('SELECT a.*, e.name as employee_name FROM attendance a JOIN employees e ON e.id = a.employee_id WHERE a.tenant_id = ? AND a.date = ? ORDER BY a.created_at DESC').bind(p.tenantId, date).all()
  return c.json(rows.results || [])
})

attendanceRouter.post('/checkin', async (c) => {
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

attendanceRouter.post('/checkout', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({ error: 'No tenant' }, 403)
  const { employee_id } = await c.req.json()
  const emp: any = await c.env.DB.prepare('SELECT id FROM employees WHERE id = ? AND tenant_id = ?').bind(employee_id, p.tenantId).first()
  if (!emp) return c.json({ error: 'الموظف غير موجود' }, 404)
  const today = new Date().toISOString().split('T')[0]
  const time = new Date().toTimeString().split(' ')[0].slice(0, 5)
  await c.env.DB.prepare("UPDATE attendance SET check_out=? WHERE tenant_id=? AND employee_id=? AND date=? AND check_out IS NULL").bind(time, p.tenantId, employee_id, today).run()
  return c.json({ success: true })
})

attendanceRouter.post('/', async (c) => {
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

attendanceRouter.delete('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role === 'cashier') return c.json({ error: 'Unauthorized' }, 403)
  await c.env.DB.prepare('DELETE FROM attendance WHERE id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})
