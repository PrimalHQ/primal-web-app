import { useIntl } from '@cookbook/solid-intl';
import { Tabs } from '@kobalte/core';
import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import { defaultZap, defaultZapOptions } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { hookForDev } from '../../lib/devTools';
import { hexToNpub } from '../../lib/keys';
import { truncateNumber } from '../../lib/notifications';
import { zapNote, zapProfile } from '../../lib/zap';
import { authorName, nip05Verification, truncateNpub, userName } from '../../stores/profile';
import { toastZapFail, zapCustomOption, actions as tActions, placeholders as tPlaceholders, zapCustomAmount } from '../../translations';
import { PrimalNote, PrimalUser, ZapOption } from '../../types/primal';
import { debounce } from '../../utils';
import Avatar from '../Avatar/Avatar';
import ButtonCopy from '../Buttons/ButtonCopy';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import Modal from '../Modal/Modal';
import QrCode from '../QrCode/QrCode';
import TextInput from '../TextInput/TextInput';
import { useToastContext } from '../Toaster/Toaster';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './ProfileQrCodeModal.module.scss';

const ProfileQrCodeModal: Component<{
  id?: string,
  open?: boolean,
  profile: PrimalUser,
  onClose?: () => void,
}> = (props) => {

  const toast = useToastContext();
  const account = useAccountContext();
  const intl = useIntl();
  const settings = useSettingsContext();

  const profileData = () => Object.entries({
    pubkey: {
      title: 'Public key',
      data: `nostr:${props.profile.npub || hexToNpub(props.profile.pubkey)}`,
      type: 'nostr',
    },
    lnAddress: {
      title: 'Lightning address',
      data: `lightning:${props.profile.lud16 || props.profile.lud06}`,
      type: 'lightning',
    }
  });

  return (
    <Modal open={props.open} onClose={props.onClose}>
      <div id={props.id} class={styles.ProfileQrCodeModal}>
        <div class={styles.header}>
          <div class={styles.userInfo}>
            <div class={styles.avatar}>
              <Avatar
                size="sm"
                user={props.profile}
              />
            </div>
            <div class={styles.details}>
              <div class={styles.name}>
                {authorName(props.profile)}
                <VerificationCheck user={props.profile} />
              </div>
              <div class={styles.verification} title={props.profile?.nip05}>
                <Show when={props.profile?.nip05}>
                  <span
                    class={styles.verifiedBy}
                    title={props.profile?.nip05}
                  >
                    {nip05Verification(props.profile)}
                  </span>
                </Show>
              </div>
            </div>
          </div>
          <button class={styles.close} onClick={props.onClose}>
          </button>
        </div>

        <div class={styles.qrCode}>
          <Tabs.Root>
            <Tabs.List class={styles.tabs}>
              <For each={profileData()}>
                {([key, info]) =>
                  <Show when={info.data}>
                    <Tabs.Trigger class={styles.tab} value={key} >
                    {info.title}
                    </Tabs.Trigger>
                  </Show>
                }
              </For>

              <Tabs.Indicator class={styles.tabIndicator} />
            </Tabs.List>

            <For each={profileData()}>
              {([key, info]) =>
                <Show when={info.data}>
                  <Tabs.Content class={styles.tabContent} value={key}>
                    <QrCode data={info.data} type={info.type} />
                  </Tabs.Content>
                </Show>
              }
            </For>
          </Tabs.Root>
        </div>

        <div class={styles.keys}>

          <For each={profileData()}>
            {([key, info]) =>
              <Show when={info.data}>
                <div class={styles.keyEntry}>
                  <div class={styles.label}>
                    {info.title}:
                  </div>
                  <div class={styles.value}>
                    <ButtonCopy
                      light={true}
                      copyValue={info.data}
                      labelBeforeIcon={true}
                      label={truncateNpub(info.data)}
                    />
                  </div>
                </div>
              </Show>
            }
          </For>
        </div>
      </div>
    </Modal>
  );
}

export default hookForDev(ProfileQrCodeModal);
