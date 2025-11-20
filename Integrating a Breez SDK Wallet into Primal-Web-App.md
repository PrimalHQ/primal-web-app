# **Integrating a Breez SDK Wallet into Primal-Web-App**

## **1\. Project Goal**

The objective is to replicate the integration model of dmnyc/jumble-spark within the PrimalHQ/primal-web-app.

Based on analysis, jumble-spark is an integrated, self-custodial Nostr wallet for the Jumble.social client, built using the **Breez "Spark" SDK**.

This document outlines the steps to integrate the **Breez SDK** into the primal-web-app (a TypeScript/React-based client) to create a similar embedded, self-custodial wallet for handling Nostr zaps. This would serve as an alternative to Primal's existing Nostr Wallet Connect (NWC) functionality, which connects to external wallets.

---

## **2\. Phase 1: Prerequisite Analysis & Setup**

Before writing any new code, you must understand the existing architecture of the primal-web-app.

* **Analyze Existing Wallet Logic:**  
  * Deeply review the primal-web-app codebase to identify how it currently handles wallet connections and zap events.  
  * Locate the services, hooks, and UI components related to **Nostr Wallet Connect (NWC)**.  
  * Map out the data flow for:  
    1. Connecting a wallet.  
    2. Requesting a zap (creating an invoice).  
    3. Paying an invoice.  
    4. Receiving/displaying a zap.  
* **Set Up Primal Dev Environment:**  
  * Clone the PrimalHQ/primal-web-app repository.  
  * Follow its README.md to install dependencies (npm install) and run the local development server (npm run dev).  
  * Ensure you can successfully run the app and connect to it in a browser before proceeding.

---

## **3\. Phase 2: Breez SDK Integration (Core Logic)**

This phase involves adding the Breez SDK to the Primal project and initializing it.

