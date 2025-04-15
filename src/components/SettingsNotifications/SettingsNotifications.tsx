import { Component, For } from 'solid-js';

import userFollow from '../../assets/icons/notifications/user_followed.svg';
import userUnFollow from '../../assets/icons/notifications/user_unfollowed.svg';

import postZapped from '../../assets/icons/notifications/post_zapped.svg';
import postLiked from '../../assets/icons/notifications/post_liked.svg';
import postReposted from '../../assets/icons/notifications/post_reposted.svg';
import postReplied from '../../assets/icons/notifications/post_replied.svg';

import mention from '../../assets/icons/notifications/mention.png';
import mentionedPost from '../../assets/icons/notifications/mentioned_post.svg';

import mentionZapped from '../../assets/icons/notifications/mention_zapped.svg';
import mentionLiked from '../../assets/icons/notifications/mention_liked.svg';
import mentionReposted from '../../assets/icons/notifications/mention_reposted.svg';
import mentionReplied from '../../assets/icons/notifications/mention_replied.svg';

import mentionedPostZapped from '../../assets/icons/notifications/mentioned_post_zapped.svg';
import mentionedPostLiked from '../../assets/icons/notifications/mentioned_post_liked.svg';
import mentionedPostReposted from '../../assets/icons/notifications/mentioned_post_reposted.svg';
import mentionedPostReplied from '../../assets/icons/notifications/mentioned_post_replied.svg';

import { settings as t } from '../../translations';
import styles from './SettingsNotifications.module.scss';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { useIntl } from '@cookbook/solid-intl';
import Checkbox from '../Checkbox/Checkbox';
import { hookForDev } from '../../lib/devTools';

const SettingsNotifications: Component<{ id?: string }> = (props) => {

  const settings = useSettingsContext();
  const intl = useIntl();

  const onChange = (setting: string) => {
    const currentValue = settings?.notificationSettings[setting];
    settings?.actions.updateNotificationSettings(setting, !currentValue);

    if (setting === 'YOUR_POST_WAS_LIKED') {
      settings?.actions.updateNotificationAdditionalSettings(`YOUR_POST_WAS_HIGHLIGHTED`, !currentValue);
      settings?.actions.updateNotificationAdditionalSettings(`YOUR_POST_WAS_BOOKMARKED`, !currentValue);
    }
  };

  const onChangeAdditional = (setting: string) => {
    const currentValue = settings?.notificationAdditionalSettings[setting];
    settings?.actions.updateNotificationAdditionalSettings(setting, !currentValue);
  };

  const basicNotifications = [
    'NEW_USER_FOLLOWED_YOU',
    'YOUR_POST_WAS_ZAPPED',
    'YOUR_POST_WAS_LIKED',
    'YOUR_POST_WAS_REPOSTED',
    'YOUR_POST_WAS_REPLIED_TO',
    'YOU_WERE_MENTIONED_IN_POST',
  ];

  const yourMentionNotifications = [
    'POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED',
    'POST_YOU_WERE_MENTIONED_IN_WAS_LIKED',
    'POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED',
    'POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO',
  ];

  const yourPostMentionNotifications = [
    'POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED',
    'POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED',
    'POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED',
    'POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO',
  ];

  const additionalNotifications = [
    'ignore_events_with_too_many_mentions',
    'only_show_dm_notifications_from_users_i_follow',
    'only_show_reactions_from_users_i_follow',
  ];

  const notificationLabels: Record<string, string> = {
    NEW_USER_FOLLOWED_YOU: 'New Followers',

    YOUR_POST_WAS_ZAPPED: 'Zaps',
    YOUR_POST_WAS_LIKED: 'Reactions',
    YOUR_POST_WAS_REPOSTED: 'Reposts',
    YOUR_POST_WAS_REPLIED_TO: 'Replies',

    YOU_WERE_MENTIONED_IN_POST: 'Mentions',
    YOUR_POST_WAS_MENTIONED_IN_POST: 'your note was mentioned in a note',

    POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED: 'zapped',
    POST_YOU_WERE_MENTIONED_IN_WAS_LIKED: 'liked',
    POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED: 'reposted',
    POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO: 'replied to',

    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED: 'zapped',
    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED: 'liked',
    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED: 'reposted',
    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO: 'replied to',

    ignore_events_with_too_many_mentions: 'Ignore notes with more than 10 mentions',
    only_show_dm_notifications_from_users_i_follow: 'Only show DM notifications from users I follow',
    only_show_reactions_from_users_i_follow: 'Only show reactions from users I follow',
  }

  const icons: Record<string, string> = {
    NEW_USER_FOLLOWED_YOU: userFollow,
    USER_UNFOLLOWED_YOU: userUnFollow,

    YOUR_POST_WAS_ZAPPED: postZapped,
    YOUR_POST_WAS_LIKED: postLiked,
    YOUR_POST_WAS_REPOSTED: postReposted,
    YOUR_POST_WAS_REPLIED_TO: postReplied,

    YOU_WERE_MENTIONED_IN_POST: mention,
    YOUR_POST_WAS_MENTIONED_IN_POST: mentionedPost,

    POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED: mentionZapped,
    POST_YOU_WERE_MENTIONED_IN_WAS_LIKED: mentionLiked,
    POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED: mentionReposted,
    POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO: mentionReplied,

    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED: mentionedPostZapped,
    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED: mentionedPostLiked,
    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED: mentionReposted,
    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO: mentionedPostReplied,
  }

  return (
    <div id={props.id} class={styles.notificationSettings}>

      <div class={styles.caption}>
        {intl.formatMessage(t.notifications.core)}
      </div>

      <ul>
        <For each={basicNotifications}>
          {(notif) => (
            <li>
              <Checkbox
                id={notif}
                checked={settings?.notificationSettings[notif]}
                onChange={() => onChange(notif)}
                label={notificationLabels[notif]}
                icon={icons[notif]}
              />
            </li>
          )}
        </For>
      </ul>

      <div class={styles.caption}>
        {intl.formatMessage(t.notifications.additionalNotifs)}
      </div>
      <ul>
        <For each={additionalNotifications}>
          {(notif) => (
            <li>
              <Checkbox
                id={notif}
                checked={settings?.notificationAdditionalSettings[notif]}
                onChange={() => onChangeAdditional(notif)}
                label={notificationLabels[notif]}
                icon={icons[notif]}
              />
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}

export default hookForDev(SettingsNotifications);
