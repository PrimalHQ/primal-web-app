import { Component, createEffect, createSignal, JSX,  JSXElement,  onMount, Show } from "solid-js";
import styles from "./NoteImage.module.scss";
import { generatePrivateKey } from "../../lib/nTools";
import { MediaVariant } from "../../types/primal";
import { useAppContext } from "../../contexts/AppContext";

const NoteImageSmall: Component<{
  class?: string,
  imageGroup?: string,
  media?: MediaVariant,
  mediaThumb?: MediaVariant | string,
  width?: number,
  src?: string,
  altSrc?: string,
  isDev?: boolean,
  onError?: JSX.EventHandlerUnion<HTMLImageElement, Event>,
  onImageLoaded?: (url: string | undefined) => void,
  shortHeight?: boolean,
  plainBorder?: boolean,
  caption?: JSXElement | string,
  ignoreRatio?: boolean,
  forceHeight?: number;
  authorPk?: string,
}> = (props) => {
  const app = useAppContext();
  const imgId = generatePrivateKey();

  let imgVirtual: HTMLImageElement | undefined;
  let imgActual: HTMLImageElement | undefined;

  const [isImageLoaded, setIsImageLoaded] = createSignal(false);

  const [src, setSrc] = createSignal<string | undefined>();

  const isCached = () => !props.isDev || props.media;

  const onError = async (event: any) => {
    const image = event.target;

    if (image.src === props.altSrc || image.src.endsWith(props.altSrc)) {
      // @ts-ignore
      props.onError && props.onError(event);
      return true;
    }

    // list of user's blossom servers from kind 10_063
    const userBlossoms = app?.actions.getUserBlossomUrls(props.authorPk || '') || [];

    // Image url from a Note
    const originalSrc = image.src || '';

    // extract the file hash
    const fileHash = originalSrc.slice(originalSrc.lastIndexOf('/') + 1)

    // Send HEAD requests to each blossom server to check if the resource is there
    const reqs = userBlossoms.map(url =>
      new Promise<string>((resolve, reject) => {
        const separator = url.endsWith('/') ? '' : '/';
        const resourceUrl = `${url}${separator}${fileHash}`;

        fetch(resourceUrl, { method: 'HEAD' }).
          then(response => {
            // Check to see if there is an image there
            if (response.status === 200) {
              resolve(resourceUrl);
            } else {
              reject('')
            }
          }).
          catch((e) => {
            reject('');
          });
      })
    );

    try {
      // Wait for at least one req to succeed
      const blossomUrl = await Promise.any(reqs);

      // If found, set image src to the blossom url
      if (blossomUrl.length > 0) {
        setSrc(() => blossomUrl);
        image.onerror = "";
        image.src = blossomUrl;
        setIsImageLoaded(true);
        return true;
      }
    } catch {
      setSrc(() => props.altSrc || '');
      setIsImageLoaded(true);
      return true;
    }
  };

  const ratio = () => {
    const img = props.media;

    if (img) return img.w / img.h;

    return imgVirtual ?
      imgVirtual.width / imgVirtual.height :
      2;
  };

  const width = () => props.width || 538;

  const height = () => {
    if (props.forceHeight) {
      return `${props.forceHeight}px`;
    }

    if (!props.media || props.ignoreRatio) return '100%';

    const img = props.media;

    if (!img || ratio() <= 0.9) return '680px';
    if (!img || ratio() <= 1.2) return 'auto';

    // width of the note over the ratio of the preview image
    const h = width() / ratio();

    return `${h}px`;
  };

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
    const maxW = width();

    const h = maxW / ratio();

    return h > 680;
  };

  const thumbSrc = () => {
    if (props.mediaThumb) {
      return typeof props.mediaThumb === 'string' ?
        props.mediaThumb :
        props.mediaThumb.media_url;
    }

    return src();

    // if (!s || !s.includes('media-cache')) return s;

    // const thumb = s.replace('s=o', 's=s');

    // return thumb;
  }

  const klass = () => `${styles.noteImage} ${props.shortHeight ? styles.shortHeight : ''} ${isCached() ? '' : 'redBorder'}`;

  onMount(() => {
    // if we have media info, shortcut image dimension calc
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
  });

  return (
    <Show
      when={isImageLoaded()}
      fallback={<div class={styles.placeholderImage}></div>}
    >
      <a
        class={`${styles.imageHolder} ${props.class || ''} ${props.plainBorder ? '' : 'roundedImage'}`}
        href={src()}
        data-pswp-width={zoomW()}
        data-pswp-height={zoomH()}
        data-image-group={props.imageGroup}
        data-cropped={true}
        data-thumb-src={thumbSrc()}
        data-ratio={ratio()}
        target="_blank"
      >
        <img
          id={`${imgId}`}
          ref={imgActual}
          src={thumbSrc()}
          class={klass()}
          onerror={onError}
          // style={`${willBeTooBig() && !props.ignoreRatio ? `width: 528px; height: 680px` : `width: ${width()}px; height: ${height()}`}`}
        />
        <div class="pswp-caption-content">{props.caption}</div>
      </a>
    </Show>
  );
}

export default NoteImageSmall;
