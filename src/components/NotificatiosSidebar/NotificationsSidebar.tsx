import { useIntl } from '@cookbook/solid-intl';
import { Component, For, Show } from 'solid-js';
import { NotificationType } from '../../constants';
import { truncateNumber } from '../../lib/notifications';
import { PrimalNotification, PrimalNotifUser, SortedNotifications } from '../../types/primal';
import { notificationsSidebar as t } from '../../translations';

import styles from './NotificationsSidebar.module.scss';
import { hookForDev } from '../../lib/devTools';

const uniqueifyUsers = (users: PrimalNotifUser[]) => {
  return users.reduce<PrimalNotifUser[]>((acc, u) => {
    const found = acc.find(a => a.id === u.id);
    return found ? acc : [...acc, u];
  }, []);
}

const NotificationsSidebar: Component<{
  id?: string,
  notifications: SortedNotifications,
  getUsers: (notifs: PrimalNotification[], type: NotificationType) => PrimalNotifUser[],
}> = (props) => {

  const intl = useIntl();

  const follows = () => {
    const followNotifs = props.notifications[NotificationType.NEW_USER_FOLLOWED_YOU] || [];
    const unffolowNotifs = props.notifications[NotificationType.USER_UNFOLLOWED_YOU] || [];

    const followers = props.getUsers(followNotifs, NotificationType.USER_UNFOLLOWED_YOU);
    const lost = props.getUsers(unffolowNotifs, NotificationType.USER_UNFOLLOWED_YOU);

    return [uniqueifyUsers(followers).length, uniqueifyUsers(lost).length];
  };

  const mentions = () => {
    const myMentionNotifs = props.notifications[NotificationType.YOU_WERE_MENTIONED_IN_POST] || [];
    const myPostMentionNotifs = props.notifications[NotificationType.YOUR_POST_WAS_MENTIONED_IN_POST] || [];

    return [myMentionNotifs.length, myPostMentionNotifs.length];
  };

  const zaps = () => {
    const zapNotifs = props.notifications[NotificationType.YOUR_POST_WAS_ZAPPED] || [];

    const sats = zapNotifs.reduce((acc, n) => {
      return n.satszapped ? acc + n.satszapped : acc;
    }, 0);

    return [zapNotifs.length, sats];
  };

  const activity = () => {
    let replyNotifs = props.notifications[NotificationType.YOUR_POST_WAS_REPLIED_TO] || [];
    replyNotifs = [...replyNotifs, ...(props.notifications[NotificationType.REPLY_TO_REPLY] || [])];

    const repostNotifs = props.notifications[NotificationType.YOUR_POST_WAS_REPOSTED] || [];
    const likeNotifs = props.notifications[NotificationType.YOUR_POST_WAS_LIKED] || [];

    return [replyNotifs.length, repostNotifs.length, likeNotifs.length];
  };

  const otherNotifications = () => {
    const zapedMentionPostNotifs = props.notifications[NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED] || [];
    const replyMentionPostNotifs = props.notifications[NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_LIKED] || [];
    const repostMentionPostNotifs = props.notifications[NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED] || [];
    const likeMentionPostNotifs = props.notifications[NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO] || [];

    const zapedPostMentionPostNotifs = props.notifications[NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED] || [];
    const replyPostMentionPostNotifs = props.notifications[NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED] || [];
    const repostPostMentionPostNotifs = props.notifications[NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED] || [];
    const likePostMentionPostNotifs = props.notifications[NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO] || [];

    return [
      zapedMentionPostNotifs.length,
      replyMentionPostNotifs.length,
      repostMentionPostNotifs.length,
      likeMentionPostNotifs.length,

      zapedPostMentionPostNotifs.length,
      replyPostMentionPostNotifs.length,
      repostPostMentionPostNotifs.length,
      likePostMentionPostNotifs.length,
    ];
  };

  const otherNotifLabels = [
    {
      id: 'notifications.sidebar.mentionsPostZap',
      defaultMessage: `{number, plural,
        =0 {}
        one {mention was zapped}
        other {mentions were zapped}}`,
      description: 'Sidebar "posts you were mentioned in were zapped" stats description on the notification page',
    },
    {
      id: 'notifications.sidebar.mentionsPostLike',
      defaultMessage: `{number, plural,
        =0 {}
        one {mention was liked}
        other {mentions were liked}}`,
      description: 'Sidebar "posts you were mentioned in were liked" stats description on the notification page',
    },
    {
      id: 'notifications.sidebar.mentionsPostReposted',
      defaultMessage: `{number, plural,
        =0 {}
        one {mention was reposted}
        other {mentions were reposted}}`,
      description: 'Sidebar "posts you were mentioned in were reposted" stats description on the notification page',
    },
    {
      id: 'notifications.sidebar.mentionsPostReplied',
      defaultMessage: `{number, plural,
        =0 {}
        one {mention was replied to}
        other {mentions were replied to}}`,
      description: 'Sidebar "posts you were mentioned in were replied to" stats description on the notification page',
    },

    {
      id: 'notifications.sidebar.postMentionsPostZaped',
      defaultMessage: `{number, plural,
        =0 {}
        one {post mention was zapped}
        other {post mentions were zapped}}`,
      description: 'Sidebar "posts your posts were mentioned in were zapped" stats description on the notification page',
    },
    {
      id: 'notifications.sidebar.postMentionsPostLike',
      defaultMessage: `{number, plural,
        =0 {}
        one {post mention was liked}
        other {post mentions were liked}}`,
      description: 'Sidebar "posts your posts were mentioned in were liked" stats description on the notification page',
    },
    {
      id: 'notifications.sidebar.postMentionsPostReposted',
      defaultMessage: `{number, plural,
        =0 {}
        one {post mention was reposted}
        other {post mentions were reposted}}`,
      description: 'Sidebar "posts your posts were mentioned in were reposted" stats description on the notification page',
    },
    {
      id: 'notifications.sidebar.postMentionsPostReposted',
      defaultMessage: `{number, plural,
        =0 {}
        one {post mention was replied to}
        other {post mentions were replied to}}`,
      description: 'Sidebar "posts your posts were mentioned in were replied to" stats description on the notification page',
    },
  ];

  const nothingNew = () => {
    return mentions()[0] + mentions()[1] +
      follows()[0] + follows()[1] +
      zaps()[0] +
      activity()[0] + activity()[1] + activity()[2] === 0;
  }

  return (
    <div id={props.id}>
      <div class={styles.sidebarHeading}>
        {intl.formatMessage(t.heading)}
      </div>

      <Show when={nothingNew()}>
        <div class={styles.sidebarEmpty}>
          {intl.formatMessage(t.empty)}
        </div>
      </Show>

      <Show when={follows()[0] + follows()[1] > 0}>
        <div class={styles.category}>
          <div class={styles.categoryIcon}>
            <div class={styles.followIcon}></div>
          </div>
          <div class={styles.content}>
            <div class={styles.sidebarTitle}>
              {intl.formatMessage(t.followers)}
            </div>
            <div class={styles.sidebarItems}>
              <div class={styles.sidebarItem}>
                <Show when={follows()[0]> 0}>
                <div class={styles.itemAmount} title={`${follows()[0]}`}>{truncateNumber(follows()[0])}</div>
                {intl.formatMessage(
                  t.gainedFollowers,
                  {
                    number: follows()[0],
                  },
                )}
                </Show>
              </div>
              <div class={styles.sidebarItem}>
                <Show when={follows()[1] > 0}>
                <div class={styles.itemAmount} title={`${follows()[1]}`}>{truncateNumber(follows()[1])}</div>
                {intl.formatMessage(
                  t.lostFollowers,
                  {
                    number: follows()[1],
                  },
                )}
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Show>

      <Show when={zaps()[0] > 0}>
        <div class={styles.category}>
          <div class={styles.categoryIcon}>
            <div class={styles.zapIcon}></div>
          </div>
          <div class={styles.content}>
            <div class={styles.sidebarTitle}>
              {intl.formatMessage(t.zaps)}
            </div>
            <div class={styles.sidebarItems}>
              <div class={styles.sidebarItem}>
                <Show when={zaps()[0] > 0}>
                <div class={styles.itemAmount} title={`${zaps()[0]}`}>{truncateNumber(zaps()[0])}</div>
                {intl.formatMessage(
                  t.zapNumber,
                  {
                    number: zaps()[0],
                  },
                )}
                </Show>
              </div>
              <div class={styles.sidebarItem}>
                <Show when={zaps()[1] > 0}>
                <div class={styles.itemAmount} title={`${zaps()[1]}`}>{truncateNumber(zaps()[1])}</div>
                {intl.formatMessage(
                  t.statsNumber,
                  {
                    number: zaps()[1],
                  },
                )}
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Show>

      <Show when={activity()[0] + activity()[1] + activity()[2] > 0}>
        <div class={styles.category}>
          <div class={styles.categoryIcon}>
            <div class={styles.activityIcon}></div>
          </div>
          <div class={styles.content}>
            <div class={styles.sidebarTitle}>
              {intl.formatMessage(t.activities)}
            </div>
            <div class={styles.sidebarItems}>
              <div class={styles.sidebarItem}>
                <Show when={activity()[0] > 0}>
                  <div class={styles.itemAmount} title={`${activity()[0]}`}>{truncateNumber(activity()[0])}</div>
                  {intl.formatMessage(
                    t.replies,
                    {
                      number: activity()[0],
                    }
                  )}
                </Show>
              </div>
              <div class={styles.sidebarItem}>
                <Show when={activity()[1] > 0}>
                <div class={styles.itemAmount} title={`${activity()[1]}`}>{truncateNumber(activity()[1])}</div>
                  {intl.formatMessage(
                    t.reposts,
                    {
                      number: activity()[1],
                    },
                  )}
                </Show>
              </div>
              <div class={styles.sidebarItem}>
                <Show when={activity()[2] > 0}>
                <div class={styles.itemAmount} title={`${activity()[2]}`}>{truncateNumber(activity()[2])}</div>
                {intl.formatMessage(
                  t.likes,
                  {
                    number: activity()[2],
                  }
                )}
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Show>

      <Show when={mentions()[0] + mentions()[1] > 0}>
        <div class={styles.category}>
          <div class={styles.categoryIcon}>
            <div class={styles.mentionIcon}></div>
          </div>
          <div class={styles.content}>
            <div class={styles.sidebarTitle}>
              {intl.formatMessage(t.mentions)}
            </div>
            <div class={styles.sidebarItems}>
              <div class={styles.sidebarItem}>
                <Show when={mentions()[0]> 0}>
                <div class={styles.itemAmount} title={`${mentions()[0]}`}>{truncateNumber(mentions()[0])}</div>
                {intl.formatMessage(
                  t.mentionsYou,
                  {
                    number: mentions()[0],
                  }
                )}
                </Show>
              </div>
              <div class={styles.sidebarItem}>
                <Show when={mentions()[1] > 0}>
                <div class={styles.itemAmount} title={`${mentions()[1]}`}>{truncateNumber(mentions()[1])}</div>
                {intl.formatMessage(
                  t.mentionsYourPost,
                  {
                    number: mentions()[1],
                  }
                )}
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Show>

      <Show when={
        otherNotifications()[0] +
        otherNotifications()[1] +
        otherNotifications()[2] +
        otherNotifications()[3] +
        otherNotifications()[4] +
        otherNotifications()[5] +
        otherNotifications()[6] +
        otherNotifications()[7] > 0}
      >
        <div class={styles.category}>
          <div class={styles.categoryIcon}>
            <div class={styles.contextIcon}></div>
          </div>
          <div class={styles.content}>
            <div class={styles.sidebarTitle}>
              {intl.formatMessage(t.other)}
            </div>
            <div class={styles.sidebarItems}>
              <For each={otherNotifications()}>
                {(stat, index) => (
                  <Show when={stat > 0}>
                    <div class={styles.sidebarItem}>
                      <div class={styles.itemAmount} title={`${stat}`}>
                        {truncateNumber(stat)}
                      </div>
                      {intl.formatMessage(
                        otherNotifLabels[index()],
                        {
                        number: stat,
                        }
                      )}
                    </div>
                  </Show>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default hookForDev(NotificationsSidebar);
