import { For } from "solid-js";
import { MenuItem } from "../../types/primal";
import styles from  "./PrimalMenu.module.scss";
import PrimalMenuItem from "./PrimalMenuItem";


export default function PrimalMenu(props: {
  id: string,
  items: MenuItem[],
  position?: 'note_footer' | 'profile',
  reverse?: boolean
}) {

  const positionClass = () => {
    if (props.position == 'note_footer') {
      return styles.noteFooter
    }

    if (props.position == 'profile') {
      return styles.profile
    }

    return '';
  }

  return (
    <div
      id={props.id}
      class={`${styles.contextMenuOptions} ${positionClass()}`}
    >
      <For each={props.items}>
        {item => (
          <PrimalMenuItem item={item} reverse={props.reverse} />
        )}
      </For>
    </div>
  )
}
