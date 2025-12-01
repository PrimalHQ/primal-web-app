import { signEvent, getPublicKey } from '../nostrAPI';
import { logError, logInfo, logWarning } from '../logger';
import { Relay } from '../nTools';
import { NostrRelaySignedEvent } from '../../types/primal';
import { BreezPaymentInfo } from '../breezWalletService';

/**
 * Spark Zap Receipt Publisher
 *
 * Implements NIP-57 zap receipt publishing for Breez Spark wallet.
 * Automatically publishes kind 9735 events when zaps are sent or received.
 *
 * NIP-57 Spec: https://github.com/nostr-protocol/nips/blob/master/57.md
 */

const ZAP_RECEIPT_KIND = 9735;

export type ZapReceiptData = {
  bolt11: string; // BOLT11 invoice
  preimage?: string; // Payment preimage (proof of payment)
  description: string; // JSON-encoded zap request (kind 9734)
  recipientPubkey: string; // Who received the zap
  amountSats: number; // Amount in satoshis
  paymentHash?: string; // Payment hash
};

/**
 * Parse zap request from BOLT11 invoice description
 * The description should be a JSON-encoded kind 9734 zap request event
 */
function parseZapRequest(description: string): any | null {
  try {
    // The description might be JSON or might have the zap request embedded
    const zapRequest = JSON.parse(description);

    // Validate it's a proper zap request (kind 9734)
    if (zapRequest.kind === 9734) {
      return zapRequest;
    }

    logWarning('[SparkZapReceipt] Description is not a valid zap request');
    return null;
  } catch (error) {
    logWarning('[SparkZapReceipt] Failed to parse zap request from description:', error);
    return null;
  }
}

/**
 * Create a NIP-57 zap receipt event (kind 9735)
 * @param zapData - Zap receipt data
 * @param walletPubkey - Public key of the wallet service (us)
 * @returns Unsigned zap receipt event
 */
async function createZapReceiptEvent(
  zapData: ZapReceiptData,
  walletPubkey: string
): Promise<any> {
  const tags: string[][] = [
    ['bolt11', zapData.bolt11],
    ['description', zapData.description],
    ['p', zapData.recipientPubkey], // Recipient
  ];

  // Add preimage if available (proof of payment)
  if (zapData.preimage) {
    tags.push(['preimage', zapData.preimage]);
  }

  // Add amount
  tags.push(['amount', (zapData.amountSats * 1000).toString()]); // Convert sats to msats

  // Parse the zap request to extract additional tags
  const zapRequest = parseZapRequest(zapData.description);
  if (zapRequest) {
    // Add event being zapped if present
    const eTag = zapRequest.tags?.find((t: string[]) => t[0] === 'e');
    if (eTag) {
      tags.push(['e', eTag[1]]);
    }

    // Add author being zapped (might be different from recipient in some cases)
    const pTag = zapRequest.tags?.find((t: string[]) => t[0] === 'p');
    if (pTag && pTag[1] !== zapData.recipientPubkey) {
      tags.push(['P', pTag[1]]); // Capital P for zap request author
    }

    // Add relay hints
    const relaysTag = zapRequest.tags?.find((t: string[]) => t[0] === 'relays');
    if (relaysTag) {
      tags.push(['relays', ...relaysTag.slice(1)]);
    }
  }

  const event = {
    kind: ZAP_RECEIPT_KIND,
    tags,
    content: '', // Content is empty for zap receipts
    created_at: Math.floor(Date.now() / 1000),
    pubkey: walletPubkey,
  };

  return event;
}

/**
 * Publish zap receipt to relays
 * @param zapData - Zap receipt data
 * @param relays - Relays to publish to
 * @param walletPubkey - Public key of the wallet (optional, will fetch if not provided)
 * @returns Promise that resolves when published
 */
