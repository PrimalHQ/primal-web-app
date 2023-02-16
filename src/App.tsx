import { Component, createEffect, onCleanup, onMount } from 'solid-js';
import { Routes, Route, Navigate } from "@solidjs/router"
import Home from './pages/Home';
import Layout from './components/Layout/Layout';
import Explore from './pages/Explore';
import { FeedProvider } from './contexts/FeedContext';
import { connect, disconnect } from './sockets';
import Thread from './pages/Thread';

const App: Component = () => {

  onMount(() => {
    connect();
  });

  onCleanup(() => {
    disconnect();
  })

  createEffect(() => {

  });

  return (
    <>
      <FeedProvider>
        <Routes>
          <Route path="/" component={Layout} >
            <Route path="/" element={<Navigate href="/home" />} />
            <Route path="/home" component={Home} />
            <Route path="/thread/:postId" component={Thread} />
            <Route path="/explore" component={Explore} />
            <Route path="/rest" component={Explore} />
          </Route>
        </Routes>
      </FeedProvider>
    </>
  );
};

export default App;
