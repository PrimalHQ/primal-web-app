import { createStore, reconcile } from "solid-js/store";
import {
  batch,
  createContext,
  createEffect,
  JSXElement,
  onCleanup,
  onMount,
  useContext
} from "solid-js";
import { MediaEvent, MediaVariant, NostrBlossom, NostrEOSE, NostrEvent, NostrEventContent, NostrEvents, NostrLiveChat, PrimalArticle, PrimalDVM, PrimalNote, PrimalUser, ZapOption } from "../types/primal";
import { Tier, TierCost } from "../components/SubscribeToAuthorModal/SubscribeToAuthorModal";
import { connect, disconnect, isConnected, isNotConnected, readData, refreshSocketListeners, removeSocketListeners, socket } from "../sockets";
import { nip19, Relay } from "../lib/nTools";
import { logError, logInfo } from "../lib/logger";
import { Kind } from "../constants";
import { LegendCustomizationConfig } from "../lib/premium";
import { StreamingData } from "../lib/streaming";
import { createCashuMint, type CashuMint } from "../lib/cashu";


const decodedPubkeyCache = new Map<string, string>();
const encodedProfileCache = new Map<string, string>();

const stripProfilePrefix = (value: string) => {
  if (value.startsWith('p/')) {
    return value.slice(2);
  }

  if (value.startsWith('/')) {
    return value.slice(1);
  }

  return value;
};

const decodeToHex = (value: string) => {
  const normalized = stripProfilePrefix(value);

  if (!normalized.startsWith('npub')) {
    return normalized;
  }

  const cached = decodedPubkeyCache.get(normalized);
  if (cached) {
    return cached;
  }

  try {
    const decoded = nip19.decode(normalized);
    const hex = typeof decoded.data === 'string' ? decoded.data : decoded.data.pubkey;
    decodedPubkeyCache.set(normalized, hex);
    return hex;
  } catch (e) {
    decodedPubkeyCache.set(normalized, normalized);
    return normalized;
  }
};

const encodeProfilePointer = (hex: string) => {
  const cached = encodedProfileCache.get(hex);
  if (cached) {
    return cached;
  }

  try {
    const encoded = nip19.nprofileEncode({ pubkey: hex });
    encodedProfileCache.set(hex, encoded);
    return encoded;
  } catch (e) {
    encodedProfileCache.set(hex, hex);
    return hex;
  }
};


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
  dvm?: PrimalDVM,
  stream?: StreamingData,
  streamAuthor?: PrimalUser,
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
  onDelete?: (id: string) => void,
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

export type CohortInfo = {
  cohort_1: string,
  cohort_2: string,
  tier: string,
  expires_on: number,
  edited_shoutout?: string,
  legend_since?: number,
  premium_since?: number,
};

export type LiveStreamContextMenuInfo = {
  stream: StreamingData,
  streamAuthor: PrimalUser,
  position: DOMRect | undefined,
  onDelete?: (id: string) => void,
};

