import { Component, createMemo, Show } from 'solid-js';
import { useMediaContext } from '../../contexts/MediaContext';
import { hookForDev } from '../../lib/devTools';

import styles from './LinkPreview.module.scss';

const LinkPreview: Component<{ preview: any, id?: string, bordered?: boolean }> = (props) => {

  const media = useMediaContext();

  const encodedUrl = encodeURI(new URL(props.preview.url.toLowerCase()).origin);

  const image = () => {
    const i = media?.actions.getMedia(props.preview.images[0] || '', 'm');

    return i;
  };

  const ratio = () => {
    const img = image();

    if (!img) return 2;

    return img.w / img.h;
  };

  const height = () => {
    const img = image();

    if (!img || ratio() <= 1.2) return 'auto';

    // width of the note over the ratio of the preview image
    const h = 524 / ratio();

    return `${h}px`;
  };

  const klass = () => {
    let k = image() && ratio() <= 1.2 ? styles.linkPreviewH : styles.linkPreview;

    if (props.bordered) {
      k += ` ${styles.bordered}`;
    }

    k += " embeddedContent";

    return k;
  };

  return (
    <a
      id={props.id}
      href={props.preview.url}
      class={klass()}
      target="_blank"
    >
      <Show when={image()}>
        <img
          class={styles.previewImage}
          src={image()?.media_url}
          style={`width: 100%; height: ${height()}`}
        />
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
