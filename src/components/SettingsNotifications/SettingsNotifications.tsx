import { Component, For } from 'solid-js';

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
import mentionedPostReplied from '../../assets/icons/notifications/mentioned_post_replied.svg';

import liveStream from '../../assets/icons/notifications/live_2.svg';


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
import mentionedPostRepliedLight from '../../assets/icons/notifications/light/mentioned_post_replied.svg';

import liveStreamLight from '../../assets/icons/notifications/light/live_2.svg';



import { settings as t } from '../../translations';
import styles from './SettingsNotifications.module.scss';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { useIntl } from '@cookbook/solid-intl';
import CheckBox from '../Checkbox/CheckBox';
import { hookForDev } from '../../lib/devTools';

const SettingsNotifications: Component<{ id?: string }> = (props) => {

  const settings = useSettingsContext();
  const intl = useIntl();

  const onChange = (setting: string) => {
    const currentValue = settings?.notificationSettings[setting];

    if (setting === 'YOUR_POST_WAS_LIKED') {
      settings?.actions.updateNotificationSettingsBulk({
        YOUR_POST_WAS_LIKED: !currentValue,
        YOUR_POST_WAS_HIGHLIGHTED: !currentValue,
        YOUR_POST_WAS_BOOKMARKED: !currentValue,
      });
      return;
    }

    if (setting === 'YOU_WERE_MENTIONED_IN_POST') {
      settings?.actions.updateNotificationSettingsBulk({
        YOU_WERE_MENTIONED_IN_POST: !currentValue,
        YOUR_POST_WAS_MENTIONED_IN_POST: !currentValue,
      });
      return;
    }

    settings?.actions.updateNotificationSettings(setting, !currentValue);
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
    'LIVE_EVENT_HAPPENING',
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
    'include_deep_replies',
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

    LIVE_EVENT_HAPPENING: 'Live Streams',

    include_deep_replies: 'Include replies to replies',
    ignore_events_with_too_many_mentions: 'Ignore notes with more than 10 mentions',
    only_show_dm_notifications_from_users_i_follow: 'Only show DM notifications from users I follow',
    only_show_reactions_from_users_i_follow: 'Only show reactions from users I follow',
  }

  const themedIcons = (notif: string) => {
    const theme = settings?.theme || 'sunset';

    if (['sunset', 'midnight'].includes(theme)) {
      return icons[notif];
    }

    return iconsLight[notif];
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

    LIVE_EVENT_HAPPENING: liveStream,
  }

  const iconsLight: Record<string, string> = {
    NEW_USER_FOLLOWED_YOU: userFollowLight,
    USER_UNFOLLOWED_YOU: userUnFollowLight,

    YOUR_POST_WAS_ZAPPED: postZappedLight,
    YOUR_POST_WAS_LIKED: postLikedLight,
    YOUR_POST_WAS_REPOSTED: postRepostedLight,
    YOUR_POST_WAS_REPLIED_TO: postRepliedLight,

    YOU_WERE_MENTIONED_IN_POST: mentionLight,
    YOUR_POST_WAS_MENTIONED_IN_POST: mentionedPostLight,

    POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED: mentionZappedLight,
    POST_YOU_WERE_MENTIONED_IN_WAS_LIKED: mentionLikedLight,
    POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED: mentionRepostedLight,
    POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO: mentionRepliedLight,

    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED: mentionedPostZappedLight,
    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED: mentionedPostLikedLight,
    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED: mentionRepostedLight,
    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO: mentionedPostRepliedLight,

    LIVE_EVENT_HAPPENING: liveStreamLight,
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
              <CheckBox
                id={notif}
                checked={settings?.notificationSettings[notif]}
                onChange={() => onChange(notif)}
                label={notificationLabels[notif]}
                icon={themedIcons(notif)}
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
              <CheckBox
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
