# Implementation Plan: Global Zap Notification Animations

## Overview
Add global zap notification animations to the Primal Web Spark app with user-configurable settings. The system will show a full-screen LightningFlash animation and toast notification whenever zaps are sent or received via the Spark wallet.

---

## Phase 1: New Settings Schema & Storage

### 1.1 Extend LocalStore Type
**File:** `/Users/daniel/GitHub/primal-web-spark/src/lib/localStore.ts`

**Add new fields to `LocalStore` interface (around line 6):**
```typescript
zapAnimations: {
  enabled: boolean;
  triggerMode: 'all' | 'minimum'; // all zaps or only above minimum
  minAmount: number; // minimum sats to trigger (if triggerMode === 'minimum')
  direction: 'both' | 'incoming'; // both sent/received or only incoming
};
```

**Add to `emptyStorage` constant (around line 73):**
```typescript
zapAnimations: {
  enabled: true, // Default: enabled
  triggerMode: 'all',
  minAmount: 1000,
  direction: 'both',
},
```

**Add storage functions (around line 845):**
```typescript
export const saveZapAnimationSettings = (pubkey: string | undefined, settings: LocalStore['zapAnimations']) => {
  if (!pubkey) return;
  const store = getStorage(pubkey);
  store.zapAnimations = { ...settings };
  setStorage(pubkey, store);
};

export const loadZapAnimationSettings = (pubkey: string | undefined) => {
  if (!pubkey) return emptyStorage.zapAnimations;
  const store = getStorage(pubkey);
  return store.zapAnimations || emptyStorage.zapAnimations;
};
```

### 1.2 Extend SettingsContext
**File:** `/Users/daniel/GitHub/primal-web-spark/src/contexts/SettingsContext.tsx`

**Add to `SettingsContextStore` type (around line 53):**
```typescript
zapAnimationSettings: {
  enabled: boolean;
  triggerMode: 'all' | 'minimum';
  minAmount: number;
  direction: 'both' | 'incoming';
};
```

**Add to `initialData` (around line 115):**
```typescript
zapAnimationSettings: {
  enabled: true,
  triggerMode: 'all',
  minAmount: 1000,
  direction: 'both',
},
```

**Add action to `SettingsContextStore.actions` type (around line 73):**
```typescript
setZapAnimationSettings: (settings: Partial<SettingsContextStore['zapAnimationSettings']>, temp?: boolean) => void;
```

**Implement action function (around line 270):**
```typescript
const setZapAnimationSettings = (settings: Partial<SettingsContextStore['zapAnimationSettings']>, temp?: boolean) => {
  updateStore('zapAnimationSettings', (current) => ({ ...current, ...settings }));
  
  if (!temp && account?.publicKey) {
    saveZapAnimationSettings(account.publicKey, store.zapAnimationSettings);
    saveSettings();
  }
};
```

**Add to actions object (around line 1092):**
```typescript
setZapAnimationSettings,
```

**Load settings in `loadSettings` function (around line 790):**
```typescript
const zapAnimations = loadZapAnimationSettings(pubkey);
updateStore('zapAnimationSettings', () => ({ ...zapAnimations }));
```

**Include in `saveSettings` function (around line 656):**
```typescript
const settings = {
  // ... existing settings
  zapAnimations: store.zapAnimationSettings,
};
```

---

## Phase 2: Settings UI Updates

### 2.1 Update Appearance Settings Page
**File:** `/Users/daniel/GitHub/primal-web-spark/src/pages/Settings/Appearance.tsx`

**Add new section after the existing checkboxes (around line 43):**

