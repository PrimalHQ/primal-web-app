import { Component, createEffect, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
import styles from '../ExploreNew.module.scss';
import { useToastContext } from '../../components/Toaster/Toaster';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { useIntl } from '@cookbook/solid-intl';
import { useExploreContext } from '../../contexts/ExploreContext';
import { A, useLocation } from '@solidjs/router';
import { fetchExploreMedia, fetchExplorePeople, fetchExploreZaps } from '../../megaFeeds';
import { APP_ID } from '../../App';
import { userName } from '../../stores/profile';
import Avatar from '../../components/Avatar/Avatar';
import { useAccountContext } from '../../contexts/AccountContext';
import { imageRegex } from '../../constants';
import { PrimalNote } from '../../types/primal';
import NoteGallery from '../../components/Note/NoteGallery';

const ExploreMedia: Component<{ open?: boolean }> = (props) => {

  const settings = useSettingsContext();
  const toaster = useToastContext();
  const intl = useIntl();
  const explore = useExploreContext();
  const location = useLocation();
  const account = useAccountContext();

  onMount(() => {
    getMedia();
  });

  const getMedia = async () => {
    const { notes } = await fetchExploreMedia(account?.publicKey, `explore_media_${APP_ID}` , { limit: 20 });

    explore?.actions.setExploreMedia(notes);
  }

  const hasImages = (note: PrimalNote) => {
    const test = (imageRegex).test(note.content);
    return test;
  }

  return (
    <div class={styles.exploreMedia}>
      <div class={styles.galleryGrid}>
        <For each={explore?.exploreMedia}>
          {(note) => (
            <Switch>
              <Match when={hasImages(note)}>
                <NoteGallery note={note} />
              </Match>
              <Match when={!hasImages(note)}>
                <A href={`/e/${note.noteId}`} class={styles.missingImage}>
                  <NoteGallery note={note} />
                </A>
              </Match>
            </Switch>
          )}
        </For>
      </div>
    </div>
  )
}

export default ExploreMedia;
