export type Bindings = { DB: D1Database; JWT_SECRET: string; IMGBB_API_KEY?: string }
export type JWTPayload = { userId: string; tenantId: string; role: string; maxDiscount?: number; canEditCustomers?: number; canEditInvoices?: number; exp: number }
