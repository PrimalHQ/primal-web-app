import { Component, onCleanup, onMount } from 'solid-js';
import { Routes, Route, Navigate } from "@solidjs/router"
import Home from './pages/Home';
import Layout from './components/Layout/Layout';
import Explore from './pages/Explore';
import { FeedProvider } from './contexts/FeedContext';
import { connect, disconnect } from './sockets';
import Thread from './pages/Thread';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Downloads from './pages/Downloads';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Profile from './pages/Profile';
import styles from './App.module.scss';
import Toaster from './components/Toaster/Toaster';
import { HomeProvider } from './contexts/HomeContext';
import { ExploreProvider } from './contexts/ExploreContext';
import { ThreadProvider } from './contexts/ThreadContext';
import Router from './Router';
import { ProfileProvider } from './contexts/ProfileContext';
import { SettingsProvider } from './contexts/SettingsContext';


export const APP_ID = Math.floor(Math.random()*10000000000);

const App: Component = () => {

  onMount(() => {
    connect();

  });

  onCleanup(() => {
    disconnect();

  })

  return (
    <>
      <Toaster>
        <FeedProvider>
          <SettingsProvider>
            <ProfileProvider>
              <HomeProvider>
                <ExploreProvider>
                  <ThreadProvider>
                    <input id="defocus" class={styles.invisible}/>
                    <Router />
                  </ThreadProvider>
                </ExploreProvider>
              </HomeProvider>
            </ProfileProvider>
          </SettingsProvider>
        </FeedProvider>
      </Toaster>
    </>
  );
};

export default App;
