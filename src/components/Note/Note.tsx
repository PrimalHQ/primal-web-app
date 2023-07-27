import { A } from "@solidjs/router";
import { Component, Show } from "solid-js";
import { PrimalNote } from "../../types/primal";
import ParsedNote from "../ParsedNote/ParsedNote";
import NoteFooter from "./NoteFooter/NoteFooter";
import NoteHeader from "./NoteHeader/NoteHeader";

import styles from "./Note.module.scss";
import { useIntl } from "@cookbook/solid-intl";
import { truncateNpub } from "../../stores/profile";
import { note as t } from "../../translations";

const Note: Component<{ note: PrimalNote }> = (props) => {
  const intl = useIntl();

  const repost = () => props.note.repost;

  const reposterName = () => {
    const r = repost();

    if (!r) {
      return "";
    }

    return r.user?.displayName || r.user?.name || truncateNpub(r.user.npub);
  };

  return (
    <div class={styles.container}>
      <Show when={repost()}>
        <div class={styles.repostedBy}>
          <div class={styles.repostIcon}></div>
          <span>
            <A href={`/profile/${repost()?.user.npub}`}>{reposterName()}</A>
            <span>{intl.formatMessage(t.reposted)}</span>
          </span>
        </div>
      </Show>
      <div class={styles.post}>
        <NoteHeader note={props.note} />
        <div class={styles.content}>
          <div class={styles.message}>
            <ParsedNote note={props.note} />
          </div>
          <NoteFooter note={props.note} />
        </div>
      </div>
    </div>
  );
};

export default Note;
