const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./config/db');
require('dotenv').config();

const app = express();

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'عدد الطلبات كثير جداً من هذا العنوان، يرجى المحاولة لاحقاً',
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication endpoints get stricter rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit login attempts
  message: 'عدد محاولات تسجيل الدخول كثيرة جداً، يرجى المحاولة لاحقاً',
  skipSuccessfulRequests: true,
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);

// Serve static files (like uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads'), {
  maxAge: '1d',
  etag: false
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'POS API is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'الـ endpoint غير موجود' });
});

// Global Error Handler (must be last)
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'حجم الملف كبير جداً' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ message: 'عدد الملفات أكثر من المسموح' });
  }
  if (err.code === 'LIMIT_PART_COUNT') {
    return res.status(400).json({ message: 'عدد الأجزاء أكثر من المسموح' });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'حدث خطأ غير متوقع في الخادم';

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack.split('\n').slice(0, 5)
    })
  });
});

// Handle uncaught exceptions and unhandled rejections globally
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', {
    reason,
    promise: promise.toString()
  });
});

// Initialize database and start server
const initDB = async () => {
  try {
    const conn = await db.getConnection();
    console.log('✅ Connected to MariaDB successfully');
    conn.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('💡 Please check your database credentials in .env file');
    process.exit(1);
  }
};

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

initDB().then(() => {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 POS Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: ${process.env.DB_NAME || 'POS'}`);
    console.log(`🔧 Environment: ${NODE_ENV}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
  });
}).catch((err) => {
  console.error('Failed to initialize:', err);
  process.exit(1);
});

module.exports = app;
