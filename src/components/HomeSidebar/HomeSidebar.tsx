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
import { Transition } from 'solid-transition-group';
import SelectionBox2 from '../SelectionBox/SelectionBox2';

const sidebarOptions = [
  {
    label: 'Trending 24h',
    value: 'trending_24h',
    id: 'trending_24h',
  },
  {
    label: 'Trending 12h',
    value: 'trending_12h',
    id: 'trending_12h',
  },
  {
    label: 'Trending 4h',
    value: 'trending_4h',
    id: 'trending_4h',
  },
  {
    label: 'Trending 1h',
    value: 'trending_1h',
    id: 'trending_1h',
  },
  {
    label: '',
    value: '',
    id: 'separator_trending',
    disabled: true,
    separator: true,
  },

  {
    label: 'GM Trending 24h',
    value: 'gm_trending_24h',
    id: 'gm_trending_24h',
  },
  {
    label: 'GM Trending 12h',
    value: 'gm_trending_12h',
    id: 'gm_trending_12h',
  },
  {
    label: 'GM Trending 4h',
    value: 'gm_trending_4h',
    id: 'gm_trending_4h',
  },
  {
    label: 'GM Trending 1h',
    value: 'gm_trending_1h',
    id: 'gm_trending_1h',
  },
  {
    label: '',
    value: '',
    id: 'separator_gm_trending',
    disabled: true,
    separator: true,
  },

  {
    label: 'Classic Trending 24h',
    value: 'classic_trending_24h',
    id: 'classic_trending_24h',
  },
  {
    label: 'Classic Trending 12h',
    value: 'classic_trending_12h',
    id: 'classic_trending_12h',
  },
  {
    label: 'Classic Trending 4h',
    value: 'classic_trending_4h',
    id: 'classic_trending_4h',
  },
  {
    label: 'Classic Trending 1h',
    value: 'classic_trending_1h',
    id: 'classic_trending_1h',
  },
  {
    label: '',
    value: '',
    id: 'separator_classic_trnding',
    disabled: true,
    separator: true,
  },

  {
    label: 'Most-zapped 24h',
    value: 'mostzapped_24h',
    id: 'mostzapped_24h',
  },
  {
    label: 'Most-zapped 12h',
    value: 'mostzapped_12h',
    id: 'mostzapped_12h',
  },
  {
    label: 'Most-zapped 4h',
    value: 'mostzapped_4h',
    id: 'mostzapped_4h',
  },
  {
    label: 'Most-zapped 1h',
    value: 'mostzapped_1h',
    id: 'mostzapped_1h',
  },
];

const HomeSidebar: Component< { id?: string } > = (props) => {

  const account = useAccountContext();
  const home = useHomeContext();

  onMount(() => {
    const def = sidebarOptions.find(o => o.id === 'trending_4h') || sidebarOptions[0];
    if (account?.isKeyLookupDone && home?.sidebarNotes.length === 0) {
      let stored = readHomeSidebarSelection(account.publicKey) || { ...def };

      if (!stored.id) {
        stored = { ...def };
      }

      home?.actions.updateSidebarQuery(stored);
      home?.actions.doSidebarSearch(stored.value || '');
    }
  });

  return (
    <div id={props.id}>
      <div class={styles.headingTrending}>
        <SelectionBox2
          options={sidebarOptions}
          value={home?.sidebarQuery}
          initialValue={home?.sidebarQuery}
          onChange={(option: SelectionOption) => {
            if (option.value === home?.sidebarQuery?.value) return;
            home?.actions.updateSidebarQuery(option);
            saveHomeSidebarSelection(account?.publicKey, option);
            home?.actions.doSidebarSearch(option.value || '');
          }}
        />
      </div>

      <Transition name="slide-fade">
        <Show
          when={!home?.isFetchingSidebar}
          fallback={
            <div>
              <For each={new Array(24)}>
                {() => <ShortNoteSkeleton />}
              </For>
            </div>
          }
        >
          <div>
            <For each={home?.sidebarNotes}>
              {(note) => (
                <div class="animated">
                  <SmallNote note={note} />
                </div>
              )}
            </For>
          </div>
        </Show>
      </Transition>
    </div>
  );
}

export default hookForDev(HomeSidebar);
