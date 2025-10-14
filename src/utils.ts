import { format } from 'd3-format';
import { subsTo } from './sockets';
import { DirectMessage, NostrEventContent, PrimalArticle, PrimalNote, PrimalZap } from './types/primal';
import { DMContact, LeaderboardInfo, PaginationInfo } from './megaFeeds';
import { isAndroid } from '@kobalte/utils';
import { BlossomClient, SignedEvent, BlobDescriptor, fetchWithTimeout } from "blossom-client-sdk";
import { signEvent } from './lib/nostrAPI';
import { logWarning } from './lib/logger';

let debounceTimer: number = 0;

export const areUrlsSame = (a: string, b: string) => {
  if (a === b) return true;

  let trimA = a;
  let trimB = b;


  if (a.endsWith('/')) trimA = a.slice(0, -1);
  if (b.endsWith('/')) trimB = b.slice(0, -1);

  return trimA === trimB;
}


export const debounce = (callback: TimerHandler, time: number) => {
  if (debounceTimer) {
    window.clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(callback, time);
}

export const debounceFn = (callback: TimerHandler, time: number) => {
  let debounceTimer: number = 0;

  return () => {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
    }

    debounceTimer = window.setTimeout(callback, time);
  }
}

export const isVisibleInContainer = (element: Element, container: Element) => {
  const { bottom, height, top } = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return top <= containerRect.top ? containerRect.top - top <= height : bottom - containerRect.bottom <= height;
};

export const uuidv4 = () => {
  // @ts-ignore
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

export const titleCase = (text: string) => {
  return text[0].toUpperCase() + text.slice(1).toLowerCase();
}

export const parseBolt11 = (bolt11: string) => {
  if (!bolt11.startsWith('lnbc')) return;

  let digits: string[] = [];
  let unit: string = '';

  let i = 4;

  do {
    const char = bolt11[i];
    const n = parseInt(char);
    if (n !== 0 && !n) {
      break;
    }
    digits.push(char);
    i++;
  } while(i < bolt11.length);

  unit = bolt11[i];
  const number = parseInt(digits.join(''));
  let amount = number * 100_000_000;

  switch(unit) {
    case 'm':
      amount = amount / 1_000;
      break;
    case 'u':
      amount = amount / 1_000_000;
      break;
    case 'n':
      amount = amount / 1_000_000_000;
      break;
    case 'p':
      amount = amount / 1_000_000_000_000;
      break;
    default:
      amount = amount;
      break;
  }

  return amount;
}

export const arrayMerge: <T, >(a: T[], b: T[], predicate?: (x: T, y: T) => boolean) => T[]  = (a, b, predicate = (a, b) => a === b) => {
  const c = [...a]; // copy to avoid side effects
  // add all items from B to copy C if they're not already present
  b.forEach((bItem) => (c.some((cItem) => predicate(bItem, cItem)) ? null : c.push(bItem)))
  return c;
}

export const getScreenCordinates = (obj: any) =>  {
  let p: { x?: number, y?: number } = {};

  p.x = obj.offsetLeft;
  p.y = obj.offsetTop;

  while (obj.offsetParent) {
    p.x = p.x + obj.offsetParent.offsetLeft;
    p.y = p.y + obj.offsetParent.offsetTop;
    if (obj == document.getElementsByTagName("body")[0]) {
      break;
    }
    else {
      obj = obj.offsetParent;
    }
  }
  return p;
}

export const timeNow = () => Math.floor((new Date()).getTime() / 1000);

export const sha256 = async (file: File) => {
  const obj = await file.arrayBuffer();
  return crypto.subtle.digest('SHA-256', obj).then((hashBuffer) => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((bytes) => bytes.toString(16).padStart(2, '0'))
      .join('');
    return hashHex;
  });
}

export const convertHtmlEntityToAngleBrackets = (fieldText: string) => {
  const htmlEntities = /&(lt|gt);/
  const isHtmlEntityUsed = htmlEntities.test(fieldText)
  if (isHtmlEntityUsed) {
    return fieldText.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  } else {
    return fieldText
  }
}

export const getRandomIntegers = (start: number, end: number, qty: number) => {

  let ret = new Set<number>();
  let limit = qty;

  if (qty > end) {
    limit = end
  }

  while (ret.size < limit) {
    const rand = start + Math.floor(Math.random() * end);
    ret.add(rand);
  }

  return [...ret];
}

export const isDev = () => localStorage.getItem('devMode') === 'true';

export const formatAmount = (amount: string, precision = 3) => {

  const value = parseFloat(amount);
  const min = Math.pow(10, precision > 2 ? -1*(precision - 2) : -1*precision);
  const max = Math.pow(10, precision);

  if (value === 0) {
    return `0`;
  }

  if (value > min && value < max) {
    return Intl.NumberFormat('en').format(parseFloat(amount))
  }

  const p = format(`.${precision}s`);

  return p(value);

};

