import { Component, Show } from 'solid-js';
import {
  PrimalUser
} from '../../types/primal';

import styles from './ProfileContact.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { nip05Verification, userName } from '../../stores/profile';
import { profile as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import Avatar from '../Avatar/Avatar';
import FollowButton from '../FollowButton/FollowButton';
import { A } from '@solidjs/router';
import { humanizeNumber } from '../../lib/stats';
import { useAppContext } from '../../contexts/AppContext';
import { accountStore } from '../../stores/accountStore';


const ProfileContact: Component<{
  profile: PrimalUser | undefined,
  profileStats: any,
  light?: boolean,
  postAction?: (remove: boolean, pubkey: string) => void,
  id?: string,
}> = (props) => {

  const intl = useIntl();
  const app = useAppContext();

  return (
    <div id={props.id} class={styles.profileContact}>
      <A href={app?.actions.profileLink(props.profile?.npub) || ''} class={styles.info}>
        <div class={styles.personal}>
          <Avatar src={props.profile?.picture} size="sm" />

          <div class={styles.profileInfo}>
            <div class={styles.name}>{userName(props.profile)}</div>
            <div class={styles.nip05}>
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
      </A>
      <div class={styles.action}>
        <Show when={props.profileStats}>
          <div class={styles.stats}>
            <div class={styles.number}>
              {humanizeNumber(props.profileStats)}
            </div>
            <div class={styles.label}>
              {intl.formatMessage(t.stats.followers)}
            </div>
          </div>
        </Show>
        <Show
          when={accountStore.publicKey !== props.profile?.pubkey || !accountStore.following.includes(props.profile?.pubkey || '')}
          fallback={<div class={styles.placeholderDiv}></div>}
        >
          <FollowButton person={props.profile} postAction={props.postAction} light={props.light} />
        </Show>
      </div>
    </div>
  );
}

export default hookForDev(ProfileContact);
