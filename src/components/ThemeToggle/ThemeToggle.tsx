import { useAccountContext } from "../../contexts/AccountContext";

import styles from  "./ThemeToggle.module.scss";

export default function ThemeToggle() {
    const account = useAccountContext();

    const showNewNoteForm = () => {
      account?.actions?.showNewNoteForm();
    };


    return (
      <button
        class={styles.themeToggle}
        onClick={showNewNoteForm}
      >
        <div class={styles.postIcon}></div>
      </button>
    )
}
