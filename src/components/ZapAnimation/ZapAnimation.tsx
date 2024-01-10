import { Component } from 'solid-js';

const ZapAnimation: Component<{
  id?: string,
  class?: string,
  src: any,
  ref?: HTMLElement | undefined,
}> = (props) => {

  return (
    // @ts-ignore
    <lottie-player
      id={props.id}
      src={props.src}
      speed="1"
      class={props.class}
      ref={props.ref}
    >
    {/* @ts-ignore */}
    </lottie-player>
  );
}

export default ZapAnimation;
