import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { APP_ID } from '../../App';
import { getMostZapped4h, getTrending24h } from '../../lib/feed';
import { humanizeNumber } from '../../lib/stats';
import { convertToNotes, sortByRecency, sortingPlan } from '../../stores/note';
import { Kind } from '../../constants';
import {
  isConnected,
  refreshSocketListeners,
  removeSocketListeners,
  socket,
  subscribeTo
} from '../../sockets';
import {
  FeedPage,
  NostrEOSE,
  NostrEvent,
  NostrEventContent,
  NostrMentionContent,
  NostrNoteActionsContent,
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  NoteActions,
  PrimalNote,
  SelectionOption
} from '../../types/primal';

import styles from './HomeSidebar.module.scss';
import SmallNote from '../SmallNote/SmallNote';
import { useIntl } from '@cookbook/solid-intl';
import { hourNarrow } from '../../formats';

import { home as t } from '../../translations';
import { useAccountContext } from '../../contexts/AccountContext';
import { hookForDev } from '../../lib/devTools';
import SelectionBox from '../SelectionBox/SelectionBox';
import { getScoredUsers, searchContent } from '../../lib/search';
import { store } from '../../services/StoreService';
import Loader from '../Loader/Loader';
import { readHomeSidebarSelection, saveHomeSidebarSelection } from '../../lib/localStore';

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

  const intl = useIntl();
  const account = useAccountContext();

  const [searchResults, setSearchResults] = createStore<{ notes: PrimalNote[], page: FeedPage, isFetching: boolean, query: SelectionOption | undefined }>({
    notes: [],
    page: {
      messages: [],
      users: {},
      postStats: {},
      mentions: {},
      noteActions: {},
    },
    isFetching: false,
    query: undefined,
  });

  const saveNotes = (newNotes: PrimalNote[]) => {
    setSearchResults('notes', () => [ ...newNotes ]);
    setSearchResults('isFetching', () => false);
  };

  const updatePage = (content: NostrEventContent) => {
    if (content.kind === Kind.Metadata) {
      const user = content as NostrUserContent;

      setSearchResults('page', 'users',
        (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
      );
      return;
    }

    if ([Kind.Text, Kind.Repost].includes(content.kind)) {
      const message = content as NostrNoteContent;

      if (searchResults.page.messages.find(m => m.id === message.id)) {
        return;
      }

      setSearchResults('page', 'messages',
        (msgs) => [ ...msgs, { ...message }]
      );

      return;
    }

    if (content.kind === Kind.NoteStats) {
      const statistic = content as NostrStatsContent;
      const stat = JSON.parse(statistic.content);

      setSearchResults('page', 'postStats',
        (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
      );
      return;
    }

    if (content.kind === Kind.Mentions) {
      const mentionContent = content as NostrMentionContent;
      const mention = JSON.parse(mentionContent.content);

      setSearchResults('page', 'mentions',
        (mentions) => ({ ...mentions, [mention.id]: { ...mention } })
      );
      return;
    }

    if (content.kind === Kind.NoteActions) {
      const noteActionContent = content as NostrNoteActionsContent;
      const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

      setSearchResults('page', 'noteActions',
        (actions) => ({ ...actions, [noteActions.event_id]: { ...noteActions } })
      );
      return;
    }
  };

  const savePage = (page: FeedPage) => {
    const newPosts = sortByRecency(convertToNotes(page));

    saveNotes(newPosts);
  };

  const doSearch = (query: string) => {
    const subid = `home_sidebar_${APP_ID}`;

    const unsub = subscribeTo(subid, (type, _, content) => {

      if (type === 'EOSE') {
        savePage(searchResults.page);
        unsub();
        return;
      }

      if (!content) {
        return;
      }


      if (type === 'EVENT') {
        updatePage(content);
        return;
      }

    });

    setSearchResults('isFetching', () => true);
    setSearchResults('notes', () => []);
    setSearchResults('page', { messages: [], users: {}, postStats: {}, mentions: {}, noteActions: {} });

    getScoredUsers(account?.publicKey, query, 10, subid);
  }

  createEffect(() => {
    const query = searchResults.query?.value;
    query && doSearch(query);
  });

  createEffect(() => {
    if (account?.isKeyLookupDone && account.hasPublicKey()) {
      const stored = readHomeSidebarSelection(account.publicKey);

      if (stored) {
        setSearchResults('query', () => ({...stored}));
      }
      else {
        setSearchResults('query', () => ({ ...sidebarOptions[0]}))
      }
    }
  });

  return (
    <div id={props.id}>
    <Show when={account?.isKeyLookupDone}>
      <div class={styles.headingTrending}>
        <SelectionBox
          options={sidebarOptions}
          value={searchResults.query}
          onChange={(option: SelectionOption) => {
            setSearchResults('query', () => ({...option}));
            saveHomeSidebarSelection(account?.publicKey, option)
          }}
        />
      </div>

      <Show
        when={!searchResults.isFetching}
        fallback={
          <Loader />
        }
      >
        <For each={searchResults.notes}>
          {(note) => <SmallNote note={note} />}
        </For>
      </Show>

    </Show>
    </div>
  );
}

export default hookForDev(HomeSidebar);
