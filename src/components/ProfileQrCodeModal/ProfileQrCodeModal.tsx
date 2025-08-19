import { useIntl } from '@cookbook/solid-intl';
import { Tabs } from '@kobalte/core/tabs';
import { Component, For, Show } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { hexToNpub } from '../../lib/keys';
import { authorName, nip05Verification, truncateNpub } from '../../stores/profile';
import { profile as tProfile } from '../../translations';
import { PrimalUser } from '../../types/primal';
import AdvancedSearchDialog from '../AdvancedSearch/AdvancedSearchDialog';
import Avatar from '../Avatar/Avatar';
import ButtonCopy from '../Buttons/ButtonCopy';
import Modal from '../Modal/Modal';
import QrCode from '../QrCode/QrCode';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './ProfileQrCodeModal.module.scss';

const ProfileQrCodeModal: Component<{
  id?: string,
  open?: boolean,
  profile: PrimalUser,
  onClose?: () => void,
}> = (props) => {

  const intl = useIntl();

  const profileData = () => Object.entries({
    pubkey: {
      title: intl.formatMessage(tProfile.qrModal.pubkey),
      data: `nostr:${props.profile?.npub || hexToNpub(props.profile?.pubkey)}`,
      dataLabel: props.profile?.npub || hexToNpub(props.profile?.pubkey) || '',
      type: 'nostr',
      test: props.profile?.npub || hexToNpub(props.profile?.pubkey),
    },
    lnAddress: {
      title: intl.formatMessage(tProfile.qrModal.ln),
      data: `lightning:${props.profile?.lud16 || props.profile?.lud06}`,
      dataLabel: props.profile?.lud16 || props.profile?.lud06 || '',
      type: 'lightning',
      test: props.profile?.lud16 || props.profile?.lud06,
    }
  });

  return (
    <AdvancedSearchDialog
      open={props.open}
      setOpen={(isOpen: boolean) => !isOpen && props.onClose && props.onClose()}
      title={
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
      }
      triggerClass={styles.hidden}
    >
      <div id={props.id} class={styles.ProfileQrCodeModal}>
        <div class={styles.qrCode}>
          <Tabs>
            <Tabs.List class={styles.tabs}>
              <For each={profileData()}>
                {([key, info]) =>
                  <Show when={info.test}>
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
                <Show when={info.test}>
                  <Tabs.Content class={styles.tabContent} value={key}>
                    <QrCode data={info.data} type={info.type} />
                  </Tabs.Content>
                </Show>
              }
            </For>
          </Tabs>
        </div>

        <div class={styles.keys}>

          <For each={profileData()}>
            {([key, info]) =>
              <Show when={info.test}>
                <div class={styles.keyEntry}>
                  <div class={styles.label}>
                    {info.title}:
                  </div>
                  <div class={styles.value}>
                    <ButtonCopy
                      light={true}
                      copyValue={info.dataLabel}
                      labelBeforeIcon={true}
                      label={truncateNpub(info.dataLabel)}
                    />
                  </div>
                </div>
              </Show>
            }
          </For>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default hookForDev(ProfileQrCodeModal);
