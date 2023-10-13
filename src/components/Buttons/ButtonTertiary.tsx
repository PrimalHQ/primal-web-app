import { Button } from '@kobalte/core';
import { Component, JSXElement } from 'solid-js';
import { hookForDev } from '../../lib/devTools';

import styles from './Buttons.module.scss';


const ButtonTertiary: Component<{
  id?: string,
  onClick?: (e: MouseEvent) => void,
  children?: JSXElement,
  disabled?: boolean,
}> = (props) => {
  return (
    <Button.Root
      id={props.id}
      class={styles.tertiary}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </Button.Root>
  )
}

export default hookForDev(ButtonTertiary);
