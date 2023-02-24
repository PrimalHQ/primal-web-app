import { A, Navigate } from '@solidjs/router';
import { useNavigate, useRouter } from '@solidjs/router/dist/routing';
import type { Component } from 'solid-js';

import styles from './PageNav.module.scss';

const PageNav: Component = () => {

  const onBack = () => {
    window.history.back();
  }

  const onNext = () => {
    window.history.forward();
  }

  return (
    <>
      <button onClick={onBack} class={styles.backIcon}>
      </button>
      <button onClick={onNext} class={styles.forwardIcon}>
      </button>
    </>
  )
}

export default PageNav;
