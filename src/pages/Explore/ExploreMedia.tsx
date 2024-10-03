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
import { imageRegex, videoRegex } from '../../constants';
import { PrimalNote } from '../../types/primal';
import NoteGallery from '../../components/Note/NoteGallery';
import Paginator from '../../components/Paginator/Paginator';
import { calculatePagingOffset } from '../../utils';

const ExploreMedia: Component<{ open?: boolean }> = (props) => {

  const settings = useSettingsContext();
  const toaster = useToastContext();
  const intl = useIntl();
  const explore = useExploreContext();
  const location = useLocation();
  const account = useAccountContext();

  onMount(() => {
    if (explore?.exploreMedia.length === 0) {
      getMedia();
    }
  });

  const getMedia = async () => {
    const { notes, paging } = await fetchExploreMedia(account?.publicKey, `explore_media_${APP_ID}` , { limit: 60 });

    explore?.actions.setExploreMedia(notes, paging);
  }

  const getNextMediaPage = async () => {
    if (!explore || explore.mediaPaging.since === 0) return;

    const page = {
      limit: 60,
      until: explore.mediaPaging.since,
      offset: calculatePagingOffset(
        explore.exploreMedia,
        explore.mediaPaging.elements,
      ),
    }

    const { notes, paging } = await fetchExploreMedia(account?.publicKey, `explore_media_${APP_ID}` , page);

    explore?.actions.setExploreMedia(notes, paging);
  }

  const hasImages = (note: PrimalNote) => {
    const isImage = (imageRegex).test(note.content);
    const isVideo = (videoRegex).test(note.content);
    return isImage || isVideo;
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
        <Paginator
          isSmall={true}
          loadNextPage={getNextMediaPage}
        />
      </div>
    </div>
  )
}

export default ExploreMedia;
