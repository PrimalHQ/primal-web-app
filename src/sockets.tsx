import { createSignal } from "solid-js";

export const [socket, setSocket] = createSignal<WebSocket>();

export const connect = () => {
  setSocket(new WebSocket('wss://dev.primal.net/cache'));
}

export const disconnect = () => {
  socket()?.close();
}
