import { Component, For, Show } from 'solid-js';
import { useFeedContext } from '../../contexts/FeedContext';
import { moveFeedDown, moveFeedUp, removeFromAvailableFeeds } from '../../stores/home';
import { PrimalFeed } from '../../types/primal';

import styles from './FeedSorter.module.scss';


const FeedSorter: Component = () => {

  const context = useFeedContext();

  const availableFeeds = () => {
    return context?.data.availableFeeds || [];
  };

  const removeFeed = (feed: PrimalFeed) => {
    context?.actions?.setData('availableFeeds', feeds => removeFromAvailableFeeds(context?.data.publicKey, feed, feeds));
  };

  const onMoveFeedUp = (feed: PrimalFeed) => {
    context?.actions?.setData('availableFeeds', feeds => moveFeedUp(context?.data.publicKey, feed, feeds));
  };

  const onMoveFeedDown = (feed: PrimalFeed) => {
    context?.actions?.setData('availableFeeds', feeds => moveFeedDown(context?.data.publicKey, feed, feeds));
  };

  return (
    <div class={styles.feedSorter}>
      <Show when={availableFeeds().length > 0}>
        <For each={availableFeeds()}>
          {feed => (
            <div class={styles.feedItem}>
              <div class={styles.sortControls}>
                <button
                  class={styles.sortButton}
                  onClick={() => onMoveFeedUp(feed)}
                >
                  +
                </button>
                <button
                  class={styles.sortButton}
                  onClick={() => onMoveFeedDown(feed)}
                >
                  -
                </button>
              </div>
              <div class={styles.manageControls}>
                <button class={styles.mngButton} onClick={() => removeFeed(feed)}>
                  <div class={styles.deleteButton}></div>
                </button>
              </div>
              <div class={styles.feedName}>{feed.name}</div>
            </div>
          )}
        </For>
      </Show>
    </div>
  )
}

export default FeedSorter;
