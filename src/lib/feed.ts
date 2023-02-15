import { socket } from "../sockets";
import { FeedPage, PrimalPost } from "../types/primal";

export const getFeed = (pubkey: string, subid: string, until = 0, limit = 20) => {

  const start = until === 0 ? 'since' : 'until';

  socket()?.send(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_feed", { pubkey, limit, [start]: until }]},
  ]));
}

export const convertToPosts = (page: FeedPage) => {
  return  page?.messages.map((msg) => {
    const user = page?.users[msg.pubkey];
    const stat = page?.postStats[msg.id];

    const userMeta = JSON.parse(user?.content || '{}');

    return {
      user: {
        id: user?.id || '',
        pubkey: user?.pubkey || msg.pubkey,
        name: userMeta.name || 'N/A',
        about: userMeta.about,
        picture: userMeta.picture,
        nip05: userMeta.nip05,
        banner: userMeta.banner,
        displayName: userMeta.display_name,
        location: userMeta.location,
        lud06: userMeta.lud06,
        lud16: userMeta.lud16,
        website: userMeta.website,
        tags: user?.tags || [],
      },
      post: {
        id: msg.id,
        pubkey: msg.pubkey,
        created_at: msg.created_at,
        tags: msg.tags,
        content: msg.content,
        sig: msg.sig,
        likes: stat.likes,
        mentions: stat.mentions,
        replies: stat.replies,
      },
    };
  }).sort((a: PrimalPost, b: PrimalPost) => b.post.created_at - a.post.created_at);
}
