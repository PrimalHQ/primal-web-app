import { Component, createEffect, createMemo, createSignal, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
import { MediaVariant, PrimalNote } from '../../types/primal';


import styles from './Note.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { note as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import MentionedUserLink from './MentionedUserLink/MentionedUserLink';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
// @ts-ignore
import PhotoSwipeDynamicCaption from 'photoswipe-dynamic-caption-plugin';
// @ts-ignore
import PhotoSwipeVideoPlugin from 'photoswipe-video-plugin';

import NoteImage from '../NoteImage/NoteImage';
import { generatePrivateKey } from '../../lib/nTools';
import { imageOrVideoRegexG, imageRegexG, videoRegexG } from '../../constants';
import { useMediaContext } from '../../contexts/MediaContext';
import { createStore } from 'solid-js/store';
import { A, useNavigate } from '@solidjs/router';
import ParsedNote from '../ParsedNote/ParsedNote';
import ButtonSecondary from '../Buttons/ButtonSecondary';

const NoteGallery: Component<{
  note: PrimalNote,
  id?: string,
}> = (props) => {
  const intl = useIntl();
  const media = useMediaContext();
  const navigate = useNavigate();

  const id = generatePrivateKey();

  const lightbox = new PhotoSwipeLightbox({
    gallery: `#galleryimage_${props.note.id}`,
    children: `a.image_${props.note.post.noteId}`,
    showHideAnimationType: 'zoom',
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 2,
    maxZoomLevel: 3,
    thumbSelector: `a.image_${props.note.post.noteId}`,
    preloadFirstSlide: true,
    pswpModule: () => import('photoswipe'),
  });

  const [store, setStore] = createStore<{
    url: string,
    image: MediaVariant | undefined,
    imageThumb: string | undefined,
    type: string | undefined,
  }>({
    url: '',
    image: undefined,
    imageThumb: undefined,
    type: undefined,
  });

  onMount(() => {
    const urls = props.note.content.matchAll(imageOrVideoRegexG);
    let result = urls.next();
    let images: string[] = [];

    while (!result.done) {
      images.push(result.value[0]);
      result = urls.next();
    }

    let origUrl = images[0];

    let image = media?.actions.getMedia(origUrl, 'o');
    let url = image?.media_url || origUrl;
    let type = image?.mt;

    let imageThumb = media?.thumbnails[origUrl] || media?.actions.getMediaUrl(origUrl, 's');

    setStore(() => ({ url, image, imageThumb, type }));


    const videoPlugin = new PhotoSwipeVideoPlugin(lightbox, {
      // Plugins options
      // type: 'aside',
      // captionContent: '.pswp-caption-content'
    });

    const captionPlugin = new PhotoSwipeDynamicCaption(lightbox, {
      // Plugins options
      type: 'aside',
      captionContent: '.pswp-caption-content'
    });

    lightbox.init();
  });

  onCleanup(() => {
    lightbox.destroy()
  })

  const mediaFreeNote = (note: PrimalNote) => {
    const newNote = {
      ...note,
      content: note.content.replace(imageOrVideoRegexG, '').trim(),
    };

    return <ParsedNote
      note={newNote}
      ignoreMedia={true}
      noLinks="links"
      noPreviews={true}
      isEmbeded={false}
      noLightbox={true}
    />
  }

  return (
    <div
      id={`galleryimage_${props.note.id}`}
      data-note={props.note.id}
      data-url={store.url}
      class="animated"
    >
      <Switch>
        <Match when={store.type?.startsWith('video')}>
          <div class={styles.videoGallery}>
            <div class={styles.videoIcon}></div>
            <a
              class={`galleryimage image_${props.note.post.noteId} cell_${1}`}
              href={store.image?.media_url}
              data-pswp-video-src={store.image?.media_url}
              data-pswp-width="800"
              data-pswp-height="600"
              data-pswp-type="video"
            >
              <img src={store.imageThumb} alt="" />
              <div class="pswp-caption-content">
                <div class={styles.mediaNote}>
                  <div class={styles.note}>
                    {mediaFreeNote(props.note)}
                  </div>
                  <A
                    class={styles.noteLink}
                    href={`/e/${props.note.noteId}`}
                  >
                    Go to note
                  </A>
                </div>
              </div>
            </a>
          </div>
        </Match>
        <Match when={store.type?.startsWith('image')}>
          <div class={styles.imageGallery}>

            <NoteImage
              class={`galleryimage image_${props.note.post.noteId} cell_${1}`}
              src={store.url}
              media={store.image}
              mediaThumb={store.imageThumb}
              altSrc={store.imageThumb}
              width={210}
              shortHeight={true}
              plainBorder={true}
              caption={
                <div class={styles.mediaNote}>
                  <div class={styles.note}>
                    {mediaFreeNote(props.note)}
                  </div>
                  <A
                    class={styles.noteLink}
                    href={`/e/${props.note.noteId}`}
                  >
                    Go to note
                  </A>
                </div>
              }
            />
          </div>
        </Match>
      </Switch>
    </div>
  )
}

export default hookForDev(NoteGallery);
