import { bech32 } from "@scure/base";
// @ts-ignore Bad types in nostr-tools
import { nip57, Relay, utils } from "nostr-tools";
import { PrimalArticle, PrimalNote, PrimalUser } from "../types/primal";
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
