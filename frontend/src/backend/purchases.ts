import { Hono } from 'hono'
import type { Bindings, JWTPayload } from './types'

export const purchasesRouter = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

purchasesRouter.get('/', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const rows = await c.env.DB.prepare('SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id WHERE po.tenant_id = ? ORDER BY po.created_at DESC').bind(p.tenantId).all()
  return c.json(rows.results || [])
})

purchasesRouter.post('/', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role === 'cashier') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json(); if (!b.items || !b.items.length) return c.json({ error: 'لا توجد عناصر' }, 400)
  const orderId = crypto.randomUUID(); const orderNum = `PO-${Date.now()}`
  const stmts: any[] = [
    c.env.DB.prepare('INSERT INTO purchase_orders (id, tenant_id, supplier_id, user_id, order_number, subtotal, discount, total, paid, remaining, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(orderId, p.tenantId, b.supplier_id || null, p.userId, orderNum, b.subtotal || 0, b.discount || 0, b.total || 0, b.paid || 0, b.remaining || 0, b.status || 'received', b.notes || '')
  ]
  for (const item of b.items) {
    stmts.push(c.env.DB.prepare('INSERT INTO purchase_items (id, tenant_id, order_id, product_id, product_name, quantity, cost_price, total) VALUES (?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), p.tenantId, orderId, item.product_id || null, item.product_name, item.quantity, item.cost_price, item.total))
    if (item.product_id && b.status === 'received') stmts.push(c.env.DB.prepare('UPDATE products SET stock = stock + ?, cost_price = ? WHERE id = ? AND tenant_id = ?').bind(item.quantity, item.cost_price, item.product_id, p.tenantId))
  }
  if (b.supplier_id && b.remaining > 0) stmts.push(c.env.DB.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ? AND tenant_id = ?').bind(b.remaining, b.supplier_id, p.tenantId))
  await c.env.DB.batch(stmts)
  return c.json({ success: true, id: orderId, order_number: orderNum })
})

purchasesRouter.get('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const order: any = await c.env.DB.prepare('SELECT * FROM purchase_orders WHERE id = ? AND tenant_id = ?').bind(c.req.param('id'), p.tenantId).first()
  if (!order) return c.json({ error: 'Not found' }, 404)
  const items = await c.env.DB.prepare('SELECT * FROM purchase_items WHERE order_id = ? AND tenant_id = ?').bind(c.req.param('id'), p.tenantId).all()
  return c.json({ ...order, items: items.results || [] })
})

purchasesRouter.put('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role === 'cashier') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json();
  const orderId = c.req.param('id')
  
  const oldOrder: any = await c.env.DB.prepare('SELECT status FROM purchase_orders WHERE id=? AND tenant_id=?').bind(orderId, p.tenantId).first()
  if (!oldOrder) return c.json({ error: 'Order not found' }, 404)

  const stmts: any[] = []

  if (oldOrder.status === 'received') {
    const oldItems = await c.env.DB.prepare('SELECT product_id, quantity FROM purchase_items WHERE order_id=? AND tenant_id=?').bind(orderId, p.tenantId).all()
    oldItems.results?.forEach((i: any) => {
      if (i.product_id) stmts.push(c.env.DB.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND tenant_id = ?').bind(i.quantity, i.product_id, p.tenantId))
    })
  }

  stmts.push(c.env.DB.prepare('UPDATE purchase_orders SET supplier_id=?, subtotal=?, discount=?, total=?, paid=?, remaining=?, status=?, notes=? WHERE id=? AND tenant_id=?').bind(b.supplier_id || null, b.subtotal || 0, b.discount || 0, b.total || 0, b.paid || 0, b.remaining || 0, b.status || 'received', b.notes || '', orderId, p.tenantId))

  stmts.push(c.env.DB.prepare('DELETE FROM purchase_items WHERE order_id=? AND tenant_id=?').bind(orderId, p.tenantId))

  for (const item of b.items) {
    stmts.push(c.env.DB.prepare('INSERT INTO purchase_items (id, tenant_id, order_id, product_id, product_name, quantity, cost_price, total) VALUES (?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), p.tenantId, orderId, item.product_id || null, item.product_name || item.name, item.quantity, item.cost_price, item.total))
    if (item.product_id && b.status === 'received') {
      stmts.push(c.env.DB.prepare('UPDATE products SET stock = stock + ?, cost_price = ? WHERE id = ? AND tenant_id = ?').bind(item.quantity, item.cost_price, item.product_id, p.tenantId))
    }
  }

  await c.env.DB.batch(stmts)
  return c.json({ success: true })
})