export const formatStorage = (bytes: number) => {

  if (bytes < 1) {
    return '0'
  }

  let pow = 1;

  const units = ['', 'bytes', 'KB', 'MB', 'GB', 'TB']

  for(let i=1; i < 6; i++) {
    if (bytes < Math.pow(1024, i)) {
      pow = i;
      break;
    }
  }

  const amount = Math.round(bytes / Math.pow(1024, pow-1));

  const formatedAmount = new Intl.NumberFormat('en-US').format(amount)

  return `${formatedAmount} ${units[pow]}`;
};

export const mergeArrays = (a: any[], b: any[], predicate = (a: any, b: any) => a === b) => {
  const c = [...a]; // copy to avoid side effects
  // add all items from B to copy C if they're not already present
  b.forEach((bItem) => (c.some((cItem) => predicate(bItem, cItem)) ? null : c.push(bItem)))
  return c;
}

export const calculatePagingOffset = (collection: any[], elements: any[]) => {
  return collection.slice((elements.length - 1) * (-1)).reduce<number>((acc, p) => {
    return elements.includes(p.id) ? acc + 1 : acc;
  }, 0)
}

export const handleSubscription = (
  subId: string,
  fetcher: () => void,
  onEventHandler?: (content: NostrEventContent) => void,
  onEoseHandler?: () => void,
) => {
  const unsub = subsTo(subId, {
    onEvent: (_, content) => {
      onEventHandler && onEventHandler(content);
    },
    onEose: () => {
      onEoseHandler && onEoseHandler();
      unsub();
    },
  });

  fetcher();
}

export const handleSubscriptionAsync =  (
  subId: string,
  fetcher: () => void,
  onEventHandler?: (content: NostrEventContent) => void,
  onEoseHandler?: () => void,
) => {
  return new Promise((resolve) => {
    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        onEventHandler && onEventHandler(content);
      },
      onEose: () => {
        onEoseHandler && onEoseHandler();
        unsub();
        resolve(true);
      },
    });

    fetcher();
  })
}


export const humanizeTime = (seconds: number) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(Math.ceil(seconds % 60)).padStart(2, '0');

  return `${mins}:${secs}`;
}

export const calculateNotesOffset = (notes: PrimalNote[], paging: PaginationInfo) => {
  let offset = 0;

  for (let i=notes.length-1;i>=0;i--) {
    const note = notes[i];

    if (
      paging.sortBy === 'created_at' &&
      note.msg.created_at !== paging.since
    ) break;

    if (
      paging.sortBy === 'satszapped' &&
      note.post.satszapped !== paging.since
    ) break;

    if (
      paging.sortBy === 'score' &&
      note.post.score !== paging.since
    ) break;

    offset++;
  }

  return offset;
}

export const calculateReadsOffset = (reads: PrimalArticle[], paging: PaginationInfo) => {
  let offset = 0;

  for (let i=reads.length-1;i>=0;i--) {
    const read = reads[i];

    if (
      paging.sortBy === 'created_at' &&
      read.msg.created_at !== paging.since
    ) break;

    if (
      paging.sortBy === 'satszapped' &&
      read.satszapped !== paging.since
    ) break;

    if (
      paging.sortBy === 'score' &&
      read.score !== paging.since
    ) break;

    offset++;
  }

  return offset;
}



export const calculateZapsOffset = (zaps: PrimalZap[], paging: PaginationInfo) => {
  let offset = 0;

  for (let i=zaps.length-1;i>=0;i--) {
    const zap = zaps[i];

    if (
      paging.sortBy === 'created_at' &&
      zap.created_at !== paging.since
    ) break;

    if (
      paging.sortBy === 'satszapped' &&
      zap.amount !== paging.since
    ) break;

    if (
      paging.sortBy === 'amount_sats' &&
      zap.amount !== paging.since
    ) break;

    offset++;
  }

  return offset;
}

export const calculateDMConversationOffset = (messages: DirectMessage[], paging: PaginationInfo) => {
  let offset = 0;

  for (let i=messages.length-1;i>=0;i--) {
    const message = messages[i];

    if (
      paging.sortBy === 'created_at' &&
      message.created_at !== paging.since
    ) break;

    offset++;
  }

  return offset;
}

export const calculateDMContactsOffset = (contacts: DMContact[], paging: PaginationInfo) => {
  let offset = 0;

  for (let i=contacts.length-1;i>=0;i--) {
    const contact = contacts[i];

    if (
      paging.sortBy === 'latest_at' &&
      contact.dmInfo.latest_at !== paging.since
    ) break;

    offset++;
  }

  return offset;
}

