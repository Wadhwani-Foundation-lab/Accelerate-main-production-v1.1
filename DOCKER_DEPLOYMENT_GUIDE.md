# Docker Deployment Guide for Wadhwani Accelerate
## Complete Containerization Strategy

---

## 📦 Docker Deployment Overview

Docker deployment gives you:
- ✅ **Consistency**: Same environment everywhere (dev, staging, prod)
- ✅ **Portability**: Deploy anywhere (AWS, GCP, Azure, DigitalOcean, bare metal)
- ✅ **Isolation**: Each service in its own container
- ✅ **Scalability**: Easy horizontal scaling with orchestration
- ✅ **Version Control**: Docker images are versioned

---

## 🏗️ Architecture

### **Option 1: Docker Compose (Simple - Best for Small Scale)**
```
┌─────────────────────────────────────────────────────────────┐
│ Docker Compose (Single Server)                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Frontend    │  │  Backend     │                        │
│  │  Container   │  │  Container   │                        │
│  │  (Nginx)     │  │  (Node.js)   │                        │
│  │  Port: 80    │  │  Port: 3001  │                        │
│  └──────┬───────┘  └──────┬───────┘                        │
│         │                  │                                 │
│         └──────────┬───────┘                                │
│                    │                                         │
│                    ▼                                         │
│         ┌─────────────────────┐                             │
│         │  Supabase (External)│                             │
│         │  PostgreSQL + Auth  │                             │
│         └─────────────────────┘                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Cost: $20-40/month (DigitalOcean Droplet or similar)
Users: 100-500 easily
Setup: 1-2 hours
```

### **Option 2: Kubernetes (Advanced - Best for Scale)**
```
┌─────────────────────────────────────────────────────────────┐
│ Kubernetes Cluster                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Frontend Pods   │    │ Backend Pods    │                │
│  │ (3 replicas)    │    │ (3 replicas)    │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                           │
│  ┌────────▼────────┐    ┌───────▼────────┐                 │
│  │ Load Balancer   │    │ Load Balancer  │                 │
│  │ (Ingress)       │    │ (Service)      │                 │
│  └────────┬────────┘    └───────┬────────┘                 │
│           │                      │                           │
│           └──────────┬───────────┘                          │
│                      │                                       │
│                      ▼                                       │
│           ┌─────────────────────┐                           │
│           │  Supabase (External)│                           │
│           │  PostgreSQL + Auth  │                           │
│           └─────────────────────┘                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Cost: $100-300/month (Managed K8s)
Users: 1,000-10,000+
Setup: 1-2 days
```

---

## 📋 Complete Docker Setup Files

### **1. Dockerfile for Frontend**

```dockerfile
# Dockerfile.frontend
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build the application
RUN npm run build

# Stage 2: Production with Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### **2. Dockerfile for Backend**

```dockerfile
# backend/Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]
```

### **3. nginx.conf for Frontend**

```nginx
# nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### **4. docker-compose.yml**

```yaml
version: '3.8'

services:
  # Frontend service
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        VITE_API_URL: ${VITE_API_URL}
        VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
        VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY}
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  # Backend service
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

networks:
  app-network:
    driver: bridge
```

### **5. .dockerignore**

```
# .dockerignore
node_modules
npm-debug.log
dist
.git
.gitignore
.env
.env.*
README.md
*.md
.vscode
.idea
.DS_Store
coverage
.nyc_output
```

### **6. .env.docker (Template)**

```bash
# .env.docker
# Frontend environment variables
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://gheqxkxsjhkdbhmdntmh.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Backend environment variables
SUPABASE_URL=https://gheqxkxsjhkdbhmdntmh.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here
```

---

## 🚀 Deployment Options

### **Option A: DigitalOcean Droplet (Simplest)**

**Cost:** $24-48/month
**Setup Time:** 1-2 hours

