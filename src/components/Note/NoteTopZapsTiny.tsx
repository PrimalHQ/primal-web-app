import { Component, createSignal, For, onMount, Show } from "solid-js";
import { hookForDev } from "../../lib/devTools";
import Avatar from "../Avatar/Avatar";
import { TransitionGroup } from 'solid-transition-group';
import styles from  "./Note.module.scss";
import { PrimalNote, TopZap } from "../../types/primal";
import { accountStore } from "../../stores/accountStore";

const NoteTopZapsCompact: Component<{
  note: PrimalNote,
  action: (zap: TopZap) => void,
  topZaps: TopZap[],
  topZapLimit?: number,
  id?: string,
  hideMessage?: boolean,
}> = (props) => {
  const [dontAnimate, setDontAnimate] = createSignal(true);

  const topZaps = () => {
    const zaps = props.topZaps ? [...props.topZaps] : [ ...props.note.topZaps ];

    const highlights = zaps.slice(0, (props.topZapLimit || 3));

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
      <div class={`${styles.zapHighlightsTiny}`}>
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
                  class={`${styles.topZap} ${styles.compact}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    props.action(zap);
                  }}
                  style={`z-index: ${12 - index()};`}
                >
                  <Avatar user={zapSender(zap)} size="micro" />
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
