import { Component, createSignal, JSXElement, Match, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { Button } from "@kobalte/core";

import styles from './Buttons.module.scss';

const ButtonCopy: Component<{
  id?: string,
  copyValue: string,
  disabled?: boolean,
  label?: string,
}> = (props) => {

  const [copying, setCopying] = createSignal(false);

  const doCopy = () => {
    navigator.clipboard.writeText(props.copyValue);
    setCopying(true);

    setTimeout(() => setCopying(false), 2_000);
  }

  return (
    <Button.Root
      id={props.id}
      class={styles.copy}
      onClick={doCopy}
      disabled={props.disabled}
    >
      <Show
        when={copying()}
        fallback={<div class={styles.copyIcon}></div>}
      >
        <div class={styles.checkIcon}></div>
      </Show>
      <div>{props.label}</div>
    </Button.Root>
  )
}

export default hookForDev(ButtonCopy);
