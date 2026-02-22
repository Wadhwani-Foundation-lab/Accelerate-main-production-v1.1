# Deployment Guide - Netlify + Backend

This guide explains how to deploy your application to production with Netlify (frontend) and a backend hosting service.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   NETLIFY                           │
│  Frontend (React + Vite)                           │
│  • Public website                                   │
│  • Has ONLY public Supabase keys                   │
│  • Calls backend API for AI insights               │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ HTTPS API calls
                      ▼
┌─────────────────────────────────────────────────────┐
│         BACKEND (Railway/Render/Heroku)            │
│  • Express.js API                                   │
│  • Has Anthropic API key (SECRET)                  │
│  • Has Supabase service key (SECRET)               │
│  • Generates AI insights                           │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ API calls
                      ▼
        ┌─────────────────────────────┐
        │   Anthropic Claude API      │
        │   (AI Insights Generation)  │
        └─────────────────────────────┘
```

## 🔑 API Key Security Model

### ✅ Frontend (.env) - PUBLIC (Safe for Netlify)
```env
VITE_API_URL=https://your-backend.railway.app/api
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...  ← PUBLIC key (safe to expose)
```

### 🔒 Backend (backend/.env) - SECRET (Never expose!)
```env
ANTHROPIC_API_KEY=sk-ant-api03-...  ← SECRET (costs money!)
SUPABASE_SERVICE_KEY=eyJhbG...      ← SECRET (bypasses security!)
```

**Why this matters:**
- ❌ **DON'T** put Anthropic API key in frontend → Anyone can see it and use it (you pay!)
- ❌ **DON'T** put Supabase service key in frontend → Bypasses all security rules
- ✅ **DO** keep secrets in backend only → Protected from public access

---

## 📦 Deployment Steps

### Step 1: Deploy Backend First

You need to deploy the backend to a hosting service that supports Node.js:

#### Option A: Railway (Recommended - Easy)

1. **Go to [Railway.app](https://railway.app/)**
2. **Connect your GitHub repo**
3. **Create new project** → Select your repository
4. **Configure:**
   - Root directory: `backend`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

5. **Add environment variables in Railway dashboard:**
   ```
   PORT=3001
   NODE_ENV=production
   SUPABASE_URL=https://ymeqyrcstuskhcbpenss.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key
   FRONTEND_URL=https://your-netlify-site.netlify.app
   ANTHROPIC_API_KEY=sk-ant-api03-your-key
   ```

6. **Deploy** and note your backend URL (e.g., `https://your-backend.up.railway.app`)

#### Option B: Render.com

