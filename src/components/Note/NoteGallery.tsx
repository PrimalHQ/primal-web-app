import { Component, createEffect, createMemo, createSignal, onMount, Show } from 'solid-js';
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
// @ts-ignore Bad types in nostr-tools
import { generatePrivateKey } from 'nostr-tools';
import { imageRegexG } from '../../constants';
import { useMediaContext } from '../../contexts/MediaContext';
import { createStore } from 'solid-js/store';

const NoteGallery: Component<{
  note: PrimalNote,
  id?: string,
}> = (props) => {
  const intl = useIntl();
  const media = useMediaContext();

  const id = generatePrivateKey();

  const lightbox = new PhotoSwipeLightbox({
    gallery: `#galleryimage_${id}`,
    children: `a.image_${props.note.post.noteId}`,
    showHideAnimationType: 'zoom',
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 2,
    maxZoomLevel: 3,
    pswpModule: () => import('photoswipe'),
  });

  const [store, setStore] = createStore<{ url: string, image: MediaVariant | undefined}>({
    url: '',
    image: undefined,
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

    setStore(() => ({ url, image }));

    const captionPlugin = new PhotoSwipeDynamicCaption(lightbox, {
      // Plugins options, for example:
      type: 'auto',
      captionContent: '.pswp-caption-content'
    });

    lightbox.init();
  });

  return (
    <div id={`galleryimage_${id}`} data-note={props.note.id} data-url={store.url}>
      <NoteImage
        class={`noteimage image_${props.note.post.noteId} cell_${1}`}
        src={store.url}
        media={store.image}
        width={210}
        shortHeight={true}
        plainBorder={true}
        caption={props.note.content.replace(imageRegexG, '')}
      />
    </div>
  )
}

export default hookForDev(NoteGallery);