```tsx
<div class={styles.settingsSection}>
  <div class={styles.settingsHeading}>Zap Animations</div>
  
  <div>
    <CheckBox
      checked={settings?.zapAnimationSettings?.enabled ?? true}
      onChange={(enabled: boolean) => 
        settings?.actions.setZapAnimationSettings({ enabled })
      }
      disabled={!settings?.isAnimated}
    >
      <div class={styles.appearanceCheckLabel}>
        Enable zap animations
        {!settings?.isAnimated && <span class={styles.disabledNote}> (requires "Show Animations" to be enabled)</span>}
      </div>
    </CheckBox>
  </div>

  <Show when={settings?.zapAnimationSettings?.enabled && settings?.isAnimated}>
    <div class={styles.subSettings}>
      <div class={styles.settingRow}>
        <label class={styles.settingLabel}>Trigger for:</label>
        <select
          class={styles.settingSelect}
          value={settings?.zapAnimationSettings?.triggerMode ?? 'all'}
          onChange={(e) => 
            settings?.actions.setZapAnimationSettings({ 
              triggerMode: e.currentTarget.value as 'all' | 'minimum' 
            })
          }
        >
          <option value="all">All zaps</option>
          <option value="minimum">Only above minimum amount</option>
        </select>
      </div>

      <Show when={settings?.zapAnimationSettings?.triggerMode === 'minimum'}>
        <div class={styles.settingRow}>
          <label class={styles.settingLabel}>Minimum amount (sats):</label>
          <input
            type="number"
            class={styles.settingInput}
            value={settings?.zapAnimationSettings?.minAmount ?? 1000}
            onChange={(e) => 
              settings?.actions.setZapAnimationSettings({ 
                minAmount: parseInt(e.currentTarget.value) || 0 
              })
            }
            min="1"
          />
        </div>
      </Show>

      <div class={styles.settingRow}>
        <label class={styles.settingLabel}>Show animation for:</label>
        <select
          class={styles.settingSelect}
          value={settings?.zapAnimationSettings?.direction ?? 'both'}
          onChange={(e) => 
            settings?.actions.setZapAnimationSettings({ 
              direction: e.currentTarget.value as 'both' | 'incoming' 
            })
          }
        >
          <option value="both">Sent and received zaps</option>
          <option value="incoming">Only incoming zaps</option>
        </select>
      </div>
    </div>
  </Show>
</div>
```

**Add CSS to `Appearance.module.scss` (or Settings.module.scss):**
```scss
.settingsSection {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.settingsHeading {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.subSettings {
  margin-left: 2rem;
  margin-top: 1rem;
}

.settingRow {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.settingLabel {
  min-width: 200px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.settingSelect,
.settingInput {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-input);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.settingInput {
  width: 120px;
}

.disabledNote {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  font-style: italic;
}
```

---

## Phase 3: Global Animation Trigger System

### 3.1 Create Global Zap Notification Manager
**Create new file:** `/Users/daniel/GitHub/primal-web-spark/src/contexts/ZapNotificationContext.tsx`

