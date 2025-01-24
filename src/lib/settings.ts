import { Kind } from "../constants";
import { sendMessage } from "../sockets";
import { PrimalArticleFeed, PrimalFeed } from "../types/primal";
import { signEvent } from "./nostrAPI";

type PrimalSettings = {
  theme: string,
  feeds: PrimalFeed[],
  description?: string,
};

export const sendSettings = async (settings: PrimalSettings, subid: string) => {
  const content = { description: 'Sync app settings', ...settings };

  const event = {
    content: JSON.stringify(content),
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  try {
    const signedNote = await signEvent(event);

    sendMessage(JSON.stringify([
      "REQ",
      subid,
      {cache: ["set_app_settings", { settings_event: signedNote }]},
    ]));
    return true;
  } catch (reason) {
    console.error('Failed to send settings: ', reason);
    return false;
  }
};

export const getSettings = async (pubkey: string | undefined, subid: string) => {
  const event = {
    content: '{ "description": "Sync app settings" }',
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  try {
    const signedNote = await signEvent(event);

    sendMessage(JSON.stringify([
      "REQ",
      subid,
      {cache: ["get_app_settings", { event_from_user: signedNote }]},
    ]));

    return true;
  } catch (reason) {
    console.error('Failed to get settings: ', reason);
    return false;
  }

};

export const getHomeSettings = async (subid: string) => {
  const event = {
    content: JSON.stringify({ subkey: "user-home-feeds" }),
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  try {
    const signedNote = await signEvent(event);

    sendMessage(JSON.stringify([
      "REQ",
      subid,
      {cache: ["get_app_subsettings", { event_from_user: signedNote }]},
    ]));

    return true;
  } catch (reason) {
    console.error('Failed to get settings: ', reason);
    return false;
  }

};

export const setHomeSettings = async (subid: string, feeds: PrimalArticleFeed[]) => {
  const event = {
    content: JSON.stringify({
      subkey: "user-home-feeds",
      settings: feeds,
    }),
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  try {
    const signedNote = await signEvent(event);

    sendMessage(JSON.stringify([
      "REQ",
      subid,
      {cache: ["set_app_subsettings", { event_from_user: signedNote }]},
    ]));

    return true;
  } catch (reason) {
    console.error('Failed to set settings: ', reason);
    return false;
  }

};

export const getReadsSettings = async (subid: string) => {
  const event = {
    content: JSON.stringify({ subkey: "user-reads-feeds" }),
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  try {
    const signedNote = await signEvent(event);

    sendMessage(JSON.stringify([
      "REQ",
      subid,
      {cache: ["get_app_subsettings", { event_from_user: signedNote }]},
    ]));

    return true;
  } catch (reason) {
    console.error('Failed to get settings: ', reason);
    return false;
  }

};

export const setReadsSettings = async (subid: string, feeds: PrimalArticleFeed[]) => {
  const event = {
    content: JSON.stringify({
      subkey: "user-reads-feeds",
      settings: feeds,
    }),
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  try {
    const signedNote = await signEvent(event);

    sendMessage(JSON.stringify([
      "REQ",
      subid,
      {cache: ["set_app_subsettings", { event_from_user: signedNote }]},
    ]));

    return true;
  } catch (reason) {
    console.error('Failed to set settings: ', reason);
    return false;
  }

};

export const getDefaultSettings = async (subid: string) => {

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_default_app_settings", { client: "Primal-Web App" }]},
  ]))
};


export const getNWCSettings = async (subid: string) => {
  const event = {
    content: JSON.stringify({ subkey: "user-nwc" }),
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  try {
    const signedNote = await signEvent(event);

    sendMessage(JSON.stringify([
      "REQ",
      subid,
      {cache: ["get_app_subsettings", { event_from_user: signedNote }]},
    ]));

    return true;
  } catch (reason) {
    console.error('Failed to get settings: ', reason);
    return false;
  }

};

export const setNWCSettings = async (subid: string, nwcSettings: { nwcList: string[][], nwcActive: string[]}) => {
  const event = {
    content: JSON.stringify({
      subkey: "user-nwc",
      settings: { ...nwcSettings },
    }),
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  try {
    const signedNote = await signEvent(event);

    sendMessage(JSON.stringify([
      "REQ",
      subid,
      {cache: ["set_app_subsettings", { event_from_user: signedNote }]},
    ]));

    return true;
  } catch (reason) {
    console.error('Failed to set settings: ', reason);
    return false;
  }

};