* **Install the Breez SDK:**  
  * The Primal app is a TypeScript web app. You will need the JavaScript/WASM bindings for the Breez SDK.  
  * Breez provides its SDK bindings as an NPM package. You will likely need to find the correct package (e.g., a WASM or JS-based library from Breez).  
  * Example installation (package name is hypothetical; verify on Breez's developer docs):  
    Bash  
    npm install @breeztech/breez-sdk-js

* **Create a Wallet Service:**  
  * Inside Primal's src directory (likely under a services or lib folder), create a new TypeScript file: breezWalletService.ts.  
  * This service will act as a singleton wrapper for the entire Breez SDK.  
* **Implement Core Service Methods:**  
  * Your breezWalletService.ts should expose all necessary wallet functions. This isolates the Breez-specific logic from the React UI.  
  * **Connection:**  
    * connect(): Method to initialize the SDK. This will involve passing your Breez API key, mnemonic (or seed), and configuration.  
    * *Note:* Seed management is critical. For a self-custodial client, you must securely generate and store the user's seed, likely in encrypted localStorage or IndexedDB.  
  * **Event Listeners:**  
    * addEventListener(): The SDK will emit events (e.g., paymentSucceeded, balanceChanged). Your service needs to listen for these to update the UI.  
  * **Core Wallet Functions:**  
    * getBalance(): Returns the user's Lightning and on-chain balance.  
    * sendPayment(invoice): Pays a BOLT11 invoice (this is the core "zap" action).  
    * createInvoice(amount, description): Generates an invoice to receive a payment.  
    * getPaymentHistory(): Lists recent transactions.

---

## **4\. Phase 3: UI & Zap Functionality Integration**

This phase involves connecting your new breezWalletService to the Primal React components.

* **Create a Wallet Context:**  
  * Create a new React Context (e.g., BreezWalletContext) to provide the wallet service instance and its state (e.g., balance, isConnected) to the entire component tree.  
  * This context provider will be initialized at the top level of the app (e.g., in App.tsx).  
* **Build the Wallet Management UI:**  
  * Create new React components for the "Integrated Wallet" UI:  
    * **Onboarding:** A component to create a new wallet (generate and back up a seed) or restore an existing one.  
    * **Dashboard:** A view (perhaps in the "Wallet" section of the app) to display balance, transaction history, and send/receive buttons.  
  * Use your BreezWalletContext to call the breezWalletService methods (e.g., getBalance(), getPaymentHistory()).  
* **Override the Zap Function:**  
  * This is the most critical integration step.  
  * Locate the component responsible for the "Zap" button on a post.  
  * Modify the onClick handler for this button.  
  * The logic should now be:  
    1. Check if the user has the "Integrated Breez Wallet" enabled.  
    2. If **YES**:  
       * Call the zap recipient's Lightning address/LNURL to get an invoice.  
       * Call breezWalletService.sendPayment(invoice) with the obtained invoice.  
       * Show a "Success" or "Failed" notification based on the result.  
    3. If **NO** (or if the user prefers):  
       * Fall back to the *original* NWC flow (showing a QR code or connecting to an external wallet).

---

## **5\. Phase 4: Testing and Deployment**

* **Testing (Local):**
  * **Onboarding:** Test the wallet creation and recovery flow.
  * **Send/Receive:** Test sending and receiving payments (zaps) between your integrated wallet and another Lightning wallet (e.g., a mobile wallet).
  * **Zap Flow:** Test the end-to-end zap flow on posts within the Primal UI.
  * **Wallet Switching:** Ensure the user can seamlessly switch between using the integrated wallet and the NWC (external) wallet.
* **Environment Variables:**
  * You will need a Breez API key. This should be added as an environment variable (e.g., VITE\_BREEZ\_API\_KEY) in the Primal app's .env file.
* **Deployment:**
  * The integration adds a new client-side dependency. The primal-web-app's existing build process (likely npm run build) should bundle the Breez SDK's JS/WASM files automatically.
  * Ensure your API key is correctly configured in the production deployment environment.

---

## **6\. Recent UI/UX Updates**

### **Wallet Icon and Branding**
- Added custom outlined wallet icon (`wallet.svg` and `wallet_selected.svg`) to match nav icon style
- Implemented theme-aware Breez and Spark logos (dark in light mode via CSS filters)
- Adjusted logo sizing: Breez 36px with 10px bottom margin, Spark 32px for proper baseline alignment
- Added wallet notification badge (shows when wallet is not configured)

### **Balance Display**
- Implemented currency toggle dropdown with SATS + 30+ fiat currencies
- Added hide/show balance toggle with eye icon
- Balance visibility affects both balance display and payment history
- Horizontal layout for balance amount with proper spacing (10px between fiat and sats)
- Compact layout with reduced padding and min-height (88px)
- Proper baseline alignment for header elements (BALANCE, currency, Sync button)

### **Currency Dropdown**
- Compact spacing with line-height: 1 and minimal padding
- Popular currencies (SATS, USD, EUR, GBP, JPY) shown first
- Other currencies in scrollable 2-column grid
- localStorage persistence via SparkWalletContext

### **Payment History**
- Compact row spacing (6px gap between detail rows)
- Proper vertical alignment for copy buttons
- Reduced chevron size (12px) and payment icons increased (24px)
- Line-height: 1 for compact display
- No top border/padding for expanded details section

### **Page Header**
- Fixed PageCaption component to use consistent styling across desktop and mobile
- Font-weight: 300 (lighter) and text-transform: capitalize
- "Breez Spark Wallet" displays correctly in Initial Caps, not lowercase

### **Dialogs and Forms**
- Cleaned up create/restore wallet screens
- Removed emojis, simplified messaging
- Seed phrase display with monospace font, non-resizable
- Light mode visibility fixes (all backgrounds use rgba(0,0,0,X) overlays)
- Pill-shaped cancel buttons with visible contrast
- Optional relay backup (not automatic by default)

### **Wallet Settings & Integration (Latest)**
- Added Breez Spark wallet toggle in Settings → Nostr Wallet Connect page
- Spark wallet appears at bottom of wallet list with toggle switch
- Wallet enabled by default for new users (`spark_wallet_enabled` localStorage)
- When enabled AND connected, Breez is set as active zap wallet (`activeWalletType = 'breez'`)
- When disabled, `activeWalletType` is cleared to allow NWC wallets to work
- Navigation wallet icon hidden when Spark wallet is disabled
- Spark logo theme-aware: white in dark mode, black (#111111) in light mode (using CSS filters)

### **Zap Functionality**
- Integrated Breez wallet payments into zap flow (zapNote, zapProfile, zapArticle, zapDVM, zapStream)
- Added recipient pubkey parameter for proper zap receipt generation
- **Fixed pending payment handling**: Treats both 'completed' and 'pending' status as success
  - Lightning payments can take a moment to complete, initially returning 'pending'
  - SparkWalletContext event listener handles final completion and zap receipt publishing
- Zap priority order: Breez (if enabled) → NWC (if configured) → WebLN (fallback)
- Auto-connect only when wallet is enabled (checks `isEnabled` flag)

### **Top Up & Send Payment Enhancements**
- **Top Up Tab Features:**
  - QR code generation for invoices using qr-code-styling library
  - Currency conversion display showing fiat equivalent for preset and custom amounts
  - Edit button to toggle between preset selection (10k, 25k, 50k, 100k, 250k, 500k) and custom amount entry
  - Hot wallet warning displayed when balance exceeds 100K sats
  - Dynamic maximum top-up calculation: 500K total wallet limit minus current balance
  - Validation messages showing current balance and remaining capacity
  - Preset buttons show fiat conversion for each amount option

- **Send Payment Features:**
  - Lightning address detection (user@domain.com format)
  - Automatic amount input field when Lightning address detected
  - Full LNURL-pay flow implementation using Breez SDK (parseInput → prepareLnurlPay → lnurlPay)
  - Smart input parsing handles BOLT11 invoices, Spark invoices, Lightning addresses, and LNURL
  - Maximum sendable amount calculation (99% of balance to account for ~1% Lightning fees)
  - Balance validation preventing sending more than wallet contains
  - Fee buffer warning for amounts exceeding 99% of balance
  - Max amount display with fee disclaimer

- **Tab Layout Improvements:**
  - Redesigned tabs with equal padding top and bottom (no visual imbalance)
  - Distinct hover state for inactive tabs (subtle background vs active card background)
  - Settings icon using app's standard settings.svg instead of emoji
  - Fixed "Recent Payments" / "Refresh" button alignment (no width overflow)
  - Proper flex layout preventing text wrapping

- **Technical Implementation:**
  - Added parseInput, prepareLnurlPay, lnurlPay methods to breezWalletService.ts
  - LNURL protocol support for Lightning addresses via Breez SDK
  - Currency conversion integration using existing useCurrencyConversion hook
  - QR code component with white background container and proper sizing (300x300px)
  - Validation logic for minimum (1K sats) and maximum (500K total wallet) amounts
  - Fee calculation and warning system for near-maximum sends