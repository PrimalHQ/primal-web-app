import { Component, createEffect, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
import styles from './Explore.module.scss';
import { useToastContext } from '../../components/Toaster/Toaster';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { useIntl } from '@cookbook/solid-intl';
import { useExploreContext } from '../../contexts/ExploreContext';
import { A, useLocation } from '@solidjs/router';
import { fetchExploreMedia, fetchExplorePeople, fetchExploreTopics, fetchExploreZaps } from '../../megaFeeds';
import { APP_ID } from '../../App';
import { userName } from '../../stores/profile';
import Avatar from '../../components/Avatar/Avatar';
import { useAccountContext } from '../../contexts/AccountContext';
import { imageRegex } from '../../constants';
import { PrimalNote } from '../../types/primal';
import NoteGallery from '../../components/Note/NoteGallery';
import { humanizeNumber } from '../../lib/stats';

const ExploreTopics: Component<{ open?: boolean }> = (props) => {

  const settings = useSettingsContext();
  const toaster = useToastContext();
  const intl = useIntl();
  const explore = useExploreContext();
  const location = useLocation();
  const account = useAccountContext();

  onMount(() => {
    getTopics();
  });

  const getTopics = async () => {
    const { topicStats } = await fetchExploreTopics(account?.publicKey, `explore_topics_${APP_ID}`);

    explore?.actions.setExploreTopics(topicStats);
  }

  // @ts-ignore
  const topics = () => explore?.exploreTopics.toSorted((a, b) => {
    return b[1] - a[1];
  });

  return (
    <div class={styles.exploreTopics}>
      <For each={topics()}>
        {topicStats => (
          <A href={`/search/%23${topicStats[0]}`} class={styles.exploreTopic}>
            <div class={styles.name}>
              #{topicStats[0]}
            </div>
            <div class={styles.number}>{humanizeNumber(topicStats[1])} notes</div>
          </A>
        )}
      </For>
    </div>
  )
}

export default ExploreTopics;
