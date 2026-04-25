# API Keys Storage Documentation

## Overview

This document explains where and how API keys like `GEMINI_API_KEY` are stored in the Academic Submission Agent Platform.

---

## 1. **Supabase Edge Function Secrets** (Primary Storage)

### Location

API keys like `GEMINI_API_KEY` are stored as **Supabase Secrets** in your Supabase project.

### How They Work

- **Server-side only**: Secrets are only accessible in Supabase Edge Functions (backend)
- **Never exposed to client**: Frontend code cannot access these secrets
- **Secure storage**: Encrypted at rest in Supabase infrastructure

### Usage Example

```typescript
// In Edge Function: /supabase/functions/generate-cover-letter/index.ts
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
```

### How to Set/Update Secrets

You can set secrets using the Supabase CLI or dashboard:

```bash
# Using Supabase CLI
supabase secrets set GEMINI_API_KEY=your_api_key_here

# View all secrets (values are hidden)
supabase secrets list
```

---

## 2. **Frontend Environment Variables** (.env file)

### Location

`/workspace/app-b48rmotczthd/.env`

### Current Contents

```env
VITE_SUPABASE_URL=https://hmkkvfbnyswdixuqghts.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_ID=app-b48rmotczthd
```

### Purpose

- **Public configuration**: Only stores non-sensitive, public configuration
- **VITE\_ prefix**: Variables prefixed with `VITE_` are exposed to frontend
- **Supabase public keys**: ANON_KEY is safe to expose (it's public by design)

### ⚠️ Important Notes

- **DO NOT** store sensitive API keys (like GEMINI_API_KEY) in `.env`
- Frontend `.env` variables are bundled into JavaScript and visible to users
- Only use `.env` for public configuration values

---

## 3. **Where Each API Key is Stored**

| API Key                      | Storage Location     | Access Level                      |
| ---------------------------- | -------------------- | --------------------------------- |
| `GEMINI_API_KEY`             | Supabase Secrets     | Server-side only (Edge Functions) |
| `SUPABASE_URL`               | `.env` (frontend)    | Public                            |
| `SUPABASE_ANON_KEY`          | `.env` (frontend)    | Public (safe to expose)           |
| `SUPABASE_SERVICE_ROLE_KEY`  | Supabase Secrets     | Server-side only (admin access)   |
| OAuth tokens (Gmail/Outlook) | Database (encrypted) | User-specific, encrypted          |
| Venue credentials            | Database (encrypted) | User-specific, encrypted          |

---

## 4. **Edge Functions Using API Keys**

### Functions that use GEMINI_API_KEY:

1. **generate-cover-letter** (`/supabase/functions/generate-cover-letter/index.ts`)
   - Line 69: `const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');`
   - Generates AI-powered cover letters

2. **generate-reviewer-response** (`/supabase/functions/generate-reviewer-response/index.ts`)
   - Generates responses to reviewer comments

3. **scan-emails** (`/supabase/functions/scan-emails/index.ts`)
   - Uses Gemini for email status classification

4. **generate-paper** (if exists)
   - AI-powered paper generation

### Access Pattern

```typescript
// All Edge Functions follow this pattern:
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

if (!GEMINI_API_KEY) {
  throw new Error("Gemini API key not configured");
}

// Use the key in API calls
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
  {
    /* ... */
  },
);
```

---

## 5. **Security Best Practices**

### ✅ Current Implementation (Correct)

- Sensitive API keys stored in Supabase Secrets
- Only accessible from server-side Edge Functions
- Never exposed to frontend code
- User credentials encrypted in database

### ❌ What NOT to Do

- Don't store API keys in `.env` file
- Don't commit API keys to version control
- Don't expose API keys in frontend code
- Don't log API keys in console

---

## 6. **How to Add New API Keys**

### For Server-Side APIs (Recommended)

```bash
# Set the secret in Supabase
supabase secrets set NEW_API_KEY=your_key_here

# Use in Edge Function
const NEW_API_KEY = Deno.env.get('NEW_API_KEY');
```

### For Public Configuration (Frontend)

```bash
# Add to .env file with VITE_ prefix
echo "VITE_PUBLIC_CONFIG=value" >> .env

# Access in frontend code
const config = import.meta.env.VITE_PUBLIC_CONFIG;
```

---

## 7. **Checking Current Secrets**

### View Secret Names (values hidden)

```bash
supabase secrets list
```

### Test Secret in Edge Function

```typescript
// Add temporary logging in Edge Function
console.log("GEMINI_API_KEY exists:", !!Deno.env.get("GEMINI_API_KEY"));
```

---

## 8. **Troubleshooting**

### "Gemini API key not configured" Error

**Cause**: `GEMINI_API_KEY` not set in Supabase Secrets

**Solution**:

```bash
supabase secrets set GEMINI_API_KEY=your_actual_key
```

### Edge Function Can't Access Secret

**Cause**: Secret not deployed or Edge Function not redeployed

**Solution**:

```bash
# Redeploy Edge Function after setting secret
supabase functions deploy function-name
```

---

## 9. **Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ .env file (Public variables only)                      │ │
│  │ - VITE_SUPABASE_URL                                    │ │
│  │ - VITE_SUPABASE_ANON_KEY (public, safe)               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ API Calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Functions (Backend)               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Supabase Secrets (Secure, encrypted)                   │ │
│  │ - GEMINI_API_KEY ✓                                     │ │
│  │ - SUPABASE_SERVICE_ROLE_KEY ✓                         │ │
│  │ - Other sensitive API keys ✓                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Edge Functions access secrets via:                         │
│  Deno.env.get('GEMINI_API_KEY')                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ External API Calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              External APIs (Gemini, etc.)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. **Summary**

**Q: Where is GEMINI_API_KEY stored?**  
**A: In Supabase Secrets (server-side, secure storage)**

**Q: Can frontend code access GEMINI_API_KEY?**  
**A: No, only Edge Functions can access it**

**Q: How do I update GEMINI_API_KEY?**  
**A: Use `supabase secrets set GEMINI_API_KEY=new_key`**

**Q: Is it safe to commit .env file?**  
**A: Yes, it only contains public configuration (VITE\_ prefixed variables)**

---

## Need Help?

If you need to set or update API keys, use the `register_secrets` tool or Supabase CLI:

```bash
# Set secret
supabase secrets set KEY_NAME=value

# List secrets
supabase secrets list

# Delete secret
supabase secrets unset KEY_NAME
```
