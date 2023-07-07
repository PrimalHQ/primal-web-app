import { Component, createSignal, JSXElement, onMount, Show } from 'solid-js';
import { Portal } from 'solid-js/web';

const Wormhole: Component<{children: JSXElement, to: string }> = (props) => {

  const [mounted, setMounted] = createSignal(false);

  onMount(() => {
    setTimeout(() => {
      // Temporary fix for Portal rendering on initial load.
      setMounted(true);
    });
  });

  return (
    <Show when={mounted()}>
      <Portal mount={document.getElementById(props.to) as Node}>
        {props.children}
      </Portal>
    </Show>
  );
}

export default Wormhole;
