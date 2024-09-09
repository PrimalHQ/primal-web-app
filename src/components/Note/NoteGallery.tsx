import { Component, createEffect, createMemo, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { MediaVariant, PrimalNote } from '../../types/primal';


import styles from './Note.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { note as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import MentionedUserLink from './MentionedUserLink/MentionedUserLink';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
// @ts-ignore
import PhotoSwipeDynamicCaption from 'photoswipe-dynamic-caption-plugin';

import NoteImage from '../NoteImage/NoteImage';
import { generatePrivateKey } from '../../lib/nTools';
import { imageRegexG } from '../../constants';
import { useMediaContext } from '../../contexts/MediaContext';
import { createStore } from 'solid-js/store';
import { A } from '@solidjs/router';

const NoteGallery: Component<{
  note: PrimalNote,
  id?: string,
}> = (props) => {
  const intl = useIntl();
  const media = useMediaContext();

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
    imageThumb: MediaVariant | undefined,
  }>({
    url: '',
    image: undefined,
    imageThumb: undefined,
  });

  onMount(() => {
    const urls = props.note.content.matchAll(imageRegexG);
    let result = urls.next();
    let images: string[] = [];

    while (!result.done) {
      images.push(result.value[0]);
      result = urls.next();
    }

    let url = images[0];

    let image = media?.actions.getMedia(url, 'o');
    url = image?.media_url || url;

    let imageThumb = media?.actions.getMedia(url, 's');

    setStore(() => ({ url, image, imageThumb }));

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

  const imageFreeContent = (note: PrimalNote) => {
    const content = note.content.replace(imageRegexG, '').trim();

    if (content.length === 0) {
      return 'Go to note';
    }

    return content;
  }

  return (
    <div id={`galleryimage_${props.note.id}`} data-note={props.note.id} data-url={store.url}>
      <NoteImage
        class={`galleryimage image_${props.note.post.noteId} cell_${1}`}
        src={store.url}
        media={store.image}
        mediaThumb={store.imageThumb}
        width={210}
        shortHeight={true}
        plainBorder={true}
        caption={
          <A
            href={`/e/${props.note.noteId}`}
          >
            {imageFreeContent(props.note)}
          </A>}
      />
    </div>
  )
}

export default hookForDev(NoteGallery);
