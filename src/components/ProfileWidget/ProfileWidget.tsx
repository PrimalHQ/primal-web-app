import { Component, createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';

import styles from './ProfileWidget.module.scss';

import Branding from '../Branding/Branding';
import { A, Outlet } from '@solidjs/router';
import Search from '../Search/Search';
import NavMenu from '../NavMenu/NavMenu';
import Avatar from '../Avatar/Avatar';
import { useFeedContext } from '../../contexts/FeedContext';
import { trimVerification } from '../../lib/profile';

const ProfileWidget: Component = () => {

  const context = useFeedContext()

  const activeUser = () => context?.data.activeUser;

  return (
    <div>
      <Show when={activeUser()}>
        <A href="/profile" class={styles.userProfile}>
          <Avatar
            size="vs"
            src={activeUser()?.picture}
            verified={activeUser()?.nip05}
          />
          <div class={styles.userInfo}>
            <div class={styles.userName}>{activeUser()?.name}</div>
            <div class={styles.userVerification}>
              @{trimVerification(activeUser()?.nip05)}
            </div>
          </div>
        </A>
      </Show>
    </div>
  );
}

export default ProfileWidget;
