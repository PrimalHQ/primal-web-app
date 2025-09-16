import { bech32 } from "@scure/base";
import { nip04, nip19, nip47, nip57, Relay, relayInit, utils } from "../lib/nTools";
import { Tier } from "../components/SubscribeToAuthorModal/SubscribeToAuthorModal";
import { Kind } from "../constants";
import { MegaFeedPage, NostrRelaySignedEvent, NostrUserZaps, PrimalArticle, PrimalDVM, PrimalNote, PrimalUser, PrimalZap, TopZap } from "../types/primal";
import { logError } from "./logger";
import { decrypt, enableWebLn, encrypt, sendPayment, signEvent } from "./nostrAPI";
import { decodeNWCUri } from "./wallet";
import { hexToBytes, parseBolt11 } from "../utils";
import { convertToUser } from "../stores/profile";
import { StreamingData } from "./streaming";

export let lastZapError: string = "";

export const zapOverNWC = async (pubkey: string, nwcEnc: string, invoice: string) => {
  let promises: Promise<boolean>[] = [];
  let relays: Relay[] = [];
  let result: boolean = false;
  try {
    const nwc = await decrypt(pubkey, nwcEnc);

    const nwcConfig = decodeNWCUri(nwc);

    const request = await nip47.makeNwcRequestEvent(nwcConfig.pubkey, hexToBytes(nwcConfig.secret), invoice)

    if (nwcConfig.relays.length === 0) return false;

    for (let i = 0; i < nwcConfig.relays.length; i++) {
      const relay = relayInit(nwcConfig.relays[i]);

      promises.push(new Promise(async (resolve) => {
        await relay.connect();

        relays.push(relay);

        const subInfo = relay.subscribe(
          [{ kinds: [13194], authors: [nwcConfig.pubkey] }],
          {
            onevent(event) {
              const nwcInfo = event.content.split(' ');
              if (nwcInfo.includes('pay_invoice')) {

                const subReq = relay.subscribe(
                  [{ kinds: [23195], ids: [request.id] }],
                  {
                    async onevent(eventResponse) {
                      if (!eventResponse.tags.find(t => t[0] === 'e' && t[1] === request.id)) return;

                      const decoded = await nip04.decrypt(hexToBytes(nwcConfig.secret), nwcConfig.pubkey, eventResponse.content);
                      const content = JSON.parse(decoded);

                      if (content.error) {
                        logError('Failed NWC payment: ', content.error);
                        console.error('Failed NWC payment: ', content.error);
                        subReq.close();
                        subInfo.close();
                        resolve(false);
                        return;
                      }

                      subReq.close();
                      subInfo.close();
                      resolve(true);

                    },
                  },
                );

                relay.publish(request);
              }
            },
          },
        );
      }));
    }

    result = await Promise.any(promises);
  }
  catch (e: any) {
    logError('Failed NWC payment init: ', e);
    console.error('Failed NWC payment init: ', e)
    lastZapError = e;
    result = false;
  }

  for (let i = 0; i < relays.length; i++) {
    const relay = relays[i];
    relay.close();
  }

  return result;

};

export const zapNote = async (
  note: PrimalNote,
  sender: string | undefined,
  amount: number,
  comment = '',
  relays: Relay[],
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
    profile: note.pubkey,
    event: note.id,
    amount: sats,
    relays: relays.map(r => r.url)
  };

  if (comment.length > 0) {
    // @ts-ignore
    payload.comment = comment;
  }

  const zapReq = nip57.makeZapRequest(payload);

  try {
    const signedEvent = await signEvent(zapReq);

    const event = encodeURIComponent(JSON.stringify(signedEvent));

    const r2 = await (await fetch(`${callback}?amount=${sats}&nostr=${event}`)).json();
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
  relays: Relay[],
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
    profile: note.pubkey,
    event: note.msg.id,
    amount: sats,
    relays: relays.map(r => r.url)
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

    const event = encodeURIComponent(JSON.stringify(signedEvent));

    const r2 = await (await fetch(`${callback}?amount=${sats}&nostr=${event}`)).json();
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
  relays: Relay[],
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
    profile: profile.pubkey,
    amount: sats,
    relays: relays.map(r => r.url)
  };

  if (comment.length > 0) {
    // @ts-ignore
    payload.comment = comment;
  }
  const zapReq = nip57.makeZapRequest(payload);

  try {
    const signedEvent = await signEvent(zapReq);

    const event = encodeURIComponent(JSON.stringify(signedEvent));

    const r2 = await (await fetch(`${callback}?amount=${sats}&nostr=${event}`)).json();
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
  relays: Relay[],
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
    profile: recipient.pubkey,
    event: subEvent.id,
    amount: sats,
    relays: relays.map(r => r.url)
  };

  if (subEvent.content.length > 0) {
    // @ts-ignore
    payload.comment = comment;
  }

  const zapReq = nip57.makeZapRequest(payload);

  try {
    const signedEvent = await signEvent(zapReq);

    const event = encodeURIComponent(JSON.stringify(signedEvent));

    const r2 = await (await fetch(`${callback}?amount=${sats}&nostr=${event}`)).json();
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
  relays: Relay[],
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
    profile: dvm.pubkey,
    event: dvm.id,
    amount: sats,
    relays: relays.map(r => r.url)
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

    const event = encodeURIComponent(JSON.stringify(signedEvent));

    const r2 = await (await fetch(`${callback}?amount=${sats}&nostr=${event}`)).json();
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
  relays: Relay[],
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
    profile: host.pubkey,
    event: stream.event?.id || null,
    amount: sats,
    relays: relays.map(r => r.url),
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

    const event = encodeURIComponent(JSON.stringify(signedEvent));

    const r2 = await (await fetch(`${callback}?amount=${sats}&nostr=${event}`)).json();
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
