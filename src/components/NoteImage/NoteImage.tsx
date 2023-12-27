import { Component, createEffect, createMemo, createSignal, JSX, onCleanup, onMount, Show } from "solid-js";
import styles from "./NoteImage.module.scss";
import mediumZoom from "medium-zoom";
import type { Zoom } from 'medium-zoom';
// @ts-ignore Bad types in nostr-tools
import { generatePrivateKey } from "nostr-tools";
import { MediaVariant } from "../../types/primal";

const NoteImage: Component<{
  class?: string,
  imageGroup?: string,
  media?: MediaVariant,
  width?: number,
  src?: string,
  isDev?: boolean,
  onError?: JSX.EventHandlerUnion<HTMLImageElement, Event>,
  onImageLoaded?: (url: string | undefined) => void,
  shortHeight?: boolean,
  plainBorder?: boolean,
}> = (props) => {
  const imgId = generatePrivateKey();

  let imgVirtual: HTMLImageElement | undefined;
  let imgActual: HTMLImageElement | undefined;

  const [isImageLoaded, setIsImageLoaded] = createSignal(false);

  const src = () => props.media?.media_url || props.src;

  const isCached = () => !props.isDev || props.media;

  const ratio = () => {
    const img = props.media;

    if (img) return img.w / img.h;

    return imgVirtual ?
      imgVirtual.width / imgVirtual.height :
      2;
  };

  // const height = () => {
  //   if (!props.media) {
  //     return '100%';
  //   }

  //   const img = props.media;

  //   if (!img || ratio() <= 1.2) return 'auto';

  //   // width of the note over the ratio of the preview image
  //   const h = 524 / ratio();

  //   return `${h}px`;
  // };

  const zoomW = () => {

    if (ratio() > 1) {
      return window.innerWidth;
    }

    return window.innerHeight * ratio();
  };

  const zoomH = () => {

    if (ratio() > 1) {
      return window.innerWidth / ratio();
    }

    return window.innerHeight;
  };

  const willBeTooBig = () => {
    const maxW = 524;

    const h = maxW / ratio();

    return h > 680;
  };

  const klass = () => `${styles.noteImage} ${props.shortHeight ? styles.shortHeight : ''} ${isCached() ? '' : 'redBorder'}`;

  onMount(() => {
    // if we have media info, shortcut image dimenzion calc
    if (props.media) {
      setIsImageLoaded(true);
    }

    // Virtually load an image, to be able to get it's dimensions to zoom it properly
    imgVirtual = new Image();
    imgVirtual.src = src() || '';
    imgVirtual.onload = () => {
      setIsImageLoaded(true);
    }
  });

  createEffect(() => {
    isImageLoaded() && props.onImageLoaded && props.onImageLoaded(src());
  })

  return (
    <Show when={isImageLoaded()}>
      <a
        class={`${props.class || ''} ${props.plainBorder ? '' : 'roundedImage'}`}
        href={src()}
        data-pswp-width={zoomW()}
        data-pswp-height={zoomH()}
        data-image-group={props.imageGroup}
        data-cropped={true}
      >
        <img
          id={imgId}
          ref={imgActual}
          src={src()}
          class={klass()}
          onerror={props.onError}
          width={willBeTooBig() ? undefined : '524px'}
        />
      </a>
    </Show>
  );
}

export default NoteImage;
