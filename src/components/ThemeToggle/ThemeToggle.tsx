import { createEffect, createSignal } from "solid-js"

import styles from  "./ThemeToggle.module.scss";

export default function ThemeToggle() {

    const [theme, setTheme] = createSignal('dark');

    const alternate = () => theme() === 'dark' ? 'light' : 'dark';

    const toggleTheme = () => setTheme(alternate());

    createEffect(() => {
      const html: HTMLElement | null = document.querySelector('html');
      html?.setAttribute('data-theme', theme() );
    });

    return (
      <button
        class={styles.themeToggle}
        onClick={toggleTheme}
      >
        {alternate()}
      </button>
    )
}
