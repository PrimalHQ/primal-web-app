import { Relay } from "nostr-tools";
import { Kind } from "../constants";
import { NostrRelays } from "../types/primal";
import { sendEvent } from "./notes";

export const sendHighlight = async (content: string, context: string, author: string, article: string, shouldProxy: boolean, relays: Relay[], relaySettings?: NostrRelays) => {

  const event = {
    content,
    kind: Kind.Highlight,
    tags: [
      ['p', author],
      ['a', article],
      ['context', context],
      ['alt', 'This highlight was made by https://primal.net web client'],
    ],
    created_at: Math.floor((new Date()).getTime() / 1_000),
  };

  return await sendEvent(event, relays, relaySettings, shouldProxy);
};

export const removeHighlight = async (id: string, shouldProxy: boolean, relays: Relay[], relaySettings?: NostrRelays) => {

  const event = {
    content: '',
    kind: Kind.EventDeletion,
    tags: [
      ['e', id],
      ['alt', 'This event was deleted through the https://primal.net web client'],
    ],
    created_at: Math.floor((new Date()).getTime() / 1_000),
  };

  return await sendEvent(event, relays, relaySettings, shouldProxy);
};
