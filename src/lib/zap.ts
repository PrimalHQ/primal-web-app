import { bech32 } from "@scure/base";
import { nip04, nip47, nip57, utils } from "../lib/nTools";
import { Kind } from "../constants";
import { NostrRelaySignedEvent, NostrUserZaps, PrimalArticle, PrimalDVM, PrimalNote, PrimalUser, PrimalUserPoll, PrimalZap, } from "../types/primal";
import { logError } from "./logger";
import { decrypt, enableWebLn, sendPayment, signEvent } from "./nostrAPI";
import { decodeNWCUri } from "./wallet";
import { hexToBytes, parseBolt11 } from "../utils";
import { StreamingData } from "./streaming";
import { relayWorker } from "../App";
import { NostrEvent, NostrEventTemplate } from "./nTools";
import { accountStore } from "../stores/accountStore";
import { unwrap } from "solid-js/store";

export let lastZapError: string = "";

export const zapOverNWC = async (pubkey: string, nwcEnc: string, invoice: string) => {

  try {
    const nwc = await decrypt(pubkey, nwcEnc);

    const nwcConfig = decodeNWCUri(nwc);

    const request = await nip47.makeNwcRequestEvent(nwcConfig.pubkey, hexToBytes(nwcConfig.secret), invoice)

    if (nwcConfig.relays.length === 0) return false;

    const handleNWCResponse = (e: MessageEvent<{ type: string, event: NostrEvent, secret: string, pubkey: string}>) => {
      if (e.data.type !== 'NWC_RESPONSE') return;

      relayWorker.removeEventListener('message', handleNWCResponse);

      const {event, secret, pubkey } = e.data;

      if (!secret) {
        console.error('Failed NWC payment: No secret');
      }

      const decoded = nip04.decrypt(hexToBytes(secret), pubkey, event.content);
      const content = JSON.parse(decoded);

      if (content.error) {
        console.error('Failed NWC payment: ', content.error);
      }
    }

    relayWorker.addEventListener('message', handleNWCResponse);

    relayWorker.postMessage({ type: 'SEND_NWC', nwcData: {
      event: request,
      nwcConfig,
    }})

    return true;
  }
  catch (e: any) {
    logError('Failed NWC payment init: ', e);
    console.error('Failed NWC payment init: ', e)
    lastZapError = e;
    return false;
  }
};

export const zapNote = async (
  note: PrimalNote | PrimalUserPoll,
  sender: string | undefined,
  amount: number,
  comment = '',
  relays: string[],
  nwc?: string[],
) => {
  if (!sender) {
    return false;
  }

  const callback = await getZapEndpoint(note.user);

  if (!callback) {
    return false;
  }

  const sats = Math.round(amount * 1000);

  let payload = {
    pubkey: note.pubkey,
    event: note.msg,
    amount: sats,
    relays,
  };

  if (comment.length > 0) {
    // @ts-ignore
    payload.comment = comment;
  }

  const zapReq = nip57.makeZapRequest(payload);

  try {
    const signedEvent = await signEvent(zapReq);

    const event = JSON.stringify(signedEvent);

    const url = new URL(callback);
    url.searchParams.set('amount', String(sats));
    url.searchParams.set('nostr', event);

    const r2 = await (await fetch(url.toString())).json();

    const pr = r2.pr;

    if (nwc && nwc[1] && nwc[1].length > 0) {
      return await zapOverNWC(sender, nwc[1], pr);
    }

    await enableWebLn();
    await sendPayment(pr);

    return true;
  } catch (reason) {
    console.error('Failed to zap: ', reason);
    return false;
  }
}

