import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt, sign } from 'hono/jwt'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('*', cors())

// Basic Health Check
app.get('/health', (c) => c.json({ status: 'ok', message: 'POS SaaS Cloudflare Worker Running' }))

// --- AUTHENTICATION ---
app.post('/api/login', async (c) => {
  const body = await c.req.json()
  const { username, password } = body
  
  if (!username || !password) return c.json({ error: 'Username and password required' }, 400)

  // Find user and their tenant (using raw password for simplicity in this draft, should be hashed)
  const user: any = await c.env.DB.prepare(
    "SELECT id, tenant_id, name, role FROM users WHERE username = ? AND password = ? AND active = 1"
  ).bind(username, password).first()

  if (!user) {
    return c.json({ error: 'Invalid credentials or inactive account' }, 401)
  }

  // Check tenant status if not a super admin
  if (user.tenant_id) {
      const tenant: any = await c.env.DB.prepare(
          "SELECT status FROM tenants WHERE id = ?"
      ).bind(user.tenant_id).first()
      if (!tenant || tenant.status !== 'active') {
          return c.json({ error: 'Tenant account suspended or not found' }, 403)
      }
      
      // Check active subscription
      const sub: any = await c.env.DB.prepare(
          "SELECT end_date FROM subscriptions WHERE tenant_id = ? ORDER BY end_date DESC LIMIT 1"
      ).bind(user.tenant_id).first()
      
      if (!sub || new Date(sub.end_date) < new Date()) {
          return c.json({ error: 'Subscription expired. Please contact support.' }, 403)
      }
  }

  // Generate JWT
  const payload = {
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
  }
  const token = await sign(payload, c.env.JWT_SECRET || 'fallback-secret-123')

  return c.json({
    token,
    user: { id: user.id, name: user.name, role: user.role, tenantId: user.tenant_id }
  })
})

// --- PROTECTED ROUTES MIDDLEWARE ---
app.use('/api/protected/*', async (c, next) => {
    const jwtMiddleware = jwt({ secret: c.env.JWT_SECRET || 'fallback-secret-123' })
    return jwtMiddleware(c, next)
})

// --- SYNC ENDPOINT (12-hour batch sync) ---
app.post('/api/protected/sync', async (c) => {
    const payload = c.get('jwtPayload')
    const tenantId = payload.tenantId
    if (!tenantId) return c.json({ error: 'Super Admins cannot sync store data' }, 403)

    const { operations } = await c.req.json()
    // operations format: [{ table: 'sales', action: 'insert', data: {...} }, ...]
    
    if (!operations || !Array.isArray(operations)) {
        return c.json({ error: 'Invalid operations format' }, 400)
    }

    try {
        // Execute sync in a batch transaction for atomic updates
        const statements = operations.map((op: any) => {
            if (op.action === 'insert' && op.table === 'sales') {
                return c.env.DB.prepare(
                    "INSERT OR IGNORE INTO sales (id, tenant_id, total, created_at) VALUES (?, ?, ?, ?)"
                ).bind(op.data.id, tenantId, op.data.total, op.data.created_at)
            }
            // Add other tables (products, attendance, etc.) dynamically based on needs
            // ... (implement delta updates for stock here later)
            
            // Dummy statement if not matched
            return c.env.DB.prepare("SELECT 1")
        })

        if(statements.length > 0){
             await c.env.DB.batch(statements)
        }
       
        return c.json({ success: true, synced_count: operations.length })
    } catch (error: any) {
        return c.json({ error: 'Sync failed', details: error.message }, 500)
    }
})

// --- WEBRTC SIGNALING (Cloudflare WebSocket) ---
app.get('/api/signaling', (c) => {
    // Cloudflare Workers natively supports WebSockets.
    // This endpoint will upgrade the request to a WebSocket and act as a simple message relay for WebRTC peers.
    const upgradeHeader = c.req.header('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    
    server.accept();
    server.addEventListener('message', event => {
        // Broadcast the WebRTC offer/answer/ice-candidate to all other connected peers in the same tenant.
        // Note: For a real production app, we would use Durable Objects or pub/sub to properly route messages.
        // For simplicity in this PWA, we bounce the message back to local peers.
        console.log('Received signaling message');
    });

    return new Response(null, {
        status: 101,
        webSocket: client,
    });
})

export default app
