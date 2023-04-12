import { Kind } from "../constants";
import { sendMessage } from "../sockets";
import { NostrWindow, PrimalFeed } from "../types/primal";

type PrimalSettings = {
  theme: string,
  feeds: PrimalFeed[],
  description?: string,
};

export const sendSettings = async (settings: PrimalSettings, subid: string) => {
  const win = window as NostrWindow;
  const nostr = win.nostr;

  if (nostr === undefined) {
    return false;
  }

  const content = { description: 'Sync app settings', ...settings };

  const event = {
    content: JSON.stringify(content),
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  const signedNote = await nostr.signEvent(event);

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["set_app_settings", { settings_event: signedNote }]},
  ]))
};

export const getSettings = async (pubkey: string | undefined, subid: string) => {
  const win = window as NostrWindow;
  const nostr = win.nostr;

  if (nostr === undefined || !pubkey) {
    return false;
  }

  const event = {
    content: '{ "description": "Sync app settings" }',
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  const signedNote = await nostr.signEvent(event);

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_app_settings", { event_from_user: signedNote }]},
  ]))
};