export const zapArticle = async (
  note: PrimalArticle,
  sender: string | undefined,
  amount: number,
  comment = '',
  relays: string[],
  nwc?: string[],
) => {
  if (!sender) {
    return false;
  }

  const callback = await getZapEndpoint(note.user);

  if (!callback) {
    return false;
  }

  const a = `${Kind.LongForm}:${note.pubkey}:${(note.msg.tags.find(t => t[0] === 'd') || [])[1]}`;

  const sats = Math.round(amount * 1000);

  let payload = {
    pubkey: note.pubkey,
    event: note.msg,
    amount: sats,
    relays,
  };

  if (comment.length > 0) {
    // @ts-ignore
    payload.comment = comment;
  }

  const zapReq = nip57.makeZapRequest(payload);

  if (!zapReq.tags.find((t: string[]) => t[0] === 'a' && t[1] === a)) {
    zapReq.tags.push(['a', a]);
  }

  try {
    const signedEvent = await signEvent(zapReq);

    const event = JSON.stringify(signedEvent);

    const url = new URL(callback);
    url.searchParams.set('amount', String(sats));
    url.searchParams.set('nostr', event);

    const r2 = await (await fetch(url.toString())).json();
    const pr = r2.pr;

    if (nwc && nwc[1] && nwc[1].length > 0) {
      return await zapOverNWC(sender, nwc[1], pr);
    }

    await enableWebLn();
    await sendPayment(pr);

    return true;
  } catch (reason) {
    console.error('Failed to zap: ', reason);
    return false;
  }
}

export const zapProfile = async (
  profile: PrimalUser,
  sender: string | undefined,
  amount: number,
  comment = '',
  relays: string[],
  nwc?: string[],
) => {
  if (!sender || !profile) {
    return false;
  }

  const callback = await getZapEndpoint(profile);

  if (!callback) {
    return false;
  }

  const sats = Math.round(amount * 1000);

  let payload = {
    pubkey: profile.pubkey,
    amount: sats,
    relays,
  };

  if (comment.length > 0) {
    // @ts-ignore
    payload.comment = comment;
  }
  const zapReq = nip57.makeZapRequest(payload);

  try {
    const signedEvent = await signEvent(zapReq);

    const event = JSON.stringify(signedEvent);

    const url = new URL(callback);
    url.searchParams.set('amount', String(sats));
    url.searchParams.set('nostr', event);

    const r2 = await (await fetch(url.toString())).json();

    const pr = r2.pr;

    if (nwc && nwc[1] && nwc[1].length > 0) {
      return await zapOverNWC(sender, nwc[1], pr);
    }

    await enableWebLn();
    await sendPayment(pr);

    return true;
  } catch (reason) {
    console.error('Failed to zap: ', reason);
    return false;
  }
}

export const zapSubscription = async (
  subEvent: NostrRelaySignedEvent,
  recipient: PrimalUser,
  sender: string | undefined,
  relays: string[],
  exchangeRate?: Record<string, Record<string, number>>,
  nwc?: string[],
) => {
  if (!sender || !recipient) {
    return false;
  }

  const callback = await getZapEndpoint(recipient);

  if (!callback) {
    return false;
  }

  const costTag = subEvent.tags.find(t => t [0] === 'amount');
  if (!costTag) return false;

  let sats = 0;

  if (costTag[2] === 'sats') {
    sats = parseInt(costTag[1]) * 1_000;
  }

  if (costTag[2] === 'msat') {
    sats = parseInt(costTag[1]);
  }

  if (costTag[2] === 'USD' && exchangeRate && exchangeRate['USD']) {
    let usd = parseFloat(costTag[1]);
    sats = Math.ceil(exchangeRate['USD'].sats * usd * 1_000);
  }

  let payload = {
    pubkey: recipient.pubkey,
    event: subEvent,
    amount: sats,
    relays,
  };

  if (subEvent.content.length > 0) {
    // @ts-ignore
    payload.comment = comment;
  }

  const zapReq = nip57.makeZapRequest(payload);

  try {
    const signedEvent = await signEvent(zapReq);

    const event = JSON.stringify(signedEvent);

    const url = new URL(callback);
    url.searchParams.set('amount', String(sats));
    url.searchParams.set('nostr', event);

    const r2 = await (await fetch(url.toString())).json();
    const pr = r2.pr;

    if (nwc && nwc[1] && nwc[1].length > 0) {
      return await zapOverNWC(sender, nwc[1], pr);
    }

    await enableWebLn();
    await sendPayment(pr);

    return true;
  } catch (reason) {
    console.error('Failed to zap: ', reason);
    return false;
  }
}

