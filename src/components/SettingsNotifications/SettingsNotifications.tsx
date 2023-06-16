import { Component, For } from 'solid-js';

import styles from './SettingsNotifications.module.scss';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { debounce } from '../../utils';
import { useIntl } from '@cookbook/solid-intl';

const SettingsZap: Component = () => {

  const settings = useSettingsContext();
  const intl = useIntl();

  const onChange = (setting: string) => {
    const currentValue = settings?.notificationSettings[setting];
    settings?.actions.updateNotificationSettings(setting, !currentValue);
  };

  const basicNotifications = [
    'NEW_USER_FOLLOWED_YOU',
    'USER_UNFOLLOWED_YOU',
    'YOUR_POST_WAS_ZAPPED',
    'YOUR_POST_WAS_LIKED',
    'YOUR_POST_WAS_REPOSTED',
    'YOUR_POST_WAS_REPLIED_TO',
    'YOU_WERE_MENTIONED_IN_POST',
    'YOUR_POST_WAS_MENTIONED_IN_POST',
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

  const notificationLabels: Record<string, string> = {
    NEW_USER_FOLLOWED_YOU: 'new user followed you',
    USER_UNFOLLOWED_YOU: 'a user unfollowed you',

    YOUR_POST_WAS_ZAPPED: 'your post was zapped',
    YOUR_POST_WAS_LIKED: 'your post was liked',
    YOUR_POST_WAS_REPOSTED: 'your post was reposted',
    YOUR_POST_WAS_REPLIED_TO: 'your post was replied to',

    YOU_WERE_MENTIONED_IN_POST: 'you were mentioned in a post',
    YOUR_POST_WAS_MENTIONED_IN_POST: 'your post was mentioned in a post',

    POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED: 'zapped',
    POST_YOU_WERE_MENTIONED_IN_WAS_LIKED: 'liked',
    POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED: 'reposted',
    POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO: 'replied to',

    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED: 'zapped',
    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED: 'liked',
    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED: 'reposted',
    POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO: 'replied to',
  }

  return (
    <div class={styles.notificationSettings}>
      <ul>
        <For each={basicNotifications}>
          {(notif) => (
            <li>
              <input
                id={notif}
                type='checkbox'
                checked={settings?.notificationSettings[notif]}
                onChange={() => onChange(notif)}
              />
              <label for={notif}>{notificationLabels[notif]}</label>
            </li>
          )}
        </For>
      </ul>

      <div class={styles.caption}>
        {intl.formatMessage(
          {
            id: 'pages.settings.sections.notifications.yourMentions',
            defaultMessage: 'A post you were mentioned in was:',
            description: 'Title of the notification settings sub-section for posts you were mentioned in',
          }
        )}
      </div>

      <ul>
        <For each={yourMentionNotifications}>
          {(notif) => (
            <li>
              <input
                id={notif}
                type='checkbox'
                checked={settings?.notificationSettings[notif]}
                onChange={() => onChange(notif)}
              />
              <label for={notif}>{notificationLabels[notif]}</label>
            </li>
          )}
        </For>
      </ul>

      <div class={styles.caption}>
        {intl.formatMessage(
          {
            id: 'pages.settings.sections.notifications.yourPostMentions',
            defaultMessage: 'A post your post was mentioned in was:',
            description: 'Title of the notification settings sub-section for posts your post was mentioned in',
          }
        )}
      </div>
      <ul>
        <For each={yourPostMentionNotifications}>
          {(notif) => (
            <li>
              <input
                id={notif}
                type='checkbox'
                checked={settings?.notificationSettings[notif]}
                onChange={() => onChange(notif)}
              />
              <label for={notif}>{notificationLabels[notif]}</label>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}

export default SettingsZap;
