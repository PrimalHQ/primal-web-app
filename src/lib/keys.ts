import { nip19 } from "nostr-tools"
import { logWarning } from "./logger";

export const hexToNpub = (hex: string | undefined): string =>  {

  try {
    return hex ? nip19.npubEncode(hex) : '';
  } catch (e) {
    console.warn(`Invalid pubkey hex ${hex}: `, e);
    return '';
  }

}
export const hexToNsec = (hex: string | undefined): string =>  {
  return hex ? nip19.nsecEncode(hex) : '';
}

export const npubToHex = (npub: string | undefined): string =>  {
  try {
    const decoded = nip19.decode(npub);

    if (!decoded) {
      return '';
    }

    const hex = typeof decoded.data === 'string' ?
      decoded.data :
      (decoded.data as nip19.ProfilePointer).pubkey;

    return hex;

  } catch (e) {
    console.error('nip19 decode error');
    return '';
  }
}

export const decodeIdentifier = (id: string) => {
  try {
    return nip19.decode(id);
  }
  catch (e) {
    logWarning('Failed to decode identifier: ', e);
    return {
      type: 'error',
      data: id,
    }
  }
}