export const calculateLeaderboardOffset = (leaders: LeaderboardInfo[], paging: PaginationInfo) => {
  let offset = 0;

  for (let i=leaders.length-1;i>=0;i--) {
    const leader = leaders[i];

    if (
      paging.sortBy === 'donated_btc' &&
      leader.donated_btc !== paging.since
    ) break;

    if (
      paging.sortBy === 'last_donation' &&
      leader.last_donation !== paging.since
    ) break;

    if (
      paging.sortBy === 'premium_since' &&
      leader.premium_since !== paging.since
    ) break;

    offset++;
  }

  return offset;
}

export const msgHasInvoice = (content: string) => {
  const r =/(\s+|\r\n|\r|\n|^)lnbc[a-zA-Z0-9]+/;
  const test = r.test(content);

  return test
};

export const msgHasCashu = (content: string) => {
  const r =/(\s+|\r\n|\r|\n|^)cashuA[a-zA-Z0-9]+/;
  const test = r.test(content);

  return test
};


export const now = () => Math.floor((new Date()).getTime() / 1000);

export const isIOS = () => {
  return /(iPad|iPhone|iPod)/.test(navigator.userAgent);
};

export const isPhone = () => {
  return isIOS() || isAndroid() || window.innerWidth <= 720;
}

export const selectRelayTags = (tags: string[][], limit = 2, onlyWritable = true) =>
  tags.reduce((acc, t) =>
    t[0] === 'r' &&
    (onlyWritable ? t[3] !== 'read' : true) &&
    (t[1].startsWith('wss://') ||
    t[1].startsWith('ws://')) ? [...acc, t[1]] : acc, []
  ).slice(0, limit);



// We use optimized technique to convert hex string to byte array
const asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 } as const;
function asciiToBase16(ch: number): number | undefined {
  if (ch >= asciis._0 && ch <= asciis._9) return ch - asciis._0; // '2' => 50-48
  if (ch >= asciis.A && ch <= asciis.F) return ch - (asciis.A - 10); // 'B' => 66-(65-10)
  if (ch >= asciis.a && ch <= asciis.f) return ch - (asciis.a - 10); // 'b' => 98-(97-10)
  return;
}

export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== 'string') throw new Error('hex string expected, got ' + typeof hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2) throw new Error('hex string expected, got unpadded hex of length ' + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === undefined || n2 === undefined) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2; // multiply first octet, e.g. 'a3' => 10*16+3 => 160 + 3 => 163
  }
  return array;
}

export const previousWord = (input: HTMLInputElement) => {
  const carret = input.selectionStart || 0;
  if (carret === 0) return '';

  const words = input.value.slice(0, carret).split(' ');

  return words.length > 0 ? words[words.length - 1] : '';
}

export const encodeAuthorizationHeader = (uploadAuth: SignedEvent) => {
  return "Nostr " + btoa(unescape(encodeURIComponent(JSON.stringify(uploadAuth))));
}

export const checkBlossomServer = async (url: string) => {
  // const encodedAuthHeader = encodeAuthorizationHeader(auth);
  // const uploadUrl = url.endsWith('/') ? `${url}upload` : `${url}`;

  const blossomCheck = await fetchWithTimeout(url, {
    method: "GET",
    timeout: 3_000,
  });

  return blossomCheck.status === 200;
}

export const runColorMode = (
  callback: (isDarkMode: boolean) => void,
  fallback: () => void,
) => {
  if (!window.matchMedia) {
    fallback();
    return;
  }

  const query = window.matchMedia('(prefers-color-scheme: dark)');

  callback(query.matches);

  query.addEventListener('change', (event) => callback(event.matches));
}

export const getLang = () => {
  if (navigator.languages !== undefined)
    return navigator.languages[0];
  return navigator.language;
}

export const urlEncode = (text: string) => {
    return text.replace(/[^a-zA-Z0-9-]/g,
        char => '%' + char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')
    );
};

export const replaceAsync = async(str: string, regex: RegExp, asyncReplacer: (m: string) => Promise<string>) => {
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    // Push the non-matching part
    parts.push(str.slice(lastIndex, match.index));

    // Push the promise returned by the async replacer
    parts.push(asyncReplacer(match[0]));

    lastIndex = regex.lastIndex;

    // Handle zero-length matches for global regex
    if (match[0].length === 0) {
      regex.lastIndex++;
    }
  }

  // Push the remaining part of the string
  parts.push(str.slice(lastIndex));

  // Wait for all promises to resolve and then join the parts
  return (await Promise.all(parts)).join('');
}

export const findFirstDifference = (arr1: string[], arr2: string[]) => {
  const maxLength = Math.max(arr1.length, arr2.length);

  for (let i = 0; i < maxLength; i++) {
    if (arr1[i] !== arr2[i]) {
      return i;
    }
  }

  return -1;
}


export const determineOrient = (element: HTMLElement) => {
  const coor = getScreenCordinates(element);
  const height = 100;
  return (coor.y || 0) + height < window.innerHeight + window.scrollY ? 'down' : 'up';
}
