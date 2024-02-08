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
  inputClass?: string,
  descriptionClass?: string,
  errorClass?: string,
  successMessage?: string,
  successClass?: string,
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

        <div class={styles.inputWrapper} data-validation={props.validationState}>
          {props.icon}

          <TextField.Input
            ref={props.ref}
            class={`${styles.input} ${props.inputClass || ''}`}
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
          <TextField.Description class={`${styles.description} ${props.descriptionClass || ''}`}>
            {props.description}
          </TextField.Description>
        </Show>

        <Show when={props.validationState === 'valid' && props.successMessage && props.successMessage.length > 0}>
          <TextField.Description class={`${styles.successMessage} ${props.successClass || ''}`}>
            {props.successMessage}
          </TextField.Description>
        </Show>

        <Show when={props.validationState === 'invalid'}>
          <div class={`${styles.errorMessage} ${props.errorClass || ''}`}>
            {props.errorMessage}
          </div>
        </Show>
      </TextField>
    </div>
  );
}

export default TextInput;
