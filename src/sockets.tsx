import { createSignal } from "solid-js";

export const [socket, setSocket] = createSignal<WebSocket>();

export const [isConnected, setConnected] = createSignal<Boolean>(false);

export const isNotConnected = () => !isConnected();

const onOpen = () => {
  setConnected(true);
}

const onClose = () => {
  setConnected(false);

  setTimeout(() => {
    connect();
  }, 200);
}

const onError = (error: Event) => {
  console.log("ws error: ", error);

  setTimeout(() => {
    connect();
  }, 200);
};

export const connect = () => {
  if (isNotConnected()) {
    setSocket(new WebSocket('wss://dev.primal.net/cache8'));

    socket()?.addEventListener('open', onOpen);
    socket()?.addEventListener('close', onClose);
    socket()?.addEventListener('error', onError);
  }
};

export const disconnect = () => {
  socket()?.close();
};

export const reset = () => {
  disconnect();
  setTimeout(connect, 1000);
};

export const sendMessage = (message: string) => {
  isConnected() && socket()?.send(message);
}
