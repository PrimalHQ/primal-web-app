import { Component, createResource, lazy } from 'solid-js';
import { Routes, Route, Navigate, RouteDataFuncArgs } from "@solidjs/router";

import { ComponentLog, PrimalWindow } from './types/primal';
import { fetchKnownProfiles } from './lib/profile';

import { useHomeContext } from './contexts/HomeContext';
import { useExploreContext } from './contexts/ExploreContext';
import { useThreadContext } from './contexts/ThreadContext';
import { useAccountContext } from './contexts/AccountContext';
import { useProfileContext } from './contexts/ProfileContext';
import { useSettingsContext } from './contexts/SettingsContext';
import { useMessagesContext } from './contexts/MessagesContext';
import { useMediaContext } from './contexts/MediaContext';
import { useNotificationsContext } from './contexts/NotificationsContext';
import { useSearchContext } from './contexts/SearchContext';

const Home = lazy(() => import('./pages/Home'));
const Layout = lazy(() => import('./components/Layout/Layout'));
const Explore = lazy(() => import('./pages/Explore'));
const Thread = lazy(() => import('./pages/Thread'));
const Messages = lazy(() => import('./pages/Messages'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Downloads = lazy(() => import('./pages/Downloads'));
const Settings = lazy(() => import('./pages/Settings/Settings'));
const Help = lazy(() => import('./pages/Help'));
const Search = lazy(() => import('./pages/Search'));
const NotFound = lazy(() => import('./pages/NotFound'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const Profile = lazy(() => import('./pages/Profile'));
const Mutelist = lazy(() => import('./pages/Mutelist'));

const NotifSettings = lazy(() => import('./pages/Settings/Notifications'));
const Appearance = lazy(() => import('./pages/Settings/Appearance'));
const HomeFeeds = lazy(() => import('./pages/Settings/HomeFeeds'));
const ZapSettings = lazy(() => import('./pages/Settings/Zaps'));
const Muted = lazy(() => import('./pages/Settings/Muted'));
const Network = lazy(() => import('./pages/Settings/Network'));
const Moderation = lazy(() => import('./pages/Settings/Moderation'));
const Menu = lazy(() => import('./pages/Settings/Menu'));

const primalWindow = window as PrimalWindow;

const isDev = localStorage.getItem('devMode') === 'true';

const Router: Component = () => {

  const account = useAccountContext();
  const profile = useProfileContext();
  const settings = useSettingsContext();
  const home = useHomeContext();
  const explore = useExploreContext();
  const thread = useThreadContext();
  const messages = useMessagesContext();
  const media = useMediaContext();
  const notifications = useNotificationsContext();
  const search = useSearchContext();

  if (isDev) {
    primalWindow.primal = {
      account,
      explore,
      home,
      media,
      messages,
      notifications,
      profile,
      search,
      settings,
      thread,
    };

    primalWindow.onPrimalComponentMount = () => {};
    primalWindow.onPrimalComponentCleanup = () => {};
    primalWindow.onPrimalCacheServerConnected = () => {};
    primalWindow.onPrimalCacheServerMessage = () => {};
  }

  const getKnownProfiles = ({ params }: RouteDataFuncArgs) => {
    const [profiles] = createResource(params.vanityName, fetchKnownProfiles)
    return profiles;
  }

  return (
    <>
      <Routes>
        <Route path="/" component={Layout} >
          <Route path="/" element={<Navigate href="/home" />} />
          <Route path="/home" component={Home} />
          <Route path="/thread/:postId" component={Thread} />
          <Route path="/e/:postId" component={Thread} />
          <Route path="/explore/:scope?/:timeframe?" component={Explore} />
          <Route path="/messages/:sender?" component={Messages} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/downloads" component={Downloads} />
          <Route path="/download" element={<Navigate href='/downloads' />} />;
          <Route path="/settings" component={Settings}>
            <Route path="/" component={Menu} />
            <Route path="/appearance" component={Appearance} />
            <Route path="/feeds" component={HomeFeeds} />
            <Route path="/notifications" component={NotifSettings} />
            <Route path="/zaps" component={ZapSettings} />
            <Route path="/muted" component={Muted} />
            <Route path="/network" component={Network} />
            <Route path="/filters" component={Moderation} />
          </Route>
          <Route path="/settings/profile" component={EditProfile} />
          <Route path="/profile/:npub?" component={Profile} />
          <Route path="/p/:npub?" component={Profile} />
          <Route path="/help" component={Help} />
          <Route path="/search/:query" component={Search} />
          <Route path="/rest" component={Explore} />
          <Route path="/mutelist/:npub" component={Mutelist} />
          <Route path="/404" component={NotFound} />
          <Route path="/:vanityName" component={Profile} data={getKnownProfiles} />
        </Route>
      </Routes>
    </>
  );
};

export default Router;
