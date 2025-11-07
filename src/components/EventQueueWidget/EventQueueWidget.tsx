import { Component, createEffect, createSignal, on, Show } from 'solid-js';
import styles from './EventQueueWidget.module.scss';
import { hookForDev } from '../../lib/devTools';
import { accountStore } from '../../stores/accountStore';

export const EVENT_PUBLISH_DELAY = 12_000;

const EventQueueWidget: Component<{ id?: string, hideName?: boolean }> = (props) => {

  const [queueLength, setQueueLength] = createSignal(0);

  let queueTimeout = 0;

  createEffect(on(() => accountStore.eventQueue.length, (len) => {
    if (len === 0) {
      console.log('QUEUE APPLY 0: ', len);
      clearTimeout(queueTimeout);
      setQueueLength(len);
      return;
    }

    // Giv some time for the event to be published
    queueTimeout = setTimeout(() => {
      setQueueLength(len);
    }, EVENT_PUBLISH_DELAY);
  }));

  return (
    <div id={props.id}>
      <Show when={queueLength() > 0}>
        <div class={styles.publishQueueInfo}>
          <div class={styles.clockIcon}></div>
          <div>
            Publish pending ({queueLength()})
          </div>
        </div>
      </Show>
    </div>
  );
}

export default hookForDev(EventQueueWidget);
