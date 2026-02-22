# API Configuration Quick Reference

## 📍 Current Setup

Your Claude API integration is **fully configured** and ready to use!

### ✅ What's Configured

1. **Backend API Key** → Stored in `backend/.env`
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-Oi0py...
   ```

2. **Frontend API URL** → Configured in `src/lib/api.ts`
   ```typescript
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
   ```

3. **Backend Endpoint** → `backend/src/routes/ventures.ts`
   ```
   POST /api/ventures/:id/generate-insights
   ```

4. **AI Service** → `backend/src/services/aiService.ts`
   - Uses Claude Sonnet 4.5 model
   - Generates 5 PROS, 5 CONS, 5 questions
   - Auto-saves to database

---

## 🔐 Security Setup

### ✅ Protected Files (.gitignore)

```gitignore
# Environment variables (NEVER commit these!)
.env
.env.local
backend/.env
backend/.env.local
```

### ✅ Example Files (Safe to Commit)

```
.env.example            ← Template for frontend
backend/.env.example    ← Template for backend
```

**These files are safe to commit** because they don't contain actual keys.

---

## 🔄 For Future Reference

### When Setting Up on a New Machine

1. **Clone the repository**
   ```bash
   git clone your-repo-url
   cd wadhwani_ventures_4_arun
   ```

2. **Copy example files**
   ```bash
   # Frontend
   cp .env.example .env

   # Backend
   cp backend/.env.example backend/.env
   ```

3. **Add your API keys** to both `.env` files
   - Frontend: Supabase public keys only
   - Backend: Supabase keys + **Anthropic API key**

4. **Install and run**
   ```bash
   npm install
   cd backend && npm install

   # Terminal 1
   cd backend && npm run dev

   # Terminal 2
   npm run dev
   ```

### When Adding a New Team Member

1. **Share:**
   - Repository access
   - Supabase project credentials
   - Anthropic API key (or have them create their own)

2. **DON'T share:**
   - Actual `.env` files (security risk!)
   - API keys via Slack/email (use secure methods)

3. **Instead:**
   - Point them to `SETUP.md`
   - Have them copy `.env.example` → `.env`
   - Provide keys via secure channel (1Password, etc.)

---

## 📊 API Usage Tracking

### Monitor Your Anthropic Usage

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Navigate to **Usage** section
3. View:
   - Total API calls this month
   - Costs per day
   - Token usage

### Expected Costs

| Usage | API Calls | Estimated Cost |
|-------|-----------|----------------|
| Light (10 ventures/month) | ~10 | ~$0.40/month |
| Medium (100 ventures/month) | ~100 | ~$3-4/month |
| Heavy (1000 ventures/month) | ~1000 | ~$30-40/month |

**Each insight generation:**
- Input: ~500-800 tokens (venture data + prompt)
- Output: ~800-1200 tokens (5 PROS + 5 CONS + 5 questions)
- Cost: ~$0.02-0.04 per venture

---

## 🔧 Updating API Keys

### To Update Anthropic API Key

1. **Get new key:**
   - Go to [Anthropic Console](https://console.anthropic.com/)
   - Create new API key

2. **Update backend/.env:**
   ```bash
   # Edit backend/.env
   ANTHROPIC_API_KEY=sk-ant-api03-new-key-here
   ```

3. **Restart backend:**
   ```bash
   # Stop with Ctrl+C, then:
   cd backend
   npm run dev
   ```

4. **Test it works:**
   ```bash
   cd backend
   npx tsx src/scripts/test-claude-api.ts
   ```

### To Update Supabase Keys

1. **Get new keys from Supabase Dashboard:**
   - Settings → API
   - Regenerate keys if needed

2. **Update BOTH .env files:**
   - Frontend: `.env`
   - Backend: `backend/.env`

3. **Restart both servers**

---

## 🧪 Testing the Setup

### Quick Test - Backend API
```bash
cd backend
npx tsx src/scripts/test-claude-api.ts
```

**Expected output:**
```
✅ API key found in environment variables
📡 Sending test request to Claude API...
✅ Success! Claude API responded:
   Hello! The API key is working correctly.
```

### Full Test - In Application

1. Start both servers
2. Login as Screening Manager
3. Open any venture
4. Click "Generate insights"
5. Should see 5 PROS, 5 CONS, 5 questions in ~5-10 seconds

---

## 📝 Summary

### ✅ What You Have Now

- **Configured** Claude API integration
- **Secure** .gitignore protecting secrets
- **Example files** for future setup
- **Documentation** for maintenance
- **Test scripts** to verify everything works

### 📁 Key Files

| File | Purpose | Commit to Git? |
|------|---------|----------------|
| `.env` | Frontend secrets | ❌ NO |
| `backend/.env` | Backend secrets (has API key) | ❌ NO |
| `.env.example` | Frontend template | ✅ YES |
| `backend/.env.example` | Backend template | ✅ YES |
| `SETUP.md` | Setup instructions | ✅ YES |
| `API_CONFIGURATION.md` | This file | ✅ YES |
| `docs/CLAUDE_API_SETUP.md` | Detailed API guide | ✅ YES |

### 🚀 You're All Set!

The API is configured and ready. Just:
1. Keep your `.env` files safe and never commit them
2. Use `.env.example` files as templates for new setups
3. Monitor your Anthropic API usage
4. Rotate keys every 3-6 months for security

---

**Questions?** Check [SETUP.md](SETUP.md) for full setup guide or [docs/CLAUDE_API_SETUP.md](docs/CLAUDE_API_SETUP.md) for API details.
