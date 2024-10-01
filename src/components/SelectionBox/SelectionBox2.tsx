import { useIntl } from "@cookbook/solid-intl";
import { Select } from "@kobalte/core/select";

// Import default styles. (All examples use this via a global import)
import "@thisbeyond/solid-select/style.css";
import { Component, createEffect, JSXElement, Show } from "solid-js";
import { hookForDev } from "../../lib/devTools";
import { placeholders } from "../../translations";
import { SelectionOption } from "../../types/primal";

import SelectionItem from "./SelectionItem";

// Apply custom styling. See stylesheet below.
import styles from  "./SelectionBox.module.scss";
import { A } from "@solidjs/router";
import { createStore } from "solid-js/store";
import { generatePrivateKey } from "../../lib/nTools";


const SelectionBox2: Component<{
  options: SelectionOption[],
  onChange: (option: any) => void,
  initialValue?: string | SelectionOption,
  big?: boolean,
  value?: string | SelectionOption,
  id?: string,
  caption?: string,
  captionAction?: JSXElement,
}> = (props) => {

  const defaultValue = () => {
    const init = props.initialValue;

    if (!init) return;

    if (typeof init === 'string') {
      const found = Object.entries(opts).find(([_, oo]) => oo.id === init);

      if (!found) return;

      return {
        ...found[1],
        value: found[0],
      }
    }

    const found = Object.entries(opts).find(([_, oo]) => oo.id === init.id);

    if (!found) return;

    return {
      ...found[1],
      value: found[0],
    }
    // if (typeof props.initialValue === 'string') {
    //   return props.options.find(o => o.value === props.initialValue);
    // }

    // return props.initialValue;
  }

  const value = () => {
    const v = props.value;

    if (!v) {
      return defaultValue();
    }

    if (typeof v === 'string') {
      const found = Object.entries(opts).find(([_, oo]) => oo.id === v);

      if (!found) return;

      return {
        ...found[1],
        value: found[0],
      }
    }


    const found = Object.entries(opts).find(([_, oo]) => oo.id === v.id);

    if (!found) return;

    return {
      ...found[1],
      value: found[0],
    }
  }

  const hasCaption = () => props.caption || props.captionAction;

  const [opts, setOpts] = createStore<Record<string,SelectionOption>>({});

  createEffect(() => {
    if (props.options.length > 0) {
      setTimeout(() => {
        // setOpts(() => [...props.options]);
        let temp: Record<string,SelectionOption> = {};
        for (let i=0;i<props.options.length;i++) {
          const id = generatePrivateKey();

          temp[id] = props.options[i];
        }

        setOpts(() => ({...temp}));
      }, 200);
    }
  });

  const options = () => {
    return Object.entries(opts).reduce<SelectionOption[]>((acc, [id, option]) => {
      return [ ...acc, {
        ...option,
        value: id,
      }]
    }, []);
  }

  const onOptionSelect = (option: SelectionOption) => {
    if (!option) return;

    const o = opts[option.value];

    o && props.onChange(o);
  }

  return (
    <Select
      id={props.id}
      class={styles.selectionBox}
      options={options()}
      optionValue="value"
      optionTextValue="label"
      optionDisabled="disabled"
      itemComponent={(prps) => SelectionItem(prps)}
      defaultValue={defaultValue()}
      value={value()}
      onChange={onOptionSelect}
    >
      <Select.Trigger class={props.big ? styles.triggerBig : styles.trigger}>
          <Select.Value<SelectionOption>>
            {state => options().length > 0 ? state.selectedOption()?.label || '' : ''}
          </Select.Value>
          <Select.Icon>
            <Show when={options().length > 0}>
              <div class={props.big ? styles.selectionIconBig : styles.selectionIcon}></div>
            </Show>
          </Select.Icon>
      </Select.Trigger>
      <Select.Content class={styles.selectionContent}>
        <Show when={hasCaption()}>
          <div class={styles.caption}>
            <div class={styles.title}>
              {props.caption && `${props.caption}:`}
            </div>
            {props.captionAction}
          </div>
        </Show>
        <Select.Listbox class={`${styles.listbox} ${hasCaption() ? styles.withCaption : '' }`}/>
      </Select.Content>
    </Select>
  );
}

export default hookForDev(SelectionBox2);
