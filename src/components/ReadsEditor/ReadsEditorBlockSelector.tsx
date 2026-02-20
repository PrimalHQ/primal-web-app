import { Select } from '@kobalte/core/select';
import { Component, Show, createEffect, createSignal } from 'solid-js';

import styles from './ReadsEditor.module.scss';

export type SelectorOption = {
  style: string,
  label: string,
  index: number,
}

export const blockSelectorOptions: SelectorOption[] = [
  { index: 0, style: styles.blockNormal, label: 'Normal text'},
  { index: 1, style: styles.blockH1, label: 'Heading 1'},
  { index: 2, style: styles.blockH2, label: 'Heading 2'},
  { index: 3, style: styles.blockH3, label: 'Heading 3'},
  { index: 4, style: styles.blockH4, label: 'Heading 4'},
  { index: 5, style: styles.blockH5, label: 'Heading 5'},
  { index: 6, style: styles.blockH6, label: 'Heading 6'},
  { index: 7, style: styles.blockCodeBlock, label: 'Code block'},
  { index: 8, style: styles.blockBlockQuote, label: 'Blockquote'},
];

const ReadsEditorBlockSelector: Component<{
  value: SelectorOption
  options: SelectorOption[],
  onChange: (selection: SelectorOption | null) => void,
  short?: boolean,
}> = (props) => {

  return (
    <Select<SelectorOption>
      class={styles.selectBox}
      value={props.value}
      optionValue="label"
			optionTextValue="label"
      options={props.options}
      onChange={props.onChange}
      gutter={2}
      placement="bottom-start"
      itemComponent={props => (
        <Select.Item class={`${styles.selectItem}  ${props.item.rawValue.style}`} item={props.item}>
          <Select.ItemLabel>
            <Select.ItemIndicator>
              <div class={styles.checkIcon}></div>
            </Select.ItemIndicator>
            <div class={styles.optionItem}>
              <Show when={props.item.rawValue.label === 'Blockquote'}>
                <div class={styles.blockquoteBorder}></div>
              </Show>
              <div>{props.item.rawValue.label}</div>
            </div>
          </Select.ItemLabel>
        </Select.Item>
      )}
    >
      <Select.Label />
      <Select.Trigger class={`${styles.trigger}`}>
        <Select.Value<SelectorOption>>
          {s => s.selectedOption()?.label}
        </Select.Value>
        <Select.Icon class={styles.selectChevron}>
          <div class={styles.chevronIcon}></div>
        </Select.Icon>
      </Select.Trigger>
      <Select.Description />
      <Select.ErrorMessage />
      <Select.Portal>
        <Select.Content>
          <Select.Listbox class={styles.selectContent} />
        </Select.Content>
      </Select.Portal>
    </Select>
  );
}

export default ReadsEditorBlockSelector;