```bash
# 1. Create a DigitalOcean Droplet
# - Ubuntu 22.04
# - 2GB RAM / 2 vCPUs ($24/month)
# - Or 4GB RAM / 2 vCPUs ($48/month) for 500+ users

# 2. SSH into droplet
ssh root@your-droplet-ip

# 3. Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt-get install docker-compose-plugin

# 4. Clone your repo
git clone https://github.com/vipul-wadhwani/off-wadhwani-accelerate-dev.git
cd off-wadhwani-accelerate-dev

# 5. Create .env file
nano .env.docker
# (Add your environment variables)

# 6. Build and run
docker compose --env-file .env.docker up -d

# 7. Check status
docker compose ps
docker compose logs -f

# 8. Set up reverse proxy with SSL (Caddy - easiest)
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy

# Caddyfile
cat > /etc/caddy/Caddyfile << EOF
your-domain.com {
    reverse_proxy localhost:80
}

api.your-domain.com {
    reverse_proxy localhost:3001
}
EOF

systemctl reload caddy
```

**Pros:**
- ✅ Simple setup
- ✅ Full control
- ✅ Predictable costs
- ✅ Can SSH and debug

**Cons:**
- ❌ Manual scaling
- ❌ Single point of failure
- ❌ You manage updates/security

---

### **Option B: AWS ECS Fargate (Managed Containers)**

**Cost:** $50-150/month
**Setup Time:** 3-4 hours

```bash
# Uses AWS Fargate (serverless containers)
# No server management
# Auto-scaling
# Load balancing included
```

**Architecture:**
```
ALB (Load Balancer)
  ↓
ECS Service (Frontend) - Fargate Task (2 vCPUs, 4GB RAM)
  ↓
ECS Service (Backend) - Fargate Task (2 vCPUs, 4GB RAM)
  ↓
Supabase (External)
```

**Pros:**
- ✅ Auto-scaling
- ✅ No server management
- ✅ High availability
- ✅ AWS ecosystem integration

**Cons:**
- ❌ More complex setup
- ❌ AWS learning curve
- ❌ More expensive

---

### **Option C: Kubernetes (GKE/EKS/DigitalOcean K8s)**

**Cost:** $100-300/month
**Setup Time:** 1-2 days

**Best for:** 1,000+ users, multiple environments, high availability

**Pros:**
- ✅ Enterprise-grade
- ✅ Auto-scaling (horizontal & vertical)
- ✅ Self-healing
- ✅ Rolling updates
- ✅ Multi-region

**Cons:**
- ❌ Complex
- ❌ Steep learning curve
- ❌ Overkill for <1,000 users

---

### **Option D: Render (Docker Support)**

**Cost:** $25-75/month
**Setup Time:** 30 minutes

```yaml
# render.yaml
services:
  - type: web
    name: wadhwani-frontend
    env: docker
    dockerfilePath: ./Dockerfile.frontend
    envVars:
      - key: VITE_API_URL
        value: https://api.your-domain.com
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false

  - type: web
    name: wadhwani-backend
    env: docker
    dockerfilePath: ./backend/Dockerfile
    envVars:
      - key: NODE_ENV
        value: production
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: ANTHROPIC_API_KEY
        sync: false
```

**Pros:**
- ✅ GitHub integration
- ✅ Auto-deploys
- ✅ SSL included
- ✅ Simple pricing

**Cons:**
- ❌ Less control than VPS
- ❌ Limited customization

---

## 📊 Cost & Performance Comparison

| Platform | Monthly Cost | Setup Time | Users Supported | Auto-Scaling | Complexity |
|----------|--------------|------------|-----------------|--------------|------------|
| **DigitalOcean Droplet** | $24-48 | 1-2 hours | 100-500 | ❌ Manual | ⭐ Easy |
| **Render (Docker)** | $25-75 | 30 min | 100-1,000 | ✅ Yes | ⭐ Easy |
| **AWS ECS Fargate** | $50-150 | 3-4 hours | 500-5,000 | ✅ Yes | ⭐⭐⭐ Medium |
| **DigitalOcean K8s** | $100-200 | 1 day | 1,000-10,000 | ✅ Yes | ⭐⭐⭐⭐ Hard |
| **GKE/EKS** | $150-300 | 2 days | 5,000-100,000 | ✅ Yes | ⭐⭐⭐⭐⭐ Very Hard |

---

## 🎯 My Docker Recommendation

### **For Your Use Case (100-500 users):**

**Option 1: DigitalOcean Droplet + Docker Compose ⭐ BEST VALUE**

