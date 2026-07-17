-- Cloudflare D1 (SQLite) Schema for Multi-Tenant POS SaaS
-- Run: wrangler d1 execute pos-db --file=schema.sql

-- 1. Tenants (Shop Owners)
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    store_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active', -- active, suspended
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Plans (SaaS Plan Templates)
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    price_monthly REAL DEFAULT 0.00,
    max_employees INTEGER DEFAULT 5,
    max_cashiers INTEGER DEFAULT 2,
    max_products INTEGER DEFAULT 500,
    max_sales_per_month INTEGER DEFAULT 1000,
    features TEXT DEFAULT '[]',
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Subscriptions (Per Tenant)
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    max_employees INTEGER DEFAULT 5,
    max_cashiers INTEGER DEFAULT 2,
    max_products INTEGER DEFAULT 500,
    max_sales_per_month INTEGER DEFAULT 1000,
    notes TEXT DEFAULT '',
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 4. Users (Cashiers, Tenant Admins, Super Admins)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier',
    active BOOLEAN DEFAULT 1,
    max_discount_percent REAL DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 5. Settings (Per Tenant)
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL UNIQUE,
    store_name TEXT DEFAULT 'متجر POS',
    store_phone TEXT DEFAULT '',
    store_address TEXT DEFAULT '',
    store_logo TEXT DEFAULT '',
    currency TEXT DEFAULT 'ج.م',
    tax_rate REAL DEFAULT 0.00,
    receipt_footer TEXT DEFAULT 'شكراً لزيارتكم',
    thermal_width INTEGER DEFAULT 80,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 6. Categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    color TEXT DEFAULT '#3B82F6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 7. Products
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    category_id TEXT,
    name TEXT NOT NULL,
    barcode TEXT,
    description TEXT DEFAULT '',
    cost_price REAL DEFAULT 0.00,
    sell_price REAL NOT NULL DEFAULT 0.00,
    stock REAL DEFAULT 0.000,
    min_stock REAL DEFAULT 0.000,
    unit TEXT DEFAULT 'قطعة',
    image TEXT DEFAULT '',
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, barcode),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 8. Customers
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    balance REAL DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 9. Employees
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    position TEXT DEFAULT '',
    salary REAL DEFAULT 0.00,
    hire_date DATE,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 10. Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- 11. Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    category TEXT DEFAULT 'عام',
    amount REAL NOT NULL,
    description TEXT DEFAULT '',
    user_id TEXT,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 12. Sales
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    invoice_number TEXT,
    customer_id TEXT,
    user_id TEXT,
    subtotal REAL DEFAULT 0.00,
    discount REAL DEFAULT 0.00,
    discount_type TEXT DEFAULT 'fixed',
    tax REAL DEFAULT 0.00,
    total REAL DEFAULT 0.00,
    paid REAL DEFAULT 0.00,
    remaining REAL DEFAULT 0.00,
    change_amount REAL DEFAULT 0.00,
    payment_method TEXT DEFAULT 'cash',
    status TEXT DEFAULT 'completed',
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, invoice_number),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 13. Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    sale_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    barcode TEXT DEFAULT '',
    quantity REAL NOT NULL,
    cost_price REAL DEFAULT 0.00,
    unit_price REAL NOT NULL,
    discount REAL DEFAULT 0.00,
    total REAL NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- 14. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    balance REAL DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 15. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    supplier_id TEXT,
    user_id TEXT,
    order_number TEXT,
    subtotal REAL DEFAULT 0.00,
    discount REAL DEFAULT 0.00,
    total REAL DEFAULT 0.00,
    paid REAL DEFAULT 0.00,
    remaining REAL DEFAULT 0.00,
    status TEXT DEFAULT 'received',
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, order_number),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 16. Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    cost_price REAL NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- 17. Customer Payments
CREATE TABLE IF NOT EXISTS customer_payments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    customer_id TEXT,
    sale_id TEXT,
    amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_date ON sales(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON expenses(tenant_id);

-- Seed Default Plans
INSERT OR IGNORE INTO plans (id, name, description, price_monthly, max_employees, max_cashiers, max_products, max_sales_per_month, features, color, sort_order)
VALUES
  ('plan-starter', 'Starter', 'مثالي للمشاريع الصغيرة والناشئة', 99, 3, 1, 200, 500,
   '["نقطة بيع واحدة","تقارير مبيعات أساسية","إدارة منتجات حتى 200","دعم فني عبر البريد"]',
   '#6B7280', 1),
  ('plan-basic', 'Basic', 'للمتاجر المتوسطة والنامية', 199, 5, 2, 500, 2000,
   '["3 نقاط بيع","تقارير متقدمة","إدارة مخزون","إدارة العملاء","دعم فني 24/7"]',
   '#3B82F6', 2),
  ('plan-pro', 'Pro', 'للأعمال المتنامية والمتعددة الفروع', 399, 15, 5, 2000, 10000,
   '["نقاط بيع غير محدودة","تقارير شاملة","مزامنة سحابية","إدارة موظفين","تقارير الأرباح","دعم أولوية"]',
   '#8B5CF6', 3),
  ('plan-enterprise', 'Enterprise', 'للشركات الكبرى - كل شيء بلا حدود', 999, 999, 999, 999999, 999999,
   '["غير محدود تماماً","Custom Branding","SLA 99.9%","مدير حساب مخصص","تدريب الفريق","API Access كامل","تقارير BI"]',
   '#F59E0B', 4);
