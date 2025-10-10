import type { CashuMint as CashuMintInstance, Token as CashuToken, TokenEntry as CashuTokenEntry } from "@cashu/cashu-ts";

import { logError } from "./logger";

type CashuModule = typeof import("@cashu/cashu-ts");

let cashuModulePromise: Promise<CashuModule> | undefined;

const loadCashuModule = () => {
  if (!cashuModulePromise) {
    cashuModulePromise = import("@cashu/cashu-ts");
  }

  return cashuModulePromise;
};

export const createCashuMint = async (url: string): Promise<CashuMintInstance | undefined> => {
  try {
    const { CashuMint } = await loadCashuModule();
    return new CashuMint(url);
  } catch (error) {
    logError("Failed to load Cashu mint", error);
    return undefined;
  }
};

export const decodeCashuToken = async (token: string): Promise<CashuToken> => {
  try {
    const { getDecodedToken } = await loadCashuModule();
    return getDecodedToken(token);
  } catch (error) {
    logError("Failed to decode Cashu token", error);
    throw error;
  }
};

export type { CashuMintInstance as CashuMint, CashuToken, CashuTokenEntry };

export const resetCashuModule = () => {
  cashuModulePromise = undefined;
};

