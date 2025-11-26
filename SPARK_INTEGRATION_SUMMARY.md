# Breez Spark Wallet Integration - Summary for Upstream Contribution

## Overview

This fork integrates the Breez SDK Spark (self-custodial Lightning wallet) into the Primal Web App. This document summarizes all changes made and identifies which portions are ready for upstream contribution vs. deployment-specific configurations.

## Core Features Implemented

### 1. Spark Wallet Integration
- **Self-custodial Lightning wallet** powered by Breez SDK Spark
- **BIP39 mnemonic-based** wallet creation and restore
- **NIP-44 encrypted storage** for wallet seeds
- **NIP-78 relay backup** for wallet configuration
- **Payment history** with detailed transaction views
- **Balance management** with multi-currency display
- **Invoice generation** for receiving payments
- **Lightning address support** for easier payments

### 2. Wallet Context & State Management
- Created `SparkWalletContext` for reactive wallet state
- Integrated with existing `AccountContext` for wallet type selection
- Real-time balance updates via Breez SDK event listeners
- Duplicate payment prevention and transaction deduplication

### 3. User Interface Components

#### New Components
- `WalletBalanceWidget` - Sidebar balance display with currency selector
- `SparkPaymentsList` - Transaction history list
- `LightningFlash` - Payment success animation
- `CurrencyDropdown` - Multi-currency selection (SATS + 30+ fiat)

#### Updated Pages
- `WalletNew.tsx` - Complete wallet interface with:
  - Balance display with hide/show toggle
  - Send/Receive/Top-Up/Payments tabs
  - Invoice generation and QR codes
  - Payment history with filtering
  - Currency conversion display

### 4. Payment Animations & UX
- **Lightning flash animation** on incoming payments
- **Pending payment indicator** for outgoing zaps
- **Toast notifications** for payment success/failure
- **Auto-refresh balance** after transactions
- **Pulsing animation** for pending payments (1.5s delay before clear)

### 5. Zap Integration
- **Dual wallet support**: NWC and Breez Spark
- **Global zap animations** across all views
- **Zap receipts** published via NIP-57
- **Payment deduplication** to prevent duplicate animations
- **Timestamp handling** fixed for animation age checks

