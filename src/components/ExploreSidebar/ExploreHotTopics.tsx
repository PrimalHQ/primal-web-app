import { A, useResolvedPath } from '@solidjs/router';
import { Component, createEffect, createMemo, For, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Kind } from '../../constants';
import { APP_ID } from '../../App';
import { getExploreFeed } from '../../lib/feed';
import { cacheServer, decompressBlob, isConnected, readData, refreshSocketListeners, removeSocketListeners, socket } from '../../sockets';
import { sortingPlan, convertToNotes } from '../../stores/note';
import { convertToUser, emptyUser, truncateNpub } from '../../stores/profile';
import { FeedPage, NostrEOSE, NostrEvent, NostrEventContent, NostrEvents, NostrUserContent, PrimalNote, PrimalUser } from '../../types/primal';
import Avatar from '../Avatar/Avatar';

import styles from './ExploreSidebar.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { getTrendingUsers } from '../../lib/profile';
import { hexToNpub } from '../../lib/keys';
import { exploreSidebarCaption } from '../../translations';
import { useAccountContext } from '../../contexts/AccountContext';
import { hookForDev } from '../../lib/devTools';
import { useExploreContext } from '../../contexts/ExploreContext';
import { fetchExploreTopics } from '../../megaFeeds';

const ExploreHotTopics: Component<{ id?: string }> = (props) => {

  const intl = useIntl();
  const account = useAccountContext();
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
    const { topicStats } = await fetchExploreTopics(account?.publicKey, `explore_topics_${APP_ID}`);

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
