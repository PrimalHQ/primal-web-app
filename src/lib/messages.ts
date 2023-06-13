import { Kind } from "../constants";
import { sendMessage } from "../sockets";
import { NostrWindow, UserRelation } from "../types/primal";


export const subscribeToMessagesStats = (pubkey: string, subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["directmsg_count", { pubkey }]},
  ]));
}

export const resetMessageCount = async (sender: string, subid: string) => {

  const win = window as NostrWindow;
  const nostr = win.nostr;

  if (nostr === undefined) {
    return false;
  }

  const event = {
    content: `{ "description": "reset messages from '${sender}'"}`,
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
    created_at: Math.ceil((new Date()).getTime() / 1000),
  };

  const signedEvent = await nostr.signEvent(event);

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["reset_directmsg_count", {
      event_from_user: signedEvent,
      sender,
    }]},
  ]));
}

export const getMessageCounts = (receiver: string, relation: UserRelation, subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_directmsg_contacts", { receiver, relation }]},
  ]));
}

export const getOldMessages = (receiver: string, sender: string, subid: string, until = 0, limit = 200) => {

  const start = until === 0 ? 'since' : 'until';

  const payload = { limit, [start]: until, receiver, sender };

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_directmsgs", payload]},
  ]));
}

export const getNewMessages = (receiver: string, sender: string, subid: string, since = 0, limit = 20) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_directmsgs", { receiver, sender, since, limit }]},
  ]));
}
