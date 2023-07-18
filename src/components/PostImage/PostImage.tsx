import { onCleanup, onMount } from "solid-js";
import styles from "./PostImage.module.scss";
import mediumZoom from "medium-zoom";
import type { Zoom } from 'medium-zoom';

type PostImageProps = {
  src: string;
};

export default function PostImage(props: PostImageProps) {
  let imgRef;
  let zoomRef;

  function getZoom(): Zoom {
    if (zoomRef) {
      return zoomRef;
    }

    const zoom = mediumZoom(imgRef, {
        background: "#000"
    });
    zoomRef = zoom;

    return zoom;
  }

  onMount(() => {
    if (imgRef) {
        const zoom = getZoom();
        zoom.attach(imgRef);

        onCleanup(() => {
            zoom.detach(imgRef);
        });
    }
  });

  return <img src={props.src} class={styles.postImage} ref={imgRef} />;
}
