import { A } from '@solidjs/router';
import { Component, createEffect, For } from 'solid-js';
import { APP_ID } from '../../App';

import styles from './ExploreSidebar.module.scss';
import { hookForDev } from '../../lib/devTools';
import { useExploreContext } from '../../contexts/ExploreContext';
import { fetchExploreTopics } from '../../megaFeeds';
import { accountStore } from '../../stores/accountStore';

const ExploreHotTopics: Component<{ id?: string }> = (props) => {

  const explore = useExploreContext();

  // @ts-ignore
  const topics = () => explore?.exploreTopics.toSorted((a, b) => {
    return b[1] - a[1];
  }).slice(0, 19);

  createEffect(() => {
    if (!explore || explore.exploreTopics.length > 0) return;

    getTopics();
  })

  const getTopics = async () => {
    const { topicStats } = await fetchExploreTopics(accountStore.publicKey, `explore_topics_${APP_ID}`);

    explore?.actions.setExploreTopics(topicStats);
  }

  return (
    <div id={props.id} class={styles.topicsHolder}>
      <div class={styles.hotTopicsCaption}>
        Hot Topics
      </div>
      <div class={styles.exploreHotTopics}>
        <For each={topics()}>
          {
            topic => (
              <A href={`/search/%23${topic[0]}`} class={styles.exploreHotTopic}>{topic[0]}</A>
            )
          }
        </For>
      </div>
    </div>
  )
}

export default hookForDev(ExploreHotTopics);
