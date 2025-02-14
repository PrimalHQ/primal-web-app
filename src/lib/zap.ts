import { bech32 } from "@scure/base";
import { nip57, Relay, utils } from "../lib/nTools";
import { Tier } from "../components/SubscribeToAuthorModal/SubscribeToAuthorModal";
import { Kind } from "../constants";
import { NostrRelaySignedEvent, PrimalArticle, PrimalDVM, PrimalNote, PrimalUser } from "../types/primal";
import { logError } from "./logger";
import { enableWebLn, sendPayment, signEvent } from "./nostrAPI";

export const zapNote = async (note: PrimalNote, sender: string | undefined, amount: number, comment = '', relays: Relay[]) => {
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

    await enableWebLn();
    await sendPayment(pr);

    return true;
  } catch (reason) {
    console.error('Failed to zap: ', reason);
    return false;
  }
}

export const zapArticle = async (note: PrimalArticle, sender: string | undefined, amount: number, comment = '', relays: Relay[]) => {
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

    await enableWebLn();
    await sendPayment(pr);

    return true;
  } catch (reason) {
    console.error('Failed to zap: ', reason);
    return false;
  }
}

export const zapProfile = async (profile: PrimalUser, sender: string | undefined, amount: number, comment = '', relays: Relay[]) => {
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

    await enableWebLn();
    await sendPayment(pr);

    return true;
  } catch (reason) {
    console.error('Failed to zap: ', reason);
    return false;
  }
}

export const zapSubscription = async (subEvent: NostrRelaySignedEvent, recipient: PrimalUser, sender: string | undefined, relays: Relay[], exchangeRate?: Record<string, Record<string, number>>) => {
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

    await enableWebLn();
    await sendPayment(pr);

    return true;
  } catch (reason) {
    console.error('Failed to zap: ', reason);
    return false;
  }
}

export const zapDVM = async (dvm: PrimalDVM, author: PrimalUser, sender: string | undefined, amount: number, comment = '', relays: Relay[]) => {
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

    let res = await fetch(lnurl)
    let body = await res.json()

    if (body.allowsNostr && body.nostrPubkey) {
      return body.callback;
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
