import { Component, onCleanup, onMount } from 'solid-js';
import { AccountProvider } from './contexts/AccountContext';
import { connect, disconnect } from './sockets';
import Toaster from './components/Toaster/Toaster';
import { HomeProvider } from './contexts/HomeContext';
import { ExploreProvider } from './contexts/ExploreContext';
import { ThreadProvider } from './contexts/ThreadContext';
import Router from './Router';
import { ProfileProvider } from './contexts/ProfileContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { TranslatorProvider } from './contexts/TranslatorContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { SearchProvider } from './contexts/SearchContext';
import { MessagesProvider } from './contexts/MessagesContext';
import { MediaProvider } from './contexts/MediaContext';
import { AppProvider } from './contexts/AppContext';
import { ReadsProvider } from './contexts/ReadsContext';
import { AdvancedSearchProvider } from './contexts/AdvancedSearchContext';


export const version = import.meta.env.PRIMAL_VERSION;
export const APP_ID = `web_dev_${version}_${Math.floor(Math.random()*10000000000)}`;

const App: Component = () => {

  onMount(() => {
    connect();
  });

  onCleanup(() => {
    disconnect();
  });

  return (
    <AppProvider>
      <TranslatorProvider>
        <Toaster>
          <MediaProvider>
            <AccountProvider>
              <SearchProvider>
                <AdvancedSearchProvider>
                  <SettingsProvider>
                    <ProfileProvider>
                      <MessagesProvider>
                        <NotificationsProvider>
                          <ReadsProvider>
                            <HomeProvider>
                              <ExploreProvider>
                                <ThreadProvider>
                                  <Router />
                                </ThreadProvider>
                              </ExploreProvider>
                            </HomeProvider>
                          </ReadsProvider>
                        </NotificationsProvider>
                      </MessagesProvider>
                    </ProfileProvider>
                  </SettingsProvider>
                </AdvancedSearchProvider>
              </SearchProvider>
            </AccountProvider>
          </MediaProvider>
        </Toaster>
      </TranslatorProvider>
    </AppProvider>
  );
};

export default App;