export async function publishZapReceipt(
  zapData: ZapReceiptData,
  relays: Relay[],
  walletPubkey?: string
): Promise<void> {
  try {
    logInfo('[SparkZapReceipt] Publishing zap receipt...');

    // Get wallet pubkey if not provided
    const pubkey = walletPubkey || await getPublicKey();
    if (!pubkey) {
      throw new Error('Cannot publish zap receipt: No pubkey available');
    }

    // Create zap receipt event
    const receiptEvent = await createZapReceiptEvent(zapData, pubkey);

    // Sign the event
    const signedEvent = await signEvent(receiptEvent);
    if (!signedEvent) {
      throw new Error('Failed to sign zap receipt event');
    }

    // Publish to all relays
    let successCount = 0;
    let failCount = 0;

    const publishPromises = relays.map(async (relay) => {
      try {
        await relay.connect();
        relay.publish(signedEvent);
        successCount++;
        logInfo(`[SparkZapReceipt] Published to ${relay.url}`);
      } catch (error) {
        failCount++;
        logWarning(`[SparkZapReceipt] Failed to publish to ${relay.url}:`, error);
      }
    });

    await Promise.all(publishPromises);

    if (successCount === 0) {
      throw new Error('Failed to publish zap receipt to any relay');
    }

    logInfo(`[SparkZapReceipt] Zap receipt published to ${successCount}/${relays.length} relays`);
  } catch (error) {
    logError('[SparkZapReceipt] Failed to publish zap receipt:', error);
    throw error;
  }
}

/**
 * Extract zap request from BOLT11 invoice
 * @param invoice - BOLT11 invoice string
 * @returns Decoded zap request or null
 */
export function extractZapRequestFromInvoice(invoice: string): any | null {
  try {
    // BOLT11 invoices can have a description or description_hash
    // For zaps, the description should contain the zap request (kind 9734)

    // This is a simplified extraction - in production you'd want to properly
    // decode the BOLT11 invoice using a library like 'light-bolt11-decoder'

    // For now, we'll rely on the payment info having the description
    logWarning('[SparkZapReceipt] BOLT11 decoding not fully implemented');
    return null;
  } catch (error) {
    logError('[SparkZapReceipt] Failed to extract zap request from invoice:', error);
    return null;
  }
}

/**
 * Create zap receipt from payment info
 * Automatically extracts relevant data from Breez payment
 * @param payment - Breez payment info
 * @param recipientPubkey - Public key of zap recipient
 * @returns Zap receipt data or null if not a zap
 */
export function createZapReceiptFromPayment(
  payment: BreezPaymentInfo,
  recipientPubkey: string
): ZapReceiptData | null {
  try {
    // Check if payment has required fields
    if (!payment.invoice) {
      logWarning('[SparkZapReceipt] Payment missing invoice, cannot create zap receipt');
      return null;
    }

    if (!payment.description) {
      logWarning('[SparkZapReceipt] Payment missing description, cannot create zap receipt');
      return null;
    }

    // Try to parse description as zap request
    const zapRequest = parseZapRequest(payment.description);
    if (!zapRequest) {
      logInfo('[SparkZapReceipt] Payment description is not a zap request, skipping receipt');
      return null;
    }

    // Create zap receipt data
    const zapData: ZapReceiptData = {
      bolt11: payment.invoice,
      preimage: payment.preimage,
      description: payment.description,
      recipientPubkey,
      amountSats: payment.amount,
      paymentHash: payment.paymentHash,
    };

    return zapData;
  } catch (error) {
    logError('[SparkZapReceipt] Failed to create zap receipt from payment:', error);
    return null;
  }
}

/**
 * Publish zap receipt for a payment if applicable
 * Automatically determines if payment is a zap and publishes receipt
 * @param payment - Breez payment info
 * @param recipientPubkey - Public key of zap recipient
 * @param relays - Relays to publish to
 * @param walletPubkey - Public key of wallet (optional)
 * @returns Promise that resolves to true if receipt was published
 */
export async function publishZapReceiptForPayment(
  payment: BreezPaymentInfo,
  recipientPubkey: string,
  relays: Relay[],
  walletPubkey?: string
): Promise<boolean> {
  try {
    // Create zap receipt data from payment
    const zapData = createZapReceiptFromPayment(payment, recipientPubkey);

    if (!zapData) {
      logInfo('[SparkZapReceipt] Payment is not a zap, no receipt published');
      return false;
    }

    // Publish zap receipt
    await publishZapReceipt(zapData, relays, walletPubkey);

    return true;
  } catch (error) {
    logError('[SparkZapReceipt] Failed to publish zap receipt for payment:', error);
    return false;
  }
}

