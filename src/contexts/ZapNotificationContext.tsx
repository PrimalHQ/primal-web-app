import { createContext, useContext, Component, JSXElement } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useSettingsContext } from './SettingsContext';
import { useToastContext } from '../components/Toaster/Toaster';

type ZapNotification = {
  amount: number;
  direction: 'incoming' | 'outgoing';
  from?: string;
  to?: string;
  timestamp: number;
};

type ZapNotificationStore = {
  showAnimation: boolean;
  queue: ZapNotification[];
  isProcessing: boolean;
};

type ZapNotificationActions = {
  triggerZapAnimation: (notification: ZapNotification) => void;
};

const ZapNotificationContext = createContext<{
  store: ZapNotificationStore;
  actions: ZapNotificationActions;
}>();

export const ZapNotificationProvider: Component<{children: JSXElement}> = (props) => {
  const settings = useSettingsContext();
  const toast = useToastContext();

  const [store, setStore] = createStore<ZapNotificationStore>({
    showAnimation: false,
    queue: [],
    isProcessing: false,
  });

  const shouldShowAnimation = (notification: ZapNotification): boolean => {
    // Check global animation setting
    if (!settings?.isAnimated) return false;

    // Check zap animation enabled
    if (!settings?.zapAnimations.enabled) return false;

    // Wallet state is checked by caller (SparkWalletContext) before triggering

    // Check if payment is too old (more than 60 seconds ago)
    // This prevents animation spam when coming back online after being away
    const now = Date.now();
    // Convert timestamp to milliseconds if it appears to be in seconds
    const timestampMs = notification.timestamp < 10000000000
      ? notification.timestamp * 1000
      : notification.timestamp;
    const paymentAge = now - timestampMs;
    const MAX_AGE_MS = 60 * 1000; // 60 seconds

    if (paymentAge > MAX_AGE_MS) {
      console.log('[ZapNotification] Payment too old, skipping animation', {
        age: Math.round(paymentAge / 1000),
        maxAge: Math.round(MAX_AGE_MS / 1000),
      });
      return false;
    }

    // Check direction setting
    if (settings.zapAnimations.direction === 'incoming' && notification.direction === 'outgoing') {
      return false;
    }

    // Check minimum amount (only for incoming zaps)
    if (notification.direction === 'incoming' && settings.zapAnimations.triggerMode === 'min') {
      if (notification.amount < settings.zapAnimations.minAmount) {
        return false;
      }
    }

    return true;
  };

  const processQueue = async () => {
    if (store.isProcessing || store.queue.length === 0) {
      console.log('[ZapNotification] processQueue skipped', { isProcessing: store.isProcessing, queueLength: store.queue.length });
      return;
    }

    console.log('[ZapNotification] processQueue starting');
    setStore('isProcessing', true);
    const notification = store.queue[0];

    // Show animation
    console.log('[ZapNotification] Setting showAnimation to TRUE');
    setStore('showAnimation', true);

    // Show toast
    const amountFormatted = notification.amount.toLocaleString();
    if (notification.direction === 'incoming') {
      const from = notification.from ? ` from ${notification.from}` : '';
      toast?.sendSuccess(`Received ${amountFormatted} sats${from}`);
    } else {
      const to = notification.to ? ` to ${notification.to}` : '';
      toast?.sendSuccess(`Sent ${amountFormatted} sats${to}`);
    }

    // Wait for animation to complete (1000ms animation + 200ms buffer)
    console.log('[ZapNotification] Waiting for animation to complete...');
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Hide animation and remove from queue
    console.log('[ZapNotification] Setting showAnimation to FALSE');
    setStore('showAnimation', false);
    setStore('queue', queue => queue.slice(1));
    setStore('isProcessing', false);

    // Process next in queue
    if (store.queue.length > 0) {
      console.log('[ZapNotification] Processing next in queue');
      setTimeout(() => processQueue(), 100);
    }
  };

  const triggerZapAnimation = (notification: ZapNotification) => {
    console.log('[ZapNotification] triggerZapAnimation called', {
      amount: notification.amount,
      direction: notification.direction,
      isAnimated: settings?.isAnimated,
      enabled: settings?.zapAnimations.enabled,
      triggerMode: settings?.zapAnimations.triggerMode,
      minAmount: settings?.zapAnimations.minAmount,
      directionFilter: settings?.zapAnimations.direction,
    });

    if (!shouldShowAnimation(notification)) {
      console.log('[ZapNotification] Animation blocked by settings');
      return;
    }

    // Limit queue size to prevent animation spam
    const MAX_QUEUE_SIZE = 10;
    if (store.queue.length >= MAX_QUEUE_SIZE) {
      console.log('[ZapNotification] Queue full, skipping animation', {
        queueSize: store.queue.length,
        maxSize: MAX_QUEUE_SIZE,
      });
      return;
    }

    console.log('[ZapNotification] Adding to queue');
    setStore('queue', queue => [...queue, notification]);

    // Use setTimeout to ensure state update has been applied
    setTimeout(() => processQueue(), 0);
  };

  const contextValue = {
    store,
    actions: { triggerZapAnimation },
  };

  return (
    <ZapNotificationContext.Provider value={contextValue}>
      {props.children}
    </ZapNotificationContext.Provider>
  );
};

export const useZapNotification = () => {
  const context = useContext(ZapNotificationContext);
  if (!context) {
    throw new Error('useZapNotification must be used within ZapNotificationProvider');
  }
  return context;
};
