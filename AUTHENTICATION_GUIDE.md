# Authentication Architecture - Wadhwani Accelerate
## Complete Guide to How Authentication Works

---

## 🔐 Authentication Overview

Your application uses **Supabase Authentication** - a complete, production-ready auth system with zero custom code needed for the auth infrastructure.

**Key Benefits:**
- ✅ **No auth container needed** - Supabase handles everything
- ✅ **JWT-based** - Stateless, scalable authentication
- ✅ **Row Level Security (RLS)** - Database-level access control
- ✅ **Multi-layer security** - Frontend, Backend, and Database
- ✅ **Production-ready** - Used by thousands of companies

---

## 🏗️ Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ User Browser                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User logs in → Frontend sends email/password                │
│     ↓                                                            │
│  2. Supabase Auth validates credentials                         │
│     ↓                                                            │
│  3. Returns JWT tokens (access_token + refresh_token)           │
│     ↓                                                            │
│  4. Frontend stores tokens in localStorage                      │
│     ↓                                                            │
│  5. All requests include: Authorization: Bearer <token>         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Backend API (Express)                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  6. authenticateUser middleware extracts JWT token              │
│     ↓                                                            │
│  7. Validates token with Supabase.auth.getUser(token)           │
│     ↓                                                            │
│  8. Attaches user to req.user                                   │
│     ↓                                                            │
│  9. Optional: requireRole() checks user permissions             │
│     ↓                                                            │
│  10. Route handler processes authenticated request              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Supabase Database (PostgreSQL)                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  11. Row Level Security (RLS) policies check auth.uid()         │
│      ↓                                                           │
│  12. Only returns data user is authorized to see                │
│      ↓                                                           │
│  13. Prevents unauthorized modifications                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Three Layers of Security

### **Layer 1: Frontend (React Context)**

**Location:** `src/context/AuthContext.tsx`

```typescript
// What happens when user logs in:
1. User enters email/password
2. api.login(email, password) called
3. Supabase returns: { user, session }
4. Tokens stored in localStorage:
   - access_token (valid for 1 hour)
   - refresh_token (valid for 30 days)
5. User object stored in React state
6. All subsequent API calls include token
```

**Code Flow:**
```typescript
// Login
const signIn = async (email: string, password: string) => {
  const { user, session } = await api.login(email, password);

  // Store tokens
  localStorage.setItem('access_token', session.access_token);
  localStorage.setItem('refresh_token', session.refresh_token);

  // Update state
  setUser(user);
};

// Every API call includes token
fetch('/api/ventures', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});
```

---

### **Layer 2: Backend (Express Middleware)**

**Location:** `backend/src/middleware/auth.ts`

```typescript
// authenticateUser middleware
export async function authenticateUser(req, res, next) {
  // 1. Extract token from header
  const token = req.headers.authorization?.replace('Bearer ', '');

  // 2. Verify with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  // 3. If invalid, return 401
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // 4. Attach user to request
  req.user = user;
  next();
}
```

**Usage in Routes:**
```typescript
// Protected route
router.post('/api/ventures',
  authenticateUser,  // ← This middleware runs first
  async (req, res) => {
    // req.user is available here
    const userId = req.user.id;
    // ... rest of logic
  }
);
```

**Role-Based Access:**
```typescript
// Only allow specific roles
router.post('/api/ventures/:id/approve',
  authenticateUser,
  requireRole('venture_mgr', 'committee_member', 'admin'),
  async (req, res) => {
    // Only managers, committee, and admins can approve
  }
);
```

---

### **Layer 3: Database (Row Level Security)**

**Location:** `production_schema_v2.sql`

Supabase PostgreSQL has **Row Level Security (RLS)** enabled on all tables. This means even if someone bypasses your backend, the database itself enforces access control.

**Example Policies:**

#### **Ventures Table:**
```sql
-- Entrepreneurs can only view their own ventures
CREATE POLICY "Entrepreneurs view own ventures"
  ON ventures FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Staff can view all ventures
CREATE POLICY "Staff view all ventures"
  ON ventures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('success_mgr', 'venture_mgr', 'admin', 'committee_member')
      AND is_active = true
    )
  );

-- Entrepreneurs can only update their draft ventures
CREATE POLICY "Entrepreneurs update own draft ventures"
  ON ventures FOR UPDATE
  USING (auth.uid() = user_id AND status = 'Draft' AND deleted_at IS NULL);
```

