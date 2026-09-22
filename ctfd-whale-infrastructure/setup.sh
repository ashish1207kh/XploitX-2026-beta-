#!/bin/bash
# ==============================================================================
# XPLOITX 2026 - CTFd + CTFd-Whale One-Click Deployment Script
# ==============================================================================
set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}   XPLOITX 2026 - CTFd + CTFd-Whale Server Setup      ${NC}"
echo -e "${CYAN}======================================================${NC}"

# 1. Check Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker is not installed.${NC}"
    echo -e "Please install Docker first: sudo apt update && sudo apt install -y docker.io docker-compose"
    exit 1
fi

echo -e "${GREEN}[✔] Docker detected.${NC}"

# 2. Check and Initialize Docker Swarm
SWARM_STATUS=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || true)
if [ "$SWARM_STATUS" != "active" ]; then
    echo -e "${YELLOW}[!] Initializing Docker Swarm mode (Required by CTFd-Whale)...${NC}"
    docker swarm init || true
    echo -e "${GREEN}[✔] Docker Swarm initialized successfully.${NC}"
else
    echo -e "${GREEN}[✔] Docker Swarm is already active.${NC}"
fi

# 3. Create Overlay Network for Challenge Containers
if ! docker network ls --format '{{.Name}}' | grep -wq "ctfd_frp_containers"; then
    echo -e "${YELLOW}[!] Creating overlay network 'ctfd_frp_containers'...${NC}"
    docker network create -d overlay --attachable ctfd_frp_containers
    echo -e "${GREEN}[✔] Overlay network created.${NC}"
else
    echo -e "${GREEN}[✔] Network 'ctfd_frp_containers' already exists.${NC}"
fi

# 4. Prepare Directories
echo -e "${CYAN}[*] Creating storage and log directories...${NC}"
mkdir -p data/CTFd/logs data/CTFd/uploads data/mysql data/redis plugins conf

# 5. Clone ctfd-whale Plugin
if [ ! -d "plugins/ctfd-whale" ]; then
    echo -e "${YELLOW}[*] Cloning ctfd-whale plugin from GitHub...${NC}"
    git clone https://github.com/frankli0324/ctfd-whale.git plugins/ctfd-whale
    echo -e "${GREEN}[✔] ctfd-whale installed in plugins/ctfd-whale.${NC}"
else
    echo -e "${GREEN}[✔] ctfd-whale plugin directory already present.${NC}"
fi

# 6. Verify FRPS Config
if [ ! -f "conf/frps.ini" ]; then
    echo -e "${RED}[ERROR] conf/frps.ini not found. Please ensure it exists.${NC}"
    exit 1
fi

# 7. Start Containers
echo -e "${CYAN}[*] Building and starting CTFd, MariaDB, Redis, and FRPS...${NC}"
docker compose up -d --build

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}   [✔] CTFd + CTFd-Whale Deployed Successfully!       ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "Access your CTFd instance at: ${CYAN}http://<YOUR-SERVER-IP>:8000${NC}"
echo -e "FRP Dynamic Challenge Port Range: ${CYAN}20000 - 20050${NC}"
echo ""
echo -e "${YELLOW}Next Steps to configure in CTFd Admin Panel:${NC}"
echo -e "1. Complete initial CTFd setup wizard in your browser."
echo -e "2. Go to: Admin Panel -> Plugins -> CTFd Whale"
echo -e "3. Set Flag Template to: ${CYAN}XploitXβ{{{uuid}}}${NC}"
echo -e "4. Set Docker Swarm Node Token / unix:///var/run/docker.sock"
echo -e "5. Start creating challenges under 'dynamic_docker'!"
echo ""
