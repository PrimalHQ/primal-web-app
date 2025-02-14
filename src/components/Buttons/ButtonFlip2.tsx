import { Component, JSXElement, Match, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { Button } from "@kobalte/core/button";

import styles from './Buttons.module.scss';

const ButtonFlip2: Component<{
  id?: string,
  onClick?: (e: MouseEvent) => void,
  when?: boolean,
  children?: JSXElement,
  fallback?: JSXElement,
  disabled?: boolean,
  light?: boolean,
  type?: 'button' | 'submit' | 'reset' | undefined,
  dark?: boolean,
}> = (props) => {
  const klass = () => {
    let k = props.when ? styles.flipActive2 : styles.flipInactive2;

    if (props.light) {
      k += ` ${styles.light}`;
    }
    k += props.dark ? ` ${styles.dark}` : '';

    return k;
  }

  const fallback = () => props.fallback || props.children

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
          fallback={fallback()}
        >
          {props.children}
        </Show>
      </span>
    </Button>
  )
}

export default hookForDev(ButtonFlip2);
