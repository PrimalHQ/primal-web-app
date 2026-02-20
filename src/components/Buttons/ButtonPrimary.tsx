import { Component, JSXElement, Match, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { Button } from "@kobalte/core/button";

import styles from './Buttons.module.scss';

const ButtonPrimary: Component<{
  id?: string,
  onClick?: (e: MouseEvent) => void,
  children?: JSXElement,
  disabled?: boolean,
  loading?: boolean,
  type?: 'button' | 'submit' | 'reset' | undefined,
}> = (props) => {
  return (
    <Button
      id={props.id}
      class={styles.primary}
      onClick={props.onClick}
      disabled={props.disabled}
      type={props.type}
    >
      <Show
        when={props.loading}
        fallback={props.children}
      >
        <div class={styles.spinner}></div>
      </Show>
    </Button>
  )
}

export default hookForDev(ButtonPrimary);
