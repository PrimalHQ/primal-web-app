import { Component, createSignal, JSXElement, onCleanup, onMount, Show } from 'solid-js';
import { Portal } from 'solid-js/web';

const Wormhole: Component<{children: JSXElement, to: string }> = (props) => {

  const [portalTarget, setPortalTarget] = createSignal<HTMLElement | null>(null);

  const resolveTarget = () => {
    const target = document.getElementById(props.to);

    if (target && target instanceof HTMLElement) {
      setPortalTarget(target);
      return true;
    }

    return false;
  };

  onMount(() => {
    if (resolveTarget()) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (resolveTarget()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    onCleanup(() => observer.disconnect());
  });

  return (
    <Show when={portalTarget()}>
      {(getTarget) => {
        const target = getTarget();

        if (!target) {
          return null;
        }

        return (
          <Portal mount={target}>
            {props.children}
          </Portal>
        );
      }}
    </Show>
  );
}

export default Wormhole;
