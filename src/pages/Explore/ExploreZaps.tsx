import { Component, createEffect, For, onCleanup, onMount, Show } from 'solid-js';
import styles from '../ExploreNew.module.scss';
import { useToastContext } from '../../components/Toaster/Toaster';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { useIntl } from '@cookbook/solid-intl';
import { useExploreContext } from '../../contexts/ExploreContext';
import { useLocation } from '@solidjs/router';
import { fetchExplorePeople, fetchExploreZaps } from '../../megaFeeds';
import { APP_ID } from '../../App';
import { userName } from '../../stores/profile';
import Avatar from '../../components/Avatar/Avatar';

const ExploreZaps: Component<{ open?: boolean }> = (props) => {

  const settings = useSettingsContext();
  const toaster = useToastContext();
  const intl = useIntl();
  const explore = useExploreContext();
  const location = useLocation();



  onMount(() => {
    getZaps();
  });

  const getZaps = async () => {
    const { zaps } = await fetchExploreZaps(`explore_zaps_${APP_ID}`, { limit: 20 });

    explore?.actions.setExploreZaps(zaps);
  }

  return (
    <div class={styles.exploreZaps}>
      <For each={explore?.exploreZaps}>
        {zap => <div>
          <Avatar user={zap.sender} />
          <div>{zap.amount}</div>
          <Avatar user={zap.reciver} />
          <div>{zap.message.length > 0 ? zap.message : '---'}</div>
        </div>}
      </For>
    </div>
  )
}

export default ExploreZaps;
