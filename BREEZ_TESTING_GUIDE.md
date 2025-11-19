# Breez SDK Spark Integration - Development Notes

## Overview

We've successfully integrated the Breez SDK Spark into Primal Web. This creates a self-custodial Lightning wallet that runs directly in the browser, with full wallet UI, transaction history, and multi-device sync via Nostr relays.

## What's Been Implemented

### Core Infrastructure ✅
1. **Breez SDK Integration** - `src/lib/breezWalletService.ts`
   - Connection/disconnection management
   - Payment sending (BOLT11 invoices)
   - Invoice creation (receiving payments)
   - Balance management
   - Payment history retrieval with fees
   - Event listener system
   - Payment direction tracking (send/receive)

2. **Secure Storage** - `src/lib/breezStore.ts` & `src/lib/spark/`
   - NIP-04 encrypted seed storage (version 1 format)
   - Wallet configuration management
   - Import/export functionality compatible with Jumble-spark and Sparkihonne
   - Nostr relay backup/restore support

3. **State Management** - `src/contexts/SparkWalletContext.tsx`
   - Full wallet state management with SolidJS stores
   - Auto-connect on page load for existing wallets
   - Balance syncing and caching
   - Payment history management
   - Wallet type selection (NWC vs Breez)

4. **Payment Integration** - `src/lib/zap.ts`
   - All zap functions updated: `zapNote`, `zapArticle`, `zapProfile`, `zapDVM`, `zapStream`, `zapSubscription`
   - `zapOverBreez()` function for Breez payments
   - Automatic wallet type routing

5. **UI Components** ✅
   - **Full Wallet Page** - `src/pages/WalletNew.tsx` & `src/pages/Wallet.tsx`
     - Create new wallet with mnemonic generation
     - Restore wallet from seed phrase
     - Restore from encrypted Nostr relay backup
     - Restore from encrypted JSON file (Jumble/Sparkihonne compatible)
     - Balance display and refresh
     - Transaction history with send/receive indicators
     - Wallet settings and management
     - Auto-connect UX (no create screen shown for existing wallets)

   - **Payment History List** - `src/components/SparkPaymentsList/`
     - Red ↑ arrows for sent payments
     - Green ↓ arrows for received payments
     - Fee display for sent payments
     - Clean minimal design matching Primal style
     - Payment detail expansion

   - **Wallet Widget** - `src/components/BreezWalletWidget/`
     - Compact balance display
     - Quick actions

   - **Settings Integration**
     - Breez Wallet settings page (`/settings/breez`)
     - Added to settings menu and router

## Testing Instructions

### Prerequisites

1. **Set Breez API Key**
   - Edit `.env` file
   - Replace `YOUR_BREEZ_API_KEY_HERE` with your actual Breez API key
   - Get API key from: https://breez.technology/

2. **Generate a Test Mnemonic**
   - Use a BIP39 mnemonic generator (12-24 words)
   - Example tools:
     - https://iancoleman.io/bip39/
     - Or use a test wallet you control
   - **IMPORTANT**: Only use test funds!

### Step 1: Start the Development Server

```bash
npm run dev
```

Navigate to `http://localhost:5173` (or your dev server URL)

### Step 2: Login to Primal

- Log in with your Nostr account
- Make sure you have a Nostr extension or use the built-in Primal auth

### Step 3: Access Breez Wallet Settings

1. Go to Settings (click your profile → Settings)
2. In the settings menu, click **"Breez Spark Wallet"**
3. Or navigate directly to: `http://localhost:5173/settings/breez`

### Step 4: Connect Your Breez Wallet

1. Paste your BIP39 mnemonic (12-24 words) into the text area
2. Toggle "Show mnemonic" if you want to see what you're typing
3. Click **"Connect Wallet"**
4. Wait for the connection (may take 10-30 seconds)

**Expected Results:**
- Success toast: "Breez wallet connected successfully"
- Wallet status changes to "🟢 Connected"
- Balance displays (should be 0 sats for a new wallet)

### Step 5: Set as Active Wallet

1. Once connected, click **"Set as Active Wallet"**
2. This makes Breez the default payment method for zaps

**Expected Results:**
- Active Wallet shows: "✓ Breez"
- Future zaps will use Breez instead of NWC/WebLN

### Step 6: Test Balance Refresh

1. Click **"Refresh Balance"**
2. Should fetch current balance from Breez SDK

### Step 7: Test Zap Payment (When Wallet Has Funds)

**Note**: This step requires Lightning funds in your Breez wallet

1. Find a post in the feed
2. Click the zap (lightning bolt) icon
3. Select an amount
4. The zap should be processed through Breez

**Expected Flow:**
- Zap request created
- BOLT11 invoice fetched
- Payment sent via `zapOverBreez()`
- Balance updated
- Success notification

### Step 8: Test Disconnection

1. Click **"Disconnect"** button
2. Wallet status should change to disconnected
3. Balance should still be visible (cached)

