import { Component, Show } from 'solid-js';
import { A } from '@solidjs/router';
import Avatar from '../Avatar/Avatar';
import { useAccountContext } from '../../contexts/AccountContext';
import { trimVerification } from '../../lib/profile';
import { hexToNpub } from '../../lib/keys';

import styles from './ProfileWidget.module.scss';
import { hookForDev } from '../../lib/devTools';
import { userName } from '../../stores/profile';

const ProfileWidget: Component<{ id?: string }> = (props) => {

  const account = useAccountContext()

  const activeUser = () => account?.activeUser;

  return (
    <div id={props.id}>
      <Show when={account?.hasPublicKey()}>
        <A href="/profile" class={styles.userProfile}>
          <div class={styles.avatar}>
            <Avatar
              size="vs"
              user={activeUser()}
            />
          </div>
          <div class={styles.userInfo}>
            <div class={styles.userName}>{userName(activeUser())}</div>
            <div class={styles.userVerification}>
              {trimVerification(activeUser()?.nip05)[1]}
            </div>
          </div>
          <div class={styles.background}></div>
        </A>
      </Show>
    </div>
  );
}

export default hookForDev(ProfileWidget);
