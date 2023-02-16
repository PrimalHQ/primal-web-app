import { Component, createEffect, For } from 'solid-js';
import { useFeedContext } from '../../contexts/FeedContext';

import styles from './FeedSelect.module.scss';

const FeedSelect: Component = () => {

  const context = useFeedContext();

  const selectFeed = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const hex = target?.value;
    const profile = context?.data?.availableFeeds.find(p => p.hex === hex);

    context?.actions?.clearData();
    context?.actions?.selectFeed(profile);
  };

  return (
      <select
        class={styles.selector}
        name="profiles"
        id="profiles"
        onChange={selectFeed}
      >
        <For each={context?.data?.availableFeeds}>
          {(profile) =>
            <option
              value={profile.hex}
              selected={context?.data?.selectedFeed?.hex === profile.hex}
            >
              {profile.name}
            </option>
          }
        </For>
      </select>
  );
}

export default FeedSelect;
