import { Component } from 'solid-js';
import { Routes, Route, Navigate } from "@solidjs/router"
import Home from './pages/Home';
import Layout from './components/Layout/Layout';
import Explore from './pages/Explore';
import Thread from './pages/Thread';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Downloads from './pages/Downloads';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Profile from './pages/Profile';
import { PrimalWindow } from './types/primal';
import { useHomeContext } from './contexts/HomeContext';
import { useExploreContext } from './contexts/ExploreContext';
import { useThreadContext } from './contexts/ThreadContext';
import { useAccountContext } from './contexts/AccountContext';
import { useProfileContext } from './contexts/ProfileContext';
import { useSettingsContext } from './contexts/SettingsContext';

const primalWindow = window as PrimalWindow;

const Router: Component = () => {

  const account = useAccountContext();
  const profile = useProfileContext();
  const settings = useSettingsContext();
  const home = useHomeContext();
  const explore = useExploreContext();
  const thread = useThreadContext();

  const loadPrimalStores = () => {
    primalWindow.primal = {
      account,
      explore,
      home,
      profile,
      settings,
      thread,
    };
  };

  primalWindow.loadPrimalStores = loadPrimalStores;

  return (
    <>
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
    </>
  );
};

export default Router;
