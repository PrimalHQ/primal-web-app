import { Component, JSXElement, Match, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { Button } from "@kobalte/core";

import styles from './Buttons.module.scss';

const ButtonLink: Component<{
  id?: string,
  onClick?: (e: MouseEvent) => void,
  children?: JSXElement,
  disabled?: boolean,
  title?: string,
}> = (props) => {

  return (
    <Button.Root
      id={props.id}
      class={styles.link}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
    >
      {props.children}
    </Button.Root>
  )
}

export default hookForDev(ButtonLink);
