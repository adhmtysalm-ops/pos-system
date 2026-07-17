export type Bindings = { DB: D1Database; JWT_SECRET: string }
export type JWTPayload = { userId: string; tenantId: string; role: string; maxDiscount?: number; exp: number }
