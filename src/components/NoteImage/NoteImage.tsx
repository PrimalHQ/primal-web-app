import { Component, createEffect, createSignal, JSX,  onMount, Show } from "solid-js";
import styles from "./NoteImage.module.scss";
// @ts-ignore Bad types in nostr-tools
import { generatePrivateKey } from "nostr-tools";
import { MediaVariant } from "../../types/primal";

const NoteImage: Component<{
  class?: string,
  imageGroup?: string,
  media?: MediaVariant,
  width?: number,
  src?: string,
  altSrc?: string,
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

  const [src, setSrc] = createSignal<string | undefined>();

  // const src = () => props.media?.media_url || props.src;

  const isCached = () => !props.isDev || props.media;

  const onError = (event: any) => {
    const image = event.target;

    if (image.src === props.altSrc || !props.altSrc) {
      // @ts-ignore
      props.onError(event);
      return true;
    }

    setSrc(() => props.altSrc || '');

    image.onerror = "";
    image.src = src();
    return true;
  };

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
  //   const h = props.width || 524 / ratio();

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
    const maxW = props.width || 524;

    const h = maxW / ratio();

    return h > 680;
  };

  const klass = () => `${styles.noteImage} ${props.shortHeight ? styles.shortHeight : ''} ${isCached() ? '' : 'redBorder'}`;

  onMount(() => {
    // if we have media info, shortcut image dimenzion calc
    if (props.media) {
      setIsImageLoaded(true);
    }

    setSrc(() => props.media?.media_url || props.src);
  });

  createEffect(() => {
    // Virtually load an image, to be able to get it's dimensions to zoom it properly
    imgVirtual = new Image();
    imgVirtual.src = src() || '';
    imgVirtual.onload = () => {
      setIsImageLoaded(true);
    };
    imgVirtual.onerror = onError;
  });

  createEffect(() => {
    isImageLoaded() && props.onImageLoaded && props.onImageLoaded(src());
  })

  return (
    <Show
      when={isImageLoaded()}
      fallback={<div class={styles.placeholderImage}></div>}
    >
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
          onerror={onError}
          width={willBeTooBig() ? undefined : `${props.width || 524}px`}
        />
      </a>
    </Show>
  );
}

export default NoteImage;
