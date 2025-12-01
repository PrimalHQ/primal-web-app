# Vercel Deployment Notes

This document describes configuration specific to Vercel deployments that should NOT be merged into the upstream Primal repository.

## NIP-05 Vanity Name Lookup Configuration

**File modified:** `src/lib/profile.ts:233-235`

**Change:** Added `VITE_USE_PRIMAL_NIP05` environment variable to control NIP-05 vanity name lookups.

**Reason:** When deploying to Vercel (or any non-primal.net domain), the app tries to fetch `.well-known/nostr.json` from the Vercel deployment URL instead of primal.net. This causes vanity names like `/daniel` to fail because the Vercel deployment doesn't have access to Primal's NIP-05 database.

**Solution:**
- Set `VITE_USE_PRIMAL_NIP05=true` in Vercel environment variables
- This makes the app fetch NIP-05 data from `https://primal.net` instead of the deployment domain
- This allows vanity names to work on Vercel deployments

**Code change:**
```typescript
// Before
const origin = window.location.origin.startsWith('http://localhost')
  ? 'https://dev.primal.net'
  : window.location.origin;

// After
const usePrimalNip05 = window.location.origin.startsWith('http://localhost')
  || import.meta.env.VITE_USE_PRIMAL_NIP05 === 'true';
const origin = usePrimalNip05 ? 'https://primal.net' : window.location.origin;
```

## Required Vercel Environment Variables

Add these environment variables in your Vercel project settings:

```bash
# Primal service URLs
PRIMAL_CACHE_URL=wss://cache2.primal.net/v1
PRIMAL_UPLOAD_URL=wss://uploads.primal.net/v1
PRIMAL_PRIORITY_RELAYS=wss://relay.primal.net

# NIP-05 configuration (Vercel-specific)
VITE_USE_PRIMAL_NIP05=true

# Breez SDK Spark API key
VITE_BREEZ_API_KEY=<your-breez-api-key>
```

## SPA Routing on Vercel

**File added:** `vercel.json`

**Purpose:** Fix 404 errors when refreshing pages or accessing direct URLs

**Content:**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This ensures all routes are handled by the SPA router instead of returning 404s from Vercel.

## DO NOT MERGE

These changes are specific to Vercel deployments and should NOT be included in pull requests to the upstream Primal repository:

1. The `VITE_USE_PRIMAL_NIP05` environment variable check in `src/lib/profile.ts`
2. The `vercel.json` file
3. The `VITE_USE_PRIMAL_NIP05` definition in `vite.config.ts`
4. The commented-out documentation in `.env`

The upstream repository is deployed on primal.net domains and has its own `.well-known/nostr.json` mappings.
