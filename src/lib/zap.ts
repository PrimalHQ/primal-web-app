import { bech32 } from "@scure/base";
import { nip57, Relay, utils } from "nostr-tools";
import { NostrWindow, PrimalNote, PrimalUser } from "../types/primal";
import { sendEvent } from "./notes";

export const zapNote = async (note: PrimalNote, sender: string | undefined, amount: number, comment = '', relays: Relay[]) => {
  if (!sender) {
    return false;
  }

  const callback = await getZapEndpoint(note.user);

  if (!callback) {
    return false;
  }

  const sats = Math.round(amount * 1000);

  const zapReq = nip57.makeZapRequest({
    profile: note.post.pubkey,
    event: note.msg.id,
    amount: sats,
    comment,
    relays: relays.map(r => r.url)
  });

  const win = window as NostrWindow;
  const nostr = win.nostr;
  const webln = win.webln

  if (!nostr || !webln) {
    return false;
  }

  try {
    const signedEvent = await nostr.signEvent(zapReq);

    const event = encodeURI(JSON.stringify(signedEvent));

    const r2 = await (await fetch(`${callback}?amount=${sats}&nostr=${event}`)).json();
    const pr = r2.pr;

    await webln.enable();
    await webln.sendPayment(pr);

    return true;
  } catch (e) {
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
    console.log('E: ', err);
    return null;
    /*-*/
  }

  return null;
}

export const canUserReceiveZaps = (user: PrimalUser | undefined) => {
  return !!user && (!!user.lud16 || !!user.lud06);
}
