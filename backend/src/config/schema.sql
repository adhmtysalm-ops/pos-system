-- =====================================================
-- POS System Database Schema
-- Compatible with MariaDB / MySQL (XAMPP)
-- =====================================================

CREATE DATABASE IF NOT EXISTS `POS` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `POS`;

-- =====================================================
-- Users & Roles
-- =====================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'cashier') NOT NULL DEFAULT 'cashier',
  `max_discount_percent` DECIMAL(5,2) DEFAULT 100.00,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Store Settings
-- =====================================================
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `store_name` VARCHAR(200) DEFAULT 'متجر POS',
  `store_phone` VARCHAR(50) DEFAULT '',
  `store_address` TEXT DEFAULT '',
  `store_logo` VARCHAR(255) DEFAULT '',
  `currency` VARCHAR(10) DEFAULT 'ج.م',
  `tax_rate` DECIMAL(5,2) DEFAULT 0.00,
  `receipt_footer` TEXT DEFAULT 'شكراً لزيارتكم',
  `thermal_width` INT DEFAULT 80,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `settings` (`id`, `store_name`, `currency`) VALUES (1, 'متجر POS', 'ج.م');

-- =====================================================
-- Employees
-- =====================================================
CREATE TABLE IF NOT EXISTS `employees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) DEFAULT '',
  `email` VARCHAR(100) DEFAULT '',
  `address` TEXT DEFAULT '',
  `position` VARCHAR(100) DEFAULT '',
  `salary` DECIMAL(10,2) DEFAULT 0.00,
  `hire_date` DATE DEFAULT NULL,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Attendance
-- =====================================================
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `check_in` TIME DEFAULT NULL,
  `check_out` TIME DEFAULT NULL,
  `notes` TEXT DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_attendance` (`employee_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Categories
-- =====================================================
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT '',
  `color` VARCHAR(20) DEFAULT '#3B82F6',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Products
-- =====================================================
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NULL,
  `name` VARCHAR(200) NOT NULL,
  `barcode` VARCHAR(100) UNIQUE DEFAULT NULL,
  `description` TEXT DEFAULT '',
  `cost_price` DECIMAL(10,2) DEFAULT 0.00,
  `sell_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `stock` DECIMAL(10,3) DEFAULT 0.000,
  `min_stock` DECIMAL(10,3) DEFAULT 0.000,
  `unit` VARCHAR(20) DEFAULT 'قطعة',
  `image` VARCHAR(255) DEFAULT '',
  `active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Suppliers
-- =====================================================
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `phone` VARCHAR(50) DEFAULT '',
  `email` VARCHAR(100) DEFAULT '',
  `address` TEXT DEFAULT '',
  `notes` TEXT DEFAULT '',
  `balance` DECIMAL(10,2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Purchase Orders
-- =====================================================
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `supplier_id` INT NULL,
  `user_id` INT NULL,
  `order_number` VARCHAR(50) UNIQUE,
  `subtotal` DECIMAL(10,2) DEFAULT 0.00,
  `discount` DECIMAL(10,2) DEFAULT 0.00,
  `total` DECIMAL(10,2) DEFAULT 0.00,
  `paid` DECIMAL(10,2) DEFAULT 0.00,
  `remaining` DECIMAL(10,2) DEFAULT 0.00,
  `status` ENUM('pending','received','cancelled') DEFAULT 'received',
  `notes` TEXT DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `purchase_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT NULL,
  `product_name` VARCHAR(200) NOT NULL,
  `quantity` DECIMAL(10,3) NOT NULL,
  `cost_price` DECIMAL(10,2) NOT NULL,
  `total` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Customers
-- =====================================================
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `phone` VARCHAR(50) DEFAULT '',
  `email` VARCHAR(100) DEFAULT '',
  `address` TEXT DEFAULT '',
  `notes` TEXT DEFAULT '',
  `balance` DECIMAL(10,2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `customers` (`id`, `name`, `phone`) VALUES (1, 'عميل نقدي', '');

-- =====================================================
-- Sales (Invoices)
-- =====================================================
CREATE TABLE IF NOT EXISTS `sales` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) UNIQUE,
  `customer_id` INT NULL,
  `user_id` INT NULL,
  `subtotal` DECIMAL(10,2) DEFAULT 0.00,
  `discount` DECIMAL(10,2) DEFAULT 0.00,
  `discount_type` ENUM('fixed','percent') DEFAULT 'fixed',
  `tax` DECIMAL(10,2) DEFAULT 0.00,
  `total` DECIMAL(10,2) DEFAULT 0.00,
  `paid` DECIMAL(10,2) DEFAULT 0.00,
  `change_amount` DECIMAL(10,2) DEFAULT 0.00,
  `payment_method` ENUM('cash','card','credit','mixed') DEFAULT 'cash',
  `status` ENUM('completed','paid','credit','refunded','cancelled') DEFAULT 'completed',
  `notes` TEXT DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `remaining` DECIMAL(10,2) DEFAULT 0.00,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sale_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NOT NULL,
  `product_id` INT NULL,
  `product_name` VARCHAR(200) NOT NULL,
  `barcode` VARCHAR(100) DEFAULT '',
  `quantity` DECIMAL(10,3) NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `discount` DECIMAL(10,2) DEFAULT 0.00,
  `total` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Customer Payments Ledger
-- =====================================================
CREATE TABLE IF NOT EXISTS `customer_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `sale_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Expenses
-- =====================================================
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category` VARCHAR(100) DEFAULT 'عام',
  `amount` DECIMAL(10,2) NOT NULL,
  `description` TEXT DEFAULT '',
  `user_id` INT NULL,
  `date` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- Default Admin User (password: admin123)
-- =====================================================
INSERT IGNORE INTO `users` (`id`, `name`, `username`, `password`, `role`) 
VALUES (1, 'مدير النظام', 'admin', '$2a$10$rOzJqxqK8Z3K8Z3K8Z3K8u8Z3K8Z3K8Z3K8Z3K8Z3K8Z3K8Z3K8Zu', 'admin');

-- =====================================================
-- Sample Categories
-- =====================================================
INSERT IGNORE INTO `categories` (`name`, `color`) VALUES 
('مشروبات', '#3B82F6'),
('أغذية', '#10B981'),
('إلكترونيات', '#8B5CF6'),
('ملابس', '#F59E0B');
