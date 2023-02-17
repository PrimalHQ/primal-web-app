import { Component, createEffect, createResource, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';
import styles from './Feed.module.scss';
import { useFeedContext } from '../contexts/FeedContext';

const Feed: Component = () => {

  const context = useFeedContext();

  onMount(() => {

  });

  return (
    <div>
      Hello
    </div>
  )
}

export default Feed;
