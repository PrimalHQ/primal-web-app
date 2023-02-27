import { useFeedContext } from "../../contexts/FeedContext";

import styles from  "./ThemeToggle.module.scss";

export default function ThemeToggle() {
    const context = useFeedContext();

    const showNewNoteForm = () => {
      context?.actions?.showNewNoteForm();
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
