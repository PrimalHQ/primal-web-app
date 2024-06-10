import { Kind } from "../constants";
import { signEvent } from "./nostrAPI";

export const getMembershipStatus = async (pubkey: string | undefined, subId: string, socket: WebSocket) => {
  if (!pubkey) return;

  const event = {
    kind: Kind.Settings,
    tags: [['p', pubkey]],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({}),
  };

  try {
    const signedNote = await signEvent(event);

    const message = JSON.stringify([
      "REQ",
      subId,
      {cache: ["membership_status", { event_from_user: signedNote }]},
    ]);

    if (socket) {
      const e = new CustomEvent('send', { detail: { message, ws: socket }});

      socket.send(message);
      socket.dispatchEvent(e);
    } else {
      throw('no_socket');
    }


    return true;
  } catch (reason) {
    console.error('Failed to upload: ', reason);
    return false;
  }
}



export const getExchangeRate = async (pubkey: string | undefined, subId: string, currency: string, socket: WebSocket) => {
  if (!pubkey) {
    return;
  }

  const content = JSON.stringify(
    ["exchange_rate", { target_currency: currency }],
  );

  const event = {
    content,
    kind: Kind.WALLET_OPERATION,
    created_at: Math.ceil((new Date()).getTime() / 1000),
    tags: [],
  };

  const signedEvent = await signEvent(event);

  const message = JSON.stringify([
    "REQ",
    subId,
    {cache: ["wallet", { operation_event: signedEvent }]},
  ]);

  if (socket) {
    const e = new CustomEvent('send', { detail: { message, ws: socket }});

    socket.send(message);
    socket.dispatchEvent(e);
  } else {
    throw('no_socket');
  }
}
