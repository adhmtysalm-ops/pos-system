#!/bin/bash
# =====================================================
# POS System First-Time Setup Script
# =====================================================

echo "🚀 Starting POS System Setup..."
echo ""

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check XAMPP MySQL
echo -e "${YELLOW}⚙️  Checking Database Connection...${NC}"

MYSQL_CMD="mysql"
if [ -x "/opt/lampp/bin/mysql" ]; then
    MYSQL_CMD="/opt/lampp/bin/mysql"
fi

if $MYSQL_CMD -u root -e "SELECT 1" 2>/dev/null; then
    echo -e "${GREEN}✅ Connected to MySQL/MariaDB${NC}"
    
    # Auto-create POS database
    echo -e "${BLUE}⚙️  Ensuring POS database exists...${NC}"
    $MYSQL_CMD -u root -e "CREATE DATABASE IF NOT EXISTS POS CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
else
    echo -e "${YELLOW}⚠️  Please ensure XAMPP is running and MySQL is started${NC}"
    echo "   Command: sudo /opt/lampp/lampp start"
    echo ""
    echo "   If MySQL is running but setup fails, you may need to add mysql to your PATH or set a password in .env."
    exit 1
fi

# Setup Environment Files
echo -e "${YELLOW}⚙️  Checking Environment Files...${NC}"
if [ ! -f "$DIR/backend/.env" ]; then
    echo -e "${BLUE}📝 Creating backend/.env from example...${NC}"
    cp "$DIR/backend/.env.example" "$DIR/backend/.env"
fi

if [ ! -f "$DIR/frontend/.env" ]; then
    echo -e "${BLUE}📝 Creating frontend/.env from example...${NC}"
    cp "$DIR/frontend/.env.example" "$DIR/frontend/.env"
fi
echo -e "${GREEN}✅ Environment files ready${NC}"
echo ""

# Install Backend Dependencies
echo -e "${BLUE}📦 Installing Backend dependencies...${NC}"
cd "$DIR/backend"
npm install

# Install Frontend Dependencies
echo -e "${BLUE}📦 Installing Frontend dependencies...${NC}"
cd "$DIR/frontend"
npm install

# Seed database
echo -e "${BLUE}🌱 Seeding database...${NC}"
cd "$DIR/backend"
node seed.js

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}🎉 Setup Complete! You can now run ./start.sh to launch the system.${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
