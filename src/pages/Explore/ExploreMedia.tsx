import { Component, createEffect, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
import styles from './Explore.module.scss';
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
    const { notes, paging } = await fetchExploreMedia(account?.publicKey, `explore_media_${APP_ID}` , { limit: 30 });

    explore?.actions.setExploreMedia(notes, paging);
  }

  const getNextMediaPage = async () => {
    if (!explore || explore.mediaPaging.since === 0) return;

    const since = explore.mediaPaging.since || 0;
    const order = explore.mediaPaging.sortBy;
    const offset = explore.exploreMedia.reduce<number>((acc, m) => {
      // @ts-ignore
      return since === m.msg[order] ? acc + 1 : acc
    }, 0)

    const page = {
      limit: 30,
      until: explore.mediaPaging.since,
      offset,
    }

    const { notes, paging } = await fetchExploreMedia(account?.publicKey, `explore_media_${APP_ID}` , page);

    explore?.actions.setExploreMedia(notes, paging);
  }

  // const hasImages = (note: PrimalNote) => {
  //   const isImage = (imageRegex).test(note.content);
  //   const isVideo = (videoRegex).test(note.content);
  //   return isImage || isVideo;
  // }

  return (
    <div class={styles.exploreMedia}>
      <div class={styles.galleryGrid}>
        <For each={explore?.exploreMedia}>
          {(note) => (
                <A href={`/e/${note.noteId}`} class={styles.missingImage}>
                  <NoteGallery note={note} />
                </A>
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