export const zapDVM = async (
  dvm: PrimalDVM,
  author: PrimalUser,
  sender: string | undefined,
  amount: number,
  comment = '',
  relays: string[],
  nwc?: string[],
) => {
  if (!sender) {
    return false;
  }

  const callback = await getZapEndpoint(author);

  if (!callback) {
    return false;
  }

  const a = `${Kind.DVM}:${dvm.pubkey}:${dvm.identifier}`;

  const sats = Math.round(amount * 1000);

  let payload = {
    pubkey: dvm.pubkey,
    event: dvm,
    amount: sats,
    relays,
  };

  if (comment.length > 0) {
    // @ts-ignore
    payload.comment = comment;
  }

  const zapReq = nip57.makeZapRequest(payload);

  if (!zapReq.tags.find((t: string[]) => t[0] === 'a' && t[1] === a)) {
    zapReq.tags.push(['a', a]);
  }

  try {
    const signedEvent = await signEvent(zapReq);

    const event = JSON.stringify(signedEvent);

    const url = new URL(callback);
    url.searchParams.set('amount', String(sats));
    url.searchParams.set('nostr', event);

    const r2 = await (await fetch(url.toString())).json();
    const pr = r2.pr;

    if (nwc && nwc[1] && nwc[1].length > 0) {
      return await zapOverNWC(sender, nwc[1], pr);
    }

    await enableWebLn();
    await sendPayment(pr);

    return true;
  } catch (reason) {
    console.error('Failed to zap: ', reason);
    return false;
  }
}

export const zapStream = async (
  stream: StreamingData,
  host: PrimalUser | undefined,
  sender: string | undefined,
  amount: number,
  comment = '',
  relays: string[],
  nwc?: string[],
) => {
  if (!sender || !host) {
    return { success: false };
  }

  const callback = await getZapEndpoint(host);

  if (!callback) {
    return { success: false };
  }

  const a = `${Kind.LiveEvent}:${stream.pubkey}:${stream.id}`;

  const sats = Math.round(amount * 1000);

  let payload = {
    pubkey: host.pubkey,
    event: stream.event,
    amount: sats,
    relays,
  };

  if (comment.length > 0) {
    // @ts-ignore
    payload.comment = comment;
  }

  const zapReq = nip57.makeZapRequest(payload);

  if (!zapReq.tags.find((t: string[]) => t[0] === 'a' && t[1] === a)) {
    zapReq.tags.push(['a', a]);
  }

  try {
    const signedEvent = await signEvent(zapReq);

    const event = JSON.stringify(signedEvent);

    const url = new URL(callback);
    url.searchParams.set('amount', String(sats));
    url.searchParams.set('nostr', event);

    const r2 = await (await fetch(url.toString())).json();
    const pr = r2.pr;

    if (nwc && nwc[1] && nwc[1].length > 0) {
      const success = await zapOverNWC(sender, nwc[1], pr);

      return { success: true, event: signedEvent }
    }

    await enableWebLn();
    await sendPayment(pr);

    return { success: true, event: signEvent };
  } catch (reason) {
    console.error('Failed to zap: ', reason);
    return { sucess: false };
  }
}

type ProfileZap = {
  pubkey: string
  amount: number
  comment?: string
  relays: string[]
}

type EventZap = {
  event: NostrEvent
  amount: number
  comment?: string
  relays: string[]
}

export function isReplaceableKind(kind: number): boolean {
  return kind === 0 || kind === 3 || (10000 <= kind && kind < 20000)
}

/** Events are **ephemeral**, which means they are not expected to be stored by relays. */
export function isEphemeralKind(kind: number): boolean {
  return 20000 <= kind && kind < 30000
}

/** Events are **addressable**, which means that, for each combination of `pubkey`, `kind` and the `d` tag, only the latest event is expected to be stored by relays, older versions are expected to be discarded. */
export function isAddressableKind(kind: number): boolean {
  return 30000 <= kind && kind < 40000
}


