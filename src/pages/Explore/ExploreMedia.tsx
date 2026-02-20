import { Component, For, onMount } from 'solid-js';
import styles from './Explore.module.scss';
import { useExploreContext } from '../../contexts/ExploreContext';
import { A } from '@solidjs/router';
import { fetchExploreMedia } from '../../megaFeeds';
import { APP_ID } from '../../App';
import { imageOrVideoRegex } from '../../constants';
import { PrimalNote } from '../../types/primal';
import NoteGallery from '../../components/Note/NoteGallery';
import Paginator from '../../components/Paginator/Paginator';
import { accountStore } from '../../stores/accountStore';

const ExploreMedia: Component<{ open?: boolean }> = (props) => {

  const explore = useExploreContext();

  onMount(() => {
    if (explore?.exploreMedia.length === 0) {
      getMedia();
    }
  });

  const getMedia = async () => {
    const { notes, paging } = await fetchExploreMedia(accountStore.publicKey, `explore_media_${APP_ID}` , { limit: 30 });

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

    const { notes, paging } = await fetchExploreMedia(accountStore.publicKey, `explore_media_${APP_ID}` , page);

    explore?.actions.setExploreMedia(notes, paging);
  }

  const galleryImages = () => {
    return explore?.exploreMedia.filter(note => {
      const test = (imageOrVideoRegex).test(note.content);
      return test;
    });
  };

  // const hasImages = (note: PrimalNote) => {
  //   const isImage = (imageRegex).test(note.content);
  //   const isVideo = (videoRegex).test(note.content);
  //   return isImage || isVideo;
  // }
  //

  const noteLinkId = (note: PrimalNote) => {
    try {
      return `/e/${note.noteIdShort}`;
    } catch(e) {
      return '/404';
    }
  };

  return (
    <div class={styles.exploreMedia}>
      <div class={styles.galleryGrid}>
        <For each={galleryImages()}>
          {(note) => (
            <A href={noteLinkId(note)} class={styles.missingImage}>
              <NoteGallery note={note} imgWidth={120} />
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
