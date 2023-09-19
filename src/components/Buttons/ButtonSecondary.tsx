import { Component, JSXElement, Match, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { Button } from "@kobalte/core";

import styles from './Buttons.module.scss';

const ButtonSecondary: Component<{
  id?: string,
  onClick?: (e: MouseEvent) => void,
  children?: JSXElement,
  disabled?: boolean,
}> = (props) => {
  return (
    <Button.Root
      id={props.id}
      class={styles.secondary}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      <div>
        <span>
          {props.children}
        </span>
      </div>
    </Button.Root>
  );
}

export default hookForDev(ButtonSecondary);
