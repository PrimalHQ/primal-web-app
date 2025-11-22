import { Component, createSignal, Show, createEffect } from 'solid-js';
import { useToastContext } from '../Toaster/Toaster';
import { useSparkWallet } from '../../contexts/SparkWalletContext';
import { useAccountContext } from '../../contexts/AccountContext';
import { TextField } from '@kobalte/core/text-field';
import { Dialog } from '@kobalte/core/dialog';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import Loader from '../Loader/Loader';
import { sendProfile } from '../../lib/profile';

import styles from './LightningAddressCard.module.scss';

const LightningAddressCard: Component = () => {
  const sparkWallet = useSparkWallet();
  const account = useAccountContext();
  const toast = useToastContext();

  const [showRegisterForm, setShowRegisterForm] = createSignal(false);
  const [username, setUsername] = createSignal('');
  const [isRegistering, setIsRegistering] = createSignal(false);
  const [isChecking, setIsChecking] = createSignal(false);
  const [isAvailable, setIsAvailable] = createSignal<boolean | null>(null);
  const [showQrCode, setShowQrCode] = createSignal(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = createSignal('');
  const [showProfilePrompt, setShowProfilePrompt] = createSignal(false);
  const [newLightningAddress, setNewLightningAddress] = createSignal('');
  const [isUpdatingProfile, setIsUpdatingProfile] = createSignal(false);

  let checkTimeout: NodeJS.Timeout | undefined;

  // Auto-check availability when username changes
  createEffect(() => {
    const user = username().trim();

    // Clear previous timeout
    if (checkTimeout) {
      clearTimeout(checkTimeout);
    }

    // Reset availability if username is empty
    if (!user) {
      setIsAvailable(null);
      setIsChecking(false);
      return;
    }

    // Debounce the availability check
    setIsChecking(true);
    checkTimeout = setTimeout(async () => {
      try {
        const available = await sparkWallet.actions.checkLightningAddressAvailable(user);
        setIsAvailable(available);
      } catch (error: any) {
        console.error('Failed to check availability:', error);
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, 500); // 500ms debounce
  });

  // Generate QR code when modal opens
  createEffect(async () => {
    if (showQrCode() && sparkWallet.store.lightningAddress && !qrCodeDataUrl()) {
      await generateQRCode(sparkWallet.store.lightningAddress);
    }
  });

  const generateQRCode = async (address: string) => {
    try {
      // Dynamically import qr-code-styling
      const QRCodeStyling = (await import('qr-code-styling')).default;

      const qrCode = new QRCodeStyling({
        width: 300,
        height: 300,
        data: `lightning:${address}`,
        margin: 10,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: 'M',
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.4,
          margin: 4,
        },
        dotsOptions: {
          type: 'rounded',
          color: '#000000',
        },
        backgroundOptions: {
          color: '#ffffff',
        },
        cornersSquareOptions: {
          type: 'extra-rounded',
          color: '#000000',
        },
        cornersDotOptions: {
          type: 'dot',
          color: '#000000',
        },
      });

      // Get canvas and convert to data URL
      const blob = await qrCode.getRawData('png');
      if (blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setQrCodeDataUrl(reader.result as string);
        };
        reader.readAsDataURL(blob);
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast?.sendWarning('Failed to generate QR code');
    }
  };

  const handleRegister = async () => {
    const user = username().trim();
    if (!user) {
      toast?.sendWarning('Please enter a username');
      return;
    }

    try {
      setIsRegistering(true);
      const addressInfo = await sparkWallet.actions.registerLightningAddress(user);
      toast?.sendSuccess(`Lightning address registered: ${user}@breez.tips`);
      setShowRegisterForm(false);
      setUsername('');
      setIsAvailable(null);

      // Show prompt to update Nostr profile
      setNewLightningAddress(addressInfo.lightningAddress);
      setShowProfilePrompt(true);
    } catch (error: any) {
      console.error('Failed to register Lightning address:', error);
      toast?.sendWarning(`Failed to register: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!account?.activeUser || !account.activeRelays) {
      toast?.sendWarning('Please log in to update your profile');
      return;
    }

    const lightningAddress = newLightningAddress();
    if (!lightningAddress) return;

    try {
      setIsUpdatingProfile(true);

      // Get current profile from msg.content (raw Nostr event content)
      const currentProfile: Record<string, any> = JSON.parse(account.activeUser.msg?.content || '{}');

      // Build updated metadata preserving ALL existing fields
      const updatedMetadata: Record<string, any> = {
        name: currentProfile.name || account.activeUser.name,
        about: currentProfile.about || account.activeUser.about,
        picture: currentProfile.picture || account.activeUser.picture,
        nip05: currentProfile.nip05 || account.activeUser.nip05,
        lud16: lightningAddress,  // Update Lightning address
      };

      // Include optional fields if they exist
      if (currentProfile.display_name || account.activeUser.display_name) {
        updatedMetadata.display_name = currentProfile.display_name || account.activeUser.display_name;
      }
      if (currentProfile.website || account.activeUser.website) {
        updatedMetadata.website = currentProfile.website || account.activeUser.website;
      }
      if (currentProfile.banner || account.activeUser.banner) {
        updatedMetadata.banner = currentProfile.banner || account.activeUser.banner;
      }
      if (currentProfile.lud06 || account.activeUser.lud06) {
        updatedMetadata.lud06 = currentProfile.lud06 || account.activeUser.lud06;
      }
      if (currentProfile.bot) {
        updatedMetadata.bot = currentProfile.bot;
      }
      if (currentProfile.location || account.activeUser.location) {
        updatedMetadata.location = currentProfile.location || account.activeUser.location;
      }

      // Publish updated profile
      await sendProfile(updatedMetadata, account.proxyThroughPrimal, account.activeRelays, account.relaySettings);

      toast?.sendSuccess('Profile updated with new Lightning address!');
      setShowProfilePrompt(false);
      setNewLightningAddress('');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast?.sendWarning(`Failed to update profile: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSkipProfileUpdate = () => {
    setShowProfilePrompt(false);
    setNewLightningAddress('');
  };

  const handleShowQrCode = () => {
    setShowQrCode(true);
  };

  const handleCloseQrCode = () => {
    setShowQrCode(false);
  };

  const handleCopy = async () => {
    if (!sparkWallet.store.lightningAddress) return;

    try {
      await navigator.clipboard.writeText(sparkWallet.store.lightningAddress);
      toast?.sendSuccess('Lightning address copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast?.sendWarning('Failed to copy to clipboard');
    }
  };

  return (
    <div class={styles.lightningAddressCard}>
      <div class={styles.cardHeader}>
        <div class={styles.cardLabel}>Lightning Address</div>
      </div>

      <Show
        when={sparkWallet.store.lightningAddress}
        fallback={
          <Show
            when={!showRegisterForm()}
            fallback={
              <div class={styles.registerForm}>
                <div class={styles.formDescription}>
                  Choose a username for your Lightning address. This will allow others to send you payments.
                </div>

                <div class={styles.usernameInput}>
                  <input
                    type="text"
                    placeholder="username"
                    value={username()}
                    onInput={(e) => setUsername(e.currentTarget.value)}
                    disabled={isRegistering()}
                    class={styles.textInput}
                  />
                  <span class={styles.domain}>@breez.tips</span>
                </div>

                <Show when={username().trim() && (isChecking() || isAvailable() !== null)}>
                  <div classList={{
                    [styles.availabilityMessage]: true,
                    [styles.checking]: isChecking(),
                    [styles.available]: !isChecking() && isAvailable() === true,
                    [styles.unavailable]: !isChecking() && isAvailable() === false,
                  }}>
                    <Show when={!isChecking() && isAvailable() === true}>
                      <span class={styles.checkIcon}>✓</span>
                    </Show>
                    <Show when={!isChecking() && isAvailable() === false}>
                      <span class={styles.errorIcon}>✕</span>
                    </Show>
                    <span>
                      {isChecking() ? 'Checking availability...' : isAvailable() ? 'Username is available' : 'Username is taken'}
                    </span>
                  </div>
                </Show>

                <div class={styles.formActions}>
                  <ButtonSecondary
                    onClick={() => {
                      setShowRegisterForm(false);
                      setUsername('');
                      setIsAvailable(null);
                    }}
                    disabled={isRegistering()}
                  >
                    Cancel
                  </ButtonSecondary>
                  <ButtonPrimary
                    onClick={handleRegister}
                    disabled={!username().trim() || isChecking() || isAvailable() !== true || isRegistering()}
                  >
                    {isRegistering() ? <Loader /> : 'Register'}
                  </ButtonPrimary>
                </div>
              </div>
            }
          >
            <div class={styles.noAddress}>
              <div class={styles.noAddressText}>
                Get a Lightning address to receive zaps!
              </div>
              <ButtonPrimary onClick={() => setShowRegisterForm(true)}>
                Get a Lightning Address
              </ButtonPrimary>
            </div>
          </Show>
        }
      >
        <div class={styles.addressDisplay}>
          <div class={styles.addressText}>
            {sparkWallet.store.lightningAddress}
          </div>
          <div class={styles.addressActions}>
            <button
              class={styles.copyButton}
              onClick={handleCopy}
              type="button"
              title="Copy Lightning address"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button
              class={styles.qrButton}
              onClick={handleShowQrCode}
              type="button"
              title="Show QR code"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
          </div>
        </div>
      </Show>

      {/* QR Code Modal */}
      <Dialog open={showQrCode()} onOpenChange={setShowQrCode}>
        <Dialog.Portal>
          <Dialog.Overlay class={styles.dialogOverlay} />
          <div class={styles.dialogContainer}>
            <Dialog.Content class={styles.dialogContent}>
              <div class={styles.dialogHeader}>
                <Dialog.Title class={styles.dialogTitle}>
                  Lightning Address QR Code
                </Dialog.Title>
                <Dialog.CloseButton class={styles.dialogCloseButton}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </Dialog.CloseButton>
              </div>
              <Dialog.Description class={styles.qrModal}>
                <Show
                  when={qrCodeDataUrl()}
                  fallback={
                    <div class={styles.qrLoading}>
                      <Loader />
                      <div>Generating QR code...</div>
                    </div>
                  }
                >
                  <div class={styles.qrCodeWrapper}>
                    <img src={qrCodeDataUrl()} alt="Lightning Address QR Code" class={styles.qrImage} />
                  </div>
                  <div class={styles.qrAddressText}>
                    {sparkWallet.store.lightningAddress}
                  </div>
                  <div class={styles.qrActions}>
                    <ButtonPrimary onClick={handleCopy}>
                      Copy Lightning Address
                    </ButtonPrimary>
                  </div>
                </Show>
              </Dialog.Description>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog>

      {/* Profile Update Prompt Modal */}
      <Dialog open={showProfilePrompt()} onOpenChange={setShowProfilePrompt}>
        <Dialog.Portal>
          <Dialog.Overlay class={styles.dialogOverlay} />
          <div class={styles.dialogContainer}>
            <Dialog.Content class={styles.dialogContent}>
              <div class={styles.dialogHeader}>
                <Dialog.Title class={styles.dialogTitle}>
                  Update Nostr Profile?
                </Dialog.Title>
              </div>
              <Dialog.Description class={styles.profilePrompt}>
                <div class={styles.promptIcon}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <div class={styles.promptMessage}>
                  Would you like to set <strong>{newLightningAddress()}</strong> as your Nostr profile's Lightning address?
                </div>
                <div class={styles.promptDescription}>
                  This will update your profile so others can send you zaps to this address.
                </div>
                <div class={styles.promptActions}>
                  <ButtonSecondary
                    onClick={handleSkipProfileUpdate}
                    disabled={isUpdatingProfile()}
                  >
                    Maybe Later
                  </ButtonSecondary>
                  <ButtonPrimary
                    onClick={handleUpdateProfile}
                    disabled={isUpdatingProfile()}
                  >
                    {isUpdatingProfile() ? <Loader /> : 'Yes, Update Profile'}
                  </ButtonPrimary>
                </div>
              </Dialog.Description>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog>
    </div>
  );
};

export default LightningAddressCard;
