import { Component, createEffect, createSignal, JSX,  JSXElement,  onCleanup, Show } from "solid-js";
import styles from "./NostrImage.module.scss";
import { generatePrivateKey } from "../../lib/nTools";
import { MediaVariant, NostrImageContent, NostrUserContent } from "../../types/primal";
import { useAppContext } from "../../contexts/AppContext";

import type PhotoSwipeLightbox from 'photoswipe/lightbox';
import { Kind } from "../../constants";
import { convertToUser, nip05Verification, userName } from "../../stores/profile";
import Avatar from "../Avatar/Avatar";
import VerificationCheck from "../VerificationCheck/VerificationCheck";
import NoteAuthorInfo from "../Note/NoteAuthorInfo";
import { loadPhotoSwipeLightbox, loadPhotoSwipeModule } from "../../lib/photoswipe";

const NostrImage: Component<{
  event: NostrImageContent,
}> = (props) => {
  const app = useAppContext();
  const imgId = generatePrivateKey();

  let imgVirtual: HTMLImageElement | undefined;
  let imgWrapper: HTMLDivElement | undefined;
  let resizeObserver: ResizeObserver | undefined;

  const [isImageLoaded, setIsImageLoaded] = createSignal(false);
  const [wrapperWidth, setWrapperWidth] = createSignal(538);

  const id = () => {
    return `nostr_image_${props.event.id}`;
  }

  let lightbox: PhotoSwipeLightbox | undefined;

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
    if (isImageLoaded()) {
      (async () => {
        if (!lightbox) {
          const Lightbox = await loadPhotoSwipeLightbox();
          lightbox = new Lightbox({
            gallery: `#${id()}`,
            children: `a.image_${props.event.id}`,
            showHideAnimationType: 'zoom',
            initialZoomLevel: 'fit',
            secondaryZoomLevel: 2,
            maxZoomLevel: 3,
            pswpModule: loadPhotoSwipeModule,
          });
        }
        lightbox?.init();
      })();
    }
  })
  onCleanup(() => {
    lightbox?.destroy();
    lightbox = undefined;
    resizeObserver?.disconnect();
    resizeObserver = undefined;
  });

  const ratio = () => {
    return imgVirtual ?
      imgVirtual.width / imgVirtual.height :
      2;
  };


  const width = () => wrapperWidth();

  const setupWrapperObserver = () => {
    if (!imgWrapper || resizeObserver) return;

    const updateWidth = () => {
      const rect = imgWrapper?.getBoundingClientRect();
      if (!rect) return;

      setWrapperWidth(Math.max(180, rect.width - 40));
    };

    resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(updateWidth);
    });

    resizeObserver.observe(imgWrapper);
    updateWidth();
  };

  createEffect(() => {
    setupWrapperObserver();
  });

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
      <div
        class={styles.nostrImageWrapper}
        ref={(el) => {
          imgWrapper = el;
          setupWrapperObserver();
        }}
      >
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
              alt={`${author() ? userName(author()) : 'Nostr'} image attachment`}
              loading="lazy"
              decoding="async"
            />
          </a>
        </div>
      </div>
    </Show>
  );
}

export default NostrImage;
