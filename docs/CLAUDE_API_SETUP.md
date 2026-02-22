# Claude API Setup Guide

This guide explains how to set up the Claude API integration for AI-powered venture insights generation.

## Overview

The platform uses Anthropic's Claude API to generate intelligent insights for venture screening, including:
- **PROS (Strengths)**: 5 key strengths of the venture
- **CONS (Risks)**: 5 potential risks or concerns
- **Probing Questions**: 5 actionable questions for deeper assessment
- **Program Recommendation**: Suggested program tier (Prime/Core/Essential)

## Prerequisites

- Active Anthropic API account
- Claude API key with access to Claude Sonnet 4.5

## Setup Instructions

### Step 1: Get Your Claude API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **Create Key**
5. Copy the API key (starts with `sk-ant-...`)

### Step 2: Add API Key to Backend

1. Open `/backend/.env` file
2. Find the line:
   ```env
   ANTHROPIC_API_KEY=
   ```
3. Paste your API key after the `=` sign:
   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
   ```
4. Save the file

### Step 3: Restart Backend Server

If your backend is running, restart it to load the new environment variable:

```bash
cd backend
npm run dev
```

### Step 4: Test the Integration

1. **Start both frontend and backend:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd ..
   npm run dev
   ```

2. **Log in as Screening Manager:**
   - Go to the login page
   - Use an email that includes "screening" or has the `success_mgr` role

3. **Generate AI Insights:**
   - Navigate to **Screening Manager Dashboard**
   - Click on any submitted venture
   - Scroll to **"Generate AI insights"** section
   - Add any notes in the "Screening Manager's Notes" field (optional)
   - Click **"Generate insights"** button

4. **Verify Results:**
   - You should see the loading state for ~3-10 seconds (actual API call time)
   - Results will show:
     - **PROS**: 5 strengths
     - **CONS**: 5 risks
     - **Probing Questions**: 5 questions
   - The insights are automatically saved to the database

## How It Works

### Backend Architecture

```
Frontend (VSMDashboard.tsx)
    ↓
API Client (src/lib/api.ts)
    ↓ POST /api/ventures/:id/generate-insights
Backend Route (backend/src/routes/ventures.ts)
    ↓
AI Service (backend/src/services/aiService.ts)
    ↓
Anthropic Claude API (Claude Sonnet 4.5)
    ↓
Database (ventures.ai_analysis JSONB column)
```

### Files Modified

1. **Backend:**
   - `backend/package.json` - Added `@anthropic-ai/sdk` dependency
   - `backend/src/services/aiService.ts` - New AI service for Claude API calls
   - `backend/src/routes/ventures.ts` - New endpoint `/api/ventures/:id/generate-insights`
   - `backend/.env` - Added `ANTHROPIC_API_KEY` variable

2. **Frontend:**
   - `src/lib/api.ts` - Added `generateInsights()` method
   - `src/pages/VSMDashboard.tsx` - Updated to call real API instead of simulated data

### Prompt Engineering

The system sends a structured prompt to Claude that includes:
- Venture company name, founder, revenue metrics
- Current and target market information
- Screening Manager's notes (if any)
- Explicit instructions to return 5 PROS, 5 CONS, and 5 questions

Claude responds with a JSON object that's parsed and displayed in the UI.

## API Usage & Cost

### Model Used
- **Model:** `claude-sonnet-4-5-20250929`
- **Max Tokens:** 2000 per request
- **Temperature:** 0.7 (balanced creativity)

### Estimated Costs (as of Feb 2026)
- **Input:** ~500-800 tokens per venture (venture data + prompt)
- **Output:** ~800-1200 tokens (structured insights)
- **Cost per insight:** ~$0.02-0.04 USD

**Example:**
- 100 ventures screened/month = ~$3-4 USD/month
- 1000 ventures screened/month = ~$30-40 USD/month

Check current pricing at [Anthropic Pricing](https://www.anthropic.com/pricing)

## Troubleshooting

### Error: "ANTHROPIC_API_KEY is not configured"

**Cause:** API key not set in backend `.env` file

**Solution:**
1. Verify `backend/.env` has the line: `ANTHROPIC_API_KEY=sk-ant-...`
2. Restart backend server
3. Try again

### Error: "Invalid Anthropic API key"

**Cause:** API key is incorrect or expired

**Solution:**
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Verify your API key is active
3. Create a new key if needed
4. Update `backend/.env` with new key
5. Restart backend

### Error: "Rate limit exceeded"

**Cause:** Too many API calls in short time period

**Solution:**
1. Wait a few minutes before trying again
2. Consider upgrading your Anthropic plan for higher limits
3. Implement request queuing if generating insights in bulk

### Insights Not Showing 5 Points

**Cause:** Old data in database from before the API integration

**Solution:**
1. Click "Generate insights" on a venture that hasn't been analyzed yet
2. Or clear existing `ai_analysis` data and regenerate:
   ```sql
   UPDATE ventures
   SET ai_analysis = NULL
   WHERE id = 'venture-id-here';
   ```

### Backend Not Connecting to Frontend

**Cause:** CORS or API URL misconfiguration

**Solution:**
1. Verify `backend/.env` has `FRONTEND_URL=http://localhost:5173`
2. Verify frontend has correct API URL in `src/lib/api.ts`:
   ```typescript
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
   ```

## Security Best Practices

1. **Never commit API keys to git**
   - The `.env` file is in `.gitignore`
   - Use environment variables in production

2. **Restrict API access**
   - Only screening managers and above can generate insights
   - Database RLS policies enforce access control

3. **Monitor API usage**
   - Check Anthropic console for usage metrics
   - Set up billing alerts to avoid unexpected charges

4. **Rotate keys regularly**
   - Generate new API keys every 3-6 months
   - Immediately rotate if key is compromised

## Production Deployment

When deploying to production:

1. **Set environment variable:**
   ```bash
   # Vercel/Netlify
   ANTHROPIC_API_KEY=sk-ant-your-production-key

   # Railway/Render
   railway variables set ANTHROPIC_API_KEY=sk-ant-your-production-key
   ```

2. **Use separate keys for staging/production**
   - Different keys help track usage per environment

3. **Monitor performance:**
   - Track API latency in logs
   - Set up error alerting for failed API calls

## Support

- **Anthropic Documentation:** https://docs.anthropic.com/
- **API Status:** https://status.anthropic.com/
- **Support:** support@anthropic.com

## Future Enhancements

Potential improvements to consider:

1. **Caching**: Cache similar insights to reduce API calls
2. **Batch Processing**: Generate insights for multiple ventures at once
3. **Streaming**: Stream insights token-by-token for faster perceived performance
4. **Custom Prompts**: Allow screening managers to customize the analysis focus
5. **Version History**: Track changes in AI recommendations over time
6. **A/B Testing**: Compare different prompt strategies
