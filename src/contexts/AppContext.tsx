import { createStore, reconcile } from "solid-js/store";
import {
  createContext,
  createEffect,
  JSXElement,
  onCleanup,
  onMount,
  useContext
} from "solid-js";
import { PrimalNote, PrimalUser, ZapOption } from "../types/primal";

export type ReactionStats = {
  likes: number,
  zaps: number,
  reposts: number,
  quotes: number,
};

export type CustomZapInfo = {
  profile?: PrimalUser,
  note?: PrimalNote,
  onConfirm: (zapOption: ZapOption) => void,
  onSuccess: (zapOption: ZapOption) => void,
  onFail: (zapOption: ZapOption) => void,
  onCancel: (zapOption: ZapOption) => void,
};

export type NoteContextMenuInfo = {
  note: PrimalNote,
  position: DOMRect | undefined,
  openCustomZap?: () => void,
  openReactions?: () => void,
};

export type AppContextStore = {
  isInactive: boolean,
  appState: 'sleep' | 'waking' | 'woke',
  showReactionsModal: string | undefined,
  reactionStats: ReactionStats,
  showCustomZapModal: boolean,
  customZap: CustomZapInfo | undefined,
  showNoteContextMenu: boolean,
  noteContextMenuInfo: NoteContextMenuInfo | undefined,
  actions: {
    openReactionModal: (noteId: string, stats: ReactionStats) => void,
    closeReactionModal: () => void,
    openCustomZapModal: (custonZapInfo: CustomZapInfo) => void,
    closeCustomZapModal: () => void,
    openContextMenu: (note: PrimalNote, position: DOMRect | undefined, openCustomZapModal: () => void, openReactionModal: () => void) => void,
    closeContextMenu: () => void,
  },
}

const initialData: Omit<AppContextStore, 'actions'> = {
  isInactive: false,
  appState: 'woke',
  showReactionsModal: undefined,
  reactionStats: {
    likes: 0,
    zaps: 0,
    reposts: 0,
    quotes: 0,
  },
  showCustomZapModal: false,
  customZap: undefined,
  showNoteContextMenu: false,
  noteContextMenuInfo: undefined,
};

export const AppContext = createContext<AppContextStore>();

export const AppProvider = (props: { children: JSXElement }) => {

  let inactivityCounter = 0;

  const monitorActivity = () => {
    clearTimeout(inactivityCounter);

    if (store.isInactive) {
      updateStore('isInactive', () => false)
    }

    inactivityCounter = setTimeout(() => {
      updateStore('isInactive', () => true)
    }, 3 * 60_000);
  };

  const openReactionModal = (noteId: string, stats: ReactionStats) => {
    updateStore('reactionStats', () => ({ ...stats }));
    updateStore('showReactionsModal', () => noteId);
  };

  const closeReactionModal = () => {
    updateStore('reactionStats', () => ({
      likes: 0,
      zaps: 0,
      reposts: 0,
      quotes: 0,
    }));
    updateStore('showReactionsModal', () => undefined);
  };

  const openCustomZapModal = (customZapInfo: CustomZapInfo) => {
    updateStore('customZap', reconcile({ ...customZapInfo }));
    updateStore('showCustomZapModal', () => true);
  };

  const closeCustomZapModal = () => {
    updateStore('showCustomZapModal', () => false);
  };

  const openContextMenu = (
    note: PrimalNote,
    position: DOMRect | undefined,
    openCustomZap: () => void,
    openReactions: () => void,
  ) => {
    updateStore('noteContextMenuInfo', reconcile({
      note,
      position,
      openCustomZap,
      openReactions,
    }))
    updateStore('showNoteContextMenu', () => true);
  };

  const closeContextMenu = () => {
    updateStore('showNoteContextMenu', () => false);
  };

// EFFECTS --------------------------------------

  onMount(() => {
    document.addEventListener('mousemove', monitorActivity);
    document.addEventListener('scroll', monitorActivity);
    document.addEventListener('keydown', monitorActivity);
  });

  onCleanup(() => {
    document.removeEventListener('mousemove', monitorActivity);
    document.removeEventListener('scroll', monitorActivity);
    document.removeEventListener('keydown', monitorActivity);
  });

  let wakingTimeout = 0;

  createEffect(() => {
    if (store.isInactive) {
      updateStore('appState', () => 'sleep');
      clearTimeout(wakingTimeout);
    }
    else {
      // Set this state in order to make sure that we reload page
      // when user requests future notes because we didn't fetch them yet
      updateStore('appState', () => 'waking');

      // Give time for future notes fetching to fire before changing state
      wakingTimeout = setTimeout(() => {
        updateStore('appState', () => 'woke');
      }, 36_000);
    }
  });

// STORES ---------------------------------------

  const [store, updateStore] = createStore<AppContextStore>({
    ...initialData,
    actions: {
      openReactionModal,
      closeReactionModal,
      openCustomZapModal,
      closeCustomZapModal,
      openContextMenu,
      closeContextMenu,
    }
  });

  return (
      <AppContext.Provider value={store}>
        {props.children}
      </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
