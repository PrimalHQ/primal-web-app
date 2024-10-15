import { Kind } from "../constants";
import { sendMessage } from "../sockets";
import { UserRelation } from "../types/primal";
import { signEvent } from "./nostrAPI";


export const subscribeToMessagesStats = (pubkey: string, subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["directmsg_count", { pubkey }]},
  ]));
}

export const unsubscribeToMessagesStats = (subid: string) => {
  sendMessage(JSON.stringify([
    "CLOSE",
    subid,
    {cache: ["directmsg_count"]},
  ]));
}

export const resetMessageCount = async (sender: string, subid: string) => {
  const event = {
    content: `{ "description": "reset messages from '${sender}'"}`,
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
    created_at: Math.ceil((new Date()).getTime() / 1000),
  };

  try {
    const signedEvent = await signEvent(event);

    sendMessage(JSON.stringify([
      "REQ",
      subid,
      {cache: ["reset_directmsg_count", {
        event_from_user: signedEvent,
        sender,
      }]},
    ]));
    return true;
  } catch (reason) {
    console.error('Failed to reset message count: ', reason);
    return false;
  }
}

export const getMessageCounts = (user_pubkey: string | undefined, relation: UserRelation, subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_directmsg_contacts", { user_pubkey, relation }]},
  ]));
}

export const getOldMessages = (receiver: string | undefined, sender: string | undefined | null, subid: string, until = 0, limit = 20) => {

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

export const markAllAsRead = async (subid: string) => {
  const event = {
    content: `{ "description": "mark all messages as read"}`,
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
    created_at: Math.ceil((new Date()).getTime() / 1000),
  };

  try {
    const signedEvent = await signEvent(event);

    sendMessage(JSON.stringify([
      "REQ",
      subid,
      {cache: ["reset_directmsg_counts", {
        event_from_user: signedEvent,
      }]},
    ]));

    return true;
  } catch (reason) {
    console.error('Failed to mark as read: ', reason);
    return false;
  }
}
