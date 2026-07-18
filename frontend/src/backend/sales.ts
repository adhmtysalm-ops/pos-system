import { Hono } from 'hono'
import type { Bindings, JWTPayload } from './types'

export const salesRouter = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

salesRouter.get('/', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json([])
  const params: any[] = [p.tenantId]
  let q = 'SELECT s.*, c.name as customer_name, u.name as cashier_name FROM sales s LEFT JOIN customers c ON c.id = s.customer_id LEFT JOIN users u ON u.id = s.user_id WHERE s.tenant_id = ?'
  if (p.role === 'cashier') {
    q += ' AND s.user_id = ?'
    params.push(p.userId)
  }
  const df = c.req.query('date_from'), dt = c.req.query('date_to'), status = c.req.query('status')
  if (df) { q += ' AND date(s.created_at) >= ?'; params.push(df) }
  if (dt) { q += ' AND date(s.created_at) <= ?'; params.push(dt) }
  if (status) { q += ' AND s.status = ?'; params.push(status) }
  q += ' ORDER BY s.created_at DESC LIMIT 200'
  const rows = await c.env.DB.prepare(q).bind(...params).all()
  return c.json(rows.results || [])
})

salesRouter.get('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({}, 403)
  const sale: any = await c.env.DB.prepare('SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.name as cashier_name FROM sales s LEFT JOIN customers c ON c.id = s.customer_id LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.tenant_id = ?').bind(c.req.param('id'), p.tenantId).first()
  if (!sale) return c.json({ error: 'Not found' }, 404)
  const items = await c.env.DB.prepare('SELECT * FROM sale_items WHERE sale_id = ? AND tenant_id = ?').bind(c.req.param('id'), p.tenantId).all()
  return c.json({ ...sale, items: items.results || [] })
})

salesRouter.post('/', async (c) => {
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

salesRouter.put('/:id/status', async (c) => {
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

salesRouter.delete('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role === 'cashier') return c.json({ error: 'Unauthorized' }, 403)
  const saleId = c.req.param('id')
  
  const sale: any = await c.env.DB.prepare('SELECT status, remaining, customer_id FROM sales WHERE id=? AND tenant_id=?').bind(saleId, p.tenantId).first()
  if (!sale) return c.json({ error: 'Sale not found' }, 404)

  const items = await c.env.DB.prepare('SELECT product_id, quantity FROM sale_items WHERE sale_id=? AND tenant_id=?').bind(saleId, p.tenantId).all()
  const stmts: any[] = []

  if (sale.status !== 'refunded') {
    items.results?.filter((i: any) => i.product_id).forEach((i: any) => 
      stmts.push(c.env.DB.prepare('UPDATE products SET stock = stock + ? WHERE id = ? AND tenant_id = ?').bind(i.quantity, i.product_id, p.tenantId))
    )
  }

  if (sale.customer_id && sale.remaining > 0) {
    stmts.push(c.env.DB.prepare('UPDATE customers SET balance = balance - ? WHERE id = ? AND tenant_id = ?').bind(sale.remaining, sale.customer_id, p.tenantId))
  }

  stmts.push(c.env.DB.prepare('DELETE FROM customer_payments WHERE sale_id=? AND tenant_id=?').bind(saleId, p.tenantId))
  stmts.push(c.env.DB.prepare('DELETE FROM sale_items WHERE sale_id=? AND tenant_id=?').bind(saleId, p.tenantId))
  stmts.push(c.env.DB.prepare('DELETE FROM sales WHERE id=? AND tenant_id=?').bind(saleId, p.tenantId))

  await c.env.DB.batch(stmts)
  return c.json({ success: true })
})
