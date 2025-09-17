import { APP_ID } from "../App";
import { Kind } from "../constants";
import { emptyMegaFeedPage, pageResolve, updateFeedPage } from "../megaFeeds";
import { sendMessage, subsTo } from "../sockets";
import { MegaFeedPage, NostrEventContent } from "../types/primal";
import { getEvents } from "./feed";
import { getReplacableEvent } from "./notes";

export type StreamingData = {
  id?: string,
  url?: string,
  image?: string,
  status?: string,
  starts?: number,
  ends?: number,
  summary?: string,
  title?: string,
  client?: string,
  pubkey?: string,
  currentParticipants?: number,
  event?: NostrEventContent,
  hosts?: string[],
  participants?: string[],
}

export const startLiveChat = (
  id: string | undefined,
  pubkey: string | undefined,
  user_pubkey: string | undefined,
  subId: string,
  content_moderation_mode?: string,
) => {
  let page: MegaFeedPage = {...emptyMegaFeedPage()};

    if (!id && !pubkey || !user_pubkey) {
      return;
    }

    let event = {
      kind: 30311,
      pubkey,
      identifier: id,
      user_pubkey,
      content_moderation_mode,
    };

    sendMessage(JSON.stringify([
      "REQ",
      subId,
      {cache: ["live_feed", { ...event }]},
    ]));
};


export const stopLiveChat = (subId: string) => {
  sendMessage(JSON.stringify([
    "CLOSE",
    subId,
    {cache: ["live_feed"]},
  ]));
};


export const getStreamingEvent = (id: string, pubkey: string | undefined) => {
  return new Promise<StreamingData>((resolve, reject) => {
    if (!pubkey) {
      resolve({});
      return;
    }

    const subId = `get_stream_${APP_ID}`;

    let streamData: StreamingData = {};

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content.kind === 30_311) {
          const data = { ...content };

          streamData = {
            id: (data.tags?.find((t: string[]) => t[0] === 'd') || [])[1],
            url: (data.tags?.find((t: string[]) => t[0] === 'streaming') || [])[1],
            image: (data.tags?.find((t: string[]) => t[0] === 'image') || [])[1],
            status: (data.tags?.find((t: string[]) => t[0] === 'status') || [])[1],
            starts: parseInt((data.tags?.find((t: string[]) => t[0] === 'starts') || ['', '0'])[1]),
            ends: parseInt((data.tags?.find((t: string[]) => t[0] === 'ends') || ['', '0'])[1]),
            summary: (data.tags?.find((t: string[]) => t[0] === 'summary') || [])[1],
            title: (data.tags?.find((t: string[]) => t[0] === 'title') || [])[1],
            client: (data.tags?.find((t: string[]) => t[0] === 'client') || [])[1],
            currentParticipants: parseInt((data.tags?.find((t: string[]) => t[0] === 'current_participants') || ['', '0'])[1] || '0'),
            pubkey: data.pubkey,
            event: {...content},
            hosts: (data.tags || []).filter(t => t[0] === 'p' && t[3].toLowerCase() === 'host').map(t => t[1]),
            participants: (data.tags || []).filter(t => t[0] === 'p').map(t => t[1]),
          }

        }
      },
      onEose: () => {
        unsub();
        resolve(streamData);
      },
      onNotice: () => {
        reject('failed_to_find_streaming_data');
      }
    });

    sendMessage(JSON.stringify([
      "REQ",
      subId,
      {cache: ["parametrized_replaceable_event", { identifier: id, pubkey, kind: 30311 }]},
    ]));
  });
};

export const startListeningForLiveEventsSidebar = (user_pubkey: string | undefined, subId: string) => {
  if (!user_pubkey) return;

  sendMessage(JSON.stringify([
    "REQ",
    subId,
    {cache: ["live_events_from_follows", { user_pubkey }]},
  ]));
}

export const stopListeningForLiveEventsSidebar = (subId: string) => {
  sendMessage(JSON.stringify([
    "CLOSE",
    subId,
    {cache: ["live_events_from_follows"]},
  ]));
};

export const findStreamByHost = async (identifier: string | undefined, host_pubkey: string | undefined) => {
  return new Promise<any>((resolve, reject) => {
    if (!host_pubkey || !identifier) {
      resolve({});
      return;
    }

    const subId = `get_stream_by_host_${APP_ID}`;
    let streamData: StreamingData = {};

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content.kind === 30_311) {
          const data = { ...content };

          streamData = {
            id: (data.tags?.find((t: string[]) => t[0] === 'd') || [])[1],
            url: (data.tags?.find((t: string[]) => t[0] === 'streaming') || [])[1],
            image: (data.tags?.find((t: string[]) => t[0] === 'image') || [])[1],
            status: (data.tags?.find((t: string[]) => t[0] === 'status') || [])[1],
            starts: parseInt((data.tags?.find((t: string[]) => t[0] === 'starts') || ['', '0'])[1]),
            ends: parseInt((data.tags?.find((t: string[]) => t[0] === 'ends') || ['', '0'])[1]),
            summary: (data.tags?.find((t: string[]) => t[0] === 'summary') || [])[1],
            title: (data.tags?.find((t: string[]) => t[0] === 'title') || [])[1],
            client: (data.tags?.find((t: string[]) => t[0] === 'client') || [])[1],
            currentParticipants: parseInt((data.tags?.find((t: string[]) => t[0] === 'current_participants') || ['', '0'])[1] || '0'),
            pubkey: data.pubkey,
            event: {...content},
            hosts: (data.tags || []).filter(t => t[0] === 'p' && t[3].toLowerCase() === 'host').map(t => t[1]),
            participants: (data.tags || []).filter(t => t[0] === 'p').map(t => t[1]),
          }

        }
      },
      onEose: () => {
        unsub();
        resolve(streamData);
      },
      onNotice: () => {
        reject('failed_to_find_streaming_data');
      }
    });

    sendMessage(JSON.stringify([
      "REQ",
      subId,
      {cache: ["find_live_events", { host_pubkey, identifier }]},
    ]));
  })
}
