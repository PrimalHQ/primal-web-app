import { useIntl } from "@cookbook/solid-intl";
import { nip19 } from "nostr-tools";
import { Component, createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { useAccountContext } from "../../contexts/AccountContext";
import { useSearchContext } from "../../contexts/SearchContext";
import { hexToNpub } from "../../lib/keys";
import { sendNote } from "../../lib/notes";
import { referencesToTags } from "../../stores/note";
import { truncateNpub } from "../../stores/profile";
import { PrimalUser } from "../../types/primal";
import { debounce } from "../../utils";
import Avatar from "../Avatar/Avatar";
import SearchOption from "../Search/SearchOption";
import { useToastContext } from "../Toaster/Toaster";
import EditBox from "./EditBox/EditBox";
import styles from  "./NewNote.module.scss";

const NewNote: Component = () => {

  const account = useAccountContext();

  const activeUser = () => account?.activeUser;

  return (
    <>
      <div id="new_note_holder" class={styles.newNoteHolder}>
        <div class={styles.newNoteBorder}>
          <div class={styles.newNote}>
            <div class={styles.leftSide}>
              <Avatar
                src={activeUser()?.picture}
                size="md"
                verified={activeUser()?.nip05}
              />
            </div>
            <div class={styles.rightSide}>
              <EditBox
                onClose={account?.actions?.hideNewNoteForm}
              />
            </div>
          </div>
        </div>
      </div>
      <div class={styles.holderBottomBorder}>
        <div class={styles.leftCorner}></div>
        <div class={styles.rightCorner}></div>
      </div>
    </>
  )
}

export default NewNote;
