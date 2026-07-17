import { Hono } from 'hono'
import type { Bindings, JWTPayload } from './types'

export const settingsRouter = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

settingsRouter.get('/', async (c) => {
  const p = c.get('jwtPayload')
  if (!p.tenantId) return c.json({ store_name: 'Super Admin', currency: 'ج.م' })
  const s: any = await c.env.DB.prepare('SELECT * FROM settings WHERE tenant_id = ?').bind(p.tenantId).first()
  return c.json(s || {})
})

settingsRouter.put('/', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json()
  await c.env.DB.prepare(
    'UPDATE settings SET store_name=?, store_phone=?, store_address=?, currency=?, tax_rate=?, receipt_footer=?, thermal_width=?, updated_at=datetime(\'now\') WHERE tenant_id=?'
  ).bind(b.store_name || '', b.store_phone || '', b.store_address || '', b.currency || 'ج.م', b.tax_rate || 0, b.receipt_footer || '', b.thermal_width || 80, p.tenantId).run()
  return c.json({ success: true })
})