**Why?**
- ✅ **Cost-effective**: $24-48/month (cheapest option)
- ✅ **Full control**: SSH access, can debug easily
- ✅ **Simple**: Docker Compose is easy to understand
- ✅ **Flexible**: Can upgrade to K8s later if needed
- ✅ **Performance**: Dedicated resources, no cold starts

**Setup:**
```bash
# Total setup time: 1-2 hours
1. Create DigitalOcean Droplet ($24/month)
2. Install Docker & Docker Compose (10 min)
3. Clone repo & configure env (10 min)
4. docker compose up -d (5 min)
5. Install Caddy for SSL (15 min)
6. Configure DNS (10 min)
7. Test & monitor (20 min)
```

**Scaling Strategy:**
```
100 users:  2GB Droplet ($24/month)
  ↓
300 users:  4GB Droplet ($48/month)
  ↓
500 users:  8GB Droplet ($96/month)
  ↓
1,000+ users: Migrate to K8s or AWS ECS
```

---

## 🔒 Security Best Practices

### **1. Container Security**
```dockerfile
# Use specific versions, not 'latest'
FROM node:20.11.0-alpine

# Run as non-root user
USER nodejs

# Scan for vulnerabilities
# docker scan your-image:tag
```

### **2. Secrets Management**
```bash
# Never commit secrets
# Use .env files or secret managers

# DigitalOcean: Use environment variables
# AWS: Use AWS Secrets Manager
# K8s: Use Kubernetes Secrets
```

### **3. Network Security**
```yaml
# docker-compose.yml
networks:
  app-network:
    driver: bridge
    internal: false  # Frontend/backend need external access
  db-network:
    driver: bridge
    internal: true   # Database only internal (if self-hosted)
```

### **4. Firewall Rules**
```bash
# Only expose necessary ports
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 22/tcp   # SSH (from your IP only)
ufw enable
```

---

## 📈 Monitoring & Logging

### **Docker Logs**
```bash
# View logs
docker compose logs -f

# View specific service
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100

# Export logs
docker compose logs > app-logs.txt
```

### **Monitoring Tools**
```yaml
# Add Prometheus + Grafana
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## 🚀 Quick Start Commands

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild and restart
docker compose up -d --build

# Scale backend (multiple instances)
docker compose up -d --scale backend=3

# Clean up
docker compose down -v
docker system prune -a
```

---

## 🔄 CI/CD Pipeline Example

### **GitHub Actions for Auto-Deploy**

```yaml
# .github/workflows/deploy.yml
name: Deploy to DigitalOcean

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DROPLET_IP }}
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/wadhwani-accelerate
            git pull
            docker compose down
            docker compose build
            docker compose up -d
            docker compose logs --tail=50
```

---

## 🎬 Next Steps

1. **Decide on deployment platform:**
   - Small scale (100-500): DigitalOcean Droplet
   - Medium scale (500-2000): Render or AWS ECS
   - Large scale (2000+): Kubernetes

2. **Create Docker files** (I can help generate them)

3. **Test locally:**
   ```bash
   docker compose up
   # Visit http://localhost
   ```

4. **Deploy to production**

5. **Set up monitoring**

---

## 💡 Docker vs PaaS (Vercel/Railway)

| Factor | Docker (DigitalOcean) | PaaS (Vercel/Railway) |
|--------|----------------------|----------------------|
| **Cost** | $24-48/month | $40-70/month |
| **Setup** | 1-2 hours | 30 minutes |
| **Control** | Full control | Limited |
| **Scaling** | Manual | Automatic |
| **Portability** | ✅ Deploy anywhere | ❌ Vendor lock-in |
| **DevOps** | You manage | Managed for you |
| **Best for** | Cost-conscious, control | Quick deployment, scaling |

**Recommendation:**
- Start with **Vercel + Railway** for fastest launch
- Migrate to **Docker on DigitalOcean** if you need more control or want to reduce costs
- Move to **Kubernetes** when you hit 1,000+ users

---

Would you like me to:
1. Generate all the Docker files for your project?
2. Help you set up DigitalOcean deployment?
3. Create a complete CI/CD pipeline?
4. Explain any specific part in detail?
