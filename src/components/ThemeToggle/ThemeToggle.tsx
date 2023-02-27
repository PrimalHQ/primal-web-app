import { createEffect, createSignal } from "solid-js"
import { useFeedContext } from "../../contexts/FeedContext";

import styles from  "./ThemeToggle.module.scss";

export default function ThemeToggle() {

    const [theme, setTheme] = createSignal('dark');

    const alternate = () => theme() === 'dark' ? 'light' : 'dark';

    const toggleTheme = () => setTheme(alternate());

    createEffect(() => {
      const html: HTMLElement | null = document.querySelector('html');
      html?.setAttribute('data-theme', theme() );
    });

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
