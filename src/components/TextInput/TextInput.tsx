import { Component, JSXElement, Show } from 'solid-js';
import { TextField } from '@kobalte/core';

import styles from './TextInput.module.scss';

const TextInput: Component<{
  label?: string,
  description?: string,
  errorMessage?: string,
  value?: string,
  onChange?: (value: string) => void,
  children?: JSXElement,
  readonly?: boolean,
  ref?: HTMLInputElement,
  validationState?: 'valid' | 'invalid',
  type?: string,
}> = (props) => {

  return (
    <div class={styles.container}>
      <TextField.Root
        class={styles.root}
        value={props.value}
        onChange={props.onChange}
        validationState={props.validationState}
      >
        <Show when={props.label}>
          <TextField.Label class={styles.label}>
            {props.label}
          </TextField.Label>
        </Show>

        <div class={styles.inputWrapper}>
          <TextField.Input
            ref={props.ref}
            class={styles.input}
            readOnly={props.readonly}
            type={props.type}
          />

          <div class={styles.inputAfter}>
            {props.children}
          </div>
        </div>

        <Show when={props.description}>
          <TextField.Description class={styles.description}>
            {props.description}
          </TextField.Description>
        </Show>

        <TextField.ErrorMessage class={styles.errorMessage}>
          {props.errorMessage}
        </TextField.ErrorMessage>
      </TextField.Root>
    </div>
  );
}

export default TextInput;
