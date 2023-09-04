import { Component, onCleanup, onMount } from "solid-js";
import { hookForDev } from "../../lib/devTools";
import styles from  "./Paginator.module.scss";

const Paginator: Component<{
  id?: string,
  loadNextPage: (() => void) | undefined,
  isSmall?: boolean,
}> = (props) => {
  let observer: IntersectionObserver | undefined;
  let trigger: HTMLDivElement | undefined;

  onMount(() => {
    observer = new IntersectionObserver(entries => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          props.loadNextPage && props.loadNextPage();
        }
      });
    });
    trigger && observer?.observe(trigger);
  });

  onCleanup(() => {
    trigger && observer?.unobserve(trigger);
  });

  return (
    <div id={props.id} ref={trigger} class={props.isSmall ? styles.smallPaginator : styles.paginator}>
    </div>
  )
}

export default hookForDev(Paginator);
