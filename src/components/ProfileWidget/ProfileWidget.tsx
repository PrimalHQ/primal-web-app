import { Component, Show } from 'solid-js';
import { A } from '@solidjs/router';
import Avatar from '../Avatar/Avatar';
import { trimVerification } from '../../lib/profile';

import styles from './ProfileWidget.module.scss';
import { hookForDev } from '../../lib/devTools';
import { userName } from '../../stores/profile';
import { useAppContext } from '../../contexts/AppContext';
import { accountStore, hasPublicKey } from '../../stores/accountStore';

const ProfileWidget: Component<{ id?: string, hideName?: boolean }> = (props) => {
  const app = useAppContext();
  const activeUser = () => accountStore.activeUser;

  return (
    <div id={props.id}>
      <Show when={hasPublicKey()}>
        <A
          href={app?.actions.profileLink(accountStore.publicKey) || ''}
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
