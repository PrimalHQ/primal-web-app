import { createStore, reconcile } from "solid-js/store";
import {
  createContext,
  createEffect,
  JSXElement,
  onCleanup,
  onMount,
  useContext
} from "solid-js";
import { PrimalArticle, PrimalNote, PrimalUser, ZapOption } from "../types/primal";
import { CashuMint } from "@cashu/cashu-ts";


export type ReactionStats = {
  likes: number,
  zaps: number,
  reposts: number,
  quotes: number,
  openOn: string,
};

export type CustomZapInfo = {
  profile?: PrimalUser,
  note?: PrimalNote | PrimalArticle,
  onConfirm: (zapOption: ZapOption) => void,
  onSuccess: (zapOption: ZapOption) => void,
  onFail: (zapOption: ZapOption) => void,
  onCancel: (zapOption: ZapOption) => void,
};

export type NoteContextMenuInfo = {
  note: PrimalNote | PrimalArticle,
  position: DOMRect | undefined,
  openCustomZap?: () => void,
  openReactions?: () => void,
};

export type ConfirmInfo = {
  title: string,
  description: string,
  confirmLabel?: string,
  abortLabel?: string,
  onConfirm?: () => void,
  onAbort?: () => void,
};

export type InvoiceInfo = {
  invoice: string,
  onPay?: () => void,
  onCancel?: () => void,
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
  showLnInvoiceModal: boolean,
  lnbc: InvoiceInfo | undefined,
  showCashuInvoiceModal: boolean,
  cashu: InvoiceInfo | undefined,
  showConfirmModal: boolean,
  confirmInfo: ConfirmInfo | undefined,
  cashuMints: Map<string, CashuMint>,
  subscribeToAuthor: PrimalUser | undefined,
  actions: {
    openReactionModal: (noteId: string, stats: ReactionStats) => void,
    closeReactionModal: () => void,
    openCustomZapModal: (custonZapInfo: CustomZapInfo) => void,
    closeCustomZapModal: () => void,
    resetCustomZap: () => void,
    openContextMenu: (note: PrimalNote | PrimalArticle, position: DOMRect | undefined, openCustomZapModal: () => void, openReactionModal: () => void) => void,
    closeContextMenu: () => void,
    openLnbcModal: (lnbc: string, onPay: () => void) => void,
    closeLnbcModal: () => void,
    openCashuModal: (cashu: string, onPay: () => void) => void,
    closeCashuModal: () => void,
    openConfirmModal: (confirmInfo: ConfirmInfo) => void,
    closeConfirmModal: () => void,
    getCashuMint: (url: string) => CashuMint | undefined,
    openAuthorSubscribeModal: (author: PrimalUser | undefined) => void,
    closeAuthorSubscribeModal: () => void,
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
    openOn: 'likes',
  },
  showCustomZapModal: false,
  customZap: undefined,
  showNoteContextMenu: false,
  noteContextMenuInfo: undefined,
  showLnInvoiceModal: false,
  lnbc: undefined,
  showCashuInvoiceModal: false,
  cashu: undefined,
  showConfirmModal: false,
  confirmInfo: undefined,
  cashuMints: new Map(),
  subscribeToAuthor: undefined,
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
    updateStore('customZap', () => ({ ...customZapInfo }));
    updateStore('showCustomZapModal', () => true);
  };

  const closeCustomZapModal = () => {
    updateStore('showCustomZapModal', () => false);
  };

  const resetCustomZap = () => {
    updateStore('customZap', () => undefined);
  };

  const openContextMenu = (
    note: PrimalNote | PrimalArticle,
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

  const openLnbcModal = (lnbc: string, onPay: () => void) => {
    updateStore('showLnInvoiceModal', () => true);
    updateStore('lnbc', () => ({
      invoice: lnbc,
      onPay,
      onCancel: () => updateStore('showLnInvoiceModal', () => false),
    }))
  };

  const closeLnbcModal = () => {
    updateStore('showLnInvoiceModal', () => false);
    updateStore('lnbc', () => undefined);
  };


  const openCashuModal = (cashu: string, onPay: () => void) => {
    updateStore('showCashuInvoiceModal', () => true);
    updateStore('cashu', () => ({
      invoice: cashu,
      onPay,
      onCancel: () => updateStore('showCashuInvoiceModal', () => false),
    }))
  };

  const closeCashuModal = () => {
    updateStore('showCashuInvoiceModal', () => false);
    updateStore('cashu', () => undefined);
  };

  const openConfirmModal = (confirmInfo: ConfirmInfo) => {
    updateStore('showConfirmModal', () => true);
    updateStore('confirmInfo', () => ({...confirmInfo }));
  };

  const closeConfirmModal = () => {
    updateStore('showConfirmModal', () => false);
    updateStore('confirmInfo', () => undefined);
  };

  const closeContextMenu = () => {
    updateStore('showNoteContextMenu', () => false);
  };

  const getCashuMint = (url: string) => {
    const formatted = new URL(url).toString();
    if (!store.cashuMints.has(formatted)) {
      const mint = new CashuMint(formatted);
      store.cashuMints.set(formatted, mint);
    }
    return store.cashuMints.get(formatted);
  };


  const openAuthorSubscribeModal = (author: PrimalUser | undefined) => {
    console.log('OPEN: ', author)
    author && updateStore('subscribeToAuthor', () => ({ ...author }));
  };

  const closeAuthorSubscribeModal = () => {
    updateStore('subscribeToAuthor', () => undefined);
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
      resetCustomZap,
      openContextMenu,
      closeContextMenu,
      openLnbcModal,
      closeLnbcModal,
      openConfirmModal,
      closeConfirmModal,
      openCashuModal,
      closeCashuModal,
      getCashuMint,
      openAuthorSubscribeModal,
      closeAuthorSubscribeModal,
    }
  });

  return (
      <AppContext.Provider value={store}>
        {props.children}
      </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
