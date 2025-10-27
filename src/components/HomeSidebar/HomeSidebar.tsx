import {
  Component,
  createEffect,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';

import {
  PrimalUser,
  SelectionOption
} from '../../types/primal';

import {
  loadLiveAuthors,
  loadLiveStreams,
  readHomeSidebarSelection,
  saveHomeSidebarSelection,
  saveLiveAuthors,
  saveLiveStreams,
} from '../../lib/localStore';

import {
  startListeningForLiveEventsSidebar,
  stopListeningForLiveEventsSidebar,
  StreamingData,
} from '../../lib/streaming';

import styles from './HomeSidebar.module.scss';
import SmallNote from '../SmallNote/SmallNote';
import { hookForDev } from '../../lib/devTools';
import { useHomeContext } from '../../contexts/HomeContext';
import ShortNoteSkeleton from '../Skeleton/ShortNoteSkeleton';
import { Transition } from 'solid-transition-group';
import SelectionBox2 from '../SelectionBox/SelectionBox2';
import { APP_ID } from '../../App';
import { subsTo } from '../../sockets';
import { createStore } from 'solid-js/store';
import { Kind } from '../../constants';
import { fetchPeople } from '../../megaFeeds';
import { useAppContext } from '../../contexts/AppContext';
import LiveEventSidebarSkeleton from '../Skeleton/LiveEventSidebarSkeleton';
import LivePill from '../LivePill/LivePill';
import { accountStore } from '../../stores/accountStore';

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
    saveLiveAuthors(accountStore.publicKey, liveAuthors);
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

  const [initialLiveLoaded, setInitialLiveLoaded] = createSignal(false);

  createEffect(on(() => accountStore.publicKey, (pubkey) => {
    const def = sidebarOptions.find(o => o.id === 'trending_4h') || sidebarOptions[0];
    if (accountStore.isKeyLookupDone && home?.sidebarNotes.length === 0) {
      let stored = readHomeSidebarSelection(accountStore.publicKey) || { ...def };

      if (!stored.id) {
        stored = { ...def };
      }

      home?.actions.updateSidebarQuery(stored);
      home?.actions.doSidebarSearch(stored.value || '');
    }

    if (['none', 'guest'].includes(accountStore.loginType)) return;

    if (accountStore.isKeyLookupDone) {
      const cachedStreams = loadLiveStreams(pubkey);
      const cachedLiveAuthors = loadLiveAuthors(pubkey);

      if (cachedStreams.length > 0) {
        // setInitialLiveLoaded(true);
        setLiveEvents(() => [...cachedStreams]);
        setLiveAuthors(() => [ ...cachedLiveAuthors ]);
      }
    }

    if (unsub) unsub();

    let events: StreamingData[] = []

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
            hosts: (event.tags || []).filter(t => t[0] === 'p' && t[3].toLowerCase() === 'host').map(t => t[1]),
            participants: (event.tags || []).filter(t => t[0] === 'p').map(t => t[1]),
          };

          if (!initialLiveLoaded()) {
            events.push({ ...streamData });
            return;
          }

          storeStreamData(streamData);
        }
      },
      onEose: () => {
        setLiveEvents([]);
        saveLiveStreams(accountStore.publicKey, []);
        events.forEach(storeStreamData);
        setInitialLiveLoaded(true);
      }
    })

    startListeningForLiveEventsSidebar(pubkey, subId);
  }));

  onCleanup(() => {
    unsub && unsub();
    stopListeningForLiveEventsSidebar(subId);
    unsub = undefined;
  });

  const storeStreamData = (streamData: StreamingData) => {
    const host = streamData.hosts?.[0] || streamData.pubkey || '';

    if (!liveAuthorPubkeys.includes(host)) {
      let newPubkeys = [streamData.pubkey || ''];
      newPubkeys = [...newPubkeys, ...(streamData.hosts || []), ...(streamData.participants || [])].reduce<string[]>((acc, p) => {
        if (acc.includes(p)) return acc;

        return [...acc, p];
      }, []);

      setLiveAuthorPubkeys(pks => [...pks, ...newPubkeys]);
    }

    const index = liveEvents.findIndex(e => e.id === streamData.id && e.pubkey === streamData.pubkey);

    // Remove ended events
    if (index >= 0 && streamData.status !== 'live') {
      setLiveEvents((le) => le.filter(e => e.id !== streamData.id && e.pubkey !== streamData.pubkey));
      saveLiveStreams(accountStore.publicKey, liveEvents);
      return;
    }

    // Add new Events
    if (index < 0 && streamData.status === 'live') {
      setLiveEvents(liveEvents.length, () => ({ ...streamData }));
      saveLiveStreams(accountStore.publicKey, liveEvents);
      return;
    }

    // Update existing events
    if (streamData.status === 'live') {
      setLiveEvents(index, () => ({ ...streamData }));
      saveLiveStreams(accountStore.publicKey, liveEvents);
    }

    return;
  }

  const liveHref = (event: StreamingData | undefined) => {
    if (!event) return '';

    let host = event.hosts?.[0] || event.pubkey;

    return `${app?.actions.profileLink(host, true)}/live/${event.id}`;
  }

  const liveAuthor = (data: StreamingData) => {
    const pubkey = data.hosts?.[0]

    if (pubkey) {
      return liveAuthors.find(a => a.pubkey === pubkey);
    }

    return liveAuthors.find(a => a.pubkey === data.pubkey);
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
              <Show
                when={liveAuthor(liveEvent)}
                fallback={<LiveEventSidebarSkeleton />}
              >
                <LivePill
                  liveEvent={liveEvent}
                  liveAuthor={liveAuthor(liveEvent)}
                />
              </Show>
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
            saveHomeSidebarSelection(accountStore.publicKey, option);
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
