import { Hono } from 'hono'
import type { Bindings, JWTPayload } from './types'

export const categoriesRouter = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

categoriesRouter.get('/', async (c) => {
  const p = c.get('jwtPayload')
  if (!p.tenantId) return c.json([])
  const rows = await c.env.DB.prepare('SELECT * FROM categories WHERE tenant_id = ? ORDER BY name ASC').bind(p.tenantId).all()
  return c.json(rows.results || [])
})

categoriesRouter.post('/', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json(); if (!b.name) return c.json({ error: 'Name required' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO categories (id, tenant_id, name, description, color) VALUES (?,?,?,?,?)').bind(id, p.tenantId, b.name, b.description || '', b.color || '#3B82F6').run()
  return c.json({ success: true, id })
})

categoriesRouter.put('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json()
  await c.env.DB.prepare('UPDATE categories SET name=?, description=?, color=? WHERE id=? AND tenant_id=?').bind(b.name, b.description || '', b.color || '#3B82F6', c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

categoriesRouter.delete('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  await c.env.DB.prepare('DELETE FROM categories WHERE id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})

export const productsRouter = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: JWTPayload } }>()

productsRouter.get('/', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json([])
  const search = c.req.query('search') || ''; const catId = c.req.query('category_id') || ''
  let q = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.tenant_id = ? AND p.active = 1'
  const params: any[] = [p.tenantId]
  if (search) { q += ' AND (p.name LIKE ? OR p.barcode LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
  if (catId) { q += ' AND p.category_id = ?'; params.push(catId) }
  q += ' ORDER BY p.name ASC'
  const rows = await c.env.DB.prepare(q).bind(...params).all()
  return c.json(rows.results || [])
})

productsRouter.get('/barcode/:code', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId) return c.json({}, 403)
  const product = await c.env.DB.prepare('SELECT * FROM products WHERE barcode=? AND tenant_id=? AND active=1').bind(c.req.param('code'), p.tenantId).first()
  if (!product) return c.json({ error: 'Not found' }, 404)
  return c.json(product)
})

productsRouter.post('/', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json(); if (!b.name) return c.json({ error: 'Name required' }, 400)
  
  if (b.barcode && b.barcode.trim() !== '') {
    const existing: any = await c.env.DB.prepare('SELECT id FROM products WHERE barcode = ? AND tenant_id = ?').bind(b.barcode.trim(), p.tenantId).first()
    if (existing) return c.json({ error: 'هذا الباركود مسجل لمنتج آخر' }, 400)
  }

  let image_url = null;
  if (b.image_base64 && c.env.IMGBB_API_KEY) {
    try {
      const formData = new FormData();
      formData.append('key', c.env.IMGBB_API_KEY);
      const baseData = b.image_base64.includes(',') ? b.image_base64.split(',')[1] : b.image_base64;
      formData.append('image', baseData);
      const resp = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
      const result: any = await resp.json();
      if (result?.data?.url) image_url = result.data.url;
    } catch (e) { console.error('ImgBB upload error', e); }
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO products (id, tenant_id, category_id, name, barcode, description, cost_price, sell_price, stock, min_stock, unit, image_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, p.tenantId, b.category_id || null, b.name, b.barcode || null, b.description || '', b.cost_price || 0, b.sell_price || 0, b.stock || 0, b.min_stock || 0, b.unit || 'قطعة', image_url).run()
  return c.json({ success: true, id, image_url })
})

productsRouter.put('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  const b = await c.req.json()

  if (b.barcode && b.barcode.trim() !== '') {
    const existing: any = await c.env.DB.prepare('SELECT id FROM products WHERE barcode = ? AND tenant_id = ? AND id != ?').bind(b.barcode.trim(), p.tenantId, c.req.param('id')).first()
    if (existing) return c.json({ error: 'هذا الباركود مسجل لمنتج آخر' }, 400)
  }

  let image_url = b.image_url || null;
  if (b.image_base64 && c.env.IMGBB_API_KEY) {
    try {
      const formData = new FormData();
      formData.append('key', c.env.IMGBB_API_KEY);
      const baseData = b.image_base64.includes(',') ? b.image_base64.split(',')[1] : b.image_base64;
      formData.append('image', baseData);
      const resp = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
      const result: any = await resp.json();
      if (result?.data?.url) image_url = result.data.url;
    } catch (e) { console.error('ImgBB upload error', e); }
  }

  await c.env.DB.prepare('UPDATE products SET category_id=?, name=?, barcode=?, description=?, cost_price=?, sell_price=?, stock=?, min_stock=?, unit=?, active=?, image_url=?, updated_at=datetime(\'now\') WHERE id=? AND tenant_id=?').bind(b.category_id || null, b.name, b.barcode || null, b.description || '', b.cost_price || 0, b.sell_price || 0, b.stock || 0, b.min_stock || 0, b.unit || 'قطعة', b.active !== undefined ? b.active : 1, image_url, c.req.param('id'), p.tenantId).run()
  return c.json({ success: true, image_url })
})

productsRouter.delete('/:id', async (c) => {
  const p = c.get('jwtPayload'); if (!p.tenantId || p.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  await c.env.DB.prepare('UPDATE products SET active=0 WHERE id=? AND tenant_id=?').bind(c.req.param('id'), p.tenantId).run()
  return c.json({ success: true })
})
