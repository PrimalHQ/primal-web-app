import { useIntl } from '@cookbook/solid-intl';
import { A } from '@solidjs/router';
import { Component, createEffect, createSignal, Match, Show, Switch } from 'solid-js';
import { mentionedNotifTypes, NotificationType, notificationTypeNoteProps, notificationTypeUserProps } from '../../constants';
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

import userFollowLight from '../../assets/icons/notifications/light/user_followed.svg';
import userUnFollowLight from '../../assets/icons/notifications/light/user_unfollowed.svg';
import postZappedLight from '../../assets/icons/notifications/light/post_zapped.svg';
import postLikedLight from '../../assets/icons/notifications/light/post_liked.svg';
import postRepostedLight from '../../assets/icons/notifications/light/post_reposted.svg';
import postRepliedLight from '../../assets/icons/notifications/light/post_replied.svg';
import mentionLight from '../../assets/icons/notifications/light/mention.svg';
import mentionedPostLight from '../../assets/icons/notifications/light/mentioned_post.svg';
import mentionZappedLight from '../../assets/icons/notifications/light/mention_zapped.svg';
import mentionLikedLight from '../../assets/icons/notifications/light/mention_liked.svg';
import mentionRepostedLight from '../../assets/icons/notifications/light/mention_reposted.svg';
import mentionRepliedLight from '../../assets/icons/notifications/light/mention_replied.svg';
import mentionedPostZappedLight from '../../assets/icons/notifications/light/mentioned_post_zapped.svg';
import mentionedPostLikedLight from '../../assets/icons/notifications/light/mentioned_post_liked.svg';
import mentionedPostRepostedLight from '../../assets/icons/notifications/light/mentioned_post_reposted.svg';
import mentionedPostRepliedLight from '../../assets/icons/notifications/light/mentioned_post_replied.svg';
import postHighlightedLight from '../../assets/icons/notifications/light/post_highlighted.svg';
import postBookmarkedLight from '../../assets/icons/notifications/light/post_bookmarked.svg';
import postReactedLight from '../../assets/icons/notifications/light/post_reacted.svg';

import liveEventStarted from '../../assets/icons/notifications/live.svg';

import NotificationNote from '../Note/NotificationNote/NotificationNote';
import { truncateNumber } from '../../lib/notifications';
import { notificationsOld as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import Note from '../Note/Note';
import { useAppContext } from '../../contexts/AppContext';
import ArticlePreview from '../ArticlePreview/ArticlePreview';
import ArticleCompactPreview from '../ArticlePreview/ArticleCompactPreview';
import ArticleHighlight from '../ArticleHighlight/ArticleHighlight';
import VerificationCheck from '../VerificationCheck/VerificationCheck';
import { date } from '../../lib/dates';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { StreamingData } from '../../lib/streaming';

const typeIcons: Record<string, string> = {
  [NotificationType.NEW_USER_FOLLOWED_YOU]: userFollow,
  [NotificationType.USER_UNFOLLOWED_YOU]: userUnFollow,

  [NotificationType.YOUR_POST_WAS_ZAPPED]: postZapped,
  [NotificationType.YOUR_POST_WAS_LIKED]: postLiked,
  [NotificationType.YOUR_POST_WAS_REPOSTED]: postReposted,
  [NotificationType.YOUR_POST_WAS_REPLIED_TO]: postReplied,

  [NotificationType.REPLY_TO_REPLY]: postReplied,

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

  [NotificationType.LIVE_EVENT_HAPPENING]: liveEventStarted,
}


const typeIconsLight: Record<string, string> = {
  [NotificationType.NEW_USER_FOLLOWED_YOU]: userFollowLight,
  [NotificationType.USER_UNFOLLOWED_YOU]: userUnFollowLight,

  [NotificationType.YOUR_POST_WAS_ZAPPED]: postZappedLight,
  [NotificationType.YOUR_POST_WAS_LIKED]: postLikedLight,
  [NotificationType.YOUR_POST_WAS_REPOSTED]: postRepostedLight,
  [NotificationType.YOUR_POST_WAS_REPLIED_TO]: postRepliedLight,

  [NotificationType.REPLY_TO_REPLY]: postReplied,

  [NotificationType.YOU_WERE_MENTIONED_IN_POST]: mentionLight,
  [NotificationType.YOUR_POST_WAS_MENTIONED_IN_POST]: mentionedPostLight,

  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED]: mentionZappedLight,
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_LIKED]: mentionLikedLight,
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED]: mentionRepostedLight,
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO]: mentionRepliedLight,

  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED]: mentionedPostZappedLight,
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED]: mentionedPostLikedLight,
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED]:mentionedPostRepostedLight,
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO]: mentionedPostRepliedLight,

  [NotificationType.YOUR_POST_WAS_HIGHLIGHTED]: postHighlightedLight,
  [NotificationType.YOUR_POST_WAS_BOOKMARKED]: postBookmarkedLight,
  [NotificationType.YOUR_POST_HAD_REACTION]: postReactedLight,

  [NotificationType.LIVE_EVENT_HAPPENING]: liveEventStarted,
}


