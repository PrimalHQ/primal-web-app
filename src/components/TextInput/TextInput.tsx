import { Component, JSXElement, Show } from 'solid-js';
import { TextField } from '@kobalte/core/text-field';

import styles from './TextInput.module.scss';

const TextInput: Component<{
  label?: string,
  description?: string,
  errorMessage?: string,
  placeholder?: string,
  value?: string,
  onChange?: (value: string) => void,
  onKeyUp?: (e: KeyboardEvent) => void,
  children?: JSXElement,
  readonly?: boolean,
  ref?: HTMLInputElement,
  validationState?: 'valid' | 'invalid',
  type?: string,
  autocomplete?: string,
  name?: string,
  noExtraSpace?: boolean,
  icon?: JSXElement,
}> = (props) => {

  return (
    <div class={`${styles.container} ${props.noExtraSpace ? styles.noExtra : ''}`}>
      <TextField
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
          {props.icon}

          <TextField.Input
            ref={props.ref}
            class={styles.input}
            readOnly={props.readonly}
            type={props.type || 'search'}
            name={props.name || 'searchTerm'}
            autocomplete={props.autocomplete || "off"}
            onKeyUp={props.onKeyUp}
            placeholder={props.placeholder}
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
      </TextField>
    </div>
  );
}

export default TextInput;