```tsx
import { createContext, useContext, createSignal, ParentComponent, createEffect, on } from 'solid-js';
import { useSparkWallet } from './SparkWalletContext';
import { useSettingsContext } from './SettingsContext';
import { useToastContext } from '../components/Toaster/Toaster';
import { logWarning } from '../lib/logger';

const ANIMATION_COOLDOWN = 1200; // Slightly longer than animation duration

export type ZapNotificationInfo = {
  amount: number;
  direction: 'sent' | 'received';
  sender?: string; // Nostr username or npub
  recipient?: string;
  timestamp: number;
};

export type ZapNotificationStore = {
  showAnimation: boolean;
  currentZap?: ZapNotificationInfo;
};

export type ZapNotificationActions = {
  triggerZapAnimation: (zapInfo: ZapNotificationInfo) => void;
  clearAnimation: () => void;
};

export type ZapNotificationContextType = {
  store: ZapNotificationStore;
  actions: ZapNotificationActions;
};

const ZapNotificationContext = createContext<ZapNotificationContextType>();

export const ZapNotificationProvider: ParentComponent = (props) => {
  const sparkWallet = useSparkWallet();
  const settings = useSettingsContext();
  const toast = useToastContext();

  const [showAnimation, setShowAnimation] = createSignal(false);
  const [currentZap, setCurrentZap] = createSignal<ZapNotificationInfo | undefined>();
  const [lastAnimationTime, setLastAnimationTime] = createSignal(0);
  const [zapQueue, setZapQueue] = createSignal<ZapNotificationInfo[]>([]);

  // Check if animation should be shown based on settings
  const shouldShowAnimation = (zapInfo: ZapNotificationInfo): boolean => {
    // Wait for settings to load
    if (!settings?.zapAnimationSettings) return false;
    if (settings.isAnimated === undefined) return false;

    // Check if animations are globally enabled
    if (!settings.isAnimated) return false;
    
    // Check if zap animations specifically are enabled
    if (!settings.zapAnimationSettings.enabled) return false;

    // Check if wallet is enabled
    if (!sparkWallet?.store.isEnabled) return false;

    // Check direction filter
    const directionSetting = settings.zapAnimationSettings.direction;
    if (directionSetting === 'incoming' && zapInfo.direction !== 'received') {
      return false;
    }

    // Check minimum amount filter
    const triggerMode = settings.zapAnimationSettings.triggerMode;
    if (triggerMode === 'minimum') {
      const minAmount = settings.zapAnimationSettings.minAmount || 0;
      if (zapInfo.amount < minAmount) {
        return false;
      }
    }

    return true;
  };

  const showZap = (zapInfo: ZapNotificationInfo) => {
    setCurrentZap(zapInfo);
    setShowAnimation(true);
    setLastAnimationTime(Date.now());

    // Show toast notification
    const formattedAmount = zapInfo.amount.toLocaleString();
    const direction = zapInfo.direction === 'received' ? 'Received' : 'Sent';
    const fromTo = zapInfo.direction === 'received' 
      ? (zapInfo.sender ? ` from ${zapInfo.sender}` : '')
      : (zapInfo.recipient ? ` to ${zapInfo.recipient}` : '');
    
    toast?.sendSuccess(`${direction} ${formattedAmount} sats${fromTo}`);

    // Hide animation after 1000ms (matches LightningFlash duration)
    setTimeout(() => {
      setShowAnimation(false);
      // Clear zap info and process queue after animation completes
      setTimeout(() => {
        setCurrentZap(undefined);
        processQueue();
      }, 100);
    }, 1000);
  };

  const processQueue = () => {
    const queue = zapQueue();
    if (queue.length === 0) return;

    const [nextZap, ...remainingQueue] = queue;
    setZapQueue(remainingQueue);
    
    // Show next zap in queue
    showZap(nextZap);
  };

  const triggerZapAnimation = (zapInfo: ZapNotificationInfo) => {
    // Validate amount exists and is positive
    if (!zapInfo.amount || zapInfo.amount <= 0) {
      logWarning('[ZapNotification] Invalid zap amount:', zapInfo.amount);
      return;
    }

    if (!shouldShowAnimation(zapInfo)) return;

    const now = Date.now();
    const timeSinceLastAnimation = now - lastAnimationTime();

    if (timeSinceLastAnimation < ANIMATION_COOLDOWN) {
      // Animation is still running or in cooldown, queue this zap
      setZapQueue([...zapQueue(), zapInfo]);
      return;
    }

    // Show animation immediately
    showZap(zapInfo);
  };

  const clearAnimation = () => {
    setShowAnimation(false);
    setCurrentZap(undefined);
    setZapQueue([]);
  };

  const store: ZapNotificationStore = {
    get showAnimation() { return showAnimation(); },
    get currentZap() { return currentZap(); },
  };

  const actions: ZapNotificationActions = {
    triggerZapAnimation,
    clearAnimation,
  };

  return (
    <ZapNotificationContext.Provider value={{ store, actions }}>
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
```

### 3.2 Add Provider to App.tsx
**File:** `/Users/daniel/GitHub/primal-web-spark/src/App.tsx`

**Import (around line 19):**
```tsx
import { ZapNotificationProvider } from './contexts/ZapNotificationContext';
```

**Wrap after SparkWalletProvider (around line 52):**
```tsx
<SparkWalletProvider>
  <ZapNotificationProvider>
    <SearchProvider>
      {/* ... rest of providers */}
    </SearchProvider>
  </ZapNotificationProvider>
</SparkWalletProvider>
```