/**
 * Monitor incoming payments and automatically publish zap receipts
 * This should be called when a payment is received
 * @param payment - Received payment info
 * @param relays - Relays to publish to
 * @param walletPubkey - Public key of wallet (optional)
 */
export async function handleIncomingZap(
  payment: BreezPaymentInfo,
  relays: Relay[],
  walletPubkey?: string
): Promise<void> {
  try {
    logInfo('[SparkZapReceipt] Handling incoming payment...');

    // For received payments, we are the recipient
    const pubkey = walletPubkey || await getPublicKey();
    if (!pubkey) {
      logWarning('[SparkZapReceipt] No pubkey available for incoming zap');
      return;
    }

    // Check if this is a zap and publish receipt
    const published = await publishZapReceiptForPayment(payment, pubkey, relays, pubkey);

    if (published) {
      logInfo('[SparkZapReceipt] Incoming zap receipt published');
    } else {
      logInfo('[SparkZapReceipt] Incoming payment was not a zap');
    }
  } catch (error) {
    logError('[SparkZapReceipt] Failed to handle incoming zap:', error);
  }
}

/**
 * Verify zap receipt is valid
 * @param receiptEvent - Zap receipt event (kind 9735)
 * @returns True if receipt is valid
 */
export function verifyZapReceipt(receiptEvent: NostrRelaySignedEvent): boolean {
  try {
    // Check event kind
    if (receiptEvent.kind !== ZAP_RECEIPT_KIND) {
      logWarning('[SparkZapReceipt] Event is not a zap receipt');
      return false;
    }

    // Check required tags
    const bolt11Tag = receiptEvent.tags.find(t => t[0] === 'bolt11');
    const descriptionTag = receiptEvent.tags.find(t => t[0] === 'description');
    const pTag = receiptEvent.tags.find(t => t[0] === 'p');

    if (!bolt11Tag || !descriptionTag || !pTag) {
      logWarning('[SparkZapReceipt] Zap receipt missing required tags');
      return false;
    }

    // Verify description is a valid zap request
    const zapRequest = parseZapRequest(descriptionTag[1]);
    if (!zapRequest) {
      logWarning('[SparkZapReceipt] Zap receipt has invalid description');
      return false;
    }

    // All checks passed
    return true;
  } catch (error) {
    logError('[SparkZapReceipt] Failed to verify zap receipt:', error);
    return false;
  }
}

/**
 * Parse amount from zap receipt
 * @param receiptEvent - Zap receipt event
 * @returns Amount in sats or null
 */
export function getZapReceiptAmount(receiptEvent: NostrRelaySignedEvent): number | null {
  try {
    const amountTag = receiptEvent.tags.find(t => t[0] === 'amount');
    if (!amountTag || !amountTag[1]) {
      return null;
    }

    // Amount is in millisats, convert to sats
    const msats = parseInt(amountTag[1], 10);
    return Math.floor(msats / 1000);
  } catch (error) {
    logError('[SparkZapReceipt] Failed to parse zap receipt amount:', error);
    return null;
  }
}

/**
 * Get recipient pubkey from zap receipt
 * @param receiptEvent - Zap receipt event
 * @returns Recipient pubkey or null
 */
export function getZapReceiptRecipient(receiptEvent: NostrRelaySignedEvent): string | null {
  try {
    const pTag = receiptEvent.tags.find(t => t[0] === 'p');
    if (!pTag || !pTag[1]) {
      return null;
    }

    return pTag[1];
  } catch (error) {
    logError('[SparkZapReceipt] Failed to get zap receipt recipient:', error);
    return null;
  }
}

/**
 * Get zapped event ID from zap receipt
 * @param receiptEvent - Zap receipt event
 * @returns Event ID or null if zapping a profile
 */
export function getZappedEventId(receiptEvent: NostrRelaySignedEvent): string | null {
  try {
    const eTag = receiptEvent.tags.find(t => t[0] === 'e');
    if (!eTag || !eTag[1]) {
      return null; // Might be a profile zap
    }

    return eTag[1];
  } catch (error) {
    logError('[SparkZapReceipt] Failed to get zapped event ID:', error);
    return null;
  }
}
