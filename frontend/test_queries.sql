SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE tenant_id='test' AND date(created_at) = date('now') AND status!='refunded';
SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE tenant_id='test' AND date(date) = date('now');
SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE tenant_id='test' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') AND status!='refunded';
SELECT COUNT(*) as count FROM products WHERE tenant_id='test' AND active=1;
SELECT COUNT(*) as count FROM products WHERE tenant_id='test' AND active=1 AND stock <= min_stock;
SELECT COUNT(*) as count FROM customers WHERE tenant_id='test';
SELECT date(created_at) as date, COALESCE(SUM(total),0) as total FROM sales WHERE tenant_id='test' AND created_at >= date('now', '-6 days') AND status!='refunded' GROUP BY date(created_at) ORDER BY date(created_at) ASC;
SELECT product_name as name, SUM(quantity) as qty, SUM(total) as total FROM sale_items i JOIN sales s ON i.sale_id = s.id WHERE i.tenant_id='test' AND s.status!='refunded' GROUP BY product_name ORDER BY qty DESC LIMIT 5;