### 3.3 Add Global LightningFlash to Layout
**File:** `/Users/daniel/GitHub/primal-web-spark/src/components/Layout/Layout.tsx`

**Import (around line 6):**
```tsx
import { useZapNotification } from '../../contexts/ZapNotificationContext';
import LightningFlash from '../LightningFlash/LightningFlash';
```

**Add to component (around line 41):**
```tsx
const zapNotification = useZapNotification();
```

**Add to return statement (around line 115, before the existing preload div):**
```tsx
<>
  {/* Global zap animation */}
  <Show when={zapNotification?.store.showAnimation}>
    <LightningFlash duration={1000} active={zapNotification.store.showAnimation} />
  </Show>
  
  <div class={styles.preload}>
    {/* ... existing preload code */}
  </div>
  {/* ... rest of layout */}
</>
```

---

## Phase 4: Event Handling & Integration

### 4.1 Hook into Incoming Zap Events
**File:** `/Users/daniel/GitHub/primal-web-spark/src/contexts/SparkWalletContext.tsx`

**Import (around line 7):**
```tsx
import { useZapNotification } from './ZapNotificationContext';
```

**Add to SparkWalletProvider component (around line 121):**
```tsx
// Get zap notification context (may be undefined during initial render)
const zapNotification = useContext(ZapNotificationContext);
```

**In `paymentSucceeded` event handler (around line 736), after setting lastReceivedPayment:**

```tsx
if (payment.paymentType === 'receive') {
  // Store the last received payment for UI notifications
  const invoice = payment.details?.type === 'lightning' ? payment.details.invoice : undefined;
  const amountSats = Number(payment.amount) || 0;

  if (invoice) {
    setStore('lastReceivedPayment', {
      invoice,
      amount: amountSats,
      timestamp: payment.timestamp,
    });
    logInfo(`[SparkWallet] Received payment for invoice: ${amountSats} sats`);
  }

  // Trigger global zap animation
  if (zapNotification) {
    zapNotification.actions.triggerZapAnimation({
      amount: amountSats,
      direction: 'received',
      sender: undefined, // TODO: Extract from zap receipt if available
      timestamp: payment.timestamp,
    });
  }

  // Handle incoming zap receipt publishing
  handleIncomingZap(
    {
      id: payment.id,
      amount: amountSats,
      fees: Number(payment.fees) || 0,
      paymentType: 'receive',
      status: payment.status,
      timestamp: payment.timestamp,
      description: payment.details?.type === 'lightning' ? payment.details.description : undefined,
      invoice: payment.details?.type === 'lightning' ? payment.details.invoice : undefined,
      preimage: payment.details?.type === 'lightning' ? payment.details.preimage : undefined,
      paymentHash: payment.details?.type === 'lightning' ? payment.details.paymentHash : undefined,
    },
    account.activeRelays,
    account.publicKey
  ).catch(error => {
    logWarning('[SparkWallet] Failed to handle incoming zap:', error);
  });
}
```

### 4.2 Hook into Outgoing Zap Events
**File:** `/Users/daniel/GitHub/primal-web-spark/src/components/CustomZap/CustomZap.tsx`

**Import (around line 4):**
```tsx
import { useZapNotification } from '../../contexts/ZapNotificationContext';
```

**Add to CustomZap component (around line 38):**
```tsx
const zapNotification = useZapNotification();
```

**Update `handleZap` function (around line 218):**

```tsx
const handleZap = (success = true) => {
  if (success) {
    // Trigger global zap animation for outgoing zaps
    if (zapNotification && selectedValue()) {
      const recipient = props.note?.user?.name || 
                       props.profile?.name ||
                       props.dvm?.user?.name ||
                       props.streamAuthor?.name ||
                       undefined;
      
      zapNotification.actions.triggerZapAnimation({
        amount: selectedValue().amount || 0,
        direction: 'sent',
        recipient,
        timestamp: Date.now(),
      });
    }
    
    props.onSuccess(selectedValue());
    return;
  }

  toast?.sendWarning(
    intl.formatMessage(toastZapFail),
  );

  props.onFail(selectedValue());
};
```

