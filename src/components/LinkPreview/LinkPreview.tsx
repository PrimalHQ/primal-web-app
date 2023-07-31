import { A, useLocation, useNavigate } from '@solidjs/router';
import { Component, Show } from 'solid-js';

import styles from './LinkPreview.module.scss';

const LinkPreview: Component<{ preview: any }> = (props) => {

  const encodedUrl = encodeURI(props.preview.url);

  return (
    <a
      href={encodedUrl} 
      class={styles.linkPreview}
    >
      <Show when={props.preview.images && props.preview.images[0]}>
        <div class={styles.previewImage}>
          <img src={props.preview.images[0]} />
        </div>
      </Show>

      <div class={styles.previewInfo}>
        <Show when={encodedUrl}>
          <div class={styles.previewUrl}>{encodedUrl}</div>
        </Show>

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

export default LinkPreview;
