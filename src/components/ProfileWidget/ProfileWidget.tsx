import { Component, createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';

import styles from './ProfileWidget.module.scss';

import Branding from '../Branding/Branding';
import { Outlet } from '@solidjs/router';
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
        <div class={styles.userProfile}>
          <Avatar
            size="sm"
            src={activeUser()?.picture}
            verified={activeUser()?.nip05}
          />
          <div class={styles.userInfo}>
            <div class={styles.userName}>{activeUser()?.name}</div>
            <div class={styles.userVerification}>
              @{trimVerification(activeUser()?.nip05)}
            </div>
          </div>
          <div class={styles.contextMenu}>
            <div class={styles.contextIcon}></div>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default ProfileWidget;