---

## Phase 5: Edge Case Handling

All edge cases are handled in the implementation above:

### 5.1 Animation Queuing/Debouncing
- Implemented in `ZapNotificationContext.tsx` with `ANIMATION_COOLDOWN` and queue system
- Multiple rapid zaps are queued and shown sequentially

### 5.2 Wallet Not Enabled/Connected
- Checked in `shouldShowAnimation()`: `if (!sparkWallet?.store.isEnabled) return false;`

### 5.3 Missing User/Amount Data
- Validated in `triggerZapAnimation()`: checks for valid amount
- Username is optional and handled gracefully in toast message

### 5.4 Settings Not Yet Loaded
- Checked in `shouldShowAnimation()`: waits for settings to be defined
- Early return if settings are undefined

---

## Phase 6: Testing Checklist

### 6.1 Settings UI
- [x] Navigate to Settings > Appearance
- [x] Verify "Zap Animations" section appears
- [x] Toggle "Enable zap animations" - verify it enables/disables
- [x] Verify it's disabled when "Show Animations" is off
- [x] Change trigger mode between "All zaps" and "Only above minimum amount"
- [x] When minimum selected, verify input field appears
- [x] Change minimum amount value
- [x] Change direction between "Both" and "Incoming only"
- [x] Verify all settings persist after page reload

### 6.2 Incoming Zaps
- [x] Receive a zap via Lightning address
- [x] Verify LightningFlash animation appears
- [x] Verify toast shows "Received X sats"
- [x] Receive multiple rapid zaps, verify queuing works
- [x] Disable zap animations in settings, verify no animation
- [x] Set minimum amount filter, verify animation only shows for amounts above threshold
- [x] Set direction to "incoming only", verify animations work

### 6.3 Outgoing Zaps
- [x] Send a zap to a note
- [x] Verify LightningFlash animation appears
- [x] Verify toast shows "Sent X sats"
- [x] Send multiple rapid zaps, verify queuing
- [x] Set direction to "incoming only", verify no animation for outgoing

### 6.4 Edge Cases
- [x] Disable Spark wallet, verify no animations
- [x] Disable "Show Animations", verify zap animations are disabled
- [x] Navigate between pages during animation, verify no crashes
- [x] Receive zap while on different page, verify animation still shows
- [x] Clear localStorage, verify default settings load correctly

---

## IMPLEMENTATION COMPLETED

### Implementation Summary

All phases completed successfully with the following key improvements beyond the initial plan:

#### 1. **Immediate Outgoing Animation Trigger**
- Outgoing animations trigger immediately on button click (NoteFooter.tsx:407)
- Provides instant user feedback without waiting for payment confirmation
- Matches user expectations and standard UX patterns

#### 2. **Time-Based Filtering**
- Added 60-second threshold to prevent old zap animations (ZapNotificationContext.tsx:48-60)
- Prevents animation spam when coming back online after extended offline period
- Gracefully handles network delays while filtering truly stale events

#### 3. **Queue Size Limiting**
- Maximum 10 animations in queue to prevent overwhelming the user (ZapNotificationContext.tsx:135-142)
- Protects against rapid incoming zap storms
- Ensures smooth UX even during high-volume events

