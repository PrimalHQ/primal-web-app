import { createSignal, onMount, Show } from "solid-js";
import { MenuItem } from "../../types/primal";
import styles from  "./PrimalMenuItem.module.scss";


export default function PrimalMenuItem(props: {
  item: MenuItem,
}) {

  const [icon, setIcon] = createSignal<string>()

  const getIcon = () => {
    if (!props.item.icon) {
      return;
    }

    import(`../../assets/icons/${props.item.icon}.svg`).then((ic) => {
      setIcon(ic.default);
    });
  };

  onMount(getIcon);

  return (
    <button
      onClick={(e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        props.item.action();
      }}
      class={`${styles.contextOption} ${props.item.warning ? styles.warning : ''}`}
    >
      <span>
        {props.item.label}
      </span>
      <Show when={icon()}>
        <div style={`-webkit-mask: url(${icon()}) no-repeat 0 / 100%; mask: url(${icon()}) no-repeat 0 / 100%;`} />
      </Show>
    </button>
  )
}
