import { NostrEvent } from '../types/primal';

export type EmojiReaction = {
  emoji: string;           // Unicode emoji or :shortcode:
  count: number;
  users: string[];         // pubkeys who reacted
  isCustom: boolean;
  imageUrl?: string;       // For custom emojis (NIP-30)
  userReacted: boolean;    // Current user has used this reaction
};

export type ReactionSummary = {
  reactions: Map<string, EmojiReaction>;
  totalCount: number;
  userReactions: string[]; // Emojis the current user has used
};

/**
 * Aggregate reaction events into a summary
 * Follows NIP-25 and NIP-30 specifications
 */
export function aggregateReactions(
  events: NostrEvent[],
  currentUserPubkey?: string
): ReactionSummary {
  const reactions = new Map<string, EmojiReaction>();
  let totalCount = 0;
  const userReactions: string[] = [];

  console.log('[aggregateReactions] Processing reactions:', {
    eventCount: events.length,
    currentUserPubkey,
  });

  for (const event of events) {
    // NIP-25: content is the reaction (emoji or '+' for like)
    const emoji = event.content || '+';
    const pubkey = event.pubkey;

    if (currentUserPubkey && pubkey === currentUserPubkey) {
      console.log('[aggregateReactions] Found user reaction:', {
        emoji,
        eventPubkey: pubkey,
        currentUserPubkey,
        match: pubkey === currentUserPubkey,
      });
    }

    // NIP-30: Check for custom emoji
    const emojiTag = event.tags.find(t => t[0] === 'emoji');
    const isCustom = !!emojiTag;
    const imageUrl = emojiTag?.[2];

    if (!reactions.has(emoji)) {
      reactions.set(emoji, {
        emoji,
        count: 0,
        users: [],
        isCustom,
        imageUrl,
        userReacted: false
      });
    }

    const reaction = reactions.get(emoji)!;

    // Only count unique users per emoji (prevent spam)
    if (!reaction.users.includes(pubkey)) {
      reaction.users.push(pubkey);
      reaction.count++;
      totalCount++;

      if (currentUserPubkey && pubkey === currentUserPubkey) {
        reaction.userReacted = true;
        userReactions.push(emoji);
      }
    }
  }

  return {
    reactions,
    totalCount,
    userReactions
  };
}

/**
 * Check if a reaction content is a custom emoji shortcode
 * NIP-30: Custom emojis are in format :shortcode:
 */
export function isCustomEmoji(content: string): boolean {
  return /^:[\w_]+:$/.test(content);
}

/**
 * Extract custom emoji data from a reaction event
 * NIP-30: Custom emoji metadata is in 'emoji' tag
 */
export function extractCustomEmojiData(event: NostrEvent): { shortcode: string; imageUrl: string } | null {
  if (!isCustomEmoji(event.content)) return null;

  const shortcode = event.content.slice(1, -1);  // Remove colons
  const emojiTag = event.tags.find(t => t[0] === 'emoji' && t[1] === shortcode);

  if (!emojiTag || !emojiTag[2]) return null;

  return {
    shortcode,
    imageUrl: emojiTag[2]
  };
}

/**
 * Common emoji reactions for quick access
 */
export const COMMON_REACTIONS = [
  '+',      // Like/Heart (NIP-25 standard)
  '🔥',     // Fire
  '👍',     // Thumbs up
  '🤙',     // Hang loose
  '🫂',     // Hugging
  '😂',     // Laughing
  '🤔',     // Thinking
  '💯',     // 100
];

/**
 * Convert old '+' content to heart emoji for display
 */
export function normalizeReactionEmoji(emoji: string): string {
  return emoji === '+' ? '❤️' : emoji;
}
