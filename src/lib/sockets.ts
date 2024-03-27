import { NostrEventType, NostrEventContent, NostrEvent, NostrEOSE } from "../types/primal";

export const subTo = (socket: WebSocket, subId: string, cb: (type: NostrEventType, subId: string, content?: NostrEventContent) => void ) => {
  const listener = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);
    const [type, subscriptionId, content] = message;

    if (subId === subscriptionId) {
      cb(type, subscriptionId, content);
    }

  };

  socket.addEventListener('message', listener);

  return () => {
    socket.removeEventListener('message', listener);
  };
};

export const sendMessage = (socket: WebSocket, message: string) => {
  socket.readyState === WebSocket.OPEN && socket.send(message);
}