1. **Go to [Render.com](https://render.com/)**
2. **New Web Service** → Connect repository
3. **Settings:**
   - Root directory: `backend`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
4. **Add environment variables** (same as Railway)
5. **Deploy**

#### Option C: Heroku

```bash
# Install Heroku CLI
heroku login
heroku create your-backend-name

# From backend directory
cd backend
heroku config:set ANTHROPIC_API_KEY=sk-ant-your-key
heroku config:set SUPABASE_SERVICE_KEY=your-service-key
# ... set all other env vars

git push heroku main
```

---

### Step 2: Deploy Frontend to Netlify

#### A. Via Netlify Dashboard (Easiest)

1. **Go to [Netlify](https://app.netlify.com/)**
2. **Click "Add new site" → Import an existing project**
3. **Connect to GitHub** and select your repository
4. **Build settings:**
   - Base directory: (leave empty)
   - Build command: `npm run build`
   - Publish directory: `dist`

5. **Add environment variables** in Netlify dashboard:
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   VITE_SUPABASE_URL=https://ymeqyrcstuskhcbpenss.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

6. **Deploy!**

#### B. Via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy from root directory
netlify init

# Follow prompts:
# - Build command: npm run build
# - Publish directory: dist

# Set environment variables
netlify env:set VITE_API_URL https://your-backend.railway.app/api
netlify env:set VITE_SUPABASE_URL https://ymeqyrcstuskhcbpenss.supabase.co
netlify env:set VITE_SUPABASE_ANON_KEY your-anon-key

# Deploy
netlify deploy --prod
```

---

## 🔧 Environment Variables Cheat Sheet

### Frontend (Netlify)

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `VITE_API_URL` | `https://your-backend.railway.app/api` | Your backend deployment URL + `/api` |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` | Supabase Dashboard → Settings → API (anon public) |

### Backend (Railway/Render/Heroku)

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `PORT` | `3001` | Hard-coded |
| `NODE_ENV` | `production` | Hard-coded |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Same as frontend |
| `SUPABASE_ANON_KEY` | `eyJhbG...` | Same as frontend |
| `SUPABASE_SERVICE_KEY` | `eyJhbG...` | Supabase Dashboard → Settings → API (service_role) |
| `FRONTEND_URL` | `https://your-site.netlify.app` | Your Netlify site URL |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | [Anthropic Console](https://console.anthropic.com/) |

---

## 🧪 Testing Production Setup

### 1. Test Backend API Directly

```bash
# Test health endpoint
curl https://your-backend.railway.app/health

# Expected response:
# {"status":"ok","timestamp":"..."}
```

### 2. Test AI Insights Generation

```bash
# You'll need a valid auth token from Supabase
curl -X POST https://your-backend.railway.app/api/ventures/{venture-id}/generate-insights \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vsm_notes":"Test notes"}'
```

### 3. Test Frontend

1. Open your Netlify site: `https://your-site.netlify.app`
2. Login as screening manager
3. Click "Generate insights" on a venture
4. Should work exactly like local development!

---

## 🐛 Troubleshooting

### Frontend can't connect to backend

**Error:** "Failed to fetch" or CORS errors

**Solution:**
1. Check `VITE_API_URL` in Netlify env vars
2. Verify backend `FRONTEND_URL` includes your Netlify domain
3. Check backend is running (visit `https://your-backend.com/health`)

### AI insights not working in production

**Error:** "ANTHROPIC_API_KEY is not configured"

**Solution:**
1. Verify `ANTHROPIC_API_KEY` is set in backend env vars
2. Check backend logs for errors
3. Restart backend service after adding env var

### "Invalid API key" in production

**Solution:**
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Verify your API key is active
3. Create new key if needed
4. Update backend environment variable
5. Redeploy backend

---

## 📊 Monitoring & Costs

### Monitor Backend

- **Railway**: Dashboard → Metrics
- **Render**: Dashboard → Metrics
- **Heroku**: Dashboard → Metrics

### Monitor API Usage

- **Anthropic**: [Console Usage Tab](https://console.anthropic.com/)
  - View daily API calls
  - Track costs
  - Set billing alerts

### Expected Costs

| Service | Tier | Cost |
|---------|------|------|
| **Netlify** | Free tier | $0/month (plenty for most apps) |
| **Railway** | Free tier | $0-5/month (500 hours free) |
| **Supabase** | Free tier | $0/month (up to 500MB database) |
| **Anthropic API** | Pay-as-you-go | ~$0.02-0.04 per venture analyzed |

**Total estimated monthly cost:** $0-10 for moderate usage

---

## 🔄 CI/CD Setup (Auto-Deploy on Git Push)

### Netlify (Frontend)

Already set up! Every push to `main` branch auto-deploys.

**To disable:**
- Netlify Dashboard → Site settings → Build & deploy → Stop builds

### Railway (Backend)

Already set up! Every push auto-deploys.

**To configure:**
- Railway Dashboard → Settings → Deploy settings

---

## 🔐 Security Checklist for Production

Before deploying:

- [ ] ✅ Remove `SUPABASE_SERVICE_KEY` from frontend `.env`
- [ ] ✅ Verify `.env` files are in `.gitignore`
- [ ] ✅ Use different API keys for production vs development
- [ ] ✅ Set up billing alerts on Anthropic
- [ ] ✅ Enable Supabase RLS policies
- [ ] ✅ Use HTTPS for all API calls
- [ ] ✅ Set `NODE_ENV=production` in backend
- [ ] ✅ Review backend CORS settings

---

## 📝 Quick Deploy Summary

```bash
# 1. Deploy Backend (Railway example)
# - Create project on Railway
# - Connect repo
# - Set environment variables (including ANTHROPIC_API_KEY)
# - Deploy

# 2. Update Frontend .env
VITE_API_URL=https://your-backend.railway.app/api

# 3. Deploy Frontend (Netlify)
netlify login
netlify init
netlify env:set VITE_API_URL https://your-backend.railway.app/api
netlify env:set VITE_SUPABASE_URL https://xxx.supabase.co
netlify env:set VITE_SUPABASE_ANON_KEY your-anon-key
netlify deploy --prod

# 4. Test
# Open https://your-site.netlify.app
# Login and test AI insights generation
```

---

## 🆘 Need Help?

1. **Backend deployment issues** → Check hosting provider docs:
   - [Railway Docs](https://docs.railway.app/)
   - [Render Docs](https://render.com/docs)
   - [Heroku Docs](https://devcenter.heroku.com/)

2. **Netlify issues** → [Netlify Docs](https://docs.netlify.com/)

3. **API key issues** → Check [SETUP.md](SETUP.md) and [API_CONFIGURATION.md](API_CONFIGURATION.md)

---

**You're ready to deploy!** 🚀

Just remember: **Backend first** (get that URL), then **frontend** (use that URL).
