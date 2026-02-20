import { Component, For, onMount } from 'solid-js';
import styles from './Explore.module.scss';
import { useExploreContext } from '../../contexts/ExploreContext';
import { A } from '@solidjs/router';
import { fetchExploreTopics } from '../../megaFeeds';
import { APP_ID } from '../../App';
import { humanizeNumber } from '../../lib/stats';
import { accountStore } from '../../stores/accountStore';

const ExploreTopics: Component<{ open?: boolean }> = (props) => {

  const explore = useExploreContext();

  onMount(() => {
    getTopics();
  });

  const getTopics = async () => {
    const { topicStats } = await fetchExploreTopics(accountStore.publicKey, `explore_topics_${APP_ID}`);

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
