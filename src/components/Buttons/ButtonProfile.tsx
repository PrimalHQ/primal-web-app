import { Component, JSXElement, Match, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { Button } from "@kobalte/core/button";

import styles from './Buttons.module.scss';

const ButtonProfile: Component<{
  id?: string,
  onClick?: (e: MouseEvent) => void,
  children?: JSXElement,
  disabled?: boolean,
  title?: string,
}> = (props) => {

  return (
    <Button
      id={props.id}
      class={styles.profile}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
    >
      {props.children}
    </Button>
  )
}

export default hookForDev(ButtonProfile);
