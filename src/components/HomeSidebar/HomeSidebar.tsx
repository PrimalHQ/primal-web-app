import { Component, createEffect, For, onCleanup, onMount, Show } from 'solid-js';

import {
  PrimalUser,
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
import { APP_ID } from '../../App';
import { startListeningForLiveEventsSidebar, stopListeningForLiveEventsSidebar, StreamingData } from '../../lib/streaming';
import { subsTo } from '../../sockets';
import { createStore } from 'solid-js/store';
import { Kind } from '../../constants';
import { fetchPeople } from '../../megaFeeds';
import Avatar from '../Avatar/Avatar';
import { userName } from '../../stores/profile';
import { date } from '../../lib/dates';
import { useAppContext } from '../../contexts/AppContext';

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

  // {
  //   label: 'GM Trending 24h',
  //   value: 'gm_trending_24h',
  //   id: 'gm_trending_24h',
  // },
  // {
  //   label: 'GM Trending 12h',
  //   value: 'gm_trending_12h',
  //   id: 'gm_trending_12h',
  // },
  // {
  //   label: 'GM Trending 4h',
  //   value: 'gm_trending_4h',
  //   id: 'gm_trending_4h',
  // },
  // {
  //   label: 'GM Trending 1h',
  //   value: 'gm_trending_1h',
  //   id: 'gm_trending_1h',
  // },
  // {
  //   label: '',
  //   value: '',
  //   id: 'separator_gm_trending',
  //   disabled: true,
  //   separator: true,
  // },

  // {
  //   label: 'Classic Trending 24h',
  //   value: 'classic_trending_24h',
  //   id: 'classic_trending_24h',
  // },
  // {
  //   label: 'Classic Trending 12h',
  //   value: 'classic_trending_12h',
  //   id: 'classic_trending_12h',
  // },
  // {
  //   label: 'Classic Trending 4h',
  //   value: 'classic_trending_4h',
  //   id: 'classic_trending_4h',
  // },
  // {
  //   label: 'Classic Trending 1h',
  //   value: 'classic_trending_1h',
  //   id: 'classic_trending_1h',
  // },
  // {
  //   label: '',
  //   value: '',
  //   id: 'separator_classic_trnding',
  //   disabled: true,
  //   separator: true,
  // },

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
  const app = useAppContext();

  const subId = `live_events_sidebar_${APP_ID}`;

  let unsub: (() => void) | undefined;

  const [liveEvents, setLiveEvents] = createStore<StreamingData[]>([]);

  const [liveAuthorPubkeys, setLiveAuthorPubkeys] = createStore<string[]>([]);
  const [liveAuthors, setLiveAuthors] = createStore<PrimalUser[]>([]);

  const fetchLiveAuthors = async (pubkeys: string[]) => {
    const subId = `fetch_live_authors_${APP_ID}`;

    const pks = pubkeys.reduce<string[]>((acc, pk) => {
      return acc.includes(pk) ? acc : [...acc, pk]
    }, []);

    const { users } = await fetchPeople(pks, subId);
    setLiveAuthors((peps) => [ ...peps, ...users]);
  }

  let debounce = 0;

  createEffect(() => {
    const pubkeys = [...liveAuthorPubkeys];
    if (debounce) {
      clearTimeout(debounce);
    }

    debounce = setTimeout(() => {
      fetchLiveAuthors(pubkeys);
    }, 100);
  });

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

    if (unsub) unsub();

    unsub = subsTo(subId, {
      onEvent: (_, event) => {
        if (event.kind === Kind.LiveEvent) {
          const streamData = {
            id: (event.tags?.find((t: string[]) => t[0] === 'd') || [])[1],
            url: (event.tags?.find((t: string[]) => t[0] === 'streaming') || [])[1],
            image: (event.tags?.find((t: string[]) => t[0] === 'image') || [])[1],
            status: (event.tags?.find((t: string[]) => t[0] === 'status') || [])[1],
            starts: parseInt((event.tags?.find((t: string[]) => t[0] === 'starts') || ['', '0'])[1]),
            summary: (event.tags?.find((t: string[]) => t[0] === 'summary') || [])[1],
            title: (event.tags?.find((t: string[]) => t[0] === 'title') || [])[1],
            client: (event.tags?.find((t: string[]) => t[0] === 'client') || [])[1],
            currentParticipants: parseInt((event.tags?.find((t: string[]) => t[0] === 'current_participants') || ['', '0'])[1] || '0'),
            pubkey: event.pubkey,
            event: { ...event },
          };

          if (!liveAuthorPubkeys.includes(streamData.pubkey)) {
            setLiveAuthorPubkeys(pks => [...pks, streamData.pubkey]);
          }

          const index = liveEvents.findIndex(e => e.id === streamData.id && e.pubkey === streamData.pubkey);

          if (index < 0 && streamData.status === 'live') {
            setLiveEvents(liveEvents.length, () => ({ ...streamData }));
            return;
          }

          if (streamData.status)

          setLiveEvents(index, () => ({ ...streamData }));
          return;
        }
      }
    })

    startListeningForLiveEventsSidebar(account?.publicKey, subId);
  });

  onCleanup(() => {
    unsub && unsub();
    stopListeningForLiveEventsSidebar(subId);
  });

  const liveHref = (event: StreamingData | undefined) => {
    if (!event) return '';

    return `${app?.actions.profileLink(event.pubkey, true)}/live/${event.id}`;

  }

  return (
    <div id={props.id}>
      <Show when={liveEvents.length > 0}>
        <div class={styles.headingLive}>
          <div>
            Live on Nostr
          </div>
        </div>

        <div class={styles.liveList}>
          <For each={liveEvents}>
            {liveEvent => (
              <a class={styles.liveItem} href={liveHref(liveEvent)}>
                <div class={styles.leftSide}>
                  <Avatar user={liveAuthors.find(a => a.pubkey === liveEvent.pubkey)} size="xxs" />
                  <div class={styles.eventInfo}>
                    <div class={styles.authorName}>{userName(liveAuthors.find(a => a.pubkey === liveEvent.pubkey))}</div>
                    <div class={styles.ribbon}>
                      <div class={styles.time}>Started {date(liveEvent.starts || 0).label} ago</div>

                        <div class={styles.participantIcon}></div>
                        <div>{liveEvent.currentParticipants || 0}</div>

                    </div>
                  </div>
                </div>
                <div class={styles.liveStatus}>
                  <div class={styles.liveDot}></div>
                  Live
                </div>
              </a>
            )}
          </For>
        </div>
      </Show>


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
