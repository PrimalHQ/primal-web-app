import { Component, JSXElement, Match, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { Button } from "@kobalte/core";

import styles from './Buttons.module.scss';

const ButtonPremium: Component<{
  id?: string,
  onClick?: (e: MouseEvent) => void,
  children?: JSXElement,
  disabled?: boolean,
  pro?: boolean,
  type?: 'button' | 'submit' | 'reset' | undefined,
}> = (props) => {
  return (
    <Button.Root
      id={props.id}
      class={`${styles.premium} ${props.pro ? styles.proVersion : ''}`}
      onClick={props.onClick}
      disabled={props.disabled}
      type={props.type}
    >
      {props.children}
    </Button.Root>
  )
}

export default hookForDev(ButtonPremium);
