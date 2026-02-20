import { Component, createSignal, For, onMount, Show } from "solid-js";
import { hookForDev } from "../../lib/devTools";
import Avatar from "../Avatar/Avatar";
import { TransitionGroup } from 'solid-transition-group';
import styles from  "./Note.module.scss";
import { PrimalNote, TopZap } from "../../types/primal";
import { accountStore } from "../../stores/accountStore";

const NoteTopZapsCompact: Component<{
  note: PrimalNote,
  action: () => void,
  topZaps: TopZap[],
  topZapLimit?: number,
  id?: string,
  hideMessage?: boolean,
}> = (props) => {
  const [dontAnimate, setDontAnimate] = createSignal(true);

  const topZaps = () => {
    const zaps = props.topZaps ? [...props.topZaps] : [ ...props.note.topZaps ];

    const highlights = zaps.slice(0, (props.topZapLimit || 4));

    return highlights;
  }

  const zapSender = (zap: TopZap) => {
    if (zap.pubkey === accountStore.publicKey) return accountStore.activeUser;

    return (props.note.mentionedUsers || {})[zap.pubkey];
  };

  onMount(() => {
    setTimeout(() => {
      setDontAnimate(() => false);
    }, 600)
  });

  return (
    <Show when={topZaps().length > 0}>
      <div class={`${styles.zapHighlightsCompact}`}>
        <TransitionGroup
          name="top-zaps-feed"
          enterClass={styles.topZapEnterTransition}
          exitClass={styles.topZapExitTransition}
        >
          <For each={topZaps()}>
            {(zap, index) => (
              <div
                class={`${styles.zapWrap} ${dontAnimate() ? styles.noAnimation : '' }`}
                style={`z-index: ${12 - index()};`}
                data-index={index()}
              >
                <button
                  class={`${styles.topZap} ${index() > 0 ? styles.compact : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    props.action();
                  }}
                  style={`z-index: ${12 - index()};`}
                >
                  <Avatar user={zapSender(zap)} size="micro" />
                  <Show when={!props.hideMessage && index() === 0}>
                    <div class={styles.topZapIcon}></div>
                    <div class={styles.amount}>
                      {zap.amount.toLocaleString()}
                    </div>
                    <div class={styles.description}>
                      {zap.message}
                    </div>
                  </Show>
                </button>
              </div>
            )}
          </For>
        </TransitionGroup>
      </div>
    </Show>
  );
}

export default hookForDev(NoteTopZapsCompact);
