@echo off
chcp 65001 >nul
echo 🚀 Starting POS System...
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Node.js is not installed! Please install Node.js (v18+) from https://nodejs.org
    pause
    exit /b
)

:: Install Backend dependencies
if not exist "backend\node_modules\" (
    echo 📦 Installing Backend dependencies...
    cd backend
    call npm install
    cd ..
)

:: Install Frontend dependencies
if not exist "frontend\node_modules\" (
    echo 📦 Installing Frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

:: Seed database (assuming MySQL/XAMPP is running)
echo 🌱 Seeding database...
cd backend
call node seed.js
cd ..
echo.

:: Start Backend in a new window
echo 🔧 Starting Backend Server...
start "POS Backend API" cmd /c "cd backend && npm start"

:: Start Frontend in a new window
echo 🎨 Starting Frontend Server...
start "POS Frontend UI" cmd /c "cd frontend && npm run dev"

echo.
echo =========================================
echo 🎉 POS System is live!
echo =========================================
echo   Frontend UI:  http://localhost:5173
echo   Backend API:  http://localhost:5000
echo.
echo   Default Login Credentials:
echo   Admin:   admin / admin123
echo   Cashier: cashier / cashier123
echo.
echo Close this window to keep servers running in the background.
echo To stop the servers completely, close the newly opened command windows.
pause
