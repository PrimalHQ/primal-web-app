import { Component, createSignal, onMount, Show } from "solid-js";
import { hookForDev } from "../../lib/devTools";
import { MenuItem } from "../../types/primal";
import styles from  "./PrimalMenuItem.module.scss";


const PrimalMenuItem: Component<{
  item: MenuItem,
  reverse?: boolean,
  id?: string,
}> = (props) => {

  const [icon, setIcon] = createSignal<string>()

  const getIcon = () => {
    if (!props.item.icon) {
      return;
    }

    import(`../../assets/icons/${props.item.icon}.svg`).then((ic) => {
      setIcon(ic.default);
    });
  };

  const warningClass= () => props.item.warning ? styles.warning : '';

  const reverseClass= () => props.reverse ? styles.reverse : '';

  onMount(getIcon);

  return (
    <Show
      when={!props.item.separator}
      fallback={<div class={styles.separator}></div>}
    >
      <button
        id={props.id}
        onClick={(e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          props.item.action();
        }}
        class={`${styles.contextOption} ${warningClass()}  ${reverseClass()}`}
      >

        <span>
          {props.item.label}
        </span>
        <Show when={icon()}>
          <div style={`-webkit-mask: url(${icon()}) no-repeat 0 / 100%; mask: url(${icon()}) no-repeat 0 / 100%;`} />
        </Show>
      </button>
    </Show>
  )
}

export default hookForDev(PrimalMenuItem);
