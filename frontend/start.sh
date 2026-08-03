#!/usr/bin/env bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

if [ ! -f ".env.local" ] && [ -f ".env.local.example" ]; then
    echo -e "${YELLOW}⚠️  Creating .env.local from .env.local.example...${NC}"
    cp .env.local.example .env.local
fi

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing node_modules...${NC}"
    npm install
fi

echo -e "${GREEN}⚡ Starting Next.js Frontend on http://localhost:3000 ...${NC}"
exec npm run dev
