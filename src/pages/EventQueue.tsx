import { Component, createSignal, For, onMount, Show } from 'solid-js';
import { eventQueue as tEventQueue } from '../translations';
import { useIntl } from '@cookbook/solid-intl';

import styles from './EventQueuePage.module.scss';
import PageTitle from '../components/PageTitle/PageTitle';
import Search from '../components/Search/Search';
import Wormhole from '../components/Wormhole/Wormhole';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import SettingsSidebar from '../components/SettingsSidebar/SettingsSidebar';
import PageCaption from '../components/PageCaption/PageCaption';
import { accountStore, dequeEvents, processArrayUntilFailure, startEventQueueMonitor, updateAccountStore } from '../stores/accountStore';
import { getEvents } from '../lib/feed';
import { APP_ID } from '../App';
import { subsTo } from '../sockets';
import { Kind } from '../constants';
import { MegaFeedPage, NostrNoteContent, NostrRelaySignedEvent, NostrUserContent } from '../types/primal';
import { emptyMegaFeedPage, updateFeedPage } from '../megaFeeds';
import { createStore, unwrap } from 'solid-js/store';
import { convertSingleNoteMega, convertSingleReadMega } from '../stores/megaFeed';
import { getUserProfiles } from '../lib/profile';
import { likes } from '../components/Notifications/NotificationItemOld';
import { ReactionEventType } from '../components/Events/ReactionEvent';
import CheckBox from '../components/Checkbox/CheckBox';
import ButtonSecondary from '../components/Buttons/ButtonSecondary';
import ButtonPrimary from '../components/Buttons/ButtonPrimary';
import { sendSignedEvent } from '../lib/notes';
import { saveEventQueue } from '../lib/localStore';
import GenericEvent from '../components/Events/GenericEvent';
import { signEvent } from '../lib/nostrAPI';

