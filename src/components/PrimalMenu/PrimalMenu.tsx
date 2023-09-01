import { Component, For } from "solid-js";
import { hookForDev } from "../../lib/devTools";
import { MenuItem } from "../../types/primal";
import styles from  "./PrimalMenu.module.scss";
import PrimalMenuItem from "./PrimalMenuItem";


const PrimalMenu: Component<{
  id: string,
  items: MenuItem[],
  position?: 'note_footer' | 'profile',
  reverse?: boolean,
}> = (props) => {

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

export default hookForDev(PrimalMenu);
