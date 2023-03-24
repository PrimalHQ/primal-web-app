import { Component, createEffect, For, Show } from 'solid-js';
import styles from './Feed.module.scss';
import { APP_ID } from '../App';
import { useParams } from '@solidjs/router';
import Note from '../components/Note/Note';
import Loader from '../components/Loader/Loader';
import { useExploreContext } from '../contexts/ExploreContext';
import Paginator from '../components/Paginator/Paginator';

const Feed: Component<{ scope: string, timeframe: string}> = () => {

  const context = useExploreContext();

  const params = useParams();

  createEffect(() => {
    if (params.scope && params.timeframe) {
      context?.actions.clearNotes();
      context?.actions.fetchNotes(
        `${params.scope};${params.timeframe}`,
        `${APP_ID}`
      );
    }
  });

  return (
    <div class={styles.feedContent}>
      <Show
        when={context && context.notes.length > 0}
        fallback={<Loader />}
      >
        <For each={context?.notes} >
          {(note) => {
            return <Note
              note={note}
            />
          }}
        </For>
        <Paginator loadNextPage={context?.actions.fetchNextPage} />
      </Show>
    </div>
  )
}

export default Feed;
