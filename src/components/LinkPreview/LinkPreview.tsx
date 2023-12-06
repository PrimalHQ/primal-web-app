import { Component, createMemo, Show } from 'solid-js';
import { useMediaContext } from '../../contexts/MediaContext';
import { hookForDev } from '../../lib/devTools';

import styles from './LinkPreview.module.scss';

const LinkPreview: Component<{ preview: any, id?: string }> = (props) => {

  const media = useMediaContext();

  const encodedUrl = encodeURI(new URL(props.preview.url.toLowerCase()).origin);

  const image = () => {
    const i = media?.actions.getMedia(props.preview.images[0] || '', 'm');

    return i;
  };

  const height = () => {
    const img = image();

    if (!img) {
      return '100%';
    }

    const mediaHeight = img.h;
    const mediaWidth = img.w || 0;
    const imgWidth = 524;

    const ratio = mediaWidth / imgWidth;

    const h = ratio > 1 ?
      mediaHeight / ratio :
      mediaHeight * ratio;

    return `${h}px`;
  };

  return (
    <a
      id={props.id}
      href={props.preview.url}
      class={styles.linkPreview}
    >
      <Show when={image()}>
        <div
          class={styles.previewImage}
          style={`width: 100%; height: ${height()}`}
        >
          <img
            src={image()?.media_url}
          />
        </div>
      </Show>

      <div class={styles.previewInfo}>
        <div class={styles.previewUrlLine}>
          <Show when={encodedUrl}>
            <div class={styles.previewUrl}>{encodedUrl}</div>
          </Show>
        </div>

        <Show when={props.preview.title}>
          <div class={styles.previewTitle}>{props.preview.title}</div>
        </Show>

        <Show when={props.preview.description}>
          <div class={styles.previewDescription}>{props.preview.description}</div>
        </Show>
      </div>
    </a>
  );
}

export default hookForDev(LinkPreview);
