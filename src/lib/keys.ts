import { nip19 } from "nostr-tools"
import { noKey } from "../constants";

export const hexToNpub = (hex: string | undefined): string =>  {
  return hex && hex !== noKey ? nip19.npubEncode(hex) : '';
}
