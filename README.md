<h1 align="center">Advanced POS System (React & Node.js) 🛒</h1>

<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="NodeJS" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="ExpressJS" />
  <img src="https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=mariadb&logoColor=white" alt="MariaDB" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
</div>

<p align="center">
  <strong>A comprehensive, production-ready Point of Sale (POS) application built with a modern web stack. Designed to be fast, secure, and fully responsive across desktops, tablets, and mobile devices.</strong>
</p>

---

## 🌟 Key Features

### 💻 Cashier Interface (POS)
- **Lightning Fast Workflow**: Intuitive interface for quick checkout.
- **Barcode Scanner Support**: Instantly add items by scanning barcodes.
- **Floating Mobile Cart**: On mobile devices, the cart hides inside a beautiful floating action button (Drawer) for maximum screen space.
- **Smart Printing**: Directly print 80mm thermal receipts via the browser.

### 📦 Inventory & Products
- **Real-time Stock Tracking**: Prevents overselling when stock reaches 0.
- **Dynamic Image Uploads**: Upload product images securely; automatically served by the local backend.
- **Categorization**: Filter products by custom, color-coded categories.

### 👥 Multi-Role System
- **Admin**: Full access to dashboard, reports, settings, deleting items, and HR.
- **Cashier**: Restricted to the POS screen, their own sales, and their own attendance clock-in. Admins can set a maximum allowed discount percentage per cashier.

### 💼 Debts & Customers
- Track customer debts with partial payments.
- One-click filters to see "Customers with Debts".

### 📊 Comprehensive Dashboard & Reports
- Beautiful charts powered by Recharts showing 7-day sales trends.
- Detailed daily, monthly, and custom-range financial reports (Net Profit, Expenses, Purchases).

### 🏢 HR & Operations
- **Employees**: Manage staff profiles.
- **Attendance**: Daily Check-in / Check-out tracking for payroll.
- **Suppliers & Purchases**: Track wholesale inventory purchases and supplier ledgers.
- **Expenses**: Record operational costs (Rent, Electricity, Salaries).

---

## 🚀 Architecture & Tech Stack

- **Frontend**: React (Vite), React Router v6, TailwindCSS, Lucide Icons, Recharts.
- **Backend**: Node.js, Express, `mysql2/promise` for raw SQL efficiency, JWT Authentication, Multer for file uploads.
- **Database**: MariaDB / MySQL. Relational schema with foreign keys and strict constraints.
- **Responsiveness**: 100% Mobile & Tablet friendly (using `dvh` for native mobile browser support).
- **Localhost Only**: Strictly configured to run locally on a single machine for maximum security and zero network conflicts.

---

## ⚡ Installation & Setup

We designed the deployment process to be as simple as pressing a single button.

### Prerequisites
- Node.js (v16+)
- XAMPP or any MariaDB/MySQL server running on port `3306`.

### Step-by-Step Setup

#### 1. Database Setup
Before starting, ensure MySQL is running (e.g., via XAMPP), then create an empty database named `POS`.
- **Option 1 (via Terminal):**
  ```bash
  mysql -u root -e "CREATE DATABASE IF NOT EXISTS POS CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  ```
- **Option 2 (via phpMyAdmin):**
  1. Open your browser and go to `http://localhost/phpmyadmin`
  2. Click on **Databases**.
  3. Type `POS` in the Database name field and click **Create**.

#### 2. Install Dependencies
1. Clone the repository:
   ```bash
   git clone https://github.com/adhmtysalm-ops/pos-system.git
   cd pos-system
   ```
2. Make the setup script executable and run it:
   ```bash
   chmod +x setup.sh start.sh
   ./setup.sh
   ```

**What does `./setup.sh` do automatically?**
1. Installs backend dependencies.
2. Installs frontend dependencies.
3. Automatically injects the database tables (`schema.sql`) and sample data (`seed.js`) into your MySQL database!
4. Configures all `.env` files automatically.

### Running the System (Daily Use)
Whenever you want to start the system, just run:
```bash
./start.sh
```
This script instantly starts the servers without re-installing dependencies or duplicating data.

---

## 🔒 Localhost Access Only

For security reasons, this system is now configured to run strictly on `localhost`. 

- **Access URL**: Open your browser on the same computer and go to `http://localhost:5173`.
- **Note**: The system will block external requests from other devices on the network.

---

## 🔑 Default Credentials
Once the system starts, you can log in immediately:

- **Admin Account**:
  - Username: `admin`
  - Password: `admin123`

- **Cashier Account**:
  - Username: `cashier`
  - Password: `cashier123`

*(Please change these passwords in the Users menu after your first login!)*

---

## 🎨 Screenshots
*(Add your application screenshots here)*

<div align="center">
  <p>Built with ❤️ for modern retail businesses.</p>
</div>
