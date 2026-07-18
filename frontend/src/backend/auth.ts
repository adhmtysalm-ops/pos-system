import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import type { Bindings, JWTPayload } from './types'
import { hashPassword } from './utils'

export const authRouter = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

authRouter.post('/login', async (c) => {
  const { username, password } = await c.req.json()
  if (!username || !password) return c.json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' }, 400)

  const userRecord: any = await c.env.DB.prepare(
    'SELECT id, tenant_id, name, role, max_discount_percent, can_edit_customers, password FROM users WHERE username = ? AND active = 1'
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
    canEditCustomers: user.can_edit_customers,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  }, c.env.JWT_SECRET)

  return c.json({ token, user: { id: user.id, name: user.name, role: user.role, tenantId: user.tenant_id, maxDiscount: user.max_discount_percent, canEditCustomers: user.can_edit_customers } })
})
