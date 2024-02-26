import { Component, createEffect, createResource, lazy } from 'solid-js';
import { Routes, Route, Navigate, RouteDataFuncArgs, useLocation } from "@solidjs/router";

import { PrimalWindow } from './types/primal';
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
const CreateAccount = lazy(() => import('./pages/CreateAccount'));

const NotifSettings = lazy(() => import('./pages/Settings/Notifications'));
const Account = lazy(() => import('./pages/Settings/Account'));
const Appearance = lazy(() => import('./pages/Settings/Appearance'));
const HomeFeeds = lazy(() => import('./pages/Settings/HomeFeeds'));
const ZapSettings = lazy(() => import('./pages/Settings/Zaps'));
const Muted = lazy(() => import('./pages/Settings/Muted'));
const Network = lazy(() => import('./pages/Settings/Network'));
const Moderation = lazy(() => import('./pages/Settings/Moderation'));
const Menu = lazy(() => import('./pages/Settings/Menu'));
const Landing = lazy(() => import('./pages/Landing'));
const AppDownloadQr = lazy(() => import('./pages/appDownloadQr'));

const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Support = lazy(() => import('./pages/Support'));

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
  const locations = useLocation();

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
    primalWindow.onPrimalUploadServerConnected = () => {};
    primalWindow.onPrimalCacheServerMessageReceived = () => {};
    primalWindow.onPrimalCacheServerMessageSent = () => {};
  }

  const getKnownProfiles = ({ params }: RouteDataFuncArgs) => {
    const [profiles] = createResource(params.vanityName, fetchKnownProfiles)
    return profiles;
  }

  createEffect(() => {
    if (locations.pathname) {
      settings?.actions.refreshMobileReleases();
    }
  });

  return (
    <>
      <Routes>
        <Route path="/app-download-qr" component={AppDownloadQr} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/support" component={Support} />
        <Route path="/" component={Layout} >
          <Route path="/" component={Landing} />
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
            <Route path="/account" component={Account} />
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
          <Route path="/new" component={CreateAccount} />
          <Route path="/404" component={NotFound} />
          <Route path="/:vanityName" component={Profile} data={getKnownProfiles} />
        </Route>
      </Routes>
    </>
  );
};

export default Router;
