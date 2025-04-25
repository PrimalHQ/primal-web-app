import { Component, createEffect, createSignal, on, Show } from 'solid-js';
import { useMediaContext } from '../../contexts/MediaContext';
import { hookForDev } from '../../lib/devTools';

import styles from './LinkPreview.module.scss';

const errorCountLimit = 3;

const LinkPreview: Component<{ preview: any, id?: string, bordered?: boolean, isLast?: boolean }> = (props) => {

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
    let k = styles.linkPreviewH;

    if (!hasImage()) {
      k += ` ${styles.noImage}`;
    }

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

  let title: HTMLDivElement | undefined;

  const [isLongTitle, setIsLongTitle] = createSignal(false);

  createEffect(on(() => props.preview.title, (v, p) => {
    if (!v || v === p || title === undefined) return;

    new ResizeObserver(() => {
      setIsLongTitle(() => (title?.clientHeight || 0) > 25)
    }).observe(title as Element);

  }));

  const hasImage = () => errorCount() < errorCountLimit && (image() || props.preview.images[0]);

  return (
    <a
      id={props.id}
      href={props.preview.url}
      class={klass()}
      target="_blank"
    >
      <Show when={hasImage()}>
        <img
          class={styles.previewImage}
          src={image()?.media_url || props.preview.images[0]}
          style={`width: 180px; height: 120px`}
          onerror={onError}
        />
      </Show>

      <div class={styles.previewInfo}>
        <Show when={props.preview.title}>
          <div class={styles.previewTitle} ref={title}>{props.preview.title}</div>
        </Show>

        <Show when={props.preview.description}>
          <div class={`${styles.previewDescription} ${isLongTitle() ? styles.short : ''}`}>{props.preview.description}</div>
        </Show>

        <div class={styles.previewUrlLine}>
          <Show when={encodedUrl}>
            <div class={styles.previewUrl}>{encodedUrl}</div>
          </Show>
        </div>
      </div>
    </a>
  );
}

export default hookForDev(LinkPreview);
