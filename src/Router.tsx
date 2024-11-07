import { Component, createEffect, createResource, lazy } from 'solid-js';
import { Router, Route, Navigate, useLocation, cache } from "@solidjs/router";

import { PrimalWindow } from './types/primal';
import { fetchKnownProfiles } from './lib/profile';

import { useHomeContext } from './contexts/HomeContext';
import { useExploreContext } from './contexts/ExploreContext';
import { useThreadContext } from './contexts/ThreadContext';
import { useAccountContext } from './contexts/AccountContext';
import { useProfileContext } from './contexts/ProfileContext';
import { useSettingsContext } from './contexts/SettingsContext';
import { useMediaContext } from './contexts/MediaContext';
import { useNotificationsContext } from './contexts/NotificationsContext';
import { useSearchContext } from './contexts/SearchContext';
import { useDMContext } from './contexts/DMContext';

const Home = lazy(() => import('./pages/Home'));
const Reads = lazy(() => import('./pages/Reads'));
const Layout = lazy(() => import('./components/Layout/Layout'));
// const Explore = lazy(() => import('./pages/Explore'));
const Explore = lazy(() => import('./pages/Explore/Explore'));
const ExploreFeeds = lazy(() => import('./pages/Explore/ExploreFeeds'));
const Thread = lazy(() => import('./pages/Thread'));
const DirectMessages = lazy(() => import('./pages/DirectMessages'));
const Bookmarks = lazy(() => import('./pages/Bookmarks'));
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
const Premium = lazy(() => import('./pages/Premium/Premium'));

const NotifSettings = lazy(() => import('./pages/Settings/Notifications'));
const Account = lazy(() => import('./pages/Settings/Account'));
const Appearance = lazy(() => import('./pages/Settings/Appearance'));
const HomeFeeds = lazy(() => import('./pages/Settings/HomeFeeds'));
const ReadsFeeds = lazy(() => import('./pages/Settings/ReadsFeeds'));
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

const Feeds = lazy(() => import('./pages/FeedsTest'));
const Feed = lazy(() => import('./pages/FeedQueryTest'));
const AdvancedSearch = lazy(() => import('./pages/AdvancedSearch'));
const AdvancedSearchResults = lazy(() => import('./pages/AdvancedSearchResults'));

const primalWindow = window as PrimalWindow;

const isDev = localStorage.getItem('devMode') === 'true';

export const getKnownProfiles = cache(({ params }: any) => {
  return fetchKnownProfiles(params.vanityName);
}, 'vanityName')

// export const getKnownProfiles = cache(({ params }: any) => {
//   const [profiles] = createResource(params.vanityName, fetchKnownProfiles)

//   return profiles;
// }, 'vanityName')

const AppRouter: Component = () => {

  const account = useAccountContext();
  const profile = useProfileContext();
  const settings = useSettingsContext();
  const home = useHomeContext();
  const explore = useExploreContext();
  const thread = useThreadContext();
  const messages = useDMContext();
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
    primalWindow.onPrimalUploadServerConnected = () => {};
    primalWindow.onPrimalCacheServerMessageReceived = () => {};
    primalWindow.onPrimalCacheServerMessageSent = () => {};
  }

  return (
      <Router>
        <Route path="/app-download-qr" component={AppDownloadQr} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/support" component={Support} />
        <Route path="/" component={Layout} >
          <Route path="/" component={() => <Navigate href="/home" />} />
          <Route path="/home" component={Home} />
          <Route path="/reads/:topic?" component={Reads} />
          <Route path="/thread/:id" component={Thread} />
          <Route path="/e/:id" component={Thread} />
          <Route path="/explore">
            <Route path="/" component={Explore} />
            <Route path="/feed/:id" component={ExploreFeeds} />
          </Route>
          {/* <Route path="/explore/:scope?/:timeframe?" component={Explore} /> */}
          <Route path="/dms/:contact?" component={DirectMessages} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/downloads" component={Downloads} />
          <Route path="/download" component={() => <Navigate href='/downloads' />} />;
          <Route path="/settings" component={Settings}>
            <Route path="/" component={Menu} />
            <Route path="/account" component={Account} />
            <Route path="/appearance" component={Appearance} />
            <Route path="/home_feeds" component={HomeFeeds} />
            <Route path="/reads_feeds" component={ReadsFeeds} />
            <Route path="/notifications" component={NotifSettings} />
            <Route path="/zaps" component={ZapSettings} />
            <Route path="/muted" component={Muted} />
            <Route path="/network" component={Network} />
            <Route path="/filters" component={Moderation} />
          </Route>
          <Route path="/bookmarks" component={Bookmarks} />
          <Route path="/settings/profile" component={EditProfile} />
          <Route path="/profile/:npub?" component={Profile} />
          <Route path="/p/:npub?" component={Profile} />
          <Route path="/help" component={Help} />
          <Route path="/search/:query" component={Search} />
          {/* <Route path="/rest" component={Explore} /> */}
          <Route path="/mutelist/:npub" component={Mutelist} />
          <Route path="/new" component={CreateAccount} />
          <Route path="/feeds">
            <Route path="/" component={Feeds} />
            <Route path="/:query" component={Feed} />
          </Route>
          <Route path="/asearch">
            <Route path="/" component={AdvancedSearch} />
            <Route path="/:query" component={AdvancedSearchResults} />
          </Route>
          <Route path="/premium/:step?" component={Premium} />
          <Route path="/:vanityName">
            <Route path="/" component={Profile} preload={getKnownProfiles} />
            <Route path="/:identifier" component={Thread} preload={getKnownProfiles} />
          </Route>
          <Route path="/404" component={NotFound} />
        </Route>
      </Router>
  );
};

export default AppRouter;
