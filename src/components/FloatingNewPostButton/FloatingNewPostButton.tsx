import { Component } from "solid-js";
import { useAccountContext } from "../../contexts/AccountContext";
import { hookForDev } from "../../lib/devTools";

import styles from  "./FloatingNewPostButton.module.scss";

const FloatingNewPostButton: Component<{ id?: string }> = (props) => {
    const account = useAccountContext();

    const showNewNoteForm = () => {
      account?.actions?.showNewNoteForm();
    };


    return (
      <button
        id={props.id}
        class={styles.newPostButton}
        onClick={showNewNoteForm}
      >
        <div class={styles.postIcon}></div>
      </button>
    )
}

export default hookForDev(FloatingNewPostButton);