### 6. Security & Encryption
- **NIP-44 encryption** for Spark wallet data (XChaCha20-Poly1305)
- **NIP-04 encryption** for legacy Breez wallet support
- **Nostr key-based encryption** (user's private key encrypts wallet seed)
- **No plaintext storage** of mnemonics or private keys
- **Relay backup encryption** for remote seed storage

## Files Created

### Core Services
```
src/lib/
├── breezWalletService.ts          # Main Breez SDK integration (479 lines)
├── breezStore.ts                   # Legacy NIP-04 storage (215 lines)
├── logger.ts                       # Unified logging utility
└── spark/
    ├── sparkStorage.ts             # NIP-44/NIP-78 storage
    ├── sparkEncryption.ts          # Encryption utilities
    ├── sparkRelay.ts               # Relay backup sync
    ├── sparkZapReceipt.ts          # Zap receipt publishing
    └── check-relay-backups.ts      # Relay backup verification tool
```

### UI Components
```
src/components/
├── WalletBalanceWidget/            # Sidebar wallet widget
│   ├── WalletBalanceWidget.tsx
│   └── WalletBalanceWidget.module.scss
├── SparkPaymentsList/              # Transaction history
│   ├── SparkPaymentsList.tsx
│   └── SparkPaymentsList.module.scss
├── LightningFlash/                 # Payment animation
│   ├── LightningFlash.tsx
│   └── LightningFlash.module.scss
└── CurrencyDropdown/               # Currency selector
    ├── CurrencyDropdown.tsx
    └── CurrencyDropdown.module.scss
```

### Contexts
```
src/contexts/
├── SparkWalletContext.tsx          # Spark wallet state provider (1000+ lines)
└── ZapNotificationContext.tsx      # Zap animation coordinator
```

### Pages
```
src/pages/
├── WalletNew.tsx                   # Main wallet interface
└── Wallet.module.scss              # Wallet styling
```

### Hooks
```
src/hooks/
└── useCurrencyConversion.ts        # Currency conversion hook
```

## Files Modified

### Major Modifications
- **`src/contexts/AccountContext.tsx`** - Added Breez wallet integration
- **`src/contexts/AppContext.tsx`** - Added Breez transaction history state
- **`src/lib/zap.ts`** - Added `zapOverBreez()` and pending payment tracking
- **`src/Router.tsx`** - Added `/wallet` route
- **`src/pages/Settings/Menu.tsx`** - Added Breez Spark Wallet menu item
- **`vite.config.ts`** - Added Breez SDK WASM and environment variables

### Minor Modifications
- **`src/components/ProfileSidebar/ProfileSidebar.tsx`** - Added wallet widget
- **`src/pages/Layout/Layout.tsx`** - Added wallet widget to timeline sidebar
- **`src/components/Note/NoteFooter/NoteFooter.tsx`** - Integrated zap animations
- **`src/lib/currency.ts`** - Currency formatting utilities
- **`package.json`** - Added Breez SDK and dependencies

## Documentation Created

### User & Developer Docs
- `BREEZ_TESTING_GUIDE.md` - Comprehensive testing instructions
- `ZAP_ANIMATION_IMPLEMENTATION_PLAN.md` - Zap animation architecture
- `Integrating a Breez SDK Wallet into Primal-Web-App.md` - Integration guide
- `.dev-notes-breez-integration.md` - Development progress notes
- `.dev-notes-breez-spark-integration.md` - Technical implementation notes

### Deployment Docs (Vercel-Specific)
- `VERCEL_DEPLOYMENT.md` - Vercel configuration guide
- `vercel.json` - SPA routing configuration

---

## ⚠️ VERCEL-SPECIFIC CONFIGURATION (DO NOT MERGE UPSTREAM)

The following changes are **specific to Vercel deployments** and should **NOT** be included in pull requests to the upstream Primal repository:

### 1. NIP-05 Vanity Name Lookup Override

**File:** `src/lib/profile.ts:233-235`

**Purpose:** Allows Vercel deployments to use primal.net's NIP-05 database

**Code:**
```typescript
// Use primal.net for NIP-05 lookups on localhost, or if VITE_USE_PRIMAL_NIP05 is set
const usePrimalNip05 = window.location.origin.startsWith('http://localhost')
  || import.meta.env.VITE_USE_PRIMAL_NIP05 === 'true';
const origin = usePrimalNip05 ? 'https://primal.net' : window.location.origin;
```

**Why it's needed:**
- Vercel deployments don't have access to Primal's `.well-known/nostr.json` database
- Without this, vanity names like `/daniel` fail on Vercel
- Upstream deployment on primal.net has its own NIP-05 database

**What to exclude:**
- The `|| import.meta.env.VITE_USE_PRIMAL_NIP05 === 'true'` check
- Keep the localhost check for upstream

### 2. Vercel Environment Variable Definition

**File:** `vite.config.ts:53`

**Code:**
```typescript
'import.meta.env.VITE_USE_PRIMAL_NIP05': JSON.stringify(env.VITE_USE_PRIMAL_NIP05 || 'false'),
```

**What to exclude:**
- This entire line should be removed for upstream
- Keep the other environment variable definitions

### 3. Vercel SPA Routing Configuration

**File:** `vercel.json`

**Content:**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**What to exclude:**
- This entire file should not be merged upstream
- Upstream uses its own deployment configuration

### 4. Vercel Environment Variable Logging

**File:** `vite.config.ts:17`

**Code:**
```typescript
console.log('[VITE CONFIG] VITE_USE_PRIMAL_NIP05:', env.VITE_USE_PRIMAL_NIP05);
```

**What to exclude:**
- This debug log line should be removed for upstream

---

## RECOMMENDED UPSTREAM CONTRIBUTION

### Core Features to Merge
✅ All Breez Spark wallet integration code
✅ SparkWalletContext and state management
✅ Payment history components
✅ Wallet UI components
✅ Zap animations and notifications
✅ Currency conversion features
✅ Pending payment indicators
✅ All security/encryption implementations
✅ Documentation (testing guides, integration docs)

### Changes to Exclude from Upstream
❌ `VITE_USE_PRIMAL_NIP05` environment variable check in `src/lib/profile.ts`
❌ `VITE_USE_PRIMAL_NIP05` definition in `vite.config.ts`
❌ `vercel.json` file
❌ `VERCEL_DEPLOYMENT.md` (deployment-specific)
❌ Debug logging for `VITE_USE_PRIMAL_NIP05`

### Recommended Changes Before Upstream Merge

#### 1. Revert NIP-05 Override
In `src/lib/profile.ts:233-235`, change from:
```typescript
const usePrimalNip05 = window.location.origin.startsWith('http://localhost')
  || import.meta.env.VITE_USE_PRIMAL_NIP05 === 'true';
```

To:
```typescript
const usePrimalNip05 = window.location.origin.startsWith('http://localhost');
```

#### 2. Remove Vercel Environment Variable
In `vite.config.ts`, remove line 53:
```typescript
'import.meta.env.VITE_USE_PRIMAL_NIP05': JSON.stringify(env.VITE_USE_PRIMAL_NIP05 || 'false'),
```

#### 3. Remove Vercel Debug Logging
In `vite.config.ts`, remove line 17:
```typescript
console.log('[VITE CONFIG] VITE_USE_PRIMAL_NIP05:', env.VITE_USE_PRIMAL_NIP05);
```

#### 4. Clean Up Documentation
- Move `VERCEL_DEPLOYMENT.md` to a separate deployment repository or wiki
- Keep user-facing documentation in the main repo
- Archive development notes (`.dev-notes-*.md`) or move to wiki

---

## Environment Variables Required

### For All Deployments
```bash
# Primal service URLs (already in upstream)
PRIMAL_CACHE_URL=wss://cache2.primal.net/v1
PRIMAL_UPLOAD_URL=wss://uploads.primal.net/v1
PRIMAL_PRIORITY_RELAYS=wss://relay.primal.net

# Breez SDK Spark API key (NEW - needed upstream)
VITE_BREEZ_API_KEY=<your-breez-api-key>
```

### For Vercel Only (DO NOT add upstream)
```bash
# NIP-05 configuration (Vercel-specific, NOT for upstream)
VITE_USE_PRIMAL_NIP05=true
```

---

## Testing Checklist for Upstream

### Core Wallet Functions
- [x] Wallet creation with BIP39 mnemonic
- [x] Seed phrase backup and verification
- [x] Wallet restore from mnemonic
- [x] Wallet restore from relay backup (NIP-78)
- [x] Balance display and refresh
- [x] Currency conversion (SATS to fiat)
- [x] Balance visibility toggle

### Payment Operations
- [x] Send payment via BOLT11 invoice
- [x] Receive payment via generated invoice
- [x] Lightning address payments
- [x] Payment history display
- [x] Transaction filtering
- [x] Pending payment indicator
- [x] Payment success animations

### Zap Integration
- [x] Zap notes with Breez wallet
- [x] Zap profiles with Breez wallet
- [x] Zap articles with Breez wallet
- [x] Zap animations on incoming payments
- [x] Zap receipts (NIP-57) publishing
- [x] Dual wallet support (NWC + Breez)

### UI/UX
- [x] Wallet widget in sidebar (desktop)
- [x] Mobile responsive design
- [x] Loading states for all actions
- [x] Error handling and user feedback
- [x] Toast notifications
- [x] Lightning flash animations
- [x] Currency dropdown functionality

### Security
- [x] NIP-44 encryption for wallet data
- [x] No plaintext mnemonic storage
- [x] Secure relay backup
- [x] Encrypted local storage
- [x] PIN validation before wallet operations

---

## Dependencies Added

```json
{
  "@breeztech/breez-sdk-spark": "^0.4.0-rc2",
  "@scure/bip39": "^1.2.1",
  "@noble/hashes": "^1.3.0",
  "@cashu/cashu-ts": "^0.8.0" (indirect)
}
```

---

## Architecture Decisions

### 1. Singleton Pattern for Breez Service
- Single global instance of Breez SDK
- Prevents multiple connections
- Cleaner state management

### 2. Context-Based State Management
- `SparkWalletContext` for wallet state
- Reactive SolidJS signals
- Global context exposure via `window.__sparkWalletContext`

### 3. NIP-44 Encryption
- Modern XChaCha20-Poly1305 encryption
- Better security than NIP-04
- Compatible with jumble-spark and sparkihonne

### 4. Event-Driven Updates
- Breez SDK event listeners for real-time updates
- Duplicate payment prevention
- Timestamp-based animation filtering

### 5. Multi-Currency Support
- SATS as base unit
- 30+ fiat currencies via CoinGecko
- Real-time conversion rates
- User preference persistence

---

## Performance Optimizations

- **Lazy loading** of wallet components
- **Memoized** currency conversions
- **Debounced** balance refreshes
- **Indexed** payment history for fast lookups
- **Minimal re-renders** with SolidJS reactivity

---

## Known Limitations

1. **Breez SDK requires API key** - Users need to obtain from breez.technology
2. **Browser storage dependency** - Wallet data stored in localStorage (encrypted)
3. **No cloud backup by default** - Manual relay backup setup required
4. **Desktop-optimized** - Mobile UX could be further improved
5. **Single wallet per account** - Cannot have multiple Breez wallets

---

## Future Enhancements (Post-Merge)

- [ ] Multi-wallet support (multiple Spark wallets)
- [ ] Advanced payment filtering and search
- [ ] Export transaction history (CSV/JSON)
- [ ] Payment memo/notes support
- [ ] Wallet analytics dashboard
- [ ] Scheduled/recurring payments
- [ ] Payment request creation
- [ ] Lightning address configuration
- [ ] Channel management UI
- [ ] Advanced fee controls

---

## Commit History for Upstream PR

### Recommended Commit Breakdown

1. **Core Breez SDK integration**
   - Add breezWalletService.ts
   - Add breezStore.ts
   - Add Spark storage layer
   - Configure environment variables

2. **State management**
   - Add SparkWalletContext
   - Extend AccountContext
   - Add ZapNotificationContext

3. **UI components**
   - Add WalletBalanceWidget
   - Add SparkPaymentsList
   - Add LightningFlash animation
   - Add CurrencyDropdown

4. **Wallet interface**
   - Add WalletNew page
   - Add wallet routing
   - Add settings integration

5. **Zap integration**
   - Add zapOverBreez function
   - Add pending payment indicators
   - Add global zap animations
   - Fix zap animation timing

6. **UX improvements**
   - Add balance visibility toggle
   - Add currency conversion
   - Add pending payment indicator with delay
   - Add profile sidebar wallet
   - Fix dropdown z-index issues

7. **Bug fixes and polish**
   - Fix duplicate zap animations
   - Fix console logging
   - Fix PIN validation
   - Improve error handling

8. **Documentation**
   - Add testing guide
   - Add integration documentation
   - Add inline code comments

---

## Migration Path for Existing Users

Users upgrading to this version will see:
1. New "Wallet" menu item in sidebar (desktop only)
2. New "Breez Spark Wallet" option in Settings
3. Existing NWC wallets continue to work
4. Ability to switch between wallet types
5. New zap animation system (can be disabled in settings)

No breaking changes to existing functionality.

---

## Credits

This integration was developed with assistance from Claude (Anthropic) and draws inspiration from:
- **jumble-spark** - Reference implementation by sparkinbc
- **sparkihonne** - Alternative Spark wallet implementation
- **Breez SDK documentation** - Official Breez SDK guides

---

## Contact

For questions about this integration:
- Fork maintainer: [@daniel on Nostr](https://primal.net/daniel)
- Original Primal repo: [PrimalHQ/primal-web-app](https://github.com/PrimalHQ/primal-web-app)
- Breez SDK: [breez/spark-sdk](https://github.com/breez/spark-sdk)

---

## License

This work maintains the original Primal Web App license (MIT).
All new code contributions are offered under the same license terms.
