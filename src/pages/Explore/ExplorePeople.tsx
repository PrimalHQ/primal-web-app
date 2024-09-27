import { Component, createEffect, For, onCleanup, onMount, Show } from 'solid-js';
import styles from '../ExploreNew.module.scss';
import { useToastContext } from '../../components/Toaster/Toaster';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { useIntl } from '@cookbook/solid-intl';
import { useExploreContext } from '../../contexts/ExploreContext';
import { useLocation } from '@solidjs/router';
import { fetchExplorePeople } from '../../megaFeeds';
import { APP_ID } from '../../App';
import { userName } from '../../stores/profile';
import Avatar from '../../components/Avatar/Avatar';

const ExplorePeople: Component<{ open?: boolean }> = (props) => {

  const settings = useSettingsContext();
  const toaster = useToastContext();
  const intl = useIntl();
  const explore = useExploreContext();
  const location = useLocation();



  onMount(() => {
    getPeople();
  });

  const getPeople = async () => {
    const { users } = await fetchExplorePeople(`explore_people_${APP_ID}`, { limit: 20 });

    explore?.actions.setExplorePeople(users);
  }



  return (
    <div class={styles.explorePeople}>
      <For each={explore?.explorePeople}>
        {user => <div>
          <Avatar user={user} />
          <div>{userName(user)}</div>
        </div>}
      </For>
    </div>
  )
}

export default ExplorePeople;
