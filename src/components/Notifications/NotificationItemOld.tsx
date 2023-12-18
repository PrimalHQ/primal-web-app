import { useIntl } from '@cookbook/solid-intl';
import { A } from '@solidjs/router';
import { Component, createEffect, createSignal, Show } from 'solid-js';
import { NotificationType, notificationTypeNoteProps, notificationTypeUserProps } from '../../constants';
import { trimVerification } from '../../lib/profile';
import { userName } from '../../stores/profile';
import { PrimalNote, PrimalNotification, PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';

import styles from './NotificationItem.module.scss';

import userFollow from '../../assets/icons/notifications/user_followed.svg';
import userUnFollow from '../../assets/icons/notifications/user_unfollowed.svg';

import postZapped from '../../assets/icons/notifications/post_zapped.svg';
import postLiked from '../../assets/icons/notifications/post_liked.svg';
import postReposted from '../../assets/icons/notifications/post_reposted.svg';
import postReplied from '../../assets/icons/notifications/post_replied.svg';

import mention from '../../assets/icons/notifications/mention.svg';
import mentionedPost from '../../assets/icons/notifications/mentioned_post.svg';

import mentionZapped from '../../assets/icons/notifications/mention_zapped.svg';
import mentionLiked from '../../assets/icons/notifications/mention_liked.svg';
import mentionReposted from '../../assets/icons/notifications/mention_reposted.svg';
import mentionReplied from '../../assets/icons/notifications/mention_replied.svg';

import mentionedPostZapped from '../../assets/icons/notifications/mentioned_post_zapped.svg';
import mentionedPostLiked from '../../assets/icons/notifications/mentioned_post_liked.svg';
import mentionedPostReposted from '../../assets/icons/notifications/mentioned_post_reposted.svg';
import mentionedPostReplied from '../../assets/icons/notifications/mentioned_post_replied.svg';
import NotificationNote from '../Note/NotificationNote/NotificationNote';
import { truncateNumber } from '../../lib/notifications';
import { notificationsOld as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';

const typeIcons: Record<string, string> = {
  [NotificationType.NEW_USER_FOLLOWED_YOU]: userFollow,
  [NotificationType.USER_UNFOLLOWED_YOU]: userUnFollow,

  [NotificationType.YOUR_POST_WAS_ZAPPED]: postZapped,
  [NotificationType.YOUR_POST_WAS_LIKED]: postLiked,
  [NotificationType.YOUR_POST_WAS_REPOSTED]: postReposted,
  [NotificationType.YOUR_POST_WAS_REPLIED_TO]: postReplied,

  [NotificationType.YOU_WERE_MENTIONED_IN_POST]: mention,
  [NotificationType.YOUR_POST_WAS_MENTIONED_IN_POST]: mentionedPost,

  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED]: mentionZapped,
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_LIKED]: mentionLiked,
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED]: mentionReposted,
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO]: mentionReplied,

  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED]: mentionedPostZapped,
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED]: mentionedPostLiked,
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED]:mentionedPostReposted,
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO]: mentionedPostReplied,

}

type NotificationItemProps = {
  id?: string,
  notes: PrimalNote[],
  users: Record<string, PrimalUser>,
  userStats: Record<string, { followers_count: number }>,
  notification: PrimalNotification,
};

const NotificationItemOld: Component<NotificationItemProps> = (props) => {

  const intl = useIntl();

  const [typeIcon, setTypeIcon] = createSignal<string>('');

  const type = () => props.notification.type

  const note = () => {
    const prop = notificationTypeNoteProps[type()];
    // @ts-ignore
    const id = props.notification[prop];
    return props.notes.find(n => n.post.id === id)
  };

  const user = () => {
    const prop = notificationTypeUserProps[type()];
    // @ts-ignore
    const id = props.notification[prop];
    return props.users[`${id}`];
  };

  const typeDescription = () => {
    return intl.formatMessage(t[type()]);

  }

  createEffect(() => {
    setTypeIcon(typeIcons[type()])
  });


  const isReply = () => {
    return [
      NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO,
      NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO,
      NotificationType.YOUR_POST_WAS_REPLIED_TO,
    ].includes(type())
  };

  const isZapType = () => {
    return [
      NotificationType.YOUR_POST_WAS_ZAPPED,
      NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED,
      NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED,
    ].includes(type())
  };


  return (
    <div id={props.id} class={styles.notifItem}>
      <div class={styles.notifType}>
        <img src={typeIcon()} alt="notification icon" />
        <Show when={isZapType()}>
          <div class={styles.iconInfo} title={`${props.notification.satszapped} sats`}>
            {truncateNumber(props.notification.satszapped || 0)}
          </div>
        </Show>
      </div>
      <div class={styles.notifContent}>
        <div class={styles.avatars}>
          <A
            href={`/p/${user()?.npub}`} class={styles.avatar}
            title={userName(user())}
          >
            <Avatar user={user()} size="xs" />
          </A>
        </div>
        <div class={styles.description}>
          <div class={styles.firstUser}>
          <span class={styles.firstUserName}>{userName(user())}</span>
            <Show when={trimVerification(user()?.nip05)}>
              <span class={styles.verifiedIcon} />
            </Show>
          </div>
          <div class={styles.restUsers}>{typeDescription()}</div>
        </div>
        <Show
          when={![NotificationType.NEW_USER_FOLLOWED_YOU, NotificationType.USER_UNFOLLOWED_YOU].includes(type())}
        >
          <div class={styles.reference}>
            <Show when={note()}>
              <NotificationNote
                // @ts-ignore
                note={note()}
              />
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default hookForDev(NotificationItemOld);
