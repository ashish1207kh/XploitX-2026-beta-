# 🐋 CTFd + CTFd-Whale Infrastructure Guide (XploitX 2026)

This folder contains the complete, production-ready infrastructure to host **CTFd** with the **CTFd-Whale** plugin for on-demand Docker challenge containers and dynamic flags (`XploitXβ{flag}`).

---

## 1. What You Need to Prepare (Prerequisites)

### A. Linux Server / VPS
- **OS**: Ubuntu 22.04 LTS or 24.04 LTS (Clean installation recommended)
- **Minimum Hardware**:
  - 4 vCPU
  - 8 GB RAM (16 GB recommended for 50+ concurrent challenge instances)
  - 50 GB NVMe / SSD Storage
- **Providers**: Hetzner, DigitalOcean, Linode/Akamai, AWS EC2, or your college data-center server.

### B. DNS Records (in Cloudflare, GoDaddy, or Namecheap)
Add the following `A` records pointing to your VPS public IPv4 address:
1. `arena.yourdomain.com` $\rightarrow$ `YOUR_VPS_IP` *(CTFd Scoreboard & Arena)*
2. `*.direct.yourdomain.com` $\rightarrow$ `YOUR_VPS_IP` *(Wildcard for dynamic container routing)*

### C. Firewall / Security Group Ports
Ensure the following inbound ports are open on your VPS / AWS Security Group:
- `80` & `443`: HTTP/HTTPS
- `8000`: CTFd Main Web Interface
- `7000`: FRP Proxy Control Port
- `8080`: FRP HTTP Challenges Port
- `20000-20050`: FRP TCP / Pwn / Netcat Dynamic Challenge Ports

---

## 2. Server Deployment (Quickstart)

### Step 1: Copy or Clone to Your Server
SSH into your Ubuntu VPS:
```bash
# Clone the repository onto your server
git clone https://github.com/ashish1207kh/XploitX-2026-beta-.git /opt/xploitx
cd /opt/xploitx/ctfd-whale-infrastructure
```

### Step 2: Make the Setup Script Executable & Run It
```bash
chmod +x setup.sh
./setup.sh
```

The script will automatically:
1. Initialize **Docker Swarm** (required by Whale).
2. Create the **`ctfd_frp_containers`** overlay network.
3. Clone the official **CTFd-Whale** plugin into `plugins/ctfd-whale`.
4. Build and start **CTFd**, **MariaDB**, **Redis**, and **FRPS** reverse proxy.

---

## 3. What You Need to Do Manually (One-Time Setup)

### Step 1: Complete Initial CTFd Setup Wizard
1. Open your browser and navigate to:
   ```
   http://<YOUR-SERVER-IP>:8000
   ```
2. Enter your competition details:
   - **CTF Name**: `XPLOITX 2.0 BETA`
   - **Mode**: Team Mode
   - Create your **Admin Account** username and password.

---

### Step 2: Configure the Whale Plugin in Admin Panel
1. In the top navbar, click **Admin** to enter the Admin Panel.
2. In the navbar, go to **Plugins** $\rightarrow$ **CTFd Whale**.
3. Fill in the configuration values:

| Field | Setting Value | Purpose |
| :--- | :--- | :--- |
| **Docker API URL** | `unix:///var/run/docker.sock` | Allows CTFd to launch Docker containers |
| **Auto-destroy Timeout** | `1800` | Shuts down containers after 30 mins of inactivity |
| **Max Renewal Count** | `2` | Allows teams to extend their instance twice |
| **Flag Template** | `XploitXβ{{{uuid}}}` | Generates unique dynamic flags per team |
| **FRP Server IP / Host** | `frps` | Internal Docker service name |
| **FRP Server Port** | `7000` | FRP communication port |
| **FRP Token** | `XPLOITX_WHALE_SECRET_2026` | Matches `conf/frps.ini` |
| **FRP Subdomain Host** | `direct.yourdomain.com` | Base domain for challenge URLs |
| **Direct Port Range** | `20000-20050` | Port range for TCP / Pwn challenges |

4. Click **Submit / Save Configuration**.

---

### Step 3: Deploying Dynamic Challenges
To add a containerized challenge:
1. Build or pull your challenge image on the VPS:
   ```bash
   docker build -t xploitx/sample-web:1.0 challenges/sample-web-challenge/
   ```
2. In CTFd Admin, navigate to **Challenges** $\rightarrow$ **New Challenge**.
3. Select **`dynamic_docker`**.
4. Fill in:
   - **Name**: e.g., `Secret Incursion Node`
   - **Category**: `Web Exploitation`
   - **Docker Image**: `xploitx/sample-web:1.0`
   - **Redirect Type**: `HTTP` or `Direct Port`
   - **Target Port**: `80` (or challenge service port)
   - **Initial Value & Decay**: Configure dynamic scoring points.
5. Click **Create**.

When a player views this challenge, they will see a **"Launch Instance"** button. Whale will spin up their private container, display their private URL, and inject the unique flag format `XploitXβ{...}`!

---

## 4. Connecting the Arena to Your Main Website
Update `public/config.js` on the frontend with your live CTFd domain:
```javascript
window.XPLOITX_CONFIG = {
    RENDER_BACKEND_URL: 'https://xploitx-backend.onrender.com',
    CTFD_ARENA_URL: 'https://arena.yourdomain.com'
};
```
Competitors clicking **"CTF ARENA"** from the navigation bar or hero buttons will be routed directly to the competition arena.
