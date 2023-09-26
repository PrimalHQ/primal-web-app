import { Component, JSX } from "solid-js";
import styles from "./NoteImage.module.scss";
// @ts-ignore Bad types in nostr-tools
import { generatePrivateKey } from "nostr-tools";

const NoteImage: Component<{
  src?: string,
  isDev?: boolean,
  onError?: JSX.EventHandlerUnion<HTMLImageElement, Event>,
}> = (props) => {
  const imgId = generatePrivateKey();

  const klass = () => `${styles.noteImage} ${props.isDev ? 'redBorder' : ''}`;

  return <img id={imgId} src={props.src} class={klass()} onerror={props.onError} />;
}

export default NoteImage;
