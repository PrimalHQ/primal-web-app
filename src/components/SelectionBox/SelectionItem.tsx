import { useIntl } from "@cookbook/solid-intl";
import { Select } from "@kobalte/core";
import { SelectBaseItemComponentProps } from "@kobalte/core/dist/types/select/select-base";

// Import default styles. (All examples use this via a global import)
import "@thisbeyond/solid-select/style.css";
import { Component, Show } from "solid-js";
import { hookForDev } from "../../lib/devTools";
import { placeholders } from "../../translations";
import { FeedOption } from "../../types/primal";

// Apply custom styling. See stylesheet below.
import styles from "./SelectionBox.module.scss";

const SelectionItem: Component<SelectBaseItemComponentProps<any>> = (props) => {

  return (
    <Select.Item item={props.item} class={props.item.rawValue.separator ? styles.separator : styles.item}>
      <Show
        when={!props.item.rawValue.separator}
      >
        <Select.ItemLabel>
          <div class={styles.label}>
            {props.item.rawValue.label}
          </div>
          <Show when={props.item.rawValue.description && props.item.rawValue.description.length > 0}>
            <div class={styles.description}>
              {props.item.rawValue.description || ''}
            </div>
          </Show>
        </Select.ItemLabel>
      </Show>
    </Select.Item>
  );
}

export default hookForDev(SelectionItem);