type NotificationItemProps = {
  id?: string,
  notes: PrimalNote[],
  reads: PrimalArticle[],
  highlights: any[],
  users: Record<string, PrimalUser>,
  streams: StreamingData[],
  userStats: Record<string, { followers_count: number }>,
  notification: PrimalNotification,
};

export const likes = [
  "🤙",
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
];

const NotificationItemOld: Component<NotificationItemProps> = (props) => {

  const intl = useIntl();
  const app = useAppContext();
  const settings = useSettingsContext();

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

  const read = () => {
    const prop = notificationTypeNoteProps[type()];
    // @ts-ignore
    const id = props.notification[prop];
    return props.reads.find(n => n.id === id)
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
    let label = intl.formatMessage(t[type()]);

    if ([
      NotificationType.NEW_USER_FOLLOWED_YOU,
      NotificationType.USER_UNFOLLOWED_YOU,
      NotificationType.REPLY_TO_REPLY,
      ...mentionedNotifTypes,
    ]. includes(type())) {
      return label;
    }

    const reference = note() ? 'note' : 'article';

    if (type() === NotificationType.YOUR_POST_WAS_LIKED && !isLike()) {
      return `${intl.formatMessage(t[NotificationType.YOUR_POST_HAD_REACTION])} ${reference}`;
    }

    if (type() === NotificationType.YOUR_POST_WAS_ZAPPED && props.notification.satszapped) {
      const zapMessage = intl.formatMessage(t[NotificationType.YOUR_POST_WAS_ZAPPED]);
      return `${zapMessage} ${reference} for a total of ${truncateNumber(props.notification.satszapped)} sats`;
    }

    return `${label} ${reference}`
  }

  const isLight = () => {
    return ['sunrise', 'ice'].includes(settings?.theme || 'sunset');
  }

  createEffect(() => {
    const t = type();
    let icon = isLight() ? typeIconsLight[t] : typeIcons[t];

    if (t !== NotificationType.YOUR_POST_WAS_LIKED) {
      setTypeIcon(icon);
      return;
    }

    const r = props.notification.reaction || '+';

    if (r === '+') {
      setReactionIcon('');
      setIsLike(true);
      return;
    }

    const e = likes.find(l => l === r);

    if (e) {
      setReactionIcon(e);
      setIsLike(true);
      return;
    }

    // Emoji not found
    if (r.startsWith(':') && r.endsWith(':')) {
      setReactionIcon(likes[0]);
      setIsLike(false);
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
      NotificationType.REPLY_TO_REPLY,
    ].includes(type())
  };

  const isZapType = () => {
    return [
      NotificationType.YOUR_POST_WAS_ZAPPED,
      NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED,
      NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED,
    ].includes(type())
  };

  const time = () => {
    const tm = props.notification?.created_at;

    if (!tm) return '';

    return date(tm, 'narrow').label;

  }

  const stream = () => {
    const identifier = (props.notification.coordinate || '').split(':')[2];
    return props.streams.find(s => identifier === s.id);
  }


  return (
    <div id={props.id} class={styles.notifItem} data-notif={props.notification.id}>
      <div class={`${styles.notifType} ${[NotificationType.YOUR_POST_WAS_REPLIED_TO, NotificationType.REPLY_TO_REPLY].includes(props.notification.type) ? styles.replyAvatar : ''}`}>
        <Switch fallback={
          <img src={typeIcon()} alt="notification icon" />
        }>
          <Match when={isLike() && reactionIcon() === ''}>
            <img src={postLiked} alt="notification icon" />
          </Match>

          <Match when={props.notification.type === NotificationType.YOUR_POST_WAS_LIKED}>
            <div>{reactionIcon()}</div>
          </Match>

          <Match when={[NotificationType.YOUR_POST_WAS_REPLIED_TO, NotificationType.REPLY_TO_REPLY].includes(props.notification.type)}>
            <A
              href={app?.actions.profileLink(user()?.npub) || ''} class={styles.avatar}
              title={userName(user())}
            >
              <Avatar user={user()} size="vvs" />
            </A>
          </Match>
        </Switch>

        <Show when={isZapType()}>
          <div class={styles.iconZapInfo} title={`${props.notification.satszapped} sats`}>
            {truncateNumber(props.notification.satszapped || 0)}
          </div>
        </Show>

        <Show when={[NotificationType.LIVE_EVENT_HAPPENING].includes(props.notification.type)}>
          <div class={styles.iconLiveInfo}>
            LIVE
          </div>
        </Show>
      </div>
      <div class={styles.notifContent}>
        <div class={styles.time}>
          {time()}
        </div>
        <div class={styles.notifHeader}>
          <Show
            when={![NotificationType.YOUR_POST_WAS_REPLIED_TO, NotificationType.REPLY_TO_REPLY].includes(props.notification.type)}
          >
            <div class={styles.avatars}>
              <A
                class={styles.avatar}
                href={app?.actions.profileLink(user()?.npub) || ''}
                title={userName(user())}
              >
                <Avatar user={user()} size="vvs" />
              </A>
            </div>
          </Show>

          <div class={styles.description}>
            <div class={styles.firstUser}>
              <span class={styles.firstUserName}>{userName(user())}</span>
              <div class={styles.verification}>
                <VerificationCheck user={user()} />
              </div>
            </div>
            <div class={styles.restUsers}>{typeDescription()}</div>
          </div>
        </div>
        <Switch>
          <Match when={[NotificationType.LIVE_EVENT_HAPPENING].includes(type())}>
            <div class={styles.liveEventNotif}>
              <div class={styles.liveTitle}>
                {stream()?.title}
              </div>
              <div class={styles.liveStatus}>
                <Show when={stream()?.status === 'live'}>
                  <div class={styles.liveDotStatus}>
                    <div class={styles.liveDotIcon}></div>
                    <div class={styles.liveDotCaption}>LIVE</div>
                  </div>
                </Show>
                <div class={styles.info}>
                  <Show
                    when={stream()?.status === 'live'}
                    fallback={<>Stream ended {date(stream()?.starts || 0).label} ago</>}
                  >
                    Started {date(stream()?.starts || 0).label} ago
                  </Show>
                  <div class={styles.participantsIcon}></div>
                  <div>{stream()?.currentParticipants || 0}</div>
                </div>
              </div>
            </div>
          </Match>
          <Match
            when={[NotificationType.YOUR_POST_WAS_HIGHLIGHTED].includes(type())}
          >
            <div class={styles.reference}>
              <Show when={article()}>
                <ArticleHighlight
                  highlight={highlight()}
                />
                <ArticlePreview
                  article={article()}
                  hideFooter={false}
                  hideContext={true}
                  bordered={false}
                  noLinks={true}
                  notif={true}
                />
              </Show>
            </div>
          </Match>

          <Match
            when={
              ![
                NotificationType.NEW_USER_FOLLOWED_YOU,
                NotificationType.USER_UNFOLLOWED_YOU,
              ].includes(type()) &&
              note()
            }
          >
            <div class={styles.reference}>
              <Note
                // @ts-ignore
                note={note()}
                noteType="notification"
              />
            </div>
          </Match>

          <Match
            when={
              ![
                NotificationType.NEW_USER_FOLLOWED_YOU,
                NotificationType.USER_UNFOLLOWED_YOU,
              ].includes(type()) &&
              read()
            }
          >
            <div class={styles.reference}>
              <ArticlePreview
                article={read()}
                hideFooter={false}
                hideContext={true}
                bordered={false}
                noLinks={true}
                notif={true}
              />
            </div>
          </Match>
        </Switch>
      </div>
    </div>
  );
}

export default hookForDev(NotificationItemOld);
