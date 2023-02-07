import { createContext, createEffect, createSignal, JSX, onCleanup, onMount, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import type { 
  NostrMultiAdd,
  NostrPost, 
  NostrUser,
  PrimalFeed, 
  Store, 
} from '../types/primal';
import { isConnected, socket } from "../sockets";

type PrimalContextStore = {

  data?: Store, 
  actions?: { 
    selectFeed: (profile: PrimalFeed | undefined) => void,
    clearData: () => void,
  },
};

const convertDataToPosts = (data: Store) => {
  return  data?.messages.map((msg) => {
    const user = data?.users[msg.event.pubkey];

    const userMeta = JSON.parse(user?.meta_data.content || '');

    return {
      user: {
        id: user?.meta_data.id || '',
        pubkey: user?.pubkey || '',
        name: userMeta.name,
        about: userMeta.about,
        picture: userMeta.picture,
        nip05: userMeta.nip05,
        banner: userMeta.banner,
        displayName: userMeta.display_name,
        location: userMeta.location,
        lud06: userMeta.lud06,
        lud16: userMeta.lud16,
        website: userMeta.website,
        tags: user?.meta_data.tags || [],
      },
      post: {
        id: msg.event.id,
        pubkey: msg.event.pubkey,
        created_at: msg.event.created_at,
        tags: msg.event.tags,
        content: msg.event.content,
        sig: msg.event.sig,
        likes: msg.stats.likes,
        mentions: msg.stats.mentions,
        replies: msg.stats.replies,
      },
    };
  });
}

const initialStore: Store = { 
  posts: [], 
  users: {}, 
  messages: [], 
  selectedFeed: { 
    name: 'snowden',
    hex: '84dee6e676e5bb67b4ad4e042cf70cbd8681155db535942fcc6a0533858a7240',
    npub: 'npub1sn0wdenkukak0d9dfczzeacvhkrgz92ak56egt7vdgzn8pv2wfqqhrjdv9',
  },
  availableFeeds: [
    { 
      name: 'snowden',
      hex: '84dee6e676e5bb67b4ad4e042cf70cbd8681155db535942fcc6a0533858a7240',
      npub: 'npub1sn0wdenkukak0d9dfczzeacvhkrgz92ak56egt7vdgzn8pv2wfqqhrjdv9',
    },{ 
      name: 'jack',
      hex: '82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2',
      npub: 'npub1sg6plzptd64u62a878hep2kev88swjh3tw00gjsfl8f237lmu63q0uf63m',
    },{ 
      name: 'miljan',
      hex: 'd61f3bc5b3eb4400efdae6169a5c17cabf3246b514361de939ce4a1a0da6ef4a',
      npub: 'npub16c0nh3dnadzqpm76uctf5hqhe2lny344zsmpm6feee9p5rdxaa9q586nvr',
    },
  ],
};


export const FeedContext = createContext<PrimalContextStore>();

export function FeedProvider(props: { children: number | boolean | Node | JSX.ArrayElement | JSX.FunctionElement | (string & {}) | null | undefined; }) {
  
  const [data, setData] = createStore<Store>(initialStore);

  const onError = (error: Event) => {
    console.log("error: ", error);
  };

  const onMessage = (message: MessageEvent) => {
    const fetchedData: NostrMultiAdd | NostrPost | NostrUser = JSON.parse(message.data);

    console.log('FETCHED: ', fetchedData);

    if (fetchedData.op === 'eos') {
      setData('posts', convertDataToPosts(data));
    }

    if (fetchedData.op === 'multi_add') {
      const msg = fetchedData as NostrMultiAdd;

      msg.event.forEach((event) => {
        setData('messages', (msgs) => [ ...msgs, event ]);
      });

      msg.meta_data.forEach((user) => {
        setData('users', (users) => ({ ...users, [user.pubkey]: user }));
      });
    }

    if (fetchedData.op === 'add') {
      if ('event' in fetchedData) {
        const msg = fetchedData as NostrPost;
        setData('messages', (msgs) => [ ...msgs, msg ]);
      }
      
      if ('meta_data' in fetchedData) {
        const msg = fetchedData as NostrUser;
        setData('users', (users) => ({ ...users, [msg.pubkey]: msg }));
      }
    }
  };

  createEffect(() => {
    socket()?.addEventListener('error', onError);
    
    socket()?.addEventListener('message', onMessage);
  });

	createEffect(() => {
    if (isConnected()) {
      const randomNumber = Math.floor(Math.random()*10000000000);
      const subid = String(randomNumber);
      
      const pubkey = data?.selectedFeed?.hex;

			socket()?.send(JSON.stringify([
        "REQ", 
        subid, 
        {cache: ["user_feed", {"pubkey": pubkey}]},
      ]));
		}
	});

  onCleanup(() => {
    socket()?.removeEventListener('error', onError);
    socket()?.removeEventListener('message', onMessage);
  });

  const store = {
    data: data,
    actions: {
      selectFeed(profile: PrimalFeed | undefined) {
        if (profile as PrimalFeed) {
          setData('selectedFeed', profile);
        }
      },

      clearData() {
        setData({ posts: [], messages: [], users: {}});
      },
    }
  };

  return (
    <FeedContext.Provider value={store}>
      {props.children}
    </FeedContext.Provider>
  );
}

export function useFeedContext() { return useContext(FeedContext); }
