import { useIntl } from '@cookbook/solid-intl';
import { A } from '@solidjs/router';
import { Component, createEffect, createMemo, createSignal, For, lazy, Show } from 'solid-js';
import { NotificationType, notificationTypeTranslations, typeIcons } from '../../constants';
import { trimVerification } from '../../lib/profile';
import { truncateNpub } from '../../stores/profile';
import { PrimalNote, PrimalNotifUser, PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';

import styles from './NotificationItem.module.scss';

const iconRoot = '../../assets/icons/notifications';

type NotificationItemProps = {
  type: NotificationType,
  users?: PrimalNotifUser[],
  note?: PrimalNote,
  iconInfo?: string,
  iconTooltip?: string,
};

const uniqueifyUsers = (users: PrimalNotifUser[]) => {
  return users.reduce<PrimalNotifUser[]>((acc, u) => {
    const found = acc.find(a => a.id === u.id);
    return found ? acc : [...acc, u];
  }, []);
}

const NotificationItem: Component<NotificationItemProps> = (props) => {

  const intl = useIntl();

  const [typeIcon, setTypeIcon] = createSignal<string>('');

  const sortedUsers = createMemo(() => {
    if (!props.users || props.users.length === 0) {
      return [];
    }

    const users = uniqueifyUsers(props.users);


    return users.sort((a, b) => b.followers_count - a.followers_count);
  });

  const numberOfUsers = () => sortedUsers().length;

  const firstUserName = () => {
    const firstUser = sortedUsers()[0];

    if (!firstUser) {
      return '';
    }

    return firstUser.displayName ||
      firstUser.name ||
      truncateNpub(firstUser.npub);
  };

  const firstUserVerification = () => {
    const firstUser = sortedUsers()[0];

    if (!firstUser || !firstUser.nip05) {
      return null;
    }

    return trimVerification(firstUser.nip05);

  }

  const userName = (user: PrimalUser) => {
    return user.displayName ||
      user.name ||
      truncateNpub(user.npub);
  };

  const typeDescription = () => {

    return intl.formatMessage({
      id: `notifications.${props.type}`,
      defaultMessage: `{number, plural,
        =0 {}
        one {and # other}
        other {and # others}}
        ${notificationTypeTranslations[props.type]}`,
    }, {
      number: numberOfUsers() - 1,
    });

  }

  createEffect(() => {
    import(/* @vite-ignore */`${iconRoot}/${typeIcons[props.type]}`).
      then((icon) => {
        setTypeIcon(icon.default);
      });
  });

  return (
    <div class={styles.notifItem}>
      <div class={styles.notifType}>
        <img src={typeIcon()} alt="notification icon" />
        <div class={styles.iconInfo} title={props.iconTooltip}>
          {props.iconInfo}
        </div>
      </div>
      <div class={styles.notifContent}>
        <div class={styles.avatars}>
          <Show when={numberOfUsers() > 0}>
            <For each={sortedUsers()}>
              {(user) => (
                <A
                  href={`/profile/${user.npub}`} class={styles.avatar}
                  title={userName(user)}
                >
                  <Avatar src={user.picture} size="xs" />
                </A>
              )}
            </For>
          </Show>
        </div>
        <div class={styles.description}>
          <div class={styles.firstUser}>
            {firstUserName()}
            <Show when={firstUserVerification()}>
              <span class={styles.verifiedIcon} />
            </Show>
          </div>
          <div class={styles.restUsers}>{typeDescription()}</div>
        </div>
        <Show
          when={![NotificationType.NEW_USER_FOLLOWED_YOU, NotificationType.USER_UNFOLLOWED_YOU].includes(props.type)}
        >
          <div class={styles.reference}>
            {props.note && props.note.post.content}
          </div>
        </Show>
      </div>
    </div>
  );
}

export default NotificationItem;
