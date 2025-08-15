import { Component, Show } from 'solid-js';
import { A } from '@solidjs/router';
import Avatar from '../Avatar/Avatar';
import { useAccountContext } from '../../contexts/AccountContext';
import { trimVerification } from '../../lib/profile';
import { hexToNpub } from '../../lib/keys';

import styles from './ProfileWidget.module.scss';
import { hookForDev } from '../../lib/devTools';
import { userName } from '../../stores/profile';
import { useAppContext } from '../../contexts/AppContext';

const ProfileWidget: Component<{ id?: string, hideName?: boolean }> = (props) => {

  const account = useAccountContext();
  const app = useAppContext();

  const activeUser = () => account?.activeUser;

  return (
    <div id={props.id}>
      <Show when={account?.hasPublicKey()}>
        <A
          href={app?.actions.profileLink(account?.publicKey) || ''}
          class={`${styles.userProfile} ${props.hideName ? styles.hiddenName : ''}`}
        >
          <div class={styles.avatar}>
            <Avatar
              size="vvs"
              user={activeUser()}
              showCheck={false}
            />
          </div>
          <Show when={!props.hideName}>
            <div class={styles.userInfo}>
              <div class={styles.userName}>{userName(activeUser())}</div>
              <div class={styles.userVerification}>
                {trimVerification(activeUser()?.nip05)[1]}
              </div>
            </div>
          </Show>
        </A>
      </Show>
    </div>
  );
}

export default hookForDev(ProfileWidget);
