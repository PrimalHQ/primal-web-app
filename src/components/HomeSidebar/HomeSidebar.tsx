import { Component, For, onMount, Show } from 'solid-js';

import {
  SelectionOption
} from '../../types/primal';

import styles from './HomeSidebar.module.scss';
import SmallNote from '../SmallNote/SmallNote';
import { useAccountContext } from '../../contexts/AccountContext';
import { hookForDev } from '../../lib/devTools';
import SelectionBox from '../SelectionBox/SelectionBox';
import Loader from '../Loader/Loader';
import { readHomeSidebarSelection, saveHomeSidebarSelection } from '../../lib/localStore';
import { useHomeContext } from '../../contexts/HomeContext';
import ShortNoteSkeleton from '../Skeleton/ShortNoteSkeleton';

const sidebarOptions = [
  {
    label: 'Trending 24h',
    value: 'trending_24h',
  },
  {
    label: 'Trending 12h',
    value: 'trending_12h',
  },
  {
    label: 'Trending 4h',
    value: 'trending_4h',
  },
  {
    label: 'Trending 1h',
    value: 'trending_1h',
  },
  {
    label: '',
    value: '',
    disabled: true,
    separator: true,
  },

  {
    label: 'Most-zapped 24h',
    value: 'mostzapped_24h',
  },
  {
    label: 'Most-zapped 12h',
    value: 'mostzapped_12h',
  },
  {
    label: 'Most-zapped 4h',
    value: 'mostzapped_4h',
  },
  {
    label: 'Most-zapped 1h',
    value: 'mostzapped_1h',
  },
];

const HomeSidebar: Component< { id?: string } > = (props) => {

  const account = useAccountContext();
  const home = useHomeContext();

  onMount(() => {
    if (account?.isKeyLookupDone && home?.sidebar.notes.length === 0) {
      const stored = readHomeSidebarSelection(account.publicKey) || sidebarOptions[0];

      home?.actions.updateSidebarQuery(stored);
      home?.actions.doSidebarSearch(home?.sidebar.query?.value || '');
    }
  });

  return (
    <div id={props.id}>
    <Show when={account?.isKeyLookupDone}>
      <div class={styles.headingTrending}>
        <SelectionBox
          options={sidebarOptions}
          value={home?.sidebar.query}
          onChange={(option: SelectionOption) => {
            home?.actions.updateSidebarQuery(option);
            saveHomeSidebarSelection(account?.publicKey, option);
            home?.actions.doSidebarSearch(home?.sidebar.query?.value || '');
          }}
        />
      </div>

      <Show
        when={!home?.sidebar.isFetching}
        fallback={
          <div>
            <ShortNoteSkeleton />
            <ShortNoteSkeleton />
            <ShortNoteSkeleton />
            <ShortNoteSkeleton />
            <ShortNoteSkeleton />
            <ShortNoteSkeleton />
            <ShortNoteSkeleton />
            <ShortNoteSkeleton />
            <ShortNoteSkeleton />
            <ShortNoteSkeleton />
          </div>
        }
      >
        <For each={home?.sidebar.notes}>
          {(note) => <SmallNote note={note} />}
        </For>
      </Show>

    </Show>
    </div>
  );
}

export default hookForDev(HomeSidebar);
