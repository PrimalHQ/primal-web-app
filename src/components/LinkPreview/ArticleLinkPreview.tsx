import { A } from '@solidjs/router';
import { Component, createSignal, Show } from 'solid-js';
import { useMediaContext } from '../../contexts/MediaContext';
import { hookForDev } from '../../lib/devTools';

import styles from './LinkPreview.module.scss';

const errorCountLimit = 3;

const ArticleLinkPreview: Component<{ preview: any, id?: string, bordered?: boolean, isLast?: boolean }> = (props) => {

  const media = useMediaContext();

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

    k += props.isLast ? ' noBottomMargin' : '';

    return k;
  };

  const [errorCount, setErrorCount] = createSignal(0);

  const onError = (event: any) => {
    if (errorCount() > errorCountLimit) return;
    setErrorCount(v => v + 1);
    const image = event.target;
    image.onerror = '';
    image.src = props.preview.images[0];
    return true;
  };

  return (
    <A
      id={props.id}
      href={props.preview.url}
      class={klass()}
    >
      <Show when={errorCount() < errorCountLimit && (image() || props.preview.images[0])}>
        <img
          class={styles.previewImage}
          src={image()?.media_url || props.preview.images[0]}
          style={`width: 100%; height: ${height()}`}
          onerror={onError}
        />
      </Show>

      <div class={styles.previewInfo}>
        <Show when={props.preview.title}>
          <div class={styles.previewTitle}>{props.preview.title}</div>
        </Show>

        <Show when={props.preview.description}>
          <div class={styles.previewDescription}>{props.preview.description}</div>
        </Show>
      </div>
    </A>
  );
}

export default hookForDev(ArticleLinkPreview);