export function makeZapPollRequest(params: ProfileZap | EventZap, option: string): NostrEventTemplate {
  let zr: NostrEventTemplate = {
    kind: 9734,
    created_at: Math.round(Date.now() / 1000),
    content: params.comment || '',
    tags: [
      ['p', 'pubkey' in params ? params.pubkey : params.event.pubkey, params.relays[0]],
      ['amount', params.amount.toString()],
      ['relays', ...params.relays],
      ['poll_option', option],
    ],
  }

  if ('event' in params) {
    zr.tags.push(['e', params.event.id, params.relays[0]])
    if (isReplaceableKind(params.event.kind)) {
      const a = ['a', `${params.event.kind}:${params.event.pubkey}:`, params.relays[0]]
      zr.tags.push(a)
    } else if (isAddressableKind(params.event.kind)) {
      let d = params.event.tags.find(([t, v]) => t === 'd' && v)
      if (!d) throw new Error('d tag not found or is empty')
      const a = ['a', `${params.event.kind}:${params.event.pubkey}:${d[1]}`, params.relays[0]]
      zr.tags.push(a)
    }
    zr.tags.push(['k', params.event.kind.toString()])
  }

  return zr
}

export const zapVote = async (
  poll: PrimalUserPoll,
  sender: string | undefined,
  amount: number,
  option: string,
  comment = '',
  nwc?: string[],
) => {
  if (!sender) {
    return false;
  }

  const pTag = poll.msg.tags.find(t => t[0] === 'p' && t[3] !== 'mention');

  const relay = pTag?.[3] || accountStore.activeRelays[0];
  const receiverPubkey = pTag?.[1] || poll.pubkey;

  const callback = await getZapEndpoint(poll.user);

  if (!callback) {
    return false;
  }

  const sats = Math.round(amount * 1000);

  let relays = poll.tags.filter(t => t[0] === 'relay').map((t) => t[1]);

  if (relays.length === 0){
    relays = unwrap(accountStore.activeRelays);
  }

  let payload = {
    pubkey: receiverPubkey,
    event: poll.msg,
    amount: sats,
    relays: [ ...relays ],
  };

  if (comment.length > 0) {
    // @ts-ignore
    payload.comment = comment;
  }

  const zapReq = makeZapPollRequest(payload, option);

  try {
    const signedEvent = await signEvent(zapReq);

    const event = JSON.stringify(signedEvent);

    const url = new URL(callback);
    url.searchParams.set('amount', String(sats));
    url.searchParams.set('nostr', event);

    const r2 = await (await fetch(url.toString())).json();
    const pr = r2.pr;

    if (nwc && nwc[1] && nwc[1].length > 0) {
      return await zapOverNWC(sender, nwc[1], pr);
    }

    await enableWebLn();
    await sendPayment(pr);

    return true;
  } catch (reason) {
    console.error('Failed to zap: ', reason);
    return false;
  }
}

export const getZapEndpoint = async (user: PrimalUser): Promise<string | null>  => {
  try {
    let lnurl: string = ''
    let {lud06, lud16} = user;

    if (lud16) {
      let [name, domain] = lud16.split('@')
      lnurl = `https://${domain}/.well-known/lnurlp/${name}`
    }
    else if (lud06) {
      let {words} = bech32.decode(lud06, 1023)
      let data = bech32.fromWords(words)
      lnurl = utils.utf8Decoder.decode(data)
    }
    else {
      return null;
    }

    try {
      let res = await fetch(lnurl)
      let body = await res.json()

      if (body.allowsNostr && body.nostrPubkey) {
        return body.callback;
      }
    }
    catch (e) {
      logError('LNURL: ', lnurl)
      logError('Error fetching lnurl: ', e);
      return null;
    }
  } catch (err) {
    logError('Error zapping: ', err);
    return null;
    /*-*/
  }

  return null;
}

export const canUserReceiveZaps = (user: PrimalUser | undefined) => {
  return !!user && (!!user.lud16 || !!user.lud06);
}

export const convertToZap = (zapContent: NostrUserZaps) => {

  const bolt11 = (zapContent.tags.find(t => t[0] === 'bolt11') || [])[1];
  const zapEvent = JSON.parse((zapContent.tags.find(t => t[0] === 'description') || [])[1] || '{}');
  const senderPubkey = zapEvent.pubkey as string;
  const receiverPubkey = zapEvent.tags.find((t: string[]) => t[0] === 'p')[1] as string;

  let zappedId = '';
  let zappedKind: number = 0;

  const zap: PrimalZap = {
    id: zapContent.id,
    message: zapEvent.content || '',
    amount: parseBolt11(bolt11) || 0,
    sender: senderPubkey,
    reciver: receiverPubkey,
    created_at: zapContent.created_at,
    zappedId,
    zappedKind,
  };

  return zap;
}
