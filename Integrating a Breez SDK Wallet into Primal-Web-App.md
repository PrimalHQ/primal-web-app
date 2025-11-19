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