const EventQueuePage: Component = () => {
  const intl = useIntl();

  const [page, setPage] = createSignal<MegaFeedPage>();

  onMount(() => {
    // fetchEvents()
    fetchRelatedStuff();
  });

  const [parsedEvents, setParsedEvents] = createStore<Record<string, any>>({});
  const [selectedEvents, setSelectedEvents] = createStore<NostrRelaySignedEvent[]>([]);

  const [fetchingDone, setFetchingDone] = createStore<string[]>([]);

  // createEffect(() => {
  //   const q = unwrap(accountStore.eventQueue);
  //   console.log('CHECK QUEUE: ', q);
  //   // const eventsPage = page();
  //   // if (!eventsPage) return;

  //   // parseEvents(eventsPage);

  //   // const noteEvents = accountStore.eventQueue.filter(e => e.kind === Kind.Text);

  //   // const notes = noteEvents.reduce<Record<string, any>>((acc, n) => ({ ...acc, [n.id]: convertSingleNoteMega(n, eventsPage)}), {});

  //   // setParsedEvents(() => ({ ...notes }))
  // })

  const convertSingleReaction = (event: NostrNoteContent, page: MegaFeedPage): ReactionEventType | undefined => {
    const icon = likes.find(l => l === event.content) || likes[1];

    const users = event.tags.reduce<Record<string, NostrUserContent>>((acc, t) => {
      if (t[0] !== 'p') return acc;
      const id = t[1];
      const e = page.users[id];
      if (e === undefined) return acc;

      return { ...acc, [id]: {...e}};
    }, {});

    const eId = (event.tags.find(t => t[0] === 'e') || [])[1];


    if (eId) {
      const e = page.notes.find(n => n.id === eId);

      if (e) {
        const note = convertSingleNoteMega(e, page);
        return {
          icon,
          rKind: Kind.Text,
          note,
          users,
        }
      }
    }

    const aId = (event.tags.find(t => t[0] === 'a') || [])[1];

    if (aId) {
      const e = page.reads.find(r => {
        const identifier = (r.tags.find(t => t[0] === 'd') || [])[1];
        return aId === `${r.kind}:${r.pubkey}:${identifier}`;
      });

      if (e) {
        const read = convertSingleReadMega(e, page);
        return {
          icon,
          rKind: Kind.LongForm,
          read,
          users,
        }
      }
    }

    return undefined;
  }

  const parseEvents = (eventsPage: MegaFeedPage) => {
    const queue = [ ...accountStore.eventQueue ];

    const parsedEvents: Record<string, any> = {}

    for(let i=0;i<queue.length;i++) {
      const event = queue[i];

      switch (event.kind) {
        case Kind.Text:
        case Kind.Repost:
          parsedEvents[event.id] = convertSingleNoteMega(event, eventsPage);
          break;
        case Kind.LongForm:
          parsedEvents[event.id] = convertSingleReadMega(event, eventsPage);
          break;
        case Kind.Reaction:
          parsedEvents[event.id] = convertSingleReaction(event, eventsPage);
          break;
        case Kind.Bookmarks:
          parsedEvents[event.id] = convertSingleReaction(event, eventsPage);
          break;
      }
    }

    setParsedEvents(() => ({ ...parsedEvents }));
  };

  const fetchRelatedStuff = () => {
    const subId = `get_event_events_${APP_ID}`;
    let page: MegaFeedPage = emptyMegaFeedPage();

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        content && updateFeedPage(page, content);
      },
      onEose: () => {
        unsub();
        setPage((p) => ({ ...p, ...page }));
        if (!fetchingDone.includes('events')) {
          setFetchingDone(l => [...l, 'events']);
        }
      },
      onNotice: (_, reason) => {
        unsub();
      }
    });


    let ids: string[] = [];

    for (let i =0;i<accountStore.eventQueue.length;i++) {
      const e = accountStore.eventQueue[i];

      ids = [ ...ids, ...e.tags.reduce<string[]>((acc, t) => {
        if (t[0] !== 'e') return acc;
        return [...acc, t[1]];
      }, [])];
    }


    getEvents(accountStore.publicKey, ids, subId);


    const subIdProfiles = `get_event_profiles_${APP_ID}`;
    const unsubProfiles = subsTo(subIdProfiles, {
      onEvent: (_, content) => {
        content && updateFeedPage(page, content);
      },
      onEose: () => {
        unsubProfiles();
        setPage((p) => ({ ...p, ...page }));
        if (!fetchingDone.includes('profiles')) {
          setFetchingDone(l => [...l, 'profiles']);
        }
      },
      onNotice: (_, reason) => {
        unsubProfiles();
      }
    });

    let pubkeys: string[] = [];

    for (let i =0;i<accountStore.eventQueue.length;i++) {
      const e = accountStore.eventQueue[i];

      pubkeys = e.tags.reduce<string[]>((acc, t) => {
        if (t[0] !== 'p') return acc;
        return [...acc, t[1]];
      }, []);

      if (!pubkeys.includes(e.pubkey)) {
        pubkeys.push(e.pubkey);
      }
    }

    if (accountStore.publicKey && !pubkeys.includes(accountStore.publicKey)) {
      pubkeys.push(accountStore.publicKey)
    }


    getUserProfiles(pubkeys, subIdProfiles);
  }

  const abortSelected = () => {
    dequeEvents([...selectedEvents]);
    setSelectedEvents([]);
    startEventQueueMonitor();
  };

  const retrySelected = async () => {
    if (!accountStore.publicKey) return;

    const queue = unwrap(selectedEvents);

    const newQueue = await processArrayUntilFailure<NostrRelaySignedEvent>(queue, (item) => {
      return new Promise<void>(async (resolve, reject) => {
        if (!item.sig) {
          try {
            const event = await signEvent(item);

            item = { ...event };
          } catch (reason) {
            reject('relay_send_timeout');
          }
        }

        let timeout = setTimeout(
          () => reject('relay_send_timeout'),
          8_000,
        );

        sendSignedEvent(item, {
          success: () => {
            clearTimeout(timeout);
            resolve();
          },
        });
      });
    });

    updateAccountStore('eventQueue', () => [ ...newQueue ]);
    saveEventQueue(accountStore.publicKey, accountStore.eventQueue);
  }

  const retrySigning = (item: NostrRelaySignedEvent) => {
    if (item.sig) return;

    return new Promise<void>(async (resolve, reject) => {
      try {
        const event = await signEvent(item);

        item = { ...event };
      } catch (reason) {
        reject('relay_send_timeout');
      }

      let timeout = setTimeout(
        () => reject('relay_send_timeout'),
        8_000,
      );

      sendSignedEvent(item, {
        success: () => {
          clearTimeout(timeout);
          resolve();
        },
      });
    });
  }


  return (
    <div class={styles.settingsContainer}>
      <PageTitle title={intl.formatMessage(tEventQueue.title)} />

      <PageCaption>
        <div>{intl.formatMessage(tEventQueue.caption, { number: accountStore.eventQueue.length })}</div>
      </PageCaption>

      <Wormhole to="search_section">
        <Search />
      </Wormhole>

      <StickySidebar>
        <SettingsSidebar />
      </StickySidebar>

      <div>
        <div class={styles.eventQueueHeader}>
          <Show
            when={accountStore.eventQueue.length > 0}
            fallback={
              <div class={styles.label}>
                {intl.formatMessage(tEventQueue.empty)}
              </div>
            }
          >
            <div class={styles.label}>
              {intl.formatMessage(tEventQueue.label)}
            </div>

            <div class={styles.retry}>
              <Show
                when={accountStore.eventQueueRetry > 0}
                fallback={<>{intl.formatMessage(tEventQueue.retrying)}</>}
              >
                {intl.formatMessage(tEventQueue.retry, { seconds: accountStore.eventQueueRetry })}
              </Show>
            </div>
          </Show>
        </div>
        <div class={styles.eventList}>
          <For each={accountStore.eventQueue}>
            {queuedEvent =>
              <div class={styles.queueItem}>
                <div class={styles.check}>
                  <CheckBox
                    checked={selectedEvents.find(e => queuedEvent.id === e.id)}
                    onChange={() => {
                      if (selectedEvents.find(e => queuedEvent.id === e.id)) {
                        setSelectedEvents((evs => evs.filter(e => e.id !== queuedEvent.id)));
                        return;
                      }

                      setSelectedEvents(selectedEvents.length, () => ({ ...queuedEvent }));
                    }}
                  />
                </div>
                <GenericEvent
                  event={queuedEvent}
                  onResign={retrySigning}
                />
              </div>
            }
          </For>
        </div>
        <div class={styles.actionFooter}>
          <ButtonSecondary
            onClick={abortSelected}
            disabled={selectedEvents.length === 0}
          >Abort Selected</ButtonSecondary>
          <ButtonPrimary
            onClick={retrySelected}
            disabled={selectedEvents.length === 0}
          >Retry Selected</ButtonPrimary>
        </div>
      </div>

    </div>
  );
}

export default EventQueuePage;
