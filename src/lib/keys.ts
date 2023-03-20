import { npubEncode } from "nostr-tools/nip19"

export const hexToNpub = (hex: string | undefined): string =>  {
  return hex ? npubEncode(hex) : '';
}
