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
    label: 'Népszerű (24 óra)',
    value: 'trending_24h',
    id: 'trending_24h',
  },
  {
    label: 'Népszerű (12 óra)',
    value: 'trending_12h',
    id: 'trending_12h',
  },
  {
    label: 'Népszerű (4 óra)',
    value: 'trending_4h',
    id: 'trending_4h',
  },
  {
    label: 'Népszerű (1 óra)',
    value: 'trending_1h',
    id: 'trending_1h',
  },
  {
    label: '',
    value: '',
    disabled: true,
    separator: true,
  },

  {
    label: 'Legtöbbet zappolt (24 óra)',
    value: 'mostzapped_24h',
    id: 'mostzapped_24h',
  },
  {
    label: 'Legtöbbet zappolt (12 óra)',
    value: 'mostzapped_12h',
    id: 'mostzapped_12h',
  },
  {
    label: 'Legtöbbet zappolt (4 óra)',
    value: 'mostzapped_4h',
    id: 'mostzapped_4h',
  },
  {
    label: 'Legtöbbet zappolt (1 óra)',
    value: 'mostzapped_1h',
    id: 'mostzapped_1h',
  },
];

const HomeSidebar: Component< { id?: string } > = (props) => {

  const account = useAccountContext();
  const home = useHomeContext();

  onMount(() => {
    if (account?.isKeyLookupDone && home?.sidebarNotes.length === 0) {
      let stored = readHomeSidebarSelection(account.publicKey) || { ...sidebarOptions[0] };

      if (!stored.id) {
        stored = { ...sidebarOptions[0] };
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
