import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import { NotificationType } from '../../constants';
import { truncateNumber } from '../../lib/notifications';
import { SortedNotifications } from '../../types/primal';

import styles from './NotificationsSidebar.module.scss';

const NotificationsSidebar: Component<{ notifications: SortedNotifications}> = (props) => {

  const intl = useIntl();

  const follows = () => {
    const followNotifs = props.notifications[NotificationType.NEW_USER_FOLLOWED_YOU] || [];
    const unffolowNotifs = props.notifications[NotificationType.USER_UNFOLLOWED_YOU] || [];

    const newFollowers = followNotifs.map(n => n.follower || 'NA');
    const lostFolloowers = unffolowNotifs.map(n => n.follower || 'NA');

    const followCounts: Record<string, number> = {};
    const unfollowCounts: Record<string, number> = {};

    newFollowers.forEach(f => {
      followCounts[f] = followCounts[f] ? followCounts[f] + 1 : 1;
    })

    lostFolloowers.forEach(f => {
      unfollowCounts[f] = unfollowCounts[f] ? unfollowCounts[f] + 1 : 1;
    })

    const followTotal = Object.keys(followCounts).reduce((acc, key) => {
      if (!unfollowCounts[key]) {
        return acc + 1;
      }

      const diff = followCounts[key] - unfollowCounts[key];

      return diff > 0 ? acc + 1 : acc;
    }, 0);

    const unfollowTotal = Object.keys(unfollowCounts).reduce((acc, key) => {
      if (!followCounts[key]) {
        return acc + 1;
      }

      const diff = unfollowCounts[key] - followCounts[key];

      return diff > 0 ? acc + 1 : acc;
    }, 0);

    return [followTotal, unfollowTotal];

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
    const replyNotifs = props.notifications[NotificationType.YOUR_POST_WAS_REPLIED_TO] || [];
    const repostNotifs = props.notifications[NotificationType.YOUR_POST_WAS_REPOSTED] || [];
    const likeNotifs = props.notifications[NotificationType.YOUR_POST_WAS_LIKED] || [];


    return [replyNotifs.length, repostNotifs.length, likeNotifs.length];
  };

  const nothingNew = () => {
    return mentions()[0] + mentions()[1] +
      follows()[0] + follows()[1] +
      zaps()[0] +
      activity()[0] + activity()[1] + activity()[2] === 0;
  }

  return (
    <>
      <div class={styles.sidebarHeading}>
        {intl.formatMessage({
          id: 'notifications.sidebar.summary',
          defaultMessage: 'Summary',
          description: 'Sidebar caption on the notification page',
        })}
      </div>

      <Show when={nothingNew()}>
        <div class={styles.sidebarTitle}>
          {intl.formatMessage({
            id: 'notifications.sidebar.nothing',
            defaultMessage: 'No new notifications',
            description: 'Sidebar caption indicating no new notifications',
          })}
        </div>
      </Show>

      <Show when={follows()[0] + follows()[1] > 0}>
        <div class={styles.category}>
          <div class={styles.categoryIcon}>
            <div class={styles.followIcon}></div>
          </div>
          <div class={styles.content}>
            <div class={styles.sidebarTitle}>
              {intl.formatMessage({
                id: 'notifications.sidebar.followers',
                defaultMessage: 'Followers',
                description: 'Sidebar follower stats caption on the notification page',
              })}
            </div>
            <div class={styles.sidebarItems}>
              <div class={styles.sidebarItem}>
                <Show when={follows()[0]> 0}>
                <div class={styles.itemAmount} title={`${follows()[0]}`}>{truncateNumber(follows()[0])}</div>
                {intl.formatMessage({
                  id: 'notifications.sidebar.gainedFollowers',
                  defaultMessage: 'new followers',
                  description: 'Sidebar new follower stats description on the notification page',
                })}
                </Show>
              </div>
              <div class={styles.sidebarItem}>
                <Show when={follows()[1] > 0}>
                <div class={styles.itemAmount} title={`${follows()[1]}`}>{truncateNumber(follows()[1])}</div>
                {intl.formatMessage({
                  id: 'notifications.sidebar.lostFollowers',
                  defaultMessage: 'lost follwers',
                  description: 'Sidebar lost follwers stats description on the notification page',
                })}
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
              {intl.formatMessage({
                id: 'notifications.sidebar.mentions',
                defaultMessage: 'Mentions',
                description: 'Sidebar mentions stats caption on the notification page',
              })}
            </div>
            <div class={styles.sidebarItems}>
              <div class={styles.sidebarItem}>
                <Show when={mentions()[0]> 0}>
                <div class={styles.itemAmount} title={`${mentions()[0]}`}>{truncateNumber(mentions()[0])}</div>
                {intl.formatMessage({
                  id: 'notifications.sidebar.mentionsYou',
                  defaultMessage: 'mentions of you',
                  description: 'Sidebar mentions you stats description on the notification page',
                })}
                </Show>
              </div>
              <div class={styles.sidebarItem}>
                <Show when={mentions()[1] > 0}>
                <div class={styles.itemAmount} title={`${mentions()[1]}`}>{truncateNumber(mentions()[1])}</div>
                {intl.formatMessage({
                  id: 'notifications.sidebar.mentionsYourPost',
                  defaultMessage: 'mentions of your posts',
                  description: 'Sidebar mentions your post stats description on the notification page',
                })}
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
              {intl.formatMessage({
                id: 'notifications.sidebar.zaps',
                defaultMessage: 'Zaps',
                description: 'Sidebar zaps stats caption on the notification page',
              })}
            </div>
            <div class={styles.sidebarItems}>
              <div class={styles.sidebarItem}>
                <Show when={zaps()[0] > 0}>
                <div class={styles.itemAmount} title={`${zaps()[0]}`}>{truncateNumber(zaps()[0])}</div>
                {intl.formatMessage({
                  id: 'notifications.sidebar.zapNumber',
                  defaultMessage: 'zaps',
                  description: 'Sidebar zaps stats description on the notification page',
                })}
                </Show>
              </div>
              <div class={styles.sidebarItem}>
                <Show when={zaps()[1] > 0}>
                <div class={styles.itemAmount} title={`${zaps()[1]}`}>{truncateNumber(zaps()[1])}</div>
                {intl.formatMessage({
                  id: 'notifications.sidebar.stasNumber',
                  defaultMessage: 'sats',
                  description: 'Sidebar sats stats description on the notification page',
                })}
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
              {intl.formatMessage({
                id: 'notifications.sidebar.activities',
                defaultMessage: 'Reactions',
                description: 'Sidebar activities stats caption on the notification page',
              })}
            </div>
            <div class={styles.sidebarItems}>
              <div class={styles.sidebarItem}>
                <Show when={activity()[0] > 0}>
                  <div class={styles.itemAmount} title={`${activity()[0]}`}>{truncateNumber(activity()[0])}</div>
                  {intl.formatMessage({
                    id: 'notifications.sidebar.replies',
                    defaultMessage: 'replies',
                    description: 'Sidebar replies stats caption on the notification page',
                  })}
                </Show>
              </div>
              <div class={styles.sidebarItem}>
                <Show when={activity()[1] > 0}>
                <div class={styles.itemAmount} title={`${activity()[1]}`}>{truncateNumber(activity()[1])}</div>
                  {intl.formatMessage({
                    id: 'notifications.sidebar.reposts',
                    defaultMessage: 'reposts',
                    description: 'Sidebar reposts stats caption on the notification page',
                  })}
                </Show>
              </div>
              <div class={styles.sidebarItem}>
                <Show when={activity()[2] > 0}>
                <div class={styles.itemAmount} title={`${activity()[2]}`}>{truncateNumber(activity()[2])}</div>
                {intl.formatMessage({
                  id: 'notifications.sidebar.likes',
                  defaultMessage: 'likes',
                  description: 'Sidebar likes stats caption on the notification page',
                })}
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </>
  )
}

export default NotificationsSidebar;
