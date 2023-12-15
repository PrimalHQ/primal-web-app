import { Component, createEffect, createMemo, JSX, onCleanup, onMount } from "solid-js";
import styles from "./NoteImage.module.scss";
import mediumZoom from "medium-zoom";
import type { Zoom } from 'medium-zoom';
// @ts-ignore Bad types in nostr-tools
import { generatePrivateKey } from "nostr-tools";
import { MediaVariant } from "../../types/primal";

const NoteImage: Component<{
  media?: MediaVariant,
  width?: number,
  src?: string,
  isDev?: boolean,
  onError?: JSX.EventHandlerUnion<HTMLImageElement, Event>,
}> = (props) => {
  const imgId = generatePrivateKey();
  let zoomRef: Zoom | undefined;

  let imgRefActual: HTMLImageElement | undefined;

  const imgRef = () => {
    return document.getElementById(imgId)
  };

  const src = () => props.media?.media_url || props.src;

  const isCached = () => !props.isDev || props.media;

  const ratio = () => {
    const img = props.media;

    if (!img) return 2;

    return img.w / img.h;
  };

  const height = () => {
    if (!props.media) {
      return '100%';
    }

    const img = props.media;

    if (!img || ratio() <= 1.2) return 'auto';

    // width of the note over the ratio of the preview image
    const h = 524 / ratio();

    return `${h}px`;
  };

  // const height = createMemo(() => {
  //   if (!props.media) {
  //     return '100%';
  //   }


  //   const mediaHeight = props.media.h;
  //   const mediaWidth = props.media.w || 0;
  //   const rect = imgRefActual?.getBoundingClientRect();
  //   const imgWidth = props.width || rect?.width || 0;

  //   const ratio = mediaWidth / imgWidth;

  //   const h = ratio > 1 ?
  //   mediaHeight / ratio :
  //   mediaHeight * ratio;

  //   console.log('MEDIA: ', props.media, h, ratio);
  //   return `${h}px`;
  // });

  const klass = () => `${styles.noteImage} ${isCached() ? '' : 'redBorder'}`;

  const doZoom = (e: MouseEvent) => {
    if (!e.target || (e.target as HTMLImageElement).id !== imgId) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    zoomRef?.open();
  };

  const getZoom = () => {
    const iRef = imgRef();
    if (zoomRef || !iRef) {
      return zoomRef;
    }

   zoomRef = mediumZoom(iRef, {
        background: "var(--background-site)",
    });

    zoomRef.attach(iRef);
  }

  onMount(() => {
    getZoom();
  });

  onCleanup(() => {
    const iRef = imgRef();
    iRef && zoomRef && zoomRef.detach(iRef);
  });

  return (
    <div style={`width: 100%; height: ${height()};`}>
      <img
        id={imgId}
        ref={imgRefActual}
        src={src()}
        class={klass()}
        onerror={props.onError}
        onClick={doZoom}
      />
    </div>
  );
}

export default NoteImage;
