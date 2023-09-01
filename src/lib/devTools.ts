import { onMount, onCleanup } from "solid-js";
import { ComponentLog, PrimalWindow } from "../types/primal";

const hook = (type: 'onPrimalComponentMount' | 'onPrimalComponentCleanup', data: ComponentLog) => {
  const fn = (window as PrimalWindow)[type];
  fn && fn(data);
};

export const hookForDev = (fn: Function) => {
  if (localStorage.getItem('devMode') !== 'true') {
    return fn;
  }

  return (props: any) => {
    const domId = props.id || `${fn.name}_${crypto.randomUUID()}`;
    const scope: ComponentLog = { name: fn.name, props, domId };

    onMount(() => {
      hook('onPrimalComponentMount', scope);
    });

    onCleanup(() => {
      hook('onPrimalComponentCleanup', scope);
    })

    props.id = domId;

    return fn(props);
  };
}
