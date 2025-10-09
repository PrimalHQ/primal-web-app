import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import { useAccountContext } from '../../contexts/AccountContext';
import { FeedType } from '../../contexts/SettingsContext';
import { hookForDev } from '../../lib/devTools';
import { PrimalArticleFeed } from '../../types/primal';
import CheckBox2 from '../Checkbox/CheckBox';

import styles from './FeedSorter.module.scss';
import { ariaLabels as tAria } from '../../translations';

const lockedFeeds = ['primal'];

export type FeedSorterActions = {
  remove?: (feed: PrimalArticleFeed, feedType: FeedType) => void,
  move?: (from: number, to: number, feedType: FeedType) => void,
  rename?: (feed: PrimalArticleFeed, newName: string, feedType: FeedType) => void,
  enable?: (feed: PrimalArticleFeed, enabled: boolean, feedType: FeedType) => void,
}

const FeedSorter: Component<{
  id?: string,
  feedType: 'home' | 'reads',
  feeds: PrimalArticleFeed[],
  actions: FeedSorterActions,

}> = (props) => {

  let sorter: any;
  const account = useAccountContext();
  const intl = useIntl();

  const [editMode, setEditMode] = createSignal('');

  const [newName, setNewName] = createSignal('');

  const [statusMessage, setStatusMessage] = createSignal('');

  const constructId = (feed: PrimalArticleFeed) => {
    return feed.spec;
  }

  const removeFeed = (feed: PrimalArticleFeed) => {
    props.actions.remove && props.actions.remove(feed, props.feedType);
  };

  const editFeed = (feed: PrimalArticleFeed) => {
    const id = `${constructId(feed)}`;
    setEditMode(() => id);
    setNewName(() => feed.name);
    const input = document.getElementById(`input_${id}`);
    input && input.focus();
  };

  const updateFeedName = (feed: PrimalArticleFeed) => {
    props.actions.rename && props.actions.rename(feed, newName(), props.feedType);
    setEditMode('');
  }

  const moveItemUp = (index: number) => {
    if (index > 0) {
      props.actions.move && props.actions.move(index, index - 1, props.feedType);
      const feed = props.feeds[index];
      setStatusMessage(intl.formatMessage(tAria.feedSorter.movedUp, { name: feed.name }));
      setTimeout(() => setStatusMessage(''), 1000);
    }
  };

  const moveItemDown = (index: number) => {
    if (index < props.feeds.length - 1) {
      props.actions.move && props.actions.move(index, index + 1, props.feedType);
      const feed = props.feeds[index];
      setStatusMessage(intl.formatMessage(tAria.feedSorter.movedDown, { name: feed.name }));
      setTimeout(() => setStatusMessage(''), 1000);
    }
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

          props.actions.move && props.actions.move(oldIndex, newIndex, props.feedType);

          for (let it of items) {
            it.classList.remove(styles.draggedBefore);
            it.classList.remove(styles.draggedBefore);
            it.classList.remove(styles.draggeditem);
          }
        }
      };
    }
  }

  createEffect(() => {
    if (sorter && props.feeds.length > 0) {
      sortList(sorter);
    }
  });

  const isLockedFeed = (feed: PrimalArticleFeed) => lockedFeeds.includes(feed.feedkind || '');

  return (
    <div id={props.id} class={styles.feedSorter} ref={sorter}>
      <div class="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage()}
      </div>
      <Show when={props.feeds.length > 0}>
        <For each={props.feeds}>
          {(feed, index) => (
            <div
              class={styles.feedItem}
              data-value={feed.spec}
              data-index={index()}
              role="listitem"
              tabIndex={0}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.ctrlKey && e.key === 'ArrowUp') {
                  e.preventDefault();
                  moveItemUp(index());
                }
                if (e.ctrlKey && e.key === 'ArrowDown') {
                  e.preventDefault();
                  moveItemDown(index());
                }
              }}
            >
              <Show
                when={editMode() === constructId(feed)}
                fallback={
                  <>
                    <div class={styles.feedInfo}>
                      <div class={styles.feedName}>{feed.name}</div>
                      <div class={styles.feedDescription}>{feed.description}</div>
                    </div>
                    <Show when={account?.hasPublicKey()}>
                      <div class={styles.controls}>
                        <div class={styles.manageControls}>
                          <Show when={isLockedFeed(feed)}>
                            <div class={styles.feedEnabled}>
                              <CheckBox2
                                onChange={(v: boolean) => {
                                  props.actions.enable && props.actions.enable(feed, v, props.feedType);
                                }}
                                checked={feed.enabled}
                              />
                            </div>
                          </Show>

                          <Show when={!isLockedFeed(feed)}>
                            <button
                              type="button"
                              class={styles.mngButton}
                              onClick={() => editFeed(feed)}
                              disabled={isLockedFeed(feed)}
                              aria-label={intl.formatMessage(tAria.feedSorter.rename, { name: feed.name })}
                              title={intl.formatMessage(tAria.feedSorter.rename, { name: feed.name })}
                            >
                              <div class={styles.editButton} aria-hidden="true"></div>
                            </button>
                            <button
                              type="button"
                              class={styles.mngButton}
                              onClick={() => removeFeed(feed)}
                              disabled={isLockedFeed(feed)}
                              aria-label={intl.formatMessage(tAria.feedSorter.remove, { name: feed.name })}
                              title={intl.formatMessage(tAria.feedSorter.remove, { name: feed.name })}
                            >
                              <div class={styles.deleteButton} aria-hidden="true"></div>
                            </button>
                          </Show>
                          <button
                            type="button"
                            class={styles.sortButton}
                            onClick={() => {}}
                            aria-label={intl.formatMessage(tAria.feedSorter.reorder, { name: feed.name })}
                            title={intl.formatMessage(tAria.feedSorter.reorder, { name: feed.name })}
                          >
                            <div class={styles.dragIcon} aria-hidden="true"></div>
                          </button>
                        </div>
                      </div>
                    </Show>
                  </>
                }
              >
                <div class={styles.feedEdit}>
                  <input
                    id={`input_${constructId(feed)}`}
                    class={styles.feedNameInput}
                    value={newName()}
                    aria-label={intl.formatMessage(tAria.feedSorter.inputLabel, { name: feed.name })}
                    // @ts-ignore
                    onInput={(e: InputEvent) => setNewName(() => e.target?.value)}
                    onKeyUp={(e: KeyboardEvent) => {
                      if (e.code === 'Enter') {
                        updateFeedName(feed);
                      }

                      if (e.code === 'Escape') {
                        setEditMode('');
                      }
                    }}
                  />
                  <div class={styles.feedEditControl}>
                    <button
                      type="button"
                      onClick={() => updateFeedName(feed)}
                      aria-label={intl.formatMessage(tAria.feedSorter.save, { name: feed.name })}
                      title={intl.formatMessage(tAria.feedSorter.save, { name: feed.name })}
                    >
                      <div class={styles.checkIcon} aria-hidden="true"></div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {setEditMode('')}}
                      aria-label={intl.formatMessage(tAria.feedSorter.cancel, { name: feed.name })}
                      title={intl.formatMessage(tAria.feedSorter.cancel, { name: feed.name })}
                    >
                      <div class={styles.closeIcon} aria-hidden="true"></div>
                    </button>
                  </div>
                </div>
              </Show>
            </div>
          )}
        </For>
      </Show>
    </div>
  )
}

export default hookForDev(FeedSorter);