export type AppContextStore = {
  events: Record<number, NostrEventContent[]>,
  isInactive: boolean,
  appState: 'sleep' | 'waking' | 'woke',
  showReactionsModal: string | undefined,
  reactionStats: ReactionStats,
  showCustomZapModal: boolean,
  customZap: CustomZapInfo | undefined,
  showNoteContextMenu: boolean,
  noteContextMenuInfo: NoteContextMenuInfo | undefined,
  showStreamContextMenu: boolean,
  streamContextMenuInfo: LiveStreamContextMenuInfo | undefined,
  showArticleOverviewContextMenu: boolean,
  articleOverviewContextMenuInfo: NoteContextMenuInfo | undefined,
  showArticleDraftContextMenu: boolean,
  articleDraftContextMenuInfo: NoteContextMenuInfo | undefined,
  showLnInvoiceModal: boolean,
  lnbc: InvoiceInfo | undefined,
  showCashuInvoiceModal: boolean,
  cashu: InvoiceInfo | undefined,
  showConfirmModal: boolean,
  confirmInfo: ConfirmInfo | undefined,
  cashuMints: Map<string, Promise<CashuMint | undefined>>,
  subscribeToAuthor: PrimalUser | undefined,
  subscribeToTier: (tier: Tier) => void,
  connectedRelays: Relay[],
  verifiedUsers: Record<string, string>,
  legendCustomization: Record<string, LegendCustomizationConfig>,
  memberCohortInfo: Record<string, CohortInfo>,
  showProfileQr: PrimalUser | undefined,
  reportContent: PrimalNote | PrimalArticle | NostrLiveChat | undefined,
  actions: {
    openReactionModal: (noteId: string, stats: ReactionStats) => void,
    closeReactionModal: () => void,
    openCustomZapModal: (custonZapInfo: CustomZapInfo) => void,
    closeCustomZapModal: () => void,
    resetCustomZap: () => void,
    openContextMenu: (
      note: PrimalNote | PrimalArticle,
      position: DOMRect | undefined,
      openCustomZap: () => void,
      openReaction: () => void,
      onDelete: (id: string) => void,
    ) => void,
    openStreamContextMenu: (
      stream: StreamingData,
      streamAuthor: PrimalUser,
      position: DOMRect | undefined,
      onDelete: (id: string) => void,
    ) => void,
    closeStreamContextMenu: () => void,
    closeContextMenu: () => void,
    openArticleOverviewContextMenu: (
      note: PrimalArticle,
      position: DOMRect | undefined,
      openCustomZap: () => void,
      openReaction: () => void,
      onDelete: (id: string) => void,
    ) => void,
    closeArticleOverviewContextMenu: () => void,
    openArticleDraftContextMenu: (
      note: PrimalArticle,
      position: DOMRect | undefined,
      openCustomZapModal: () => void,
      openReactionModal: () => void,
      onDelete: (id: string) => void,
    ) => void,
    closeArticleDraftContextMenu: () => void,
    openLnbcModal: (lnbc: string, onPay: () => void) => void,
    closeLnbcModal: () => void,
    openCashuModal: (cashu: string, onPay: () => void) => void,
    closeCashuModal: () => void,
    openConfirmModal: (confirmInfo: ConfirmInfo) => void,
    closeConfirmModal: () => void,
    getCashuMint: (url: string) => Promise<CashuMint | undefined>,
    openAuthorSubscribeModal: (author: PrimalUser | undefined, subscribeTo: (tier: Tier, cost: TierCost) => void) => void,
    closeAuthorSubscribeModal: () => void,
    addConnectedRelay: (relay: Relay) => void,
    removeConnectedRelay: (relay: Relay) => void,
    profileLink: (pubkey: string | undefined, noP?: boolean) => string,
    setLegendCustomization: (pubkey: string, config: LegendCustomizationConfig) => void,
    getUserBlossomUrls: (pubkey: string) => string[],
    openProfileQr: (user: PrimalUser) => void,
    closeProfileQr: () => void,
    openReportContent: (content: PrimalNote | PrimalArticle | NostrLiveChat) => void,
    closeReportContent: () => void,
  },
}

