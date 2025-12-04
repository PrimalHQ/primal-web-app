import { Component, createEffect, on, onCleanup, onMount } from 'solid-js';
import { connect, disconnect } from './sockets';
import Toaster from './components/Toaster/Toaster';
import { HomeProvider } from './contexts/HomeContext';
import { ExploreProvider } from './contexts/ExploreContext';
import { ThreadProvider } from './contexts/ThreadContext';
import AppRouter from './Router';
import { ProfileProvider } from './contexts/ProfileContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { TranslatorProvider } from './contexts/TranslatorContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { SearchProvider } from './contexts/SearchContext';
import { MediaProvider } from './contexts/MediaContext';
import { AppProvider } from './contexts/AppContext';
import { ReadsProvider } from './contexts/ReadsContext';
import { AdvancedSearchProvider } from './contexts/AdvancedSearchContext';
import { DMProvider } from './contexts/DMContext';
import 'media-chrome';
import "media-chrome/media-theme-element";
import 'hls-video-element';
import 'videojs-video-element';
import { generateAppKeys } from './lib/PrimalNip46';
import { accountStore, dequeEvent, enqueEvent, refreshQueue, startEventQueueMonitor, updateRelays } from './stores/accountStore';
import { triggerImportEvents } from './lib/notes';


export const version = import.meta.env.PRIMAL_VERSION;
export const APP_ID = `web_${version}_${Math.floor(Math.random()*10000000000)}`;

export const relayWorker = new Worker(
  new URL(`../relayWorker.ts`, import.meta.url),
  {
    type: 'module'
  },
);


const App: Component = () => {

  onMount(() => {
    connect();
    generateAppKeys();
    initRelayWorker();
  });

  onCleanup(() => {
    disconnect();
    relayWorker?.terminate();
  });

  createEffect(() => {
    const relays = Object.keys(accountStore.relaySettings);

    if (relays.length === 0) {
      setTimeout(() => {
        updateRelays();
      }, 200);
    }
  });

  const initRelayWorker = () => {
    relayWorker.addEventListener('message', (e: MessageEvent) => {
      const message = e.data;

      if (message.type === 'ENQUE_EVENT' && message.event) {
        enqueEvent(message.event);
        startEventQueueMonitor();
      }

      if (message.type === 'DEQUE_EVENT' && message.event) {
        dequeEvent(message.event);
      }

      if (message.type === 'EVENT_SENT' && message.event) {
        triggerImportEvents([message.event], `import_event_${message.event.id}_${APP_ID}`);
      }
    });

    relayWorker.postMessage({type: 'INIT'});
  }

  createEffect(on(() => accountStore.eventQueueRetry, (countdown) => {
    if (countdown > 0) return;

    refreshQueue();
  }));

  return (
    <AppProvider>
      <TranslatorProvider>
        <Toaster>
          <MediaProvider>
              <SearchProvider>
                <AdvancedSearchProvider>
                  <SettingsProvider>
                    <ProfileProvider>
                      <DMProvider>
                        <NotificationsProvider>
                          <ReadsProvider>
                            <HomeProvider>
                              <ExploreProvider>
                                <ThreadProvider>
                                  <AppRouter />
                                </ThreadProvider>
                              </ExploreProvider>
                            </HomeProvider>
                          </ReadsProvider>
                        </NotificationsProvider>
                      </DMProvider>
                    </ProfileProvider>
                  </SettingsProvider>
                </AdvancedSearchProvider>
              </SearchProvider>
          </MediaProvider>
        </Toaster>
      </TranslatorProvider>
    </AppProvider>
  );
};

export default App;
