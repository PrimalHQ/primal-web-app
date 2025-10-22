import { Component, onCleanup, onMount } from 'solid-js';
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



export const version = import.meta.env.PRIMAL_VERSION;
export const APP_ID = `web_${version}_${Math.floor(Math.random()*10000000000)}`;

const App: Component = () => {

  onMount(() => {
    connect();

    // if ('serviceWorker' in navigator) {
    //   navigator.serviceWorker.register('./sw.js')
    //     .then(reg => console.log('SW registered: ', reg))
    //     .catch(err => console.log('SW registration failed: ', err));
    // }
  });

  onCleanup(() => {
    disconnect();
  });

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
