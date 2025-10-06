import { useIntl } from '@cookbook/solid-intl';
import { A } from '@solidjs/router';
import { Component, createEffect, createSignal, Match, Show, Switch } from 'solid-js';
import { mentionedNotifTypes, NotificationType, notificationTypeNoteProps, notificationTypeUserProps } from '../../constants';
import { trimVerification } from '../../lib/profile';
import { userName } from '../../stores/profile';
import { PrimalArticle, PrimalNote, PrimalNotification, PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';

import styles from './NotificationItem.module.scss';

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
import {
  notificationIcons,
  notificationIconsLight,
  postLiked,
  postLikedLight,
  reactionLikes,
} from './notificationAssets';

const typeIcons = notificationIcons;


const typeIconsLight = notificationIconsLight;


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

const likes = reactionLikes;

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
      <div class={`${styles.notifType} ${props.notification.type === NotificationType.YOUR_POST_WAS_REPLIED_TO ? styles.replyAvatar : ''}`}>
        <Switch fallback={
          <img src={typeIcon()} alt="notification icon" loading="lazy" decoding="async" />
        }>
          <Match when={isLike() && reactionIcon() === ''}>
            <img src={isLight() ? postLikedLight : postLiked} alt="notification icon" loading="lazy" decoding="async" />
          </Match>

          <Match when={props.notification.type === NotificationType.YOUR_POST_WAS_LIKED}>
            <div>{reactionIcon()}</div>
          </Match>

          <Match when={props.notification.type === NotificationType.YOUR_POST_WAS_REPLIED_TO}>
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

        <Show when={[NotificationType.LIVE_EVENT_STARTED].includes(props.notification.type)}>
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
            when={props.notification.type !== NotificationType.YOUR_POST_WAS_REPLIED_TO}
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
          <Match when={[NotificationType.LIVE_EVENT_STARTED].includes(type())}>
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