### Step 9: Test Auto-Reconnection

1. Refresh the page
2. The wallet should auto-connect using stored encrypted seed
3. Balance should be fetched automatically

### Step 10: Test Wallet Removal

1. Click **"Remove Wallet"**
2. Confirm the removal
3. All data should be cleared
4. Returns to "Connect Wallet" view

## What to Look For

### Success Indicators ✅
- Wallet connects without errors
- Balance displays correctly
- Wallet status updates properly
- Toast notifications appear for actions
- Auto-reconnect works after page refresh
- Settings persist across sessions

### Common Issues to Check

1. **WASM Loading Errors**
   - Check browser console for WASM initialization errors
   - Breez SDK uses WebAssembly

2. **API Key Errors**
   - Check if `VITE_BREEZ_API_KEY` is set correctly
   - Look for "Breez API key not configured" errors

3. **Seed Storage Errors**
   - Check if NIP-04 encryption is working
   - Verify user is logged in (has Nostr keys)

4. **Connection Timeouts**
   - Initial connection can take 10-30 seconds
   - Check network tab for hanging requests

5. **Balance Not Updating**
   - May need to wait for SDK sync
   - Try "Refresh Balance" button

## Browser Console Commands

For debugging, you can access the Breez wallet service:

```javascript
// Import the service (in browser console after navigation)
const { breezWallet } = await import('./src/lib/breezWalletService');

// Check connection status
breezWallet.isConnected();

// Get current state
breezWallet.getState();
```

## Recent Updates (Session 2)

### UX Improvements ✅
- **Fixed payment direction display** - Corrected paymentType from 'sent'/'received' to 'send'/'receive' to match Breez SDK
- **Added proper icons** - Imported red ↑ and green ↓ arrow icons from Jumble-spark
- **Removed grey card backgrounds** - Clean minimal design with only border separators
- **Added fee display** - Shows "+ X sats fee" for sent payments
- **Fixed auto-connect UX** - Shows loading state instead of create wallet screen when wallet exists
- **File import support** - Can import encrypted wallet files from Jumble/Sparkihonne (NIP-04 format)

### Design System Alignment ✅
- Matched Jumble-spark UX patterns for payment list
- Clean Primal-style minimal backgrounds (transparent with 1px separators)
- Proper color coding: red (#dc2626) for sent, green (#22c55e) for received
- Consistent spacing and typography

## Known Limitations

- ⚠️ CustomZap component not yet updated (will use default behavior)
- ⚠️ No receive invoice UI yet
- ⚠️ No send payment UI yet (can only zap)
- ⚠️ Limited error messages for edge cases

## Files Modified/Created

### New Files
- `src/lib/breezWalletService.ts` - Core Breez SDK service
- `src/lib/breezStore.ts` - Secure storage for wallet config
- `src/lib/spark/` - Spark-specific utilities (backup, encryption)
- `src/contexts/SparkWalletContext.tsx` - Wallet state management
- `src/pages/WalletNew.tsx` - Main wallet UI page
- `src/pages/Wallet.tsx` - Wallet page wrapper
- `src/pages/Wallet.module.scss` - Wallet page styles
- `src/pages/Settings/BreezWallet.tsx` - Settings page
- `src/components/SparkPaymentsList/` - Payment history component
- `src/components/BreezWalletWidget/` - Compact widget
- `src/assets/icons/sent_icon.svg` - Red ↑ arrow icon
- `src/assets/icons/received_icon.svg` - Green ↓ arrow icon

### Modified Files
- `src/contexts/AccountContext.tsx` - Wallet type management
- `src/contexts/AppContext.tsx` - Transaction handling
- `src/lib/zap.ts` - Breez payment integration
- `src/Router.tsx` - Wallet route
- `src/pages/Settings/Menu.tsx` - Settings menu
- `vite.config.ts` - WASM support
- `.env` - Breez API key

### Dependencies Added
- `@breeztech/breez-sdk-spark@0.4.0-rc2`
- `@scure/bip39` - Mnemonic generation

## Next Steps for Full Implementation

1. **Update CustomZap Component** - Pass wallet type to zap functions
2. **Create Transaction History UI** - Display payment history
3. **Add Onboarding Wizard** - Guide users through wallet creation
4. **Implement Receive UI** - Generate and display invoices
5. **Add Error Boundaries** - Better error handling
6. **Polish Loading States** - Improve UX during operations
7. **Write Unit Tests** - Test wallet service and storage
8. **Update Documentation** - Complete user guide

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify `.env` configuration
3. Ensure you're using a valid BIP39 mnemonic
4. Check that Nostr account is logged in
5. Try with a fresh browser profile (no cached data)

## Security Notes

⚠️ **IMPORTANT**:
- Only use TEST wallets and TEST funds during development
- Never share your seed phrase
- The seed is encrypted with your Nostr key
- Losing your seed means losing access to funds
- This is experimental software - use at your own risk

