import { Component, For, Show } from 'solid-js';
import {
  PrimalNote,
  PrimalUser
} from '../../types/primal';

import styles from './ProfileContact.module.scss';
import SmallNote from '../SmallNote/SmallNote';
import { useIntl } from '@cookbook/solid-intl';
import { nip05Verification, userName } from '../../stores/profile';
import { profile as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import Avatar from '../Avatar/Avatar';
import FollowButton from '../FollowButton/FollowButton';
import { A } from '@solidjs/router';
import { humanizeNumber } from '../../lib/stats';


const ProfileContact: Component<{
  profile: PrimalUser | undefined,
  profileStats: any,
  postAction?: (remove: boolean, pubkey: string) => void,
  id?: string,
}> = (props) => {

  const intl = useIntl();

  return (
    <div id={props.id} class={styles.profileContact}>
      <A href={`/p/${props.profile?.npub}`}>
        <Avatar src={props.profile?.picture} size="sm" />
      </A>

      <A href={`/p/${props.profile?.npub}`} class={styles.info}>
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
      </A>

      <div class={styles.action}>
        <FollowButton person={props.profile} postAction={props.postAction} />
      </div>
    </div>
  );
}

export default hookForDev(ProfileContact);