**What This Means:**
- ❌ Entrepreneur A **cannot** see Entrepreneur B's ventures
- ❌ Entrepreneur **cannot** update submitted ventures
- ✅ Venture Manager **can** see all ventures
- ✅ Committee Member **can** see all ventures

---

## 🔑 JWT Token Flow

### **Token Structure:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "v1.MV9u...",
  "token_type": "bearer",
  "expires_in": 3600  // 1 hour
}
```

**JWT Payload (Decoded):**
```json
{
  "sub": "user-uuid",           // User ID
  "email": "user@example.com",
  "role": "authenticated",
  "iat": 1234567890,            // Issued at
  "exp": 1234571490             // Expires at (1 hour later)
}
```

### **Token Lifecycle:**

```
1. Login → Receive tokens
   ↓
2. Use access_token for API calls (valid 1 hour)
   ↓
3. When expired → Use refresh_token to get new access_token
   ↓
4. Refresh token valid for 30 days
   ↓
5. After 30 days → User must login again
```

**Auto-Refresh** (Supabase handles this automatically):
```typescript
// Supabase client automatically refreshes tokens
supabase.auth.getSession(); // Returns fresh token if needed
```

---

## 👥 Role-Based Access Control (RBAC)

### **User Roles:**

| Role | Permissions | Database Column |
|------|-------------|-----------------|
| **entrepreneur** | View/edit own ventures, submit applications | `profiles.role = 'entrepreneur'` |
| **success_mgr** | View all ventures, review applications, assign VSMs | `profiles.role = 'success_mgr'` |
| **venture_mgr** | All ventures, assessments, recommendations | `profiles.role = 'venture_mgr'` |
| **committee_member** | Review ventures, approve/reject, assign partners | `profiles.role = 'committee_member'` |
| **admin** | Full access to everything | `profiles.role = 'admin'` |

### **Role Assignment:**

**Auto-Assignment (Email-Based):**
```sql
-- In production_schema_v2.sql
CREATE OR REPLACE FUNCTION auto_assign_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email LIKE '%@wadhwani.%' THEN
    -- Wadhwani email → venture_mgr
    NEW.role := 'venture_mgr';
  ELSIF NEW.email LIKE '%committee%' THEN
    -- Committee email → committee_member
    NEW.role := 'committee_member';
  ELSE
    -- Default → entrepreneur
    NEW.role := 'entrepreneur';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Manual Assignment:**
```sql
-- Update user role (admin only)
UPDATE profiles
SET role = 'venture_mgr', is_active = true
WHERE email = 'manager@wadhwani.com';
```

---

## 🔒 Security Features

### **1. Password Security**
- ✅ Hashed with bcrypt by Supabase
- ✅ Minimum 6 characters enforced
- ✅ Can add custom password policies
- ✅ Rate limiting on login attempts

### **2. Token Security**
- ✅ JWT signed with secret key
- ✅ Short-lived access tokens (1 hour)
- ✅ Refresh tokens stored securely
- ✅ Tokens can be revoked

### **3. API Security**
```typescript
// All routes protected
router.post('/api/ventures', authenticateUser, handler);

// Role-based protection
router.post('/api/ventures/:id/approve',
  authenticateUser,
  requireRole('venture_mgr', 'admin'),
  handler
);
```

### **4. Database Security**
- ✅ Row Level Security (RLS) on all tables
- ✅ Cannot bypass with direct database access
- ✅ Enforced at PostgreSQL level

### **5. CORS Protection**
```typescript
// backend/src/index.ts
app.use(cors({
  origin: ['https://your-frontend.com'],  // Only allow your domain
  credentials: true
}));
```

---

## 🚀 Authentication in Docker Deployment

**Good news:** Authentication works **exactly the same** in Docker!

### **Why No Auth Container Needed:**

```
┌─────────────────────────────────────┐
│ Frontend Container                  │
│ - Supabase JS client included       │
│ - Talks to Supabase API (external) │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Backend Container                   │
│ - Supabase JS client included       │
│ - Validates tokens with Supabase   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Supabase (External - Cloud)         │
│ - Auth service ✅ (managed)         │
│ - Database ✅ (managed)              │
│ - No container needed! ✅            │
└─────────────────────────────────────┐
```

