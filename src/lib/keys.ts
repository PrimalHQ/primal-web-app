import { npubEncode } from "nostr-tools/nip19"

export const hexToNpub = (hex: string): string =>  {
  return npubEncode(hex);
}
