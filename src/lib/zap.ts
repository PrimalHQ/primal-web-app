import { bech32 } from "@scure/base";
import { nip57, Relay, utils } from "nostr-tools";
import { NostrWindow, PrimalNote, PrimalUser } from "../types/primal";
import { sendEvent } from "./notes";

export const zapNote = async (note: PrimalNote, sender: string | undefined, amount: number, comment = '', relays: Relay[]) => {
  if (!sender) {
    return false;
  }

  // Ignoring typecheck because we only need lud06 and lud16 in content.
  // We don't need the whole Event.
  // @ts-ignore
  const { callback } = await getZapEndpoint(note.user);

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

  const signeEvent = await nostr.signEvent(zapReq);

  const event = encodeURI(JSON.stringify(signeEvent));

  try {
    const r2 = await (await fetch(`${callback}?amount=${sats}&nostr=${event}`)).json();
    const pr = r2.pr;

    await webln.enable();
    await webln.sendPayment(pr);

    return true;
  } catch (e) {
    return false;
  }
}

export const getZapEndpoint = async (user: PrimalUser): Promise<null | { callback: string, lnurl: string}>  => {
  try {
    let lnurl: string = ''
    let {lud06, lud16} = user;
    if (lud06) {
      let {words} = bech32.decode(lud06, 1000)
      let data = bech32.fromWords(words)
      lnurl = utils.utf8Decoder.decode(data)
    } else if (lud16) {
      let [name, domain] = lud16.split('@')
      lnurl = `https://${domain}/.well-known/lnurlp/${name}`
    } else {
      return null
    }

    let res = await fetch(lnurl)
    let body = await res.json()

    if (body.allowsNostr && body.nostrPubkey) {
      return {callback: body.callback, lnurl };
    }
  } catch (err) {
    /*-*/
  }

  return null
}

export const canUserReceiveZaps = (user: PrimalUser | undefined) => {
  return !!user && (!!user.lud16 || !!user.lud06);
}
