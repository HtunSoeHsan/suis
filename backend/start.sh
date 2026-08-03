#!/usr/bin/env bash
set -e

# Terminal Colors
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

echo -e "${BOLD}${CYAN}🚀 Starting SUIS FastAPI Backend...${NC}\n"

# 1. Environment file setup
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}⚠️  .env file not found. Copying from .env.example...${NC}"
        cp .env.example .env
    else
        echo -e "${RED}❌ Error: Neither .env nor .env.example was found in backend directory.${NC}"
        exit 1
    fi
fi

# 2. Virtual environment detection or creation
VENV_PATH=""
if [ -d ".venv" ]; then
    VENV_PATH=".venv"
elif [ -d "venv" ]; then
    VENV_PATH="venv"
else
    echo -e "${YELLOW}📦 Creating Python virtual environment (.venv)...${NC}"
    python3 -m venv .venv
    VENV_PATH=".venv"
    echo -e "${GREEN}📥 Installing backend dependencies from requirements.txt...${NC}"
    "${VENV_PATH}/bin/pip" install --upgrade pip
    "${VENV_PATH}/bin/pip" install -r requirements.txt
fi

UVICORN_BIN="${VENV_PATH}/bin/uvicorn"

if [ ! -f "${UVICORN_BIN}" ]; then
    echo -e "${YELLOW}⚠️  uvicorn not found in ${VENV_PATH}. Installing dependencies...${NC}"
    "${VENV_PATH}/bin/pip" install -r requirements.txt
fi

# 3. Start FastAPI server
PORT=${PORT:-8001}
HOST=${HOST:-0.0.0.0}

echo -e "${BOLD}${GREEN}✅ Backend setup complete!${NC}"
echo -e "   - Host: ${CYAN}http://${HOST}:${PORT}${NC}"
echo -e "   - Interactive Docs (Swagger): ${CYAN}http://localhost:${PORT}/docs${NC}"
echo -e "   - ReDoc: ${CYAN}http://localhost:${PORT}/redoc${NC}\n"

exec "${UVICORN_BIN}" app.main:app --host "${HOST}" --port "${PORT}" --reload
