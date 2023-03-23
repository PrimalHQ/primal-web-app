import { npubEncode } from "nostr-tools/nip19"
import { noKey } from "../constants";

export const hexToNpub = (hex: string | undefined): string =>  {
  return hex && hex !== noKey ? npubEncode(hex) : '';
}
