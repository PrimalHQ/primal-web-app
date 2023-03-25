import { Component, createEffect, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useHomeContext } from '../../contexts/HomeContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { PrimalFeed } from '../../types/primal';

import styles from './FeedSorter.module.scss';


const FeedSorter: Component = () => {

  let sorter: any;

  const settings = useSettingsContext();

  const [orderedFeeds, setOrderedFeeds] = createStore<PrimalFeed[]>([]);

  const availableFeeds = () => {
    return settings?.availableFeeds || [];
  };

  const removeFeed = (feed: PrimalFeed) => {
    settings?.actions.removeAvailableFeed(feed);
  };

  const reorderFeeds = (feedList: PrimalFeed[]) => {
    settings?.actions.setAvailableFeeds(feedList);
  };

  const sortList = (target: any) => {
    // Get all items
    let items = target.getElementsByClassName(styles.feedItem);
    // init current item
    let current: any = null;

    // (Make items draggable and sortable
    for (let i of items) {
      i.draggable = true;

      i.ondragstart = (e: DragEvent) => {
        current = i;
        for (let it of items) {
          if (it === current) {
            it.classList.add(styles.draggedItem);
          }
        }
      };

      i.ondragenter = (e: DragEvent) => {
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
      i.ondragover = (e: DragEvent) => e.preventDefault();

      i.ondrop = (e: DragEvent) => {
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
      sortList(sorter);
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
