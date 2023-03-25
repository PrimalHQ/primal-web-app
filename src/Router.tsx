import { Component, createResource } from 'solid-js';
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


const Router: Component = () => {

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
