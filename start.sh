#!/usr/bin/env bash
set -e

# Colors for terminal output
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"

echo -e "${BOLD}${CYAN}🚀 SUIS - Smart University Intelligence System Starter Script${NC}\n"

# Function to check and set up environment files
setup_env() {
    if [ ! -f "${BACKEND_DIR}/.env" ]; then
        if [ -f "${BACKEND_DIR}/.env.example" ]; then
            echo -e "${YELLOW}⚠️  Creating backend/.env from backend/.env.example...${NC}"
            cp "${BACKEND_DIR}/.env.example" "${BACKEND_DIR}/.env"
        fi
    fi

    if [ ! -f "${FRONTEND_DIR}/.env.local" ]; then
        if [ -f "${FRONTEND_DIR}/.env.local.example" ]; then
            echo -e "${YELLOW}⚠️  Creating frontend/.env.local from frontend/.env.local.example...${NC}"
            cp "${FRONTEND_DIR}/.env.local.example" "${FRONTEND_DIR}/.env.local"
        fi
    fi
}

# Function to run backend
run_backend() {
    echo -e "${GREEN}📦 Setting up Backend...${NC}"
    cd "${BACKEND_DIR}"

    if [ -d ".venv" ]; then
        VENV_PYTHON=".venv/bin/python"
        VENV_UVICORN=".venv/bin/uvicorn"
    elif [ -d "venv" ]; then
        VENV_PYTHON="venv/bin/python"
        VENV_UVICORN="venv/bin/uvicorn"
    else
        echo -e "${YELLOW}Creating Python virtual environment in backend/.venv...${NC}"
        python3 -m venv .venv
        VENV_PYTHON=".venv/bin/python"
        VENV_UVICORN=".venv/bin/uvicorn"
        echo -e "${GREEN}Installing backend dependencies...${NC}"
        "${VENV_PYTHON}" -m pip install --upgrade pip
        "${VENV_PYTHON}" -m pip install -r requirements.txt
    fi

    echo -e "${GREEN}🔥 Starting FastAPI Backend on http://localhost:8001 ...${NC}"
    exec "${VENV_UVICORN}" app.main:app --host 0.0.0.0 --port 8001 --reload
}

# Function to run frontend
run_frontend() {
    echo -e "${GREEN}📦 Setting up Frontend...${NC}"
    cd "${FRONTEND_DIR}"

    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing frontend dependencies...${NC}"
        npm install
    fi

    echo -e "${GREEN}⚡ Starting Next.js Frontend on http://localhost:3000 ...${NC}"
    exec npm run dev
}

# Function to run docker-compose
run_docker() {
    echo -e "${GREEN}🐳 Starting services with Docker Compose...${NC}"
    cd "${ROOT_DIR}"
    docker-compose up --build
}

# Function to run both concurrently
run_both() {
    setup_env

    echo -e "${GREEN}Starting Backend and Frontend for local development...${NC}"

    PIDS=()

    cleanup() {
        echo -e "\n${YELLOW}🛑 Stopping all services...${NC}"
        for pid in "${PIDS[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
            fi
        done
        wait 2>/dev/null || true
        echo -e "${GREEN}Shutdown complete.${NC}"
    }

    trap cleanup EXIT INT TERM

    # Start backend in background
    (
        cd "${BACKEND_DIR}"
        if [ -d ".venv" ]; then
            VENV_UVICORN=".venv/bin/uvicorn"
        elif [ -d "venv" ]; then
            VENV_UVICORN="venv/bin/uvicorn"
        else
            python3 -m venv .venv
            .venv/bin/pip install -r requirements.txt
            VENV_UVICORN=".venv/bin/uvicorn"
        fi
        echo -e "${GREEN}🔥 [Backend] Running FastAPI on http://localhost:8001${NC}"
        "${VENV_UVICORN}" app.main:app --host 0.0.0.0 --port 8001 --reload
    ) &
    PIDS+=($!)

    # Start frontend in background
    (
        cd "${FRONTEND_DIR}"
        if [ ! -d "node_modules" ]; then
            npm install
        fi
        echo -e "${GREEN}⚡ [Frontend] Running Next.js on http://localhost:3000${NC}"
        npm run dev
    ) &
    PIDS+=($!)

    echo -e "${BOLD}${GREEN}✅ Both services are starting!${NC}"
    echo -e "   - Frontend: ${CYAN}http://localhost:3000${NC}"
    echo -e "   - Backend Docs: ${CYAN}http://localhost:8001/docs${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop all servers.${NC}\n"

    wait
}

# Main command routing
MODE="${1:-dev}"

case "${MODE}" in
    dev|all|both)
        run_both
        ;;
    backend|api)
        setup_env
        run_backend
        ;;
    frontend|ui)
        setup_env
        run_frontend
        ;;
    docker)
        setup_env
        run_docker
        ;;
    *)
        echo -e "${RED}Unknown command: ${MODE}${NC}"
        echo -e "Usage: $0 [dev | backend | frontend | docker]"
        echo -e "  dev       - Start both backend and frontend concurrently (default)"
        echo -e "  backend   - Start only backend server (port 8001)"
        echo -e "  frontend  - Start only frontend server (port 3000)"
        echo -e "  docker    - Start full stack using docker-compose"
        exit 1
        ;;
esac
