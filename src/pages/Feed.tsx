import { Component, createEffect, For, Show } from 'solid-js';
import styles from './Feed.module.scss';
import { useParams } from '@solidjs/router';
import Note from '../components/Note/Note';
import Loader from '../components/Loader/Loader';
import { useExploreContext } from '../contexts/ExploreContext';
import Paginator from '../components/Paginator/Paginator';

const Feed: Component<{ scope: string, timeframe: string}> = () => {

  const explore = useExploreContext();

  const params = useParams();

  createEffect(() => {
    if (params.scope && params.timeframe) {
      explore?.actions.clearNotes();
      explore?.actions.fetchNotes(
        `${params.scope};${params.timeframe}`,
      );
    }
  });

  return (
    <div class={styles.feedContent}>
      <Show
        when={explore && explore.notes.length > 0}
        fallback={<Loader />}
      >
        <For each={explore?.notes} >
          {(note) => <Note note={note} shorten={true} />}
        </For>
        <Paginator loadNextPage={explore?.actions.fetchNextPage} />
      </Show>
    </div>
  )
}

export default Feed;
