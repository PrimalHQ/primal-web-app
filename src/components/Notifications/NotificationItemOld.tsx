import { useIntl } from '@cookbook/solid-intl';
import { A } from '@solidjs/router';
import { Component, createEffect, createSignal, Show } from 'solid-js';
import { NotificationType, notificationTypeNoteProps, notificationTypeUserProps } from '../../constants';
import { trimVerification } from '../../lib/profile';
import { userName } from '../../stores/profile';
import { PrimalArticle, PrimalNote, PrimalNotification, PrimalUser } from '../../types/primal';
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

import postHighlighted from '../../assets/icons/notifications/post_highlighted.svg';
import postBookmarked from '../../assets/icons/notifications/post_bookmarked.svg';
import postReacted from '../../assets/icons/notifications/post_reacted.svg';

import NotificationNote from '../Note/NotificationNote/NotificationNote';
import { truncateNumber } from '../../lib/notifications';
import { notificationsOld as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import Note from '../Note/Note';
import { useAppContext } from '../../contexts/AppContext';
import ArticlePreview from '../ArticlePreview/ArticlePreview';
import ArticleCompactPreview from '../ArticlePreview/ArticleCompactPreview';
import ArticleHighlight from '../ArticleHighlight/ArticleHighlight';

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

  [NotificationType.YOUR_POST_WAS_HIGHLIGHTED]: postHighlighted,
  [NotificationType.YOUR_POST_WAS_BOOKMARKED]: postBookmarked,
  [NotificationType.YOUR_POST_HAD_REACTION]: postReacted,

}

type NotificationItemProps = {
  id?: string,
  notes: PrimalNote[],
  reads: PrimalArticle[],
  highlights: any[],
  users: Record<string, PrimalUser>,
  userStats: Record<string, { followers_count: number }>,
  notification: PrimalNotification,
};

export const likes = [
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🤎",
  "🖤",
  "🤍",
  "💖",
  "💗",
  "💓",
  "💞",
  "💕",
  "💝",
  "💟",
  "❣️",
  "💌",
  "💘",
  "💑",
  "🤙",
  "+",
];

const NotificationItemOld: Component<NotificationItemProps> = (props) => {

  const intl = useIntl();
  const app = useAppContext();

  const [typeIcon, setTypeIcon] = createSignal<string>('');
  const [reactionIcon, setReactionIcon] = createSignal<string>('');
  const [isLike, setIsLike] = createSignal(false);

  const type = () => props.notification.type

  const note = () => {
    const prop = notificationTypeNoteProps[type()];
    // @ts-ignore
    const id = props.notification[prop];
    return props.notes.find(n => n.post.id === id)
  };

  const article = () => {
    const prop = notificationTypeNoteProps[type()];
    // @ts-ignore
    const id = props.notification[prop];
    return props.reads.find(n => n.id === id)
  };

  const highlight = () => {
    const prop = notificationTypeNoteProps[type()];
    // @ts-ignore
    const id = props.notification.highlight;
    return props.highlights.find(n => n.id === id)
  };

  const user = () => {
    const prop = notificationTypeUserProps[type()];
    // @ts-ignore
    const id = props.notification[prop];
    return props.users[`${id}`];
  };

  const typeDescription = () => {
    if (type() === NotificationType.YOUR_POST_WAS_LIKED && !isLike()) {
      return intl.formatMessage(t[NotificationType.YOUR_POST_HAD_REACTION]);
    }
    return intl.formatMessage(t[type()]);

  }

  createEffect(() => {
    const t = type();
    let icon = typeIcons[t];

    if (t !== NotificationType.YOUR_POST_WAS_LIKED) {
      setTypeIcon(icon);
      return;
    }

    const r = props.notification.reaction;

    if (!r) {
      setReactionIcon(likes[0]);
      setIsLike(true);
      return;
    }

    const e = likes.find(l => l === r);

    if (e) {
      setReactionIcon(e !== '+' ? e : likes[0]);
      setIsLike(true);
      return;
    }

    setReactionIcon(r);
    setIsLike(false);

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
        <Show
          when={props.notification.type === NotificationType.YOUR_POST_WAS_LIKED}
          fallback={
            <img src={typeIcon()} alt="notification icon" />
          }
        >
          <div>{reactionIcon()}</div>
        </Show>
        <Show when={isZapType()}>
          <div class={styles.iconInfo} title={`${props.notification.satszapped} sats`}>
            {truncateNumber(props.notification.satszapped || 0)}
          </div>
        </Show>
      </div>
      <div class={styles.notifContent}>
        <div class={styles.avatars}>
          <A
            href={app?.actions.profileLink(user()?.npub) || ''} class={styles.avatar}
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
          when={[NotificationType.YOUR_POST_WAS_HIGHLIGHTED].includes(type())}
        >
          <div class={styles.reference}>
            <Show when={article()}>
              <ArticleHighlight
                highlight={highlight()}
              />
              <ArticleCompactPreview
                article={article()}
                hideFooter={true}
                hideContext={true}
                bordered={true}
                noLinks={true}
              />
            </Show>
          </div>
        </Show>
        <Show
          when={![NotificationType.NEW_USER_FOLLOWED_YOU, NotificationType.USER_UNFOLLOWED_YOU].includes(type())}
        >
          <div class={styles.reference}>
            <Show when={note()}>
              <Note
                // @ts-ignore
                note={note()}
                noteType="notification"
              />
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default hookForDev(NotificationItemOld);
