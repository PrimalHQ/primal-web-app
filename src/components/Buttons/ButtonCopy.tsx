import { Component, createSignal, JSXElement, Match, Show, Switch } from 'solid-js';
import { hookForDev } from '../../lib/devTools';
import { Button } from "@kobalte/core";

import styles from './Buttons.module.scss';

const ButtonCopy: Component<{
  id?: string,
  copyValue: string,
  disabled?: boolean,
  label?: string,
  labelBeforeIcon?: boolean,
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
      <Show when={props.labelBeforeIcon}>
        <div>{props.label}</div>
      </Show>

      <Show
        when={copying()}
        fallback={<div class={styles.copyIcon}></div>}
      >
        <div class={styles.checkIcon}></div>
      </Show>

      <Show when={!props.labelBeforeIcon}>
        <div>{props.label}</div>
      </Show>
    </Button.Root>
  )
}

export default hookForDev(ButtonCopy);
