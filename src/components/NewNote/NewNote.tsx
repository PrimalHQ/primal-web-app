import { Component } from "solid-js";
import { useAccountContext } from "../../contexts/AccountContext";
import { SendNoteResult } from "../../types/primal";
import Avatar from "../Avatar/Avatar";
import EditBox from "./EditBox/EditBox";
import styles from  "./NewNote.module.scss";

const NewNote: Component<{ onSuccess: (note: SendNoteResult) => void}> = (props) => {

  const account = useAccountContext();

  const activeUser = () => account?.activeUser;

  return (
    <>
      <div id="new_note_holder" class={styles.newNoteHolder}>
        <div class={styles.newNoteBorder}>
          <div class={styles.newNote}>
            <div class={styles.leftSide}>
              <Avatar
                size="md"
                user={activeUser()}
              />
            </div>
            <div class={styles.rightSide}>
              <EditBox
                onSuccess={props.onSuccess}
                open={account?.showNewNoteForm}
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
