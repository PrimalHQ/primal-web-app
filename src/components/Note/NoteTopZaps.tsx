import { Component, createMemo, createSignal, For, Show } from "solid-js";
import { hookForDev } from "../../lib/devTools";
import { TopZap, useThreadContext } from "../../contexts/ThreadContext";
import Avatar from "../Avatar/Avatar";
import { TransitionGroup } from 'solid-transition-group';
import styles from  "./Note.module.scss";

const NoteTopZaps: Component<{
  topZaps: TopZap[],
  zapCount: number,
  action: () => void,
  id?: string,
}> = (props) => {

  const threadContext = useThreadContext();

  const [hasMoreZaps, setHasMoreZaps] = createSignal(false);

  const topZaps = () => {
    const zaps = [...props.topZaps];

    let limit = 0;
    let digits = 0;

    for (let i=0; i< zaps.length; i++) {
      const amount = zaps[i].amount || 0;
      const length = Math.log(amount) * Math.LOG10E + 1 | 0;

      digits += length;

      if (digits > 25 || limit > 7) break;

      limit++;
    }

    const highlights = zaps.slice(0, limit);

    setHasMoreZaps(() => highlights.length < props.zapCount - 1);

    return highlights;
  }

  const zapSender = (zap: TopZap) => {
    return threadContext?.users.find(u => u.pubkey === zap.pubkey);
  };
  return (

    <Show
    when={!threadContext?.isFetchingTopZaps}
    fallback={
      <div class={styles.topZapsLoading}>
        <div class={styles.firstZap}></div>
        <div class={styles.topZaps}>
          <div class={styles.zapList}>
            <div class={styles.topZap}></div>
            <div class={styles.topZap}></div>
            <div class={styles.topZap}></div>
            <div class={styles.topZap}></div>
            <div class={styles.topZap}></div>
          </div>
        </div>
      </div>
    }
  >
    <div class={`${styles.zapHighlights}`}>
      <TransitionGroup
        name="top-zaps"
        enterClass={styles.topZapEnterTransition}
        exitClass={styles.topZapExitTransition}
      >
        <For each={topZaps()}>
          {(zap, index) => (
            <>
              <button
                class={`${styles.topZap}`}
                onClick={() => props.action()}
                style={`z-index: ${12 - index()};`}
              >
                <Avatar user={zapSender(zap)} size="micro" />
                <div class={styles.amount}>
                  {zap.amount.toLocaleString()}
                </div>
                <Show when={index() === 0}>
                  <div class={styles.description}>
                    {zap.message}
                  </div>
                </Show>
              </button>

              <Show when={index() === 0 && props.topZaps.length > 3}>
                <div class={styles.break}></div>
              </Show>
            </>
          )}
        </For>

        <Show when={hasMoreZaps()}>
          <button
            class={styles.moreZaps}
            onClick={() => props.action()}
          >
            <div class={styles.contextIcon}></div>
          </button>
        </Show>
      </TransitionGroup>
    </div>
  </Show>
  );
}

export default hookForDev(NoteTopZaps);
