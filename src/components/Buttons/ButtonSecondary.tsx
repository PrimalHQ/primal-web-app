import { Component, JSXElement, Match, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { Button } from "@kobalte/core/button";

import styles from './Buttons.module.scss';

const ButtonSecondary: Component<{
  id?: string,
  onClick?: (e: MouseEvent) => void,
  children?: JSXElement,
  disabled?: boolean,
  shrink?: boolean,
  light?: boolean,
  noPadding?: boolean,
  type?: 'button' | 'submit' | 'reset' | undefined,
}> = (props) => {

  const klass = () => {
    let cls = styles.secondary;

    if (props.shrink)
      cls += ` ${styles.shrunk}`;

    if (props.light)
    cls += ` ${styles.light}`;

    if (props.noPadding)
      cls += ` ${styles.noPadding}`;

    return cls;
  }

  return (
    <Button
      id={props.id}
      class={klass()}
      onClick={props.onClick}
      disabled={props.disabled}
      type={props.type || "button"}
    >
      {props.children}
    </Button>
  );
}

export default hookForDev(ButtonSecondary);
