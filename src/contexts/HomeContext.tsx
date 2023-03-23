import { noteEncode } from "nostr-tools/nip19";
import { createContext, createEffect, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { APP_ID } from "../App";
import { useToastContext } from "../components/Toaster/Toaster";
import { defaultFeeds, trendingFeed } from "../constants";
import { removeFromAvailableFeeds, replaceAvailableFeeds, updateAvailableFeedsTop } from "../lib/availableFeeds";
import { getExploreFeed, getFeed } from "../lib/feed";
import { hexToNpub } from "../lib/keys";
import { sortingPlan, convertToNotes } from "../stores/note";
import { profile } from "../stores/profile";
import {
  ContextChildren,
  FeedPage,
  HomeContextStore,
  NostrEventContent,
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  PrimalFeed,
  PrimalNote,
} from "../types/primal";

const initialHomeData = {
  notes: [],
  isFetching: false,
  scrollTop: 0,
  selectedFeed: undefined,
  availableFeeds: [ ...defaultFeeds ],
  page: { messages: [], users: {}, postStats: {} },
  lastNote: undefined,
};


export const HomeContext = createContext<HomeContextStore>();

export const HomeProvider = (props: { children: ContextChildren }) => {

const toaster = useToastContext();

// ACTIONS ------------------------------------

  const saveNotes = (newNotes: PrimalNote[]) => {

    updateHomeStore('notes', (notes) => [ ...notes, ...newNotes ]);
    updateHomeStore('isFetching', () => false);
  };

  const fetchNotes = (topic: string, subId: string, until = 0) => {
    const [scope, timeframe] = topic.split(';');

    if (scope && timeframe && until === 0) {
      const limit = 100;

      profile?.publicKey && getExploreFeed(
        profile.publicKey,
        `home_feed_${subId}`,
        scope,
        timeframe,
        until,
        limit,
      );
      return;
    }

    updateHomeStore('isFetching', true);
    updateHomeStore('page', () => ({ messages: [], users: {}, postStats: {} }));
    getFeed(topic, `home_feed_${subId}`, until);
  };

  const clearNotes = () => {
    updateHomeStore('scrollTop', () => 0);
    updateHomeStore('page', () => ({ messages: [], users: {}, postStats: {} }));
    updateHomeStore('notes', () => []);
    updateHomeStore('lastNote', () => undefined);
  };

  const fetchNextPage = () => {
    const lastNote = homeStore.notes[homeStore.notes.length - 1];

    if (!lastNote) {
      return;
    }

    updateHomeStore('lastNote', () => ({ ...lastNote }));

    const until = lastNote.post?.created_at || 0;

    if (until > 0) {
      const topic = homeStore.selectedFeed?.hex;

      if (topic) {
        fetchNotes(topic, `${APP_ID}`, until);
      }
    }
  };

  const updateScrollTop = (top: number) => {
    updateHomeStore('scrollTop', () => top);
  };

  const selectFeed = (feed: PrimalFeed | undefined) => {
    if (feed !== undefined && feed.hex !== undefined) {
      updateHomeStore('selectedFeed', () => ({ ...feed }));
      clearNotes();
      fetchNotes(feed.hex , `${APP_ID}`);
    }
  };

  const updatePage = (content: NostrEventContent) => {
    if (content.kind === 0) {
      const user = content as NostrUserContent;

      updateHomeStore('page', 'users',
        (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
      );
      return;
    }

    if ([1, 6].includes(content.kind)) {
      const message = content as NostrNoteContent;

      if (homeStore.lastNote?.post?.noteId !== noteEncode(message.id)) {
        updateHomeStore('page', 'messages',
          (msgs) => [ ...msgs, { ...message }]
        );
      }

      return;
    }

    if (content.kind === 10000100) {
      const statistic = content as NostrStatsContent;
      const stat = JSON.parse(statistic.content);

      updateHomeStore('page', 'postStats',
        (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
      );
      return;
    }
  };

  const savePage = (page: FeedPage) => {
    const sortingFunction = sortingPlan(homeStore.selectedFeed?.hex);

    const newPosts = sortingFunction(convertToNotes(page));

    saveNotes(newPosts);
  };

  const addAvailableFeed = (feed: PrimalFeed) => {
    if (!feed) {
      return;
    }
    if (profile.publicKey) {
      updateHomeStore('availableFeeds',
        (feeds) => updateAvailableFeedsTop(profile.publicKey, feed, feeds),
      );
    }
  };

  const removeAvailableFeed = (feed: PrimalFeed) => {
    if (!feed) {
      return;
    }

    if (profile.publicKey) {
      updateHomeStore('availableFeeds',
        (feeds) => removeFromAvailableFeeds(profile.publicKey, feed, feeds),
      );
      toaster?.sendSuccess(`"${feed.name}" has been removed from your home page`);
    }
  };

  const setAvailableFeeds = (feedList: PrimalFeed[]) => {
    if (profile.publicKey) {
      updateHomeStore('availableFeeds',
        () => replaceAvailableFeeds(profile.publicKey, feedList),
      );
    }
  };

// EFFECTS --------------------------------------

  createEffect(() => {
    if (profile.publicKey) {
      const npub = hexToNpub(profile.publicKey);
      const feed = {
        name: 'Latest, following',
        hex: profile.publicKey,
        npub,
      };

      addAvailableFeed(trendingFeed);
      addAvailableFeed(feed);
    }
  });


// STORES -------------------------------------

  const [homeStore, updateHomeStore] = createStore<HomeContextStore>({
    ...initialHomeData,
    actions: {
      saveNotes,
      clearNotes,
      fetchNotes,
      fetchNextPage,
      selectFeed,
      updateScrollTop,
      updatePage,
      savePage,
      addAvailableFeed,
      removeAvailableFeed,
      setAvailableFeeds,
    },
  });

// RENDER -------------------------------------

  return (
    <HomeContext.Provider value={homeStore}>
      {props.children}
    </HomeContext.Provider>
  );
}

export const useHomeContext = () => useContext(HomeContext);
