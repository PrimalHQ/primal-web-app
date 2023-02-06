import { createEffect, createSignal } from "solid-js"

import styles from  "./ThemeToggle.module.scss";

export default function ThemeToggle() {

    const [theme, setTheme] = createSignal('dark');

    const toggleTheme = () => theme() === 'dark' ? setTheme('light') : setTheme('dark');

    createEffect(() => {
      const html: HTMLElement | null = document.querySelector('html');
      html?.setAttribute('data-theme', theme() );
    });

    return (
      <button
        class={styles.themeToggle}
        onClick={toggleTheme}
      >
        T
      </button>
    )
}
