import { createSignal } from "solid-js";

export const [socket, setSocket] = createSignal<WebSocket>();

export const [isConnected, setConnected] = createSignal<Boolean>(false);

export const isNotConnected = () => !isConnected();

const onOpen = () => {
  setConnected(true);
}

const onClose = () => {
  setConnected(false);
}

export const connect = () => {
  if (isNotConnected()) {
    setSocket(new WebSocket('wss://dev.primal.net/cache3'));
  
    socket()?.addEventListener('open', onOpen);
    socket()?.addEventListener('close', onClose);
  }
};

export const disconnect = () => {
  socket()?.close();
};

export const reset = () => {
  disconnect();
  setTimeout(connect, 200);
};

// export const isConnected = () => {
//   return socket()?.readyState === 1;
// };
