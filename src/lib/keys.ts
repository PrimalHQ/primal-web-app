import { nip19 } from "nostr-tools"

export const hexToNpub = (hex: string | undefined): string =>  {
  return hex ? nip19.npubEncode(hex) : '';
}
