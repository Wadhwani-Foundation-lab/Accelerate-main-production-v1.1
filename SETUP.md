# Setup Guide

This guide covers the complete setup process for the Wadhwani Ventures Platform, including all required API keys and environment variables.

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Anthropic API account (for AI insights)

## Quick Start

### 1. Clone and Install

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

### 2. Environment Configuration

#### Frontend (.env)

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and configure:

```env
# Backend API URL (keep as-is for local development)
VITE_API_URL=http://localhost:3001/api

# Supabase Configuration (get from Supabase dashboard)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these:**
- Go to [Supabase Dashboard](https://app.supabase.com/)
- Select your project
- Go to **Settings** → **API**
- Copy `Project URL` → `VITE_SUPABASE_URL`
- Copy `anon` `public` key → `VITE_SUPABASE_ANON_KEY`

#### Backend (backend/.env)

```bash
# Copy the example file
cd backend
cp .env.example .env
```

Edit `backend/.env` and configure:

```env
PORT=3001
NODE_ENV=development

# Supabase Configuration (same project as frontend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Anthropic Claude API (REQUIRED for AI insights)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

**Where to find these:**

**Supabase Keys:**
- Same location as frontend (Settings → API)
- Copy `service_role` `secret` key → `SUPABASE_SERVICE_KEY`
- ⚠️ **WARNING**: Keep `service_role` key SECRET - never expose in frontend!

**Anthropic API Key:**
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-`) → `ANTHROPIC_API_KEY`

### 3. Database Setup

Run the database migrations (if not already done):

```bash
# See docs/README.md and scripts/migrations/README.md for details
# Execute migrations via Supabase Dashboard → SQL Editor
```

### 4. Start Development Servers

#### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

**Expected output:**
```
Server running on port 3001
Environment: development
Frontend URL: http://localhost:5173
```

#### Terminal 2 - Frontend:
```bash
npm run dev
```

**Expected output:**
```
VITE v7.3.1  ready in 315 ms
➜  Local:   http://localhost:5173/
```

### 5. Verify Setup

1. **Open browser:** http://localhost:5173
2. **Create account or login**
3. **Test basic functionality:**
   - Create a new venture
   - Submit it for review
4. **Test AI insights (if you're a screening manager):**
   - Go to Screening Manager Dashboard
   - Click on a venture
   - Click "Generate insights"
   - Should see 5 PROS, 5 CONS, 5 questions

## Environment Variables Reference

### Frontend (.env)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes | Backend API endpoint | `http://localhost:3001/api` |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (public) | `eyJhbG...` |

### Backend (backend/.env)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | Yes | Backend server port | `3001` |
| `NODE_ENV` | Yes | Environment mode | `development` |
| `SUPABASE_URL` | Yes | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key | `eyJhbG...` |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key (SECRET!) | `eyJhbG...` |
| `FRONTEND_URL` | Yes | Frontend URL for CORS | `http://localhost:5173` |
| `ANTHROPIC_API_KEY` | **Yes*** | Claude API key for AI insights | `sk-ant-api03-...` |

*Required for AI insights feature. Without it, the app will work but AI insights generation will fail.

## Security Best Practices

### ⚠️ CRITICAL - Never Commit Secrets

Both `.env` files are in `.gitignore` to prevent accidental commits.

**DO:**
- ✅ Use `.env.example` files as templates
- ✅ Keep `.env` files out of git
- ✅ Use different keys for staging/production
- ✅ Rotate API keys regularly (every 3-6 months)

**DON'T:**
- ❌ Commit `.env` files to git
- ❌ Share API keys in Slack/email
- ❌ Use production keys in development
- ❌ Expose `SUPABASE_SERVICE_KEY` in frontend

### Key Types

| Key Type | Where to Use | Security Level |
|----------|--------------|----------------|
| `SUPABASE_ANON_KEY` | Frontend + Backend | Public (safe to expose) |
| `SUPABASE_SERVICE_KEY` | Backend ONLY | Secret (bypasses RLS) |
| `ANTHROPIC_API_KEY` | Backend ONLY | Secret (costs money) |

## Production Deployment

### Frontend (Vercel/Netlify)

Set environment variables in the hosting platform:

```
VITE_API_URL=https://api.yourapp.com/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (Railway/Render/Heroku)

Set environment variables in the hosting platform:

```bash
# Railway example
railway variables set ANTHROPIC_API_KEY=sk-ant-your-key
railway variables set SUPABASE_SERVICE_KEY=your-service-key
# ... etc
```

**⚠️ Important for production:**
1. Use different Supabase project or separate keys
2. Use separate Anthropic API key for billing tracking
3. Set `NODE_ENV=production`
4. Update `FRONTEND_URL` to your production domain
5. Enable rate limiting and monitoring

## Troubleshooting

### Backend won't start

**Error:** `EADDRINUSE: address already in use`
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Frontend can't connect to backend

1. Check backend is running on port 3001
2. Verify `VITE_API_URL` in frontend `.env`
3. Check CORS settings in `backend/.env` (`FRONTEND_URL`)

### AI insights not working

**Error:** "ANTHROPIC_API_KEY is not configured"
1. Check `backend/.env` has `ANTHROPIC_API_KEY=sk-ant-...`
2. Restart backend server
3. Test with: `cd backend && npx tsx src/scripts/test-claude-api.ts`

**Error:** "Invalid Anthropic API key"
1. Verify key is correct in [Anthropic Console](https://console.anthropic.com/)
2. Generate new key if needed
3. Update `backend/.env`

### Database issues

1. Check Supabase project is active
2. Verify database migrations are run
3. Check RLS policies are enabled
4. Test connection with Supabase dashboard

## Testing

### Test Backend API
```bash
cd backend
npx tsx src/scripts/test-claude-api.ts
```

### Test Database Connection
Use Supabase Dashboard → SQL Editor:
```sql
SELECT * FROM profiles LIMIT 1;
SELECT * FROM ventures LIMIT 1;
```

## Next Steps

- ✅ Read [docs/CLAUDE_API_SETUP.md](docs/CLAUDE_API_SETUP.md) for AI insights details
- ✅ Read [docs/DATABASE_SCHEMA_REDESIGN.md](docs/DATABASE_SCHEMA_REDESIGN.md) for database architecture
- ✅ Review [scripts/migrations/README.md](scripts/migrations/README.md) for migration guide

## Support

For issues:
1. Check this guide first
2. Review relevant documentation in `docs/`
3. Check backend logs for error messages
4. Check browser console for frontend errors

## Summary

**Minimum required setup:**
1. ✅ Frontend `.env` with Supabase keys
2. ✅ Backend `.env` with Supabase keys + Anthropic API key
3. ✅ Database migrations executed
4. ✅ Both servers running

**Total setup time:** ~10-15 minutes