const initialData: Omit<AppContextStore, 'actions'> = {
  events: {},
  isInactive: false,
  appState: 'woke',
  showReactionsModal: undefined,
  reactionStats: {
    likes: 0,
    zaps: 0,
    reposts: 0,
    quotes: 0,
    openOn: 'default',
  },
  showCustomZapModal: false,
  customZap: undefined,
  showNoteContextMenu: false,
  noteContextMenuInfo: undefined,
  showArticleOverviewContextMenu: false,
  articleOverviewContextMenuInfo: undefined,
  showArticleDraftContextMenu: false,
  articleDraftContextMenuInfo: undefined,
  showStreamContextMenu: false,
  streamContextMenuInfo: undefined,
  showLnInvoiceModal: false,
  lnbc: undefined,
  showCashuInvoiceModal: false,
  cashu: undefined,
  showConfirmModal: false,
  confirmInfo: undefined,
  cashuMints: new Map<string, Promise<CashuMint | undefined>>(),
  subscribeToAuthor: undefined,
  connectedRelays: [],
  verifiedUsers: {},
  legendCustomization: {},
  memberCohortInfo: {},
  subscribeToTier: () => {},
  showProfileQr: undefined,
  reportContent: undefined,
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
    }, 5 * 60_000);
  };

  const openReactionModal = (noteId: string, stats: ReactionStats) => {
    batch(() => {
      updateStore('reactionStats', () => ({ openOn: 'default', ...stats }));
      updateStore('showReactionsModal', () => noteId);
    });
  };

  const closeReactionModal = () => {
    batch(() => {
      updateStore('reactionStats', () => ({
        likes: 0,
        zaps: 0,
        reposts: 0,
        quotes: 0,
        openOn: 'default',
      }));
      updateStore('showReactionsModal', () => undefined);
    });
  };

  const openCustomZapModal = (customZapInfo: CustomZapInfo) => {
    batch(() => {
      updateStore('customZap', () => ({ ...customZapInfo }));
      updateStore('showCustomZapModal', () => true);
    });
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
    onDelete: (id: string) => void,
  ) => {
    batch(() => {
      updateStore('noteContextMenuInfo', reconcile({
        note,
        position,
        openCustomZap,
        openReactions,
        onDelete,
      }));
      updateStore('showNoteContextMenu', () => true);
    });
  };

  const openStreamContextMenu = (
    stream: StreamingData,
    streamAuthor: PrimalUser,
    position: DOMRect | undefined,
    onDelete: (id: string) => void,
  ) => {
    batch(() => {
      updateStore('streamContextMenuInfo', reconcile({
        stream,
        streamAuthor,
        position,
        onDelete,
      }));
      updateStore('showStreamContextMenu', () => true);
    });
  };

  const openArticleOverviewContextMenu = (
    note: PrimalArticle,
    position: DOMRect | undefined,
    openCustomZap: () => void,
    openReactions: () => void,
    onDelete: (id: string) => void,
  ) => {
    batch(() => {
      updateStore('articleOverviewContextMenuInfo', reconcile({
        note,
        position,
        openCustomZap,
        openReactions,
        onDelete,
      }));
      updateStore('showArticleOverviewContextMenu', () => true);
    });
  };

  const openArticleDraftContextMenu = (
      note: PrimalArticle,
      position: DOMRect | undefined,
      openCustomZap: () => void,
      openReactions: () => void,
      onDelete: (id: string) => void,
    ) => {
      batch(() => {
        updateStore('articleDraftContextMenuInfo', reconcile({
          note,
          position,
          openCustomZap,
          openReactions,
          onDelete,
        }));
        updateStore('showArticleDraftContextMenu', () => true);
      });
    };

  const openLnbcModal = (lnbc: string, onPay: () => void) => {
    batch(() => {
      updateStore('showLnInvoiceModal', () => true);
      updateStore('lnbc', () => ({
        invoice: lnbc,
        onPay,
        onCancel: () => updateStore('showLnInvoiceModal', () => false),
      }));
    });
  };

  const closeLnbcModal = () => {
    batch(() => {
      updateStore('showLnInvoiceModal', () => false);
      updateStore('lnbc', () => undefined);
    });
  };


  const openCashuModal = (cashu: string, onPay: () => void) => {
    batch(() => {
      updateStore('showCashuInvoiceModal', () => true);
      updateStore('cashu', () => ({
        invoice: cashu,
        onPay,
        onCancel: () => updateStore('showCashuInvoiceModal', () => false),
      }));
    });
  };

  const closeCashuModal = () => {
    batch(() => {
      updateStore('showCashuInvoiceModal', () => false);
      updateStore('cashu', () => undefined);
    });
  };

  const openConfirmModal = (confirmInfo: ConfirmInfo) => {
    batch(() => {
      updateStore('showConfirmModal', () => true);
      updateStore('confirmInfo', () => ({...confirmInfo }));
    });
  };

  const closeConfirmModal = () => {
    batch(() => {
      updateStore('showConfirmModal', () => false);
      updateStore('confirmInfo', () => undefined);
    });
  };

  const closeContextMenu = () => {
    updateStore('showNoteContextMenu', () => false);
  };

  const closeStreamContextMenu = () => {
    updateStore('showStreamContextMenu', () => false);
  };

  const closeArticleOverviewContextMenu = () => {
    updateStore('showArticleOverviewContextMenu', () => false);
  };

  const closeArticleDraftContextMenu = () => {
    updateStore('showArticleDraftContextMenu', () => false);
  };

  const getCashuMint = async (url: string) => {
    try {
      const formatted = new URL(url).toString();
      let cached = store.cashuMints.get(formatted);

      if (!cached) {
        cached = createCashuMint(formatted);
        store.cashuMints.set(formatted, cached);
      }

      return await cached;
    } catch (error) {
      logError('Failed to initialise Cashu mint', error);
      return undefined;
    }
  };

  const openAuthorSubscribeModal = (author: PrimalUser | undefined, subscribeTo: (tier: Tier, cost: TierCost) => void) => {
    if (!author) return;

    batch(() => {
      updateStore('subscribeToAuthor', () => ({ ...author }));
      updateStore('subscribeToTier', () => subscribeTo);
    });
  };

  const closeAuthorSubscribeModal = () => {
    updateStore('subscribeToAuthor', () => undefined);
  };

  const addConnectedRelay = (relay: Relay) => {
    if (store.connectedRelays.find(r => r.url === relay.url)) return;

    updateStore('connectedRelays', store.connectedRelays.length, () => ({ ...relay }));
  };

  const removeConnectedRelay = (relay: Relay) => {
    if (!store.connectedRelays.find(r => r.url === relay.url)) return;

    updateStore('connectedRelays', (rs) => rs.filter(r => r.url !== relay.url));
  };

  const profileLink = (pubkey: string | undefined, noP?: boolean) => {
    if (!pubkey) {
      return '/home';
    }

    const normalized = decodeToHex(pubkey);
    const verifiedUser = store.verifiedUsers[normalized];

    if (verifiedUser) {
      return `/${verifiedUser}`;
    }

    const profileSegment = encodeProfilePointer(normalized);
    const prefix = noP ? '' : 'p/';

    return `/${prefix}${profileSegment}`;
  }

  const setLegendCustomization = (pubkey: string, config: LegendCustomizationConfig) => {
    updateStore('legendCustomization', (lc) => ({ ...lc, [pubkey]: { ...config } }));
  }

  const getUserBlossomUrls = (pubkey: string) => {
    const blossom = (store.events[Kind.Blossom] || []).find(b => b.pubkey === pubkey) as NostrBlossom | undefined;

    if (!blossom || !blossom.tags) return [];

    return blossom.tags.reduce<string[]>((acc, t) => {
      return t[0] === 'server' ? [ ...acc, t[1]] : acc;
    }, []);
  }

  const openProfileQr = (user: PrimalUser) => {
    updateStore('showProfileQr', () => ({ ...user }));
  }

  const closeProfileQr = () => {
    updateStore('showProfileQr', () => undefined);
  }

  const openReportContent = (user: PrimalNote | PrimalArticle | NostrLiveChat) => {
    updateStore('reportContent', () => ({ ...user }));
  }

  const closeReportContent = () => {
    updateStore('reportContent', () => undefined);
  }


