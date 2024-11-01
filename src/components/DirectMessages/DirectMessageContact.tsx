import { Component, createEffect, Show } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './DirectMessages.module.scss';
import Avatar from '../Avatar/Avatar';
import { nip05Verification, userName } from '../../stores/profile';
import { DMContact } from '../../megaFeeds';
import { date } from '../../lib/dates';

const DirectMessageContact: Component<{
  id?: string,
  dmContact: DMContact,
  isSelected?: boolean,
  onSelect?: (pubkey: string) => void,
}> = (props) => {

  const user = () => props.dmContact.user;
  const contactInfo = () => props.dmContact.dmInfo;
  const count = () => props.dmContact.dmInfo.cnt;

  const now = () => Math.floor((new Date()).getTime() / 1000);

  return (
    <button
      class={`${styles.directMessageContact} ${props.isSelected ? styles.selected : ''}`}
      onClick={() => props.onSelect && props.onSelect(user().pubkey)}
      data-user={user().pubkey}
    >
      <Avatar user={user()} size="md" />
      <div class={styles.senderInfo}>
        <div class={styles.firstLine}>
          <div class={styles.senderName}>
            {userName(user())}
          </div>
          <Show when={contactInfo().latest_at > 0}>
            <div class={styles.dotSeparator}></div>
            <div class={styles.lastMessageTime}>
              {date(contactInfo().latest_at || 0,'narrow', now()).label}
            </div>
          </Show>
        </div>
        <div class={styles.secondLine}>
          {nip05Verification(user())}
        </div>
      </div>
      <Show when={count() > 0}>
        <div class={styles.senderBubble}>
          {count()}
        </div>
      </Show>
    </button>
  )
}

export default hookForDev(DirectMessageContact);