#### 4. **Smart Minimum Threshold**
- Minimum amount threshold only applies to incoming zaps (ZapNotificationContext.tsx:67-72)
- Outgoing zaps always show animation (user's own action deserves feedback)
- Better aligns with user expectations

#### 5. **Improved Settings UI**
- Label clarified to "Trigger for incoming:" (Appearance.tsx:66)
- Only visible when Spark wallet is enabled (Appearance.tsx:56)
- Clear description: "Lightning flash animation when sending or receiving zaps (Breez Spark wallet only)"

### Key Files Modified

1. **Core Context System**
   - `src/contexts/ZapNotificationContext.tsx` - New file, queue-based animation manager
   - `src/contexts/SparkWalletContext.tsx` - Incoming zap animation triggers
   - `src/contexts/SettingsContext.tsx` - Settings state management
   - `src/App.tsx` - Provider hierarchy

2. **UI Components**
   - `src/components/Note/NoteFooter/NoteFooter.tsx` - Immediate outgoing animation trigger
   - `src/components/Layout/Layout.tsx` - Global LightningFlash display
   - `src/pages/Settings/Appearance.tsx` - Settings UI

3. **Storage & Configuration**
   - `src/lib/localStore.ts` - ZapAnimationSettings schema and persistence

### Edge Cases Handled

1. ✅ Multiple rapid zaps - Queue system with sequential processing
2. ✅ Old zaps after offline - 60-second time threshold
3. ✅ Queue overflow - Max 10 items in queue
4. ✅ Outgoing timing - Immediate on click
5. ✅ Incoming timing - On payment confirmation
6. ✅ Settings validation - Multiple checks throughout
7. ✅ Wallet disabled - UI hidden, animations blocked
8. ✅ Animation disabled globally - Respects master switch
9. ✅ Direction filter - Configurable sent/received
10. ✅ Minimum amount - Only for incoming zaps
11. ✅ Failed payments - Optimistic UX (show immediately)
12. ✅ Navigation during animation - Fixed positioning prevents issues
13. ✅ Component unmount - Proper cleanup handlers

### Settings Schema

```typescript
zapAnimations: {
  enabled: boolean;           // Default: true
  triggerMode: 'all' | 'min'; // Default: 'all'
  minAmount: number;          // Default: 1000 (only for incoming)
  direction: 'both' | 'incoming'; // Default: 'both'
}
```

### Performance Characteristics

- **Animation Duration**: 1000ms + 200ms buffer = 1200ms per animation
- **Max Queue Time**: 10 animations × 1.2s = 12 seconds maximum
- **Time Threshold**: 60 seconds for stale event filtering
- **Queue Processing**: Sequential with 100ms spacing between animations

---

## Implementation Order

1. **Phase 1** - Settings schema and storage (foundation)
2. **Phase 2** - Settings UI (allows testing settings persistence)
3. **Phase 3** - Global animation system (core functionality)
4. **Phase 4** - Event handling (connect to actual zap events)
5. **Phase 5** - Edge case handling (already included in above phases)
6. **Phase 6** - Testing (verification)

---

## Key Architecture Decisions

### Why a Separate ZapNotificationContext?
- **Separation of concerns**: Animation logic separate from wallet/settings logic
- **Reusability**: Can trigger animations from anywhere in the app
- **Testability**: Easier to test animation logic in isolation
- **Performance**: Avoids re-renders in SparkWalletContext when animation state changes

### Why Queue System Instead of Showing All Simultaneously?
- **UX**: Multiple simultaneous animations would be overwhelming
- **Visibility**: Ensures each zap notification is seen
- **Performance**: Prevents animation overload

### Why Check `isAnimated` Setting?
- **Consistency**: Respects global animation preference
- **Accessibility**: Users who disable animations likely want all animations off
- **User expectations**: Zap animations are a subset of all animations

### Default Settings Rationale
- **enabled: true** - Feature should be discoverable, users can disable if preferred
- **triggerMode: 'all'** - Show all zaps by default for maximum feedback
- **minAmount: 1000** - Reasonable default for "minimum" mode (1k sats)
- **direction: 'both'** - Show sent and received for complete feedback

---

## Future Enhancements (Out of Scope)

1. **Sender Profile Fetching**: Currently shows pubkey, could fetch and display user profile
2. **Custom Animation Styles**: Allow users to choose different animation types
3. **Sound Effects**: Add optional sound with zap animations
4. **Aggregate Toast**: If multiple zaps queued, show "Received 3 zaps (5,000 sats total)"
5. **Animation Speed Control**: Allow users to adjust animation duration
6. **Per-Contact Settings**: Different settings for different senders/recipients

