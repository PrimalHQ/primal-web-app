import { Component, Show } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './LinkPreview.module.scss';

const LinkPreview: Component<{ preview: any, id?: string }> = (props) => {

  const encodedUrl = encodeURI(new URL(props.preview.url).origin);

  return (
    <a
      id={props.id}
      href={props.preview.url}
      class={styles.linkPreview}
    >
      <Show when={props.preview.images && props.preview.images[0]}>
        <div class={styles.previewImage}>
          <img src={props.preview.images[0]} />
        </div>
      </Show>

      <div class={styles.previewInfo}>
        <div class={styles.previewUrlLine}>
          <Show when={props.preview.favicons && props.preview.favicons[0]}>
            <img src={props.preview.favicons[0]} />
          </Show>

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
