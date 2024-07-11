import { Component, JSXElement, Match, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { Button } from "@kobalte/core/button";

import styles from './Buttons.module.scss';

const ButtonFollow: Component<{
  id?: string,
  onClick?: (e: MouseEvent) => void,
  when?: boolean,
  children?: JSXElement,
  fallback?: JSXElement,
  disabled?: boolean,
  type?: 'button' | 'submit' | 'reset' | undefined,
}> = (props) => {
  const klass = () => {
    return props.when ? styles.flipActive : styles.flipInactive;
  }

  return (
    <Button
      id={props.id}
      class={klass()}
      onClick={props.onClick}
      disabled={props.disabled}
      type={props.type}
    >
      <span>
        <Show
          when={props.when}
          fallback={props.fallback}
        >
          {props.children}
        </Show>
      </span>
    </Button>
  )
}

export default hookForDev(ButtonFollow);
