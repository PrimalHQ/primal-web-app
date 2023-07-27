import { For } from "solid-js";
import { MenuItem } from "../../types/primal";
import styles from  "./PrimalMenu.module.scss";
import PrimalMenuItem from "./PrimalMenuItem";


export default function PrimalMenu(props: {
  id: string,
  items: MenuItem[],
  left?: boolean,
}) {
  return (
    <div
      id={props.id}
      class={`${styles.contextMenuOptions} ${props.left ? styles.left : ''}`}
    >
      <For each={props.items}>
        {item => (
          <PrimalMenuItem item={item} />
        )}
      </For>
    </div>
  )
}
