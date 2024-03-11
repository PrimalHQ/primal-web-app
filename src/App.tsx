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


export const APP_ID = `${Math.floor(Math.random()*10000000000)}`;

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
                <SettingsProvider>
                  <ProfileProvider>
                    <MessagesProvider>
                      <NotificationsProvider>
                        <HomeProvider>
                          <ExploreProvider>
                            <ThreadProvider>
                              <Router />
                            </ThreadProvider>
                          </ExploreProvider>
                        </HomeProvider>
                      </NotificationsProvider>
                    </MessagesProvider>
                  </ProfileProvider>
                </SettingsProvider>
              </SearchProvider>
            </AccountProvider>
          </MediaProvider>
        </Toaster>
      </TranslatorProvider>
    </AppProvider>
  );
};

export default App;
