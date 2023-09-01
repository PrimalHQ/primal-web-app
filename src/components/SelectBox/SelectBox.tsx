import { useIntl } from "@cookbook/solid-intl";
import { Select, createOptions } from "@thisbeyond/solid-select";

// Import default styles. (All examples use this via a global import)
import "@thisbeyond/solid-select/style.css";
import { Component } from "solid-js";
import { hookForDev } from "../../lib/devTools";
import { placeholders } from "../../translations";
import { FeedOption } from "../../types/primal";

// Apply custom styling. See stylesheet below.
import "./SelectBox.scss";

const SelectBox: Component<{
  options: () => FeedOption[],
  onChange: (value: any) => void,
  initialValue: any,
  isSelected: (value: any) => boolean,
  isPhone?: boolean,
  id?: string,
}> = (props) => {

  const intl = useIntl();

  const opts = createOptions(props.options, { key: 'label', disable: props.isSelected })

  const onFocus = () => {
    const control = document.querySelector('.solid-select-control');
    control?.classList.add('highlighted');
  }

  const onBlur = () => {
    const control = document.querySelector('.solid-select-control');
    control?.classList.remove('highlighted');
  }

  return (
    <Select
      id={props.id}
      class={props.isPhone ? "phone_feed_select" : "feed_select"}
      initialValue={props.initialValue}
      onChange={props.onChange}
      placeholder={
        intl.formatMessage(placeholders.selectFeed)
      }
      readonly={true}
      onFocus={onFocus}
      onBlur={onBlur}
      {...opts}
    />
  );
}

export default hookForDev(SelectBox);
