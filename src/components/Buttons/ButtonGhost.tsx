import { Button } from '@kobalte/core';
import { Component, JSXElement } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './Buttons.module.scss';


const ButtonGhost: Component<{
  id?: string,
  onClick?: (e: MouseEvent) => void,
  children?: JSXElement,
  disabled?: boolean,
  highlight?: boolean,
}> = (props) => {
  return (
    <Button.Root
      id={props.id}
      class={`${styles.ghost} ${props.highlight ? styles.highlight : ''}`}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </Button.Root>
  )
}

export default hookForDev(ButtonGhost);
