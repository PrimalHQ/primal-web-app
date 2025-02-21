import { Component, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
import { MediaVariant, PrimalNote } from '../../types/primal';


import styles from './Note.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { hookForDev } from '../../lib/devTools';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
// @ts-ignore
import PhotoSwipeDynamicCaption from 'photoswipe-dynamic-caption-plugin';
// @ts-ignore
import PhotoSwipeVideoPlugin from 'photoswipe-video-plugin';

import NoteImage from '../NoteImage/NoteImage';
import { imageOrVideoRegexG } from '../../constants';
import { useMediaContext } from '../../contexts/MediaContext';
import { createStore } from 'solid-js/store';
import { A, useNavigate } from '@solidjs/router';
import ParsedNote from '../ParsedNote/ParsedNote';
import { humanizeTime, isDev, isPhone } from '../../utils';
import { nip19 } from 'nostr-tools';
import NoteImageSmall from '../NoteImage/NoteImageSmall';

const NoteGallery: Component<{
  note: PrimalNote,
  id?: string,
  imgWidth?: number,
}> = (props) => {
  const intl = useIntl();
  const media = useMediaContext();
  const navigate = useNavigate();

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
    images : {
      origUrl: string,
      url: string,
      image: MediaVariant | undefined,
      imageThumb: string | undefined,
      type: string | undefined,
      noVideoThumbnail?: boolean,
    }[],
  }>({
    images: [],
  });

  onMount(() => {
    const urls = props.note.content.matchAll(imageOrVideoRegexG);
    let result = urls.next();
    let images: string[] = [];

    while (!result.done) {
      images.push(result.value[0]);
      result = urls.next();
    }

    for (let i=0; i<images.length; i++) {
      let origUrl = images[i];

      let image = media?.actions.getMedia(origUrl, 'o');
      let url = image?.media_url || origUrl;
      let type = image?.mt;

      let imageThumb =
        media?.thumbnails[origUrl] ||
        media?.actions.getMediaUrl(origUrl, 's') ||
        media?.actions.getMediaUrl(origUrl, 'm') ||
        media?.actions.getMediaUrl(origUrl, 'o') ||
        origUrl;

      setStore('images', store.images.length, () => ({ origUrl, url, image, imageThumb, type }));
    }


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

  const firstImage = () => store.images[0];

  const isMissingThumbnal = (image: any) => !isDev() || image.noVideoThumbnail;

  const noteLinkId = () => {
    try {
      return `/e/${props.note.noteIdShort}`;
    } catch(e) {
      return '/404';
    }
  };

  return (
    <div
      id={`galleryimage_${props.note.id}`}
      data-note={props.note.id}
      data-url={firstImage()?.url}
      class="animated"
    >
      <div class={styles.imageGallery}>
        <For each={store.images}>
          {(image, index) => (
            <Switch>
              <Match when={image.type?.startsWith('video')}>
                <div
                  class={styles.videoGallery}
                  style={`z-index: ${store.images.length - index()}`}
                >
                  <Show
                    when={store.images.length > 1}
                    fallback={<div class={styles.videoIcon}></div>}
                  >
                    <div class={styles.galleryIcon}></div>
                  </Show>
                  <Show when={image.image?.dur}>
                    <div class={styles.videoDuration}>
                      {humanizeTime(image.image?.dur || 0)}
                    </div>
                  </Show>
                  <a
                    class={`galleryimage image_${props.note.noteId} cell_${1}`}
                    href={image.image?.media_url}
                    data-pswp-video-src={image.image?.media_url}
                    data-pswp-width="800"
                    data-pswp-height="600"
                    data-pswp-type="video"
                  >
                    <Show
                      when={!image.noVideoThumbnail}
                      fallback={<div class={isMissingThumbnal(image) ? styles.missingThumb : ''}>
                        <video src={image.origUrl} width={148} height={148} ></video>
                      </div>}
                    >
                      <img src={image.imageThumb} onerror={() => setStore('images', 0, 'noVideoThumbnail', true)} />
                    </Show>

                    <div class="pswp-caption-content">
                      <div class={styles.mediaNote}>
                        <div class={styles.note}>
                          {mediaFreeNote(props.note)}
                        </div>
                        <A
                          class={styles.noteLink}
                          href={noteLinkId()}
                        >
                          Go to note
                        </A>
                      </div>
                    </div>
                  </a>
                </div>
              </Match>
              <Match when={true}>
                <div
                  class={styles.videoGallery}
                  style={`z-index: ${store.images.length - index()}`}
                >
                  <Show
                    when={store.images.length > 1}
                  >
                    <div class={styles.galleryIcon}></div>
                  </Show>

                  <NoteImageSmall
                    class={`galleryimage image_${props.note.post.noteId} cell_${1}`}
                    src={image.url}
                    media={image.image}
                    mediaThumb={image.imageThumb}
                    altSrc={image.imageThumb}
                    isDev={isDev()}
                    width={isPhone() ? (props.imgWidth || 0) : 210}
                    shortHeight={true}
                    plainBorder={true}
                    caption={
                      <div class={styles.mediaNote}>
                        <div class={styles.note}>
                          {mediaFreeNote(props.note)}
                        </div>
                        <A
                          class={styles.noteLink}
                          href={noteLinkId()}
                        >
                          Go to note
                        </A>
                      </div>
                    }
                    authorPk={props.note.pubkey}
                  />
                </div>
              </Match>
            </Switch>
          )}
        </For>
      </div>
    </div>
  )
}

export default hookForDev(NoteGallery);
