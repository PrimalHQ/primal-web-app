import { Button } from '@kobalte/core/button';
import { Component, JSXElement } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './Buttons.module.scss';


const ButtonGhost: Component<{
  id?: string,
  onClick?: (e: MouseEvent) => void,
  children?: JSXElement,
  disabled?: boolean,
  highlight?: boolean,
  class?: string,
}> = (props) => {
  return (
    <Button
      id={props.id}
      class={`${styles.ghost} ${props.highlight ? styles.highlight : ''} ${props.class || ''}`}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </Button>
  )
}

export default hookForDev(ButtonGhost);
