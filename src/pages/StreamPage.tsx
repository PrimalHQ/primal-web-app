import { batch, Component, createEffect, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js';
import Branding from '../components/Branding/Branding';
import Wormhole from '../components/Wormhole/Wormhole';
import Search from '../components/Search/Search';

import appstoreImg from '../assets/images/appstore_download.svg';
import playstoreImg from '../assets/images/playstore_download.svg';
import primalQR from '../assets/images/primal_qr.png';

import gitHubLight from '../assets/icons/github_light.svg';
import gitHubDark from '../assets/icons/github.svg';

import primalDownloads from '../assets/images/video_placeholder.png';

import styles from './StreamPage.module.scss';
import { toast as t } from '../translations';
import { useIntl } from '@cookbook/solid-intl';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import { appStoreLink, playstoreLink, apkLink, Kind } from '../constants';
import ExternalLink from '../components/ExternalLink/ExternalLink';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import { useSettingsContext } from '../contexts/SettingsContext';
import { isAndroid } from '@kobalte/utils';
import { isIOS, isPhone, uuidv4 } from '../utils';
import { useNavigate, useParams } from '@solidjs/router';
import { getStreamingEvent, startLiveChat, stopLiveChat, StreamingData } from '../lib/streaming';

import { useProfileContext } from '../contexts/ProfileContext';
import { fetchKnownProfiles, getUserProfiles } from '../lib/profile';
import { nip19 } from '../lib/nTools';
import { ProfilePointer } from 'nostr-tools/lib/types/nip19';
import { useAccountContext } from '../contexts/AccountContext';
import Avatar from '../components/Avatar/Avatar';
import { userName } from '../stores/profile';
import { humanizeNumber } from '../lib/stats';
import FollowButton from '../components/FollowButton/FollowButton';
import { createStore } from 'solid-js/store';
import { date } from '../lib/dates';
import { APP_ID } from '../App';
import { readData, refreshSocketListeners, removeSocketListeners, socket, subsTo } from '../sockets';

import { updateFeedPage, pageResolve, fetchPeople } from '../megaFeeds';
import { NostrEvent, NostrEOSE, NostrEvents, NostrEventContent, NostrLiveEvent, NostrLiveChat, PrimalUser, NostrUserZaps, PrimalZap, ZapOption } from '../types/primal';
import VerificationCheck from '../components/VerificationCheck/VerificationCheck';
import { CustomZapInfo, useAppContext } from '../contexts/AppContext';
import { sendEvent, triggerImportEvents } from '../lib/notes';
import ButtonSecondary from '../components/Buttons/ButtonSecondary';
import { canUserReceiveZaps, convertToZap, zapStream } from '../lib/zap';
import { readSecFromStorage } from '../lib/localStore';
import { useToastContext } from '../components/Toaster/Toaster';
import TopZapSkeleton from '../components/Skeleton/TopZapSkeleton';
import LiveVideo from '../components/LiveVideo/LiveVideo';
import DirectMessageParsedContent from '../components/DirectMessages/DirectMessageParsedContent';
import ChatMessage from '../components/LiveVideo/ChatMessage';
import DirectMessagesComposer from '../components/DirectMessages/DirectMessagesComposer';
import ChatMessageComposer from '../components/LiveVideo/ChatMessageComposer';

const StreamPage: Component = () => {
  const profile = useProfileContext();
  const account = useAccountContext();
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToastContext();
  const intl = useIntl();
  const app = useAppContext();
  const settings = useSettingsContext();

  const streamId = () => params.streamId;

  const [getHex, setHex] = createSignal<string>();

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

  createEffect(() => {
    resolveHex(params.vanityName)
  })

  let streamingContent: HTMLDivElement | undefined;

  const [streamData, setStreamData] = createStore<StreamingData>({});

  const resolveStreamingData = async (id: string, pubkey: string | undefined) => {
    const data = await getStreamingEvent(id, getHex());

    setStreamData(() => data || {});
  }

  const startListeningForChat = (id: string | undefined, pubkey: string | undefined) => {
    stopLiveChat(subId);

    setTimeout(() => {
      subId = `get_live_feed_${id}_${APP_ID}`;

      startLiveChat(id, pubkey, account?.publicKey, subId);

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
  };

  const [newEvents, setNewEvents] = createStore<NostrEventContent[]>([]);
  const [events, setEvents] = createStore<NostrEventContent[]>([]);
  const [people, setPeople] = createStore<PrimalUser[]>([]);

  const fetchMissingUsers = async (pubkeys: string[]) => {
    const subId = `fetch_missing_people_${APP_ID}`;

    const pks = pubkeys.reduce<string[]>((acc, pk) => {
      return acc.includes(pk) ? acc : [...acc, pk]
    }, [])

    const { users } = await fetchPeople(pks, subId);
    setPeople((peps) => [ ...peps, ...users]);
  }

  let fetchedPubkeys: string[] = [];

  let userFetcher = setInterval(() => {
    let pks = events.reduce<string[]>((acc, e) => {
      let newPks: string[] = [];

      if (e.kind === Kind.Zap) {
        const zapEvent = JSON.parse((e.tags?.find((t: string[]) => t[0] === 'description') || [])[1] || '{}');

        const tagPks = zapEvent.tags.reduce(
          (acc: string[], t: string[]) => {
            if (t[0] === 'p' && !acc.includes(t[1])) {
              return [...acc, t[1]];
            }
            return acc;
          },
          []
        );


        newPks = [...newPks, (zapEvent.pubkey || '') as string, ...tagPks];
      }

      const tagPks = (e.tags || []).reduce(
        (acc: string[], t: string[]) => {
          if (t[0] === 'p' && !acc.includes(t[1])) {
            return [...acc, t[1]];
          }
          return acc;
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
          const decoded = nip19.decode(r);

          if (decoded.type === 'npub') return [...acc, decoded.data];
          if (decoded.type === 'nprofile') return [...acc, decoded.data.pubkey];
          return acc;
        }, []);
      }

      let extracted = extractNostrIds(e.content || '')

      newPks = [...newPks, (e.pubkey || '') as string, ...tagPks, ...extracted];

      return [...acc, ...newPks];
    }, []);

    pks = pks.filter(pk => !fetchedPubkeys.includes(pk) && pk .length > 0);

    if (pks.length > 0) {
      fetchMissingUsers(pks);
      fetchedPubkeys = [...fetchedPubkeys, ...pks];
    }
  }, 1_000);

  const handleLiveEventMessage = (content: NostrEventContent) => {
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
      });

      return;
    }

    if (events.find(e => e.id === content.id)) return;

    let evs = [ ...events, { ...content}].sort((a, b) => {
      return (b.created_at || 0) - (a.created_at || 0);
    })

    setEvents(() => [...evs]);
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
    clearInterval(userFetcher);
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

  const renderChatMessage = (event: NostrLiveChat) => {
    return (
      <div class={styles.liveMessage}>
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
  const renderEvent = (event: NostrEventContent) => {
    switch (event.kind) {
      case Kind.LiveChatMessage:
        return renderChatMessage(event);
      case Kind.Zap:
        return renderChatZap(event);
    }
  }

  const topZaps = () => {
    const zaps = events.reduce<PrimalZap[]>((acc, e) => {
      if (e.kind !== Kind.Zap) return acc;

      const z = convertToZap(e);

      return [...acc, { ...z }];
    }, []);

    return zaps.sort((a, b) => b.amount - a.amount);
  }

  const renderFirstZap = () => {
    const zap = topZaps()[0];

    return (
      <Show
        when={zap}
        fallback={<TopZapSkeleton />}
      >
        <div class={styles.topZap}>
          <Avatar user={author(zap?.sender as string)} size="s38" />
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
    const zaps = topZaps().slice(1, 5);

    return <div class={styles.restZaps}>
      <For each={zaps}>
        {zap => (
          <Show
            when={zap}
            fallback={<TopZapSkeleton />}
          >
            <div class={styles.topZap}>
              <Avatar user={author(zap?.sender as string)} size="s30" />
              <div class={styles.zapAmount}>{humanizeNumber(zap?.amount, false)}</div>
            </div>
          </Show>
        )}
      </For>
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
    streamAuthor: profile?.userProfile,
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
    if (!canUserReceiveZaps(profile?.userProfile)) {
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

    if (!account?.hasPublicKey()) {
      account?.actions.showGetStarted();
      return;
    }

    if (!account.sec || account.sec.length === 0) {
      const sec = readSecFromStorage();
      if (sec) {
        account.actions.setShowPin(sec);
        return;
      }
    }

    // if ((!account.proxyThroughPrimal && account.relays.length === 0) || !canUserReceiveZaps(props.note.user)) {
    //   return;
    // }
    if (!canUserReceiveZaps(profile?.userProfile)) {
      return;
    }

    if (app?.customZap === undefined) {
      doQuickZap();
    }
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
        profile?.userProfile,
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
    return events.reduce<number>((acc, e) => {
      if (e.kind !== Kind.Zap) return acc;

      return acc + 1;
    }, 0);
  }

  const totalSats = () => {
    return events.reduce<number>((acc, e) => {
      if (e.kind !== Kind.Zap) return acc;

      const z = convertToZap(e);

      return acc + z.amount;
    }, 0);
  }

  return (
    <div class={styles.streamingPage}>
      <div class={`${styles.streamingMain} ${!showLiveChat() ? styles.fullWidth : ''}`}>
        <div class={styles.streamingHeader}>
          <div class={styles.streamerInfo}>
            <a href={app?.actions.profileLink(profile?.profileKey)}>
              <Avatar user={profile?.userProfile} size="s50" />
            </a>
            <div class={styles.userInfo}>
              <div class={styles.userName}>
                {userName(profile?.userProfile)}
              </div>
              <div class={styles.userStats}>
                {humanizeNumber(profile?.userStats.followers_count || 0)} followers
              </div>
            </div>
          </div>

          <div class={styles.headerActions}>
            <FollowButton person={profile?.userProfile} thick={true} />

            <Show when={!showLiveChat()}>
              <button class={styles.chatButton} onClick={() => setShowLiveChat(true)}>
                open chat
              </button>
            </Show>

          </div>
        </div>

        <div ref={streamingContent} class={styles.streamContent}>
          <LiveVideo
            src={streamData.url || ''}
            stream={streamData}
            streamAuthor={profile?.userProfile}
          />
        </div>

        <div class={styles.streamInfo}>
          <div class={styles.title}>{streamData.title}</div>
          <div class={styles.statsRibbon}>
            <div class={styles.status}>
              <Show when={streamData.status === 'live'}>
                <div class={styles.liveDot}>  </div>
                Live
              </Show>
            </div>
            <div class={styles.time}>
              Started {date(streamData.starts || 0).label} ago
            </div>
            <div class={styles.participants}>
              <div class={styles.participantsIcon}></div>
              {streamData.currentParticipants || 0}
            </div>
          </div>

          <div class={styles.topZaps}>
            <div class={styles.zapList}>
              <div class={styles.firstZap}>
                {renderFirstZap()}
              </div>
              <div class={styles.other}>
                {renderRestZaps()}
              </div>
            </div>
            <div class={styles.zapStats}>
              <div class={styles.statsLine}>
                <div class={styles.totalZaps}>Total {totalZaps() || 0} zaps:</div>
                <div class={styles.totalSats}>
                  <div class={styles.zapIcon}></div>
                  {humanizeNumber(totalSats() || 0, false)}
                </div>
              </div>
              <button
                class={styles.zapButton}
                onMouseDown={startZap}
                onMouseUp={commitZap}
              >
                <div class={styles.zapIcon}></div>
                Zap Now
              </button>
            </div>
          </div>

          <div class={styles.summary}>
            {streamData.summary}
          </div>
        </div>
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
            <button>
              <div class={styles.settingsIcon}></div>
            </button>
            <button onClick={() => setShowLiveChat(false)}>
              <div class={styles.closeIcon}></div>
            </button>
          </div>
        </div>

        <div class={styles.chatMessages}>
          <For each={events}>
            {event => renderEvent(event)}
          </For>
        </div>
        <div class={styles.chatInput}>
          <ChatMessageComposer
            sendMessage={sendMessage}
          />
          {/*<input
            onChange={(e) => sendMessage(e)}
            placeholder='Send a comment...'
          />*/}
        </div>
      </div>


    </div>
  );
}

export default StreamPage;
