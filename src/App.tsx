import { Component, createEffect, onCleanup, onMount } from 'solid-js';
import { Routes, Route, Navigate } from "@solidjs/router"
import Home from './pages/Home';
import Layout from './components/Layout/Layout';
import Explore from './pages/Explore';
import { FeedProvider } from './contexts/FeedContext';
import { connect, disconnect, isNotConnected } from './sockets';
import Thread from './pages/Thread';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Downloads from './pages/Downloads';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import styles from './App.module.scss';
import Toaster from './components/Toaster/Toaster';
import { HomeProvider } from './contexts/HomeContext';
import { ExploreProvider } from './contexts/ExploreContext';

// const onVisibilityChange = () => {
//   if (document.visibilityState === "visible") {
//     connect();
//   }
// };

export const APP_ID = Math.floor(Math.random()*10000000000);

const App: Component = () => {

  onMount(() => {
    connect();
    // document.addEventListener('visibilitychange', onVisibilityChange);

  });

  onCleanup(() => {
    disconnect();
    // document.removeEventListener('visibilitychange', onVisibilityChange);

  })

  createEffect(() => {

  });

  return (
    <>
      <Toaster>
        <FeedProvider>
          <HomeProvider>
            <ExploreProvider>
              <input id="defocus" class={styles.invisible}/>
              <Routes>
                <Route path="/" component={Layout} >
                  <Route path="/" element={<Navigate href="/home" />} />
                  <Route path="/home" component={Home} />
                  <Route path="/thread/:postId" component={Thread} />
                  <Route path="/explore/:scope?/:timeframe?" component={Explore} />
                  <Route path="/messages" component={Messages} />
                  <Route path="/notifications" component={Notifications} />
                  <Route path="/downloads" component={Downloads} />
                  <Route path="/settings" component={Settings} />
                  <Route path="/profile/:npub?" component={Profile} />
                  <Route path="/help" component={Help} />
                  <Route path="/rest" component={Explore} />
                </Route>
              </Routes>
            </ExploreProvider>
          </HomeProvider>
        </FeedProvider>
      </Toaster>
    </>
  );
};

export default App;
