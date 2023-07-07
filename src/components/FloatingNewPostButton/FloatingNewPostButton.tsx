import { useAccountContext } from "../../contexts/AccountContext";

import styles from  "./FloatingNewPostButton.module.scss";

export default function FloatingNewPostButton() {
    const account = useAccountContext();

    const showNewNoteForm = () => {
      account?.actions?.showNewNoteForm();
    };


    return (
      <button
        class={styles.newPostButton}
        onClick={showNewNoteForm}
      >
        <div class={styles.postIcon}></div>
      </button>
    )
}