**Environment Variables (Same in Docker):**
```yaml
# docker-compose.yml
frontend:
  environment:
    - VITE_SUPABASE_URL=https://gheqxkxsjhkdbhmdntmh.supabase.co
    - VITE_SUPABASE_ANON_KEY=your-anon-key

backend:
  environment:
    - SUPABASE_URL=https://gheqxkxsjhkdbhmdntmh.supabase.co
    - SUPABASE_ANON_KEY=your-anon-key
    - SUPABASE_SERVICE_KEY=your-service-key  # For admin operations
```

---

## 🛠️ Common Authentication Tasks

### **1. Create New User (Signup)**

**Frontend:**
```typescript
await api.signup({
  email: 'user@example.com',
  password: 'securepass123',
  full_name: 'John Doe',
  role: 'entrepreneur'
});
```

**What Happens:**
1. Supabase creates user in `auth.users` table
2. Trigger creates profile in `profiles` table
3. Role auto-assigned based on email
4. JWT tokens returned
5. User logged in automatically

### **2. Login**

```typescript
await api.login('user@example.com', 'password');
```

### **3. Check if User is Logged In**

```typescript
const { user } = useAuth();

if (!user) {
  // Redirect to login
  navigate('/login');
}
```

### **4. Protected Route**

```typescript
// App.tsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

### **5. Logout**

```typescript
await api.logout();
// Clears tokens from localStorage
// Redirects to login
```

### **6. Get Current User Info**

```typescript
// Frontend
const { user } = useAuth();
console.log(user.email);
console.log(user.user_metadata.role);

// Backend
router.get('/api/me', authenticateUser, async (req, res) => {
  res.json({ user: req.user });
});
```

---

## 🔍 Debugging Authentication

### **Check Tokens:**
```javascript
// Browser console
localStorage.getItem('access_token');
localStorage.getItem('refresh_token');
```

### **Decode JWT:**
```javascript
// Use jwt.io or:
const token = localStorage.getItem('access_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload);
```

### **Test Backend Auth:**
```bash
# Get token from browser localStorage
curl -H "Authorization: Bearer <your-token>" \
  http://localhost:3001/api/ventures
```

### **Check RLS Policies:**
```sql
-- In Supabase SQL Editor
SELECT auth.uid();  -- Should return your user ID
SELECT * FROM ventures;  -- Should only return your ventures
```

---

## 🎯 Summary

### **Authentication Components:**

✅ **Frontend:** React Context + localStorage
✅ **Backend:** Express middleware + JWT validation
✅ **Database:** Row Level Security (RLS) policies
✅ **Auth Service:** Supabase Auth (managed, no container)

### **What You DON'T Need:**

❌ Auth container (Supabase handles it)
❌ Custom password hashing (Supabase handles it)
❌ Session management (JWT handles it)
❌ OAuth setup (Supabase can do this if needed)
❌ Password reset emails (Supabase handles it)

### **What's Already Configured:**

✅ JWT-based authentication
✅ Role-based access control
✅ Row-level security
✅ Token refresh mechanism
✅ Secure password storage
✅ Frontend auth context
✅ Backend auth middleware
✅ Database access policies

---

## 🚀 For Docker Deployment:

**NO CHANGES NEEDED!**

Authentication works exactly the same:
- Frontend container talks to Supabase API
- Backend container validates tokens with Supabase
- No additional auth container required
- Just pass environment variables

**Total Auth Containers Needed: 0** ✅

Your authentication is completely managed by Supabase (external service), so you only need your 2 app containers (frontend + backend).

---

## 📚 Additional Resources

**Supabase Auth Docs:** https://supabase.com/docs/guides/auth
**JWT.io:** https://jwt.io (decode tokens)
**RLS Guide:** https://supabase.com/docs/guides/database/postgres/row-level-security

---

Need help with:
- Setting up additional authentication methods (Google, GitHub OAuth)?
- Custom password policies?
- Multi-factor authentication (MFA)?
- Email verification flows?

Let me know! 🔐
