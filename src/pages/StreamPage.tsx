import { batch, Component, createEffect, createSignal, For, on, onCleanup, Show } from 'solid-js';

import styles from './StreamPage.module.scss';
import { toast as t } from '../translations';
import { useIntl } from '@cookbook/solid-intl';
import { useSettingsContext } from '../contexts/SettingsContext';
import { useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { findStreamByHost, getStreamingEvent, startLiveChat, stopLiveChat, StreamingData } from '../lib/streaming';

import { useProfileContext } from '../contexts/ProfileContext';
import { fetchKnownProfiles } from '../lib/profile';
import { nip19 } from '../lib/nTools';
import { ProfilePointer } from 'nostr-tools/lib/types/nip19';
import { useAccountContext } from '../contexts/AccountContext';
import Avatar from '../components/Avatar/Avatar';
import { emptyUser, userName } from '../stores/profile';
import { humanizeNumber } from '../lib/stats';
import FollowButton from '../components/FollowButton/FollowButton';
import { createStore } from 'solid-js/store';
import { date } from '../lib/dates';
import { APP_ID } from '../App';
import { readData, refreshSocketListeners, removeSocketListeners, socket } from '../sockets';

import { fetchPeople } from '../megaFeeds';
import { NostrEvent, NostrEOSE, NostrEvents, NostrEventContent, NostrLiveChat, PrimalUser, NostrUserZaps, PrimalZap, ZapOption, NostrRelaySignedEvent } from '../types/primal';

import { CustomZapInfo, useAppContext } from '../contexts/AppContext';
import { isHashtag, isUrl, sendEvent, triggerImportEvents } from '../lib/notes';
import { canUserReceiveZaps, convertToZap, zapStream } from '../lib/zap';
import { readSecFromStorage } from '../lib/localStore';
import { useToastContext } from '../components/Toaster/Toaster';
import LiveVideo from '../components/LiveVideo/LiveVideo';
import ChatMessage from '../components/LiveVideo/ChatMessage';
import ChatMessageComposer from '../components/LiveVideo/ChatMessageComposer';
import ChatMessageDetails, { ChatMessageConfig } from '../components/LiveVideo/ChatMessageDetails';
import { Popover } from '@kobalte/core/popover';
import { RadioBoxOption } from '../components/Checkbox/RadioBox';
import RadioBoxWithDesc from '../components/Checkbox/RadioBoxWithDesc';
import { TransitionGroup } from 'solid-transition-group';
import CheckBox from '../components/Checkbox/CheckBox';
import TopZapModal from '../components/TopZapsModal/TopZapModal';
import Paginator from '../components/Paginator/Paginator';
import { Kind } from '../constants';

const CHAT_PAGE_SIZE = 25;

const StreamPage: Component = () => {
  const profile = useProfileContext();
  const account = useAccountContext();
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToastContext();
  const intl = useIntl();
  const app = useAppContext();
  const settings = useSettingsContext();

  const [queryParams, setQueryParams] = useSearchParams();

  const streamId = () => params.streamId;

  const [getHex, setHex] = createSignal<string>();

  const [openChatModeMenu, setOpenChatModeMenu] = createSignal(false);
  const [chatMode, setChatMode] = createSignal<string>('moderated');

  let subId = '';

  const setProfile = (hex: string | undefined) => {
    profile?.actions.setProfileKey(hex);

    profile?.actions.clearArticles();
    profile?.actions.clearNotes();
    profile?.actions.clearReplies();
    profile?.actions.clearContacts();
    profile?.actions.clearZaps();
    profile?.actions.clearFilterReason();
    profile?.actions.clearGallery();
  }

  const resolveHex = async (vanityName: string | undefined) => {
    if (vanityName) {
      let name = vanityName.toLowerCase();

      if (name === 'gigi') {
        name = 'dergigi';
      }

      const vanityProfile = await fetchKnownProfiles(name);

      const hex = vanityProfile.names[name];

      if (hex) {
        setHex(() => hex);

        profile?.profileKey !== hex && setProfile(hex);
        return;
      }
    }

    let hex = params.vanityName || account?.publicKey;

    if (!hex) {
      navigate('/404');
      return;
    }

    if (params.vanityName?.startsWith('npub')) {
      hex = nip19.decode(params.vanityName).data as string;
    }

    if (params.vanityName?.startsWith('nprofile')) {
      hex = (nip19.decode(params.vanityName).data as ProfilePointer).pubkey! as string;
    }

    setHex(() => hex);

    profile?.profileKey !== hex && setProfile(hex);

    return;
  }

  const host = () => {
    const hostPubkey = streamData.hosts?.[0];
    if (hostPubkey && people.length > 0) {
      const host = people.find(p => p.pubkey == hostPubkey) || emptyUser(hostPubkey);
      if (host) return host;
    }

    const eventPubkey = streamData.pubkey;
    if (eventPubkey && people.length > 0) {
      const host = people.find(p => p.pubkey == streamData.pubkey) || emptyUser(eventPubkey);
      if (host) return host;
    }

    return undefined;
  }

  createEffect(() => {
    resolveHex(params.vanityName)
  })

  createEffect(on(chatMode, (mode, prev) => {
    if (mode === prev) return;

    refreshFeed();
  }))

  const refreshFeed = () => {
    const id = streamData.id;
    const pubkey = streamData.pubkey;

    id && pubkey && startListeningForChat(id, pubkey, true);
  }

  let streamingContent: HTMLDivElement | undefined;

  const [streamData, setStreamData] = createStore<StreamingData>({});

  const resolveStreamingData = async (id: string, pubkey: string | undefined) => {
    let data = await findStreamByHost(id, getHex());

    if (!data.id) {
      data = await getStreamingEvent(id, getHex());
    }

    setStreamData(() => data || {});
  }

  const startListeningForChat = (
    id: string | undefined,
    pubkey: string | undefined,
    clearOld?: boolean,
  ) => {
    stopLiveChat(subId);

    setTimeout(() => {
      const time = (new Date()).getTime();
      subId = `get_live_feed_${id}_${time}_${APP_ID}`;

      if (clearOld) {
        setEvents(() => []);
      }

      startLiveChat(id, pubkey, account?.publicKey, subId, chatMode());

      refreshSocketListeners(
        socket(),
        { message: onMessage, close: onSocketClose },
      );
    }, 100);
  }

  const onSocketClose = (closeEvent: CloseEvent) => {
    const webSocket = closeEvent.target as WebSocket;

    removeSocketListeners(
      webSocket,
      { message: onMessage, close: onSocketClose },
    );
  };

  const onMessage = async (event: MessageEvent) => {
    const data = await readData(event);
    const message: NostrEvent | NostrEOSE | NostrEvents = JSON.parse(data);

    const [type, subkey, content] = message;

    if (subkey !== subId) return;

    if (type === 'EVENTS') {
      for (let i=0;i<content.length;i++) {
        const e = content[i];
        handleLiveEventMessage(e);
      }
    }

    if (type === 'EVENT') {
      handleLiveEventMessage(content);
    }

    if (type === 'EOSE') {
      handleLiveEOSEMessage();
    }
  };

  const [events, setEvents] = createStore<NostrEventContent[]>([]);
  const [people, setPeople] = createStore<PrimalUser[]>([]);
  const [fetchingPeople, setFetchingPeople] = createSignal(false);

  let mutedEvents: NostrEventContent[]= [];

  const fetchMissingUsers = async (pubkeys: string[]) => {
    const subId = `fetch_missing_people_${APP_ID}`;

    const pks = pubkeys.reduce<string[]>((acc, pk) => {
      return acc.includes(pk) ? acc : [...acc, pk]
    }, [])

    setFetchingPeople(true);
    const { users } = await fetchPeople(pks, subId);

    setPeople((peps) => [ ...peps, ...users]);

    setFetchingPeople(false);

    return true;
  }

  let fetchedPubkeys: string[] = [];

  const userFetcher = async () => {
    if (fetchingPeople()) return false;

    let parts = [ ...(streamData.participants || []) ];

    let pks = events.reduce<string[]>((acc, e) => {
      let newPks: string[] = [];

      if (e.kind === Kind.Zap) {
        let zapEvent = { tags: [] };

        try {
          zapEvent = JSON.parse((e.tags?.find((t: string[]) => t[0] === 'description') || [])[1] || '{}');
        }
        catch (err) {
          zapEvent = { tags: [] };
        }

        const tagPks = zapEvent.tags.reduce(
          (acc1: string[], t: string[]) => {
            if (t[0] === 'p' && !acc1.includes(t[1])) {
              return [...acc1, t[1]];
            }
            return acc1;
          },
          []
        );


        newPks = [...newPks, ...tagPks];

        // @ts-ignore
        if (zapEvent.pubkey) {
          // @ts-ignore
          newPks.push(zapEvent.pubkey);
        }
      }

      const tagPks = (e.tags || []).reduce(
        (acc1: string[], t: string[]) => {
          if (t[0] === 'p' && !acc1.includes(t[1])) {
            return [...acc1, t[1]];
          }
          return acc1;
        },
        []
      );

      function extractNostrIds(text: string) {
        // Pattern matches optional 'nostr:' prefix followed by npub1 or nprofile1 and their content
        const pattern = /(?:nostr:)?(npub1[a-z0-9]+|nprofile1[a-z0-9]+)/gi;
        const matches = text.match(pattern);

        // Remove 'nostr:' prefix if present and return clean IDs
        const refs = matches ? matches.map(match => match.replace(/^nostr:/, '')) : [];

        return refs.reduce<string[]>((acc, r) => {
          try {
            const decoded = nip19.decode(r);

            if (decoded.type === 'npub') return [...acc, decoded.data];
            if (decoded.type === 'nprofile') return [...acc, decoded.data.pubkey];
            return acc;
          }
          catch (e) {
            return acc;
          }
        }, []);
      }

      let extracted = extractNostrIds(e.content || '')

      newPks = [...newPks, (e.pubkey || '') as string, ...tagPks, ...extracted];

      return [...acc, ...newPks];
    }, []);

    pks = [...pks, ...parts].filter(pk => !fetchedPubkeys.includes(pk) && pk .length > 0);

    if (pks.length > 0) {
      await fetchMissingUsers(pks);
      fetchedPubkeys = [...fetchedPubkeys, ...pks];
    }

    return true;
  };

  const [topZapList, setTopZapList] = createStore({
    totalZaps: 0,
    totalSats: 0,
    lastCounted: 0,
  })

  let to = 0;
  let newEvents: any[] = [];

  const [chatMessageLimit, setChatMessageLimit] = createSignal(CHAT_PAGE_SIZE);

  const handleLiveEventMessage = async (content: NostrEventContent) => {
    // @ts-ignore
    if (content.kind === Kind.LiveChatReload) {
      refreshFeed();
      return;
    }

    if (content.kind === Kind.LiveEventStats) {
      const stats = JSON.parse(content.content || '{}');

      setTopZapList(() => ({
        totalZaps: stats.total_zaps || 0,
        totalSats: stats.total_satszapped || 0,
        lastCounted: content.created_at || 0,
      }));
      return;
    }

    if (content.kind === Kind.LiveEvent) {
      const identifier = (content.tags?.find(t => t[0] === 'd') || ['d', ''])[1];

      if (identifier !== streamData.id) return;

      setStreamData({
        id: (content.tags?.find((t: string[]) => t[0] === 'd') || [])[1],
        url: (content.tags?.find((t: string[]) => t[0] === 'streaming') || [])[1],
        image: (content.tags?.find((t: string[]) => t[0] === 'image') || [])[1],
        status: (content.tags?.find((t: string[]) => t[0] === 'status') || [])[1],
        starts: parseInt((content.tags?.find((t: string[]) => t[0] === 'starts') || ['', '0'])[1]),
        summary: (content.tags?.find((t: string[]) => t[0] === 'summary') || [])[1],
        title: (content.tags?.find((t: string[]) => t[0] === 'title') || [])[1],
        client: (content.tags?.find((t: string[]) => t[0] === 'client') || [])[1],
        currentParticipants: parseInt((content.tags?.find((t: string[]) => t[0] === 'current_participants') || ['', '0'])[1] || '0'),
        pubkey: content.pubkey,
        hosts: (content.tags || []).filter(t => t[0] === 'p' && t[3].toLowerCase() === 'host').map(t => t[1]),
        participants: (content.tags || []).filter(t => t[0] === 'p').map(t => t[1]),
        event: { ...content },
      });

      return;
    }

    if (events.find(e => e.id === content.id)) return;

    if (newEvents.find(e => content.id === e.id) || events.find(e => content.id === e.id)) return;

    if (content.kind === Kind.Zap && isUsersZap(content)) {
      return;
    }

    if (initialLoadDone()) {
      setEvents((old) => {
        let evs = [...old,  { ...content } ].sort((a, b) => {
          return (b.created_at || 0) - (a.created_at || 0);
        });

        return [...evs]
      });

      await userFetcher();

      return;
    }

    newEvents.push({ ...content });

    // clearTimeout(to)

    // to = setTimeout(() => {
    //   const eventsToAdd = [...newEvents];
    //   newEvents = [];

    //   setEvents((old) => {
    //     let evs = [...old, ...eventsToAdd].sort((a, b) => {
    //       return (b.created_at || 0) - (a.created_at || 0);
    //     });

    //     return [...evs]
    //   });
    // }, 300)
  }

  const [initialLoadDone, setInitialLoadDone] = createSignal(false);

  const isUsersZap = (event: NostrUserZaps) => {
    try {
      const zap = convertToZap(event);

      const r = events.find(e => {
        return e.kind === -1 &&
          e.message === zap.message &&
          e.sender === zap.sender &&
          Math.abs(e.created_at - (zap.created_at || 0)) < 10_000;
      });

      return r != undefined;
    }
    catch (e) {
      return false;
    }
  }

  const handleLiveEOSEMessage = async () => {
    setEvents((old) => {
      let evs = [...old,  ...newEvents ].sort((a, b) => {
        return (b.created_at || 0) - (a.created_at || 0);
      });

      return [...evs]
    });

    await userFetcher();

    newEvents = [];

    setInitialLoadDone(true)
  }

  createEffect(on(getHex, (pubkey) => {
    const stremId = streamId();

    stremId && resolveStreamingData(stremId, pubkey);
  }));

  createEffect(() => {
    const id = streamData.id;
    const pubkey = streamData.pubkey;

    id && pubkey && startListeningForChat(id, pubkey);
  });

  onCleanup(() => {
    stopLiveChat(subId);
    // clearInterval(userFetcher);
  })

  const author = (pubkey: string) => {
    return people.find(p => p.pubkey === pubkey);
  }

  const parseChatContent = (event: NostrLiveChat) => {
    const content = event.content || '';

    return (
      <Show when={people.length > 0}>
        <ChatMessage
          content={content}
          sender={author(event.pubkey)}
          mentionedUsers={people}
          event={event}
        />
      </Show>
    );
  }

  const onCloseChatMessageDetails = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const details = document.querySelector(`[data-chat-message="${selectedChatMesage()?.message.id}"]`);

    if (
      selectedChatMesage() !== undefined &&
        !details?.contains(target)
    ) {
      setSelectedChatMessage(() => undefined);

      document.removeEventListener('click', onCloseChatMessageDetails);
    }

  }

  const renderChatMessage = (event: NostrLiveChat) => {
    return (
      <div
        class={styles.liveMessage}
        onClick={(e: MouseEvent) => {
          const target = e.target as HTMLElement | null;

          setSelectedChatMessage(() => undefined);

          setSelectedChatMessage(() => ({
            author: author(event.pubkey),
            message: event,
            target,
            people,
          }));

          document.removeEventListener('click', onCloseChatMessageDetails);
          document.addEventListener('click', onCloseChatMessageDetails);
        }}
      >
        <Show when={author(event.pubkey)}>
          <div class={styles.leftSide}>
            <Avatar user={author(event.pubkey)} size="xss" />
          </div>
        </Show>
        <div class={styles.rightSide}>
          <Show when={author(event.pubkey)}>
            <span class={styles.authorName}>
              {userName(author(event.pubkey))}
            </span>
          </Show>
          <span class={styles.messageContent}>
            {parseChatContent(event)}
          </span>
        </div>
      </div>
    );
  }

  const renderChatZap = (event: NostrUserZaps) => {

    try {
      const zap = convertToZap(event);

      return (
        <div class={`${styles.liveMessage} ${styles.zapMessage}`}>
          <div class={styles.leftSide}>
            <Avatar user={author(zap.sender as string)} size="xss" />
          </div>
          <div class={styles.rightSide}>
            <span class={styles.zapInfo}>
              <span class={styles.authorName}>
                <span>
                  {userName(author(zap.sender as string), zap.sender as string)}
                </span>
                <span class={styles.zapped}>
                  zapped
                </span>
              </span>
              <div class={styles.zapStats}>
                <div class={styles.zapIcon}></div>
                {humanizeNumber(zap?.amount || 0, false)}
              </div>
            </span>
            <span class={styles.messageContent}>
              {zap?.message}
            </span>
          </div>
        </div>
      );
    }
    catch (e) {
      return <></>;
    }
  }

  const renderNewUserZap = (zap: any) => {
    return (
      <div class={`${styles.liveMessage} ${styles.zapMessage}`}>
        <div class={styles.leftSide}>
          <Avatar user={account?.activeUser} size="xss" />
        </div>
        <div class={styles.rightSide}>
          <span class={styles.zapInfo}>
            <span class={styles.authorName}>
              <span>
                {userName(account?.activeUser, account?.publicKey)}
              </span>
              <span class={styles.zapped}>
                zapped
              </span>
            </span>
            <div class={styles.zapStats}>
              <div class={styles.zapIcon}></div>
              {humanizeNumber(zap?.amount || 0, false)}
            </div>
          </span>
          <span class={styles.messageContent}>
            {zap?.message}
          </span>
        </div>
      </div>
    );
  }

  const renderEvent = (event: NostrEventContent) => {
    switch (event.kind) {
      case -1:
        return renderNewUserZap(event);
      case Kind.LiveChatMessage:
        return renderChatMessage(event);
      case Kind.Zap:
        return renderChatZap(event);
    }
  }

  const [topZapLimit, setTopZapLimit] = createSignal(5);

  const [topZaps, setTopZaps] = createStore<PrimalZap[]>([]);

  createEffect(() => {
    if (topZapLimit() === 0) {
      setTopZaps(() => [])
      return;
    }

    const zaps = events.reduce<PrimalZap[]>((acc, e) => {
      if (e.kind === -1) {
        const zap = {
          id: 'NEW_USER_ZAP',
          message: e.message || '',
          amount: e.amount || 0,
          sender: e.sender,
          reciver: e.receiver,
          created_at: e.created_at,
          zappedId: '',
          zappedKind: 0,
        };

        return [...acc, { ...zap }];
      }

      if (e.kind !== Kind.Zap) return acc;

      try {
        const z = convertToZap(e);

        return [...acc, { ...z }];
      } catch (e) {
        return acc;
      }
    }, []);

    const tz = zaps.sort((a, b) => b.amount - a.amount);

    if (tz.length === 0) {
      setTopZaps(() => []);
      return;
    }

    setTopZaps(() => [...tz]);

    // const firstNewIndex = findFirstDifference(topZaps.slice(0, 5).map(t => t.id), tz.slice(0, 5).map(t => t.id));

    // if (firstNewIndex > -1) {
    //   setTopZaps(firstNewIndex, () => ({ ...tz[firstNewIndex] }));
    // }

  })

  const allZaps = () => {
      if (topZapLimit() === 0) return [];

      const zaps = events.reduce<PrimalZap[]>((acc, e) => {
        if (e.kind !== Kind.Zap) return acc;
        try {
          const z = convertToZap(e);

          return [...acc, { ...z }];
        } catch (e) {
          return acc;
        }
      }, []);

      return zaps.sort((a, b) => b.amount - a.amount);
  }

  // const topZaps = () => {
  //   if (topZapLimit() === 0) return [];

  //   const zaps = events.reduce<PrimalZap[]>((acc, e) => {
  //     if (e.kind !== Kind.Zap) return acc;
  //     try {
  //       const z = convertToZap(e);

  //       return [...acc, { ...z }];
  //     } catch (e) {
  //       return acc;
  //     }
  //   }, []);

  //   return zaps.sort((a, b) => b.amount - a.amount);
  // }

  const renderFirstZap = () => {
    const zap = topZaps[0];

    return (
      <Show
        when={zap}
        fallback={<></>}
      >
        <div class={styles.topZap} onClick={() => setOpenZaps(true)}>
          <Show
            when={zap.id === 'NEW_USER_ZAP'}
            fallback={<Avatar user={author(zap?.sender as string)} size="s38" />}
          >
            <Avatar user={account?.activeUser} size="s38" />
          </Show>
          <div class={styles.amount}>
            <div class={styles.zapIcon}></div>
            <div class={styles.firstZapAmount}>{humanizeNumber(zap?.amount, false)}</div>
          </div>
          <div class={styles.zapMessage}>
            {zap?.message || ''}
          </div>
        </div>
      </Show>
    );
  }

  const renderRestZaps = () => {
    if (topZapLimit() === 0) return <></>;
    const zaps = topZaps.slice(1, topZapLimit());

    return <div class={styles.restZaps}>

    <TransitionGroup
      name="top-zaps"
      enterClass={styles.topZapEnterTransition}
      exitClass={styles.topZapExitTransition}
    >
      <For each={zaps}>
        {zap => (
          <div class={styles.topZap} onClick={() => setOpenZaps(true)}>
            <Show
              when={zap.id === 'NEW_USER_ZAP'}
              fallback={<Avatar user={author(zap?.sender as string)} size="s38" />}
            >
              <Avatar user={account?.activeUser} size="s38" />
            </Show>
            <div class={styles.zapAmount}>{humanizeNumber(zap?.amount, false)}</div>
          </div>
        )}
      </For>
    </TransitionGroup>
    </div>
  }


  const sendMessage = async (content: string) => {
    if (!account || content.length === 0) return;

    const eventCoodrinate = `${Kind.LiveEvent}:${streamData.pubkey}:${streamData.id}`;

    const messageEvent = {
      kind: Kind.LiveChatMessage,
      content,
      created_at: Math.floor((new Date()).getTime() / 1_000),
      tags: [
        ['a', eventCoodrinate, account.activeRelays[0].url, 'root'],
      ],
    }
    const { success, note } = await sendEvent(messageEvent, account.activeRelays, account.relaySettings, account.proxyThroughPrimal || false);

    if (success && note) {
      setEvents((es) => [{ ...note }, ...es ]);
      triggerImportEvents([note], `import_live_message_${APP_ID}`);
      return success;
    }
  }

  const [isZapping, setIsZapping] = createSignal(false);
  const [zappedAmount, setZappedAmount] = createSignal(0);

  let quickZapDelay = 0;

  const customZapInfo: () => CustomZapInfo = () => ({
    stream: streamData,
    streamAuthor: host() || profile?.userProfile,
    onConfirm: onConfirmZap,
    onSuccess: onSuccessZap,
    onFail: onFailZap,
    onCancel: onCancelZap,
  });


  const startZap = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      setIsZapping(() => false);
      return;
    }

    if (!account.sec || account.sec.length === 0) {
      const sec = readSecFromStorage();
      if (sec) {
        account.actions.setShowPin(sec);
        return;
      }
    }
    if (!canUserReceiveZaps(host() || profile?.userProfile)) {
      toast?.sendWarning(
        intl.formatMessage(t.zapUnavailable),
      );
      setIsZapping(() => false);
      return;
    }

    quickZapDelay = setTimeout(() => {
      customZapInfo() && app?.actions.openCustomZapModal(customZapInfo());
      setIsZapping(() => true);
    }, 500);
  };

  const commitZap = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    clearTimeout(quickZapDelay);

    customZapInfo() && app?.actions.openCustomZapModal(customZapInfo());
    setIsZapping(() => true);

    return;

    // if (!account?.hasPublicKey()) {
    //   account?.actions.showGetStarted();
    //   return;
    // }

    // if (!account.sec || account.sec.length === 0) {
    //   const sec = readSecFromStorage();
    //   if (sec) {
    //     account.actions.setShowPin(sec);
    //     return;
    //   }
    // }

    // if ((!account.proxyThroughPrimal && account.relays.length === 0) || !canUserReceiveZaps(props.note.user)) {
    //   return;
    // }
    // if (!canUserReceiveZaps(host() || profile?.userProfile)) {
    //   return;
    // }

    // if (app?.customZap === undefined) {
    //   doQuickZap();
    // }
  };

  const doQuickZap = async () => {
    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      return;
    }

    const amount = settings?.defaultZap.amount || 10;
    const message = settings?.defaultZap.message || '';
    const emoji = settings?.defaultZap.emoji;

    batch(() => {
      setIsZapping(() => true);
    });

    setTimeout(async () => {
      const { success, event } = await zapStream(
        streamData,
        host() || profile?.userProfile,
        account.publicKey,
        amount,
        message,
        account.activeRelays,
        account.activeNWC,
      );

      setIsZapping(() => false);

      if (success && event) {
        customZapInfo() && customZapInfo().onSuccess({
          emoji,
          amount,
          message,
        });

        return;
      } else {
        app?.actions.openConfirmModal({
          title: "Failed to zap",
          description: "",
          confirmLabel: "ok",
          onConfirm: app.actions.closeConfirmModal,
          // onAbort: app.actions.closeConfirmModal,
        })
      }

      customZapInfo() && customZapInfo().onFail({
        emoji,
        amount,
        message,
      });
    }, 100);

  }

  const onConfirmZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    batch(() => {
      setZappedAmount(() => zapOption.amount || 0);

      const zap = {
        kind: -1,
        sender: account?.publicKey,
        receiver: host()?.pubkey || profile?.profileKey || '',
        amount: zapOption.amount || 0,
        message: zapOption.message,
        created_at: Math.ceil((new Date()).getTime() / 1_000),
        id: 'newZap',
      }

      setEvents((old) => {
        let evs = [...old,  { ...zap } ].sort((a, b) => {
          return (b.created_at || 0) - (a.created_at || 0);
        });

        return [...evs]
      });
    });
  };

  const onSuccessZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    app?.actions.resetCustomZap();

    const pubkey = account?.publicKey;

    if (!pubkey) return;

    batch(() => {
      setIsZapping(() => false);
    });
  };

  const onFailZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    app?.actions.resetCustomZap();
    batch(() => {
      setZappedAmount(() => -(zapOption.amount || 0));
      setIsZapping(() => false);
    });
  };

  const onCancelZap = (zapOption: ZapOption) => {
    app?.actions.closeCustomZapModal();
    app?.actions.resetCustomZap();
    batch(() => {
      setZappedAmount(() => -(zapOption.amount || 0));
      setIsZapping(() => false);
    });
  };

  const [showLiveChat, setShowLiveChat] = createSignal(true);

  const totalZaps = () => {
    const lastCounted = topZapList.lastCounted;

    return events.reduce<number>((acc, e) => {
      if (e.kind !== Kind.Zap) return acc;

      return (e.created_at || 0) > lastCounted ? acc + 1 : acc;
    }, topZapList.totalZaps);
  }

  const totalSats = () => {
    const lastCounted = topZapList.lastCounted;

    return events.reduce<number>((acc, e) => {
      if (
        ![-1, Kind.Zap].includes(e.kind) ||
        (e.created_at || 0) <= lastCounted
      ) return acc;

      try {
        if (e.kind === Kind.Zap) {
          const z = convertToZap(e);

          return acc + z.amount;
        }
        if (e.kind === -1) {
          return acc + e.amount;
        }
      } catch (e) {
        return acc;
      }
    }, topZapList.totalSats);
  }

  const [selectedChatMesage, setSelectedChatMessage] = createSignal<ChatMessageConfig>()

  const [openZaps, setOpenZaps] = createSignal();

  const parseSummary = (text: string) => {
    const tokens = (text || '').split(' ');

    return (
      <For each={tokens}>
        {token => {
          if (isUrl(token)) {
            return <a href={token} target='_blank'>{token} </a>;
          }

          if (isHashtag(token)) {
            let [_, term] = token.split('#');
            let end = '';

            let match = hashtagCharsRegex.exec(term);

            if (match) {
              const i = match.index;
              end = term.slice(i);
              term = term.slice(0, i);
            }

            const embeded = <a href={`/search/%23${term}`}>#{term}</a>;

            return <span class="whole"> {embeded}{end}</span>;
          }

          return <span>{token} </span>
        }}
      </For>
    );
  }

  return (
    <div class={styles.streamingPage}>
      <div class={`${styles.streamingMain} ${!showLiveChat() ? styles.fullWidth : ''}`}>
        <div class={styles.streamingHeader}>
          <Show when={host()}>
            <div class={styles.streamerInfo}>
              <a href={app?.actions.profileLink(host()?.pubkey)}>
                <Avatar user={host()} size="s50" />
              </a>
              <div class={styles.userInfo}>
                <div class={styles.userName}>
                  {userName(host())}
                </div>
                <div class={styles.userStats}>
                  {humanizeNumber(host()?.userStats?.followers_count || 0)} followers
                </div>
              </div>
            </div>

            <div class={styles.headerActions}>
              <FollowButton person={host()} thick={true} />

              <Show when={!showLiveChat()}>
                <button class={styles.chatButton} onClick={() => setShowLiveChat(true)}>
                  <div class={styles.chatIcon}></div>
                </button>
              </Show>

            </div>
          </Show>
        </div>

        <div ref={streamingContent} class={styles.streamContent}>
          <LiveVideo
            src={streamData.url || ''}
            stream={streamData}
            streamAuthor={host() || profile?.userProfile}
          />
        </div>


        <Show when={initialLoadDone()}>
          <div class={styles.streamInfo}>
            <div class={styles.title}>{streamData.title}</div>
            <div class={styles.statsRibbon}>
              <Show
                when={streamData.status === 'live'}
                fallback={
                  <div class={styles.time}>
                    Ended {streamData.ends || streamData.starts ? `${date(streamData.ends || streamData.starts || 0).label} ago` : ''}
                  </div>
                }
              >
                <div class={styles.status}>
                  <Show when={streamData.status === 'live'}>
                    <div class={styles.liveDot}>  </div>
                    Live
                  </Show>
                </div>
                <Show when={streamData.starts}>
                  <div class={styles.time}>
                    Started {date(streamData.starts || 0).label} ago
                  </div>
                </Show>
              </Show>
              <Show when={streamData.participants}>
                <div class={styles.participants}>
                  <div class={styles.participantsIcon}></div>
                  {streamData.currentParticipants || 0}
                </div>
              </Show>
            </div>

            <div class={`${styles.topZaps} ${topZaps.length === 0 ? styles.centered : ''}`}>
              <div class={`${styles.zapList} ${topZaps.length === 0 ? styles.emptyZaps : ''}`}>
                <div class={styles.firstZap}>
                  {renderFirstZap()}
                </div>
                <Show when={topZaps.length > 0}>
                  <div class={styles.other}>
                    {renderRestZaps()}
                  </div>
                </Show>
              </div>
              <div class={`${styles.zapStats} ${topZaps.length === 0 ? styles.centeredZaps : ''}`}>
                <div class={`${styles.statsLine} ${topZaps.length === 0 ? styles.noStatsLine : ''}`}>
                  <div class={styles.totalZaps}>Total {totalZaps()} zaps:</div>
                  <div class={styles.totalSats}>
                    <div class={styles.zapIcon}></div>
                    {humanizeNumber(totalSats(), false)}
                  </div>
                </div>
                <button
                  class={styles.zapButton}
                  onMouseDown={startZap}
                  onMouseUp={commitZap}
                >
                  <div class={styles.zapIcon}></div>
                  {topZaps.length > 0 ? 'Zap Now' : 'Be the first to zap this stream!'}
                </button>
              </div>
            </div>

            <div class={styles.summary}>
              {parseSummary(streamData.summary || '')}
            </div>

            <Show when={queryParams.test === 'zaps'}>
              <div class={styles.testButtons}>
                <button onClick={() => {
                  setTopZapLimit(() => 0);
                }}>Hide All</button>
                <Show when={topZapLimit() > 0}>
                  <button onClick={() => {
                    const fz = { ...topZaps[0] };

                    fz.id = `random_${Math.floor(Math.random() * 1_000)}`;
                    fz.amount = fz.amount + 10;

                    setTopZaps((tzs) => [{ ...fz }, ...tzs]);
                  }}>Add top</button>
                </Show>
                <Show when={topZapLimit() > 1}>
                  <button onClick={() => {
                    const fz = { ...topZaps[1] };

                    fz.id = `random_${Math.floor(Math.random() * 1_000)}`;
                    fz.amount = fz.amount + 10;

                    setTopZaps((tzs) => [{...tzs[0]},{ ...fz }, ...tzs.slice(1)]);
                  }}>Add second</button>
                </Show>
                <Show when={topZapLimit() > 2}>
                  <button onClick={() => {
                    const fz = { ...topZaps[2] };

                    fz.id = `random_${Math.floor(Math.random() * 1_000)}`;
                    fz.amount = fz.amount + 10;

                    setTopZaps((tzs) => [...tzs.slice(0,2),{ ...fz }, ...tzs.slice(2)]);
                  }}>Add third</button>
                </Show>
                <Show when={topZapLimit() < 5}>
                  <button onClick={() =>{
                    setTopZapLimit((l) => l + 1)
                  }}>Add One</button>
                </Show>
              </div>
            </Show>
          </div>
        </Show>
      </div>

      <div class={`${styles.liveSidebar} ${!showLiveChat() ? styles.hidden : ''}`}>
        <div class={styles.chatHeader}>
          <div class={styles.chatInfo}>
            <div class={styles.lcTitle}>Live chat</div>
            <div class={styles.lcStats}>
              <div class={styles.startTime}>
                Started {date(streamData.starts || 0).label} ago
              </div>
              <div class={styles.participants}>
                <div class={styles.participantsIcon}></div>
                {streamData.currentParticipants || 0}
              </div>
            </div>
          </div>
          <div class={styles.chatActions}>
            <Popover
              open={openChatModeMenu()}
              onOpenChange={setOpenChatModeMenu}
              gutter={2}
              placement='bottom-end'
            >
             	<Popover.Trigger class={openChatModeMenu() ? styles.active : ''}>
                <div class={styles.settingsIcon}></div>
              </Popover.Trigger>
         			<Popover.Portal>
            		<Popover.Content>
                  <div class={styles.chatModeMenu}>
                    <div class={styles.title}>
                      Stream Notifications
                    </div>
                    <div class={styles.checkOptions}>
                      <CheckBox
                        onChange={(checked: boolean) => {
                          const pk = host()?.pubkey;
                          if (!pk) return;

                          if (!checked) {
                            account?.actions.addToStreamMuteList(pk);
                            return;
                          }

                          account?.actions.removeFromStreamMuteList(pk);
                        }}
                        checked={!account?.streamMuted.includes(host()?.pubkey || '')}
                        label="Notify me about live streams from this account"
                      />
                    </div>
                    <div class={styles.title}>
                      Chat Filter
                    /</div>
                    <div class={styles.options}>
                      <RadioBoxWithDesc
                        options={[
                          { value: 'moderated', label: 'High Signal Messages', description: 'Exclude accounts muted by the stream host, and potential spam'},
                          { value: 'all', label: 'All Messages', description: 'Show every message, including from accounts muted by the host'},
                        ]}
                        value={chatMode()}
                        onChange={(option: RadioBoxOption) => {
                          setChatMode(() => option.value)
                        }}
                      />
                    </div>
                  </div>
                </Popover.Content>
         			</Popover.Portal>
            </Popover>
            <button onClick={() => setShowLiveChat(false)}>
              <div class={styles.closeIcon}></div>
            </button>
          </div>
        </div>

        <div class={styles.chatMessages}>
          <Show when={initialLoadDone()}>
            <For each={events.slice(0, chatMessageLimit())}>
              {event => renderEvent(event)}
            </For>

            <Paginator
              loadNextPage={() => {
                setChatMessageLimit(l => l + CHAT_PAGE_SIZE)
              }}
              isSmall={true}
            />
          </Show>

          <Show when={selectedChatMesage()}>
            <ChatMessageDetails
              config={selectedChatMesage()}
              onClose={() => setSelectedChatMessage(undefined)}
              onMute={(pubkey: string, unmute?: boolean) => {

                if (unmute) {
                  const unmuteEvents = mutedEvents.filter(e => {
                    let pk = e.pubkey;

                    if (e.kind === Kind.Zap) {
                      try {
                        const zap = convertToZap(e);
                        if (zap.sender) {
                          pk = typeof zap.sender === 'string' ? zap.sender : zap.sender.pubkey;
                        }
                      }
                      catch (err) {}
                    }

                    return pk === pubkey && !events.find(ev => ev.id === e.id);
                  });

                  mutedEvents = mutedEvents.filter(e => {
                    let pk = e.pubkey;

                    if (e.kind === Kind.Zap) {
                      try {
                        const zap = convertToZap(e);
                        if (zap.sender) {
                          pk = typeof zap.sender === 'string' ? zap.sender : zap.sender.pubkey;
                        }

                      }
                      catch(err) {}
                    }

                    return pk !== pubkey;
                  });

                  setEvents((old) => {
                    let evs = [...old, ...unmuteEvents].sort((a, b) => {
                      return (b.created_at || 0) - (a.created_at || 0);
                    });

                    return [...evs]
                  });
                  return;
                }

                const eventsToMute = events.filter(e => {
                  let pk = e.pubkey;

                  if (e.kind === Kind.Zap) {
                    try {
                      const zap = convertToZap(e);
                      if (zap.sender) {
                        pk = typeof zap.sender === 'string' ? zap.sender : zap.sender.pubkey;
                      }

                    }
                    catch (err) {}
                  }

                  return pk === pubkey;
                });

                let mutedEventIds = mutedEvents.map(e => e.id);

                for (let i = 0; i < eventsToMute.length;i++) {
                  const e = eventsToMute[i];

                  if (!mutedEventIds.includes(e.id)) {
                    mutedEvents.push(e);
                    mutedEventIds.push(e.id);
                  }
                }

                setEvents(es => es.filter(e => !mutedEventIds.includes(e.id)));
              }}
            />
          </Show>
        </div>
        <div class={styles.chatInput}>
          <ChatMessageComposer
            sendMessage={sendMessage}
          />
        </div>
      </div>

      <TopZapModal
        open={openZaps()}
        setOpen={setOpenZaps}
        totalZaps={totalZaps()}
        totalSats={totalSats()}
        zaps={allZaps()}
        people={people}
      />
    </div>
  );
}

export default StreamPage;