// SOCKET HANDLERS ------------------------------

const handleVerifiedUsersEvent = (incoming: NostrEventContent, subId?: string) => {
  let content = incoming;

  if (incoming.kind === Kind.Mentions) {
    try {
      const wrappedEvent = JSON.parse(incoming.content) as NostrEventContent;
      content = { ...wrappedEvent };
    } catch (e) {
      content = incoming;
    }
  }

  batch(() => {
    if (content.kind === Kind.VerifiedUsersDict) {
      const verifiedUsers: Record<string, string> = JSON.parse(content.content);
      updateStore('verifiedUsers', (vu) => ({ ...vu, ...verifiedUsers }));
    }

    if (content.kind === Kind.LegendCustomization) {
      const config = JSON.parse(content.content) as Record<string, LegendCustomizationConfig>;
      updateStore('legendCustomization', (lc) => ({ ...lc, ...config }));
    }

    if (content.kind === Kind.MembershipCohortInfo) {
      const config = JSON.parse(content.content) as Record<string, CohortInfo>;
      updateStore('memberCohortInfo', (lc) => ({ ...lc, ...config }));
    }

    const events = store.events[content.kind] || [];

    if (events.length === 0) {
      updateStore(
        'events',
        content.kind,
        () => [{ ...content }],
      );
    } else if (!events.find((e: NostrEventContent) => e.id === content.id)) {
      updateStore(
        'events',
        content.kind,
        events.length,
        () => ({ ...content }),
      );
    }
  });
}

const onMessage = async (event: MessageEvent) => {
  const data = await readData(event);
  const message: NostrEvent | NostrEOSE | NostrEvents = JSON.parse(data);

  const [type, subId, content] = message;

  if (type === 'EVENTS') {
    for (let i=0;i<content.length;i++) {
      const e = content[i];
      handleVerifiedUsersEvent(e);
    }

  }

  if (type === 'EVENT') {
    handleVerifiedUsersEvent(content, subId)
  }
};

const onSocketClose = (closeEvent: CloseEvent) => {
  const webSocket = closeEvent.target as WebSocket;

  removeSocketListeners(
    webSocket,
    { message: onMessage, close: onSocketClose },
  );
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

  createEffect(() => {
    if (store.appState === 'sleep') {
      logInfo('Disconnected from Primal socket due to inactivity at: ', (new Date()).toLocaleTimeString())
      disconnect(false);
      return;
    }

    if (store.appState === 'waking' && socket()?.readyState === WebSocket.CLOSED) {
      logInfo('Reconnected to Primal socket at: ', (new Date()).toLocaleTimeString());
      connect();
    }
  })

  createEffect(() => {
    if (isConnected()) {
      refreshSocketListeners(
        socket(),
        { message: onMessage, close: onSocketClose },
      );
    }
  });

  onCleanup(() => {
    removeSocketListeners(
      socket(),
      { message: onMessage, close: onSocketClose },
    );
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
      openStreamContextMenu,
      closeContextMenu,
      closeStreamContextMenu,
      openArticleOverviewContextMenu,
      closeArticleOverviewContextMenu,
      openArticleDraftContextMenu,
      closeArticleDraftContextMenu,
      openLnbcModal,
      closeLnbcModal,
      openConfirmModal,
      closeConfirmModal,
      openCashuModal,
      closeCashuModal,
      getCashuMint,
      openAuthorSubscribeModal,
      closeAuthorSubscribeModal,
      addConnectedRelay,
      removeConnectedRelay,
      profileLink,
      setLegendCustomization,
      getUserBlossomUrls,
      openProfileQr,
      closeProfileQr,
      openReportContent,
      closeReportContent,
    }
  });

  return (
      <AppContext.Provider value={store}>
        {props.children}
      </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
