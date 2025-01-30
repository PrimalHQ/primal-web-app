import { Component, createEffect, createSignal, JSX,  JSXElement,  onMount, Show } from "solid-js";
import styles from "./NostrImage.module.scss";
import { generatePrivateKey } from "../../lib/nTools";
import { MediaVariant, NostrImageContent, NostrUserContent } from "../../types/primal";
import { useAppContext } from "../../contexts/AppContext";

import PhotoSwipeLightbox from 'photoswipe/lightbox';
import { Kind } from "../../constants";
import { convertToUser, nip05Verification, userName } from "../../stores/profile";
import Avatar from "../Avatar/Avatar";
import VerificationCheck from "../VerificationCheck/VerificationCheck";
import NoteAuthorInfo from "../Note/NoteAuthorInfo";

const NostrImage: Component<{
  event: NostrImageContent,
}> = (props) => {
  const app = useAppContext();
  const imgId = generatePrivateKey();

  let imgVirtual: HTMLImageElement | undefined;
  let imgWrapper: HTMLDivElement | undefined;

  const [isImageLoaded, setIsImageLoaded] = createSignal(false);

  const id = () => {
    return `nostr_image_${props.event.id}`;
  }

  const lightbox = new PhotoSwipeLightbox({
    gallery: `#${id()}`,
    children: `a.image_${props.event.id}`,
    showHideAnimationType: 'zoom',
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 2,
    maxZoomLevel: 3,
    pswpModule: () => import('photoswipe')
  });

  onMount(() => {
    // setTimeout(
      // () =>
    // lightbox.init();
      // 100,
    // )
  });

  const src = () => {
    if (!props.event) return '';

    const meta: string[] = props.event.tags?.find(t => t[0] === 'imeta') || [];

    if (!meta || meta.length < 2) return '';

    return meta[1].startsWith('url ') ? meta[1].slice(4) : meta[1];
  };

  createEffect(() => {
    // Virtually load an image, to be able to get it's dimensions to zoom it properly
    imgVirtual = new Image();
    imgVirtual.src = src() || '';
    imgVirtual.onload = () => {
      setIsImageLoaded(true);
    };
    // imgVirtual.onerror = onError;
  });

  createEffect(() => {
    if (isImageLoaded()){
      lightbox.init();
    }
  })

  const ratio = () => {
    return imgVirtual ?
      imgVirtual.width / imgVirtual.height :
      2;
  };


  const width = () => {
    if (!imgWrapper) return 538;

    return imgWrapper.getBoundingClientRect().width - 40;
  }

  const height = () => {
    return `${width() / ratio()}px`;
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

  const author = () => {
    const userContent = app?.events[Kind.Metadata].find(u => u.pubkey === props.event.pubkey);

    return userContent ? convertToUser(userContent as NostrUserContent, userContent.pubkey || '') : undefined;
  }

  const isVerifiedByPrimal = () => {
    return !!author()?.nip05 && author()?.nip05.endsWith('primal.net');
  }

  return (
    <Show
      when={isImageLoaded()}
      fallback={<div class={styles.placeholderImage}></div>}
    >
      <div class={styles.nostrImageWrapper} ref={imgWrapper}>
        <Show when={author() !== undefined}>
          <div class={styles.header}>
            <a href={app?.actions.profileLink(author()?.npub) || ''}>
              <Avatar user={author()} size="xs" />
            </a>
            <NoteAuthorInfo
              author={author()}
              time={props.event.created_at}
            />
          </div>
        </Show>
        <div id={id()}>
          <a
            class={`noteimage image_${props.event.id} roundedImage`}
            href={src()}
            data-pswp-width={zoomW()}
            data-pswp-height={zoomH()}
            data-ratio={ratio()}
            // data-thumb-src={src()}
            data-cropped={true}
            target="_blank"
          >
            <img
              class={styles.nostrImage}
              src={imgVirtual?.src}
              style={`width: ${width()}px; height: ${height()};`}
            />
          </a>
        </div>
      </div>
    </Show>
  );
}

export default NostrImage;
