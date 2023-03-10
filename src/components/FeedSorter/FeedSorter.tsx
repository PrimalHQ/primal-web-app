import { Component, createEffect, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useFeedContext } from '../../contexts/FeedContext';
import { moveFeedDown, moveFeedUp, removeFromAvailableFeeds, replaceAvailableFeeds } from '../../stores/home';
import { PrimalFeed } from '../../types/primal';

import styles from './FeedSorter.module.scss';


const FeedSorter: Component = () => {

  let sorter;

  const context = useFeedContext();

  const [orderedFeeds, setOrderedFeeds] = createStore<PrimalFeed[]>([]);

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

  const reorderFeeds = (list) => {
    context?.actions?.setData('availableFeeds', () => replaceAvailableFeeds(context.data.publicKey, list));
  };

  const slist = (target) => {
    // Get all items
    let items = target.getElementsByClassName(styles.feedItem);
    // init current item
    let current = null;

    // (Make items draggable and sortable
    for (let i of items) {
      i.draggable = true;

      i.ondragstart = (e) => {
        current = i;
        for (let it of items) {
          if (it === current) {
            it.classList.add(styles.draggedItem);
          }
        }
      };

      i.ondragenter = (e) => {
        const oldIndex = current.getAttribute('data-index');
        const newIndex = i.getAttribute('data-index');

        if (oldIndex > newIndex) {
          i.classList.add(styles.draggedBefore);
          i.classList.remove(styles.draggedAfter);
        }
        if (oldIndex < newIndex) {
          i.classList.add(styles.draggedAfter);
          i.classList.remove(styles.draggedBefore);
        }
      };

      i.ondragleave = () => {
        i.classList.remove(styles.draggedBefore);
        i.classList.remove(styles.draggedAfter);
      }

      i.ondragend = () => { for (let it of items) {
          it.classList.remove(styles.draggedItem);
          i.classList.remove(styles.draggedBefore);
          i.classList.remove(styles.draggedAfter);
      }};

      // Prevent default "drop", so we can do our own
      i.ondragover = e => e.preventDefault();

      i.ondrop = (e) => {
        e.preventDefault();
        if (i != current) {
          const oldIndex = current.getAttribute('data-index');
          const newIndex = i.getAttribute('data-index');

          let list = [...orderedFeeds];

          list.splice(newIndex, 0, list.splice(oldIndex, 1)[0]);

          for (let it of items) {
            it.classList.remove(styles.draggedBefore);
            it.classList.remove(styles.draggedBefore);
            it.classList.remove(styles.draggeditem);
          }

          reorderFeeds(list);
        }
      };
    }
  }

  createEffect(() => {
    if (sorter && availableFeeds().length > 0) {
      setOrderedFeeds(() => availableFeeds());
      slist(sorter);
    }
  });

  return (
    <div id="feed_sorter" class={styles.feedSorter} ref={sorter}>
      <Show when={availableFeeds().length > 0}>
        <For each={availableFeeds()}>
          {(feed, index) => (
            <div class={styles.feedItem} data-value={feed.hex} data-index={index()}>
              <div class={styles.sortControls}>
                <div class={styles.dragIcon}></div>
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
