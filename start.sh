#!/bin/bash
# =====================================================
# POS System Startup Script (Daily Use)
# =====================================================

echo "🚀 Starting POS System..."
echo ""

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check XAMPP MySQL
MYSQL_CMD="mysql"
if [ -x "/opt/lampp/bin/mysql" ]; then
    MYSQL_CMD="/opt/lampp/bin/mysql"
fi

if ! $MYSQL_CMD -u root -e "SELECT 1" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Please ensure XAMPP is running and MySQL is started${NC}"
    echo "   Command: sudo /opt/lampp/lampp start"
    exit 1
fi

# Start Backend
echo -e "${BLUE}🔧 Starting Backend Server...${NC}"
cd "$DIR/backend"
npm start &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend is running on http://localhost:5000${NC}"

sleep 2

# Start Frontend
echo -e "${BLUE}🎨 Starting Frontend Server...${NC}"
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}🎉 POS System is live!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "  Frontend UI:  ${BLUE}http://localhost:5173${NC}"
echo -e "  Backend API:  ${BLUE}http://localhost:5000${NC}"
echo ""
echo -e "  Default Login Credentials:"
echo -e "  Admin:   admin / admin123"
echo -e "  Cashier: cashier / cashier123"
echo ""
echo -e "${YELLOW}To stop the servers, press Ctrl+C${NC}"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers Stopped'" EXIT INT TERM
wait
