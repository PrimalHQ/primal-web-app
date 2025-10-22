import { batch, Component, createEffect, createSignal, Match, Switch } from 'solid-js';
import { Kind } from '../constants';
import { useNavigate, useParams } from '@solidjs/router';
import NotFound from './NotFound';
import NoteThread from './NoteThread';
import { nip19 } from '../lib/nTools';
import Longform from './Longform';
import { logError, logWarning } from '../lib/logger';
import { APP_ID } from '../App';
import { subsTo } from '../sockets';
import { getEvents } from '../lib/feed';
import { fetchKnownProfiles } from '../lib/profile';
import { useAppContext } from '../contexts/AppContext';
import { getStreamingEvent } from '../lib/streaming';
import { accountStore } from '../stores/accountStore';

const EventPage: Component = () => {

  const params = useParams();
  const app = useAppContext();
  const navigate = useNavigate();

  const [evId, setEvId] = createSignal<string>('');

  const resolveFromId = (id: string) => {
    const subId = `event_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content.kind === Kind.LongForm) {
          const idr = (content.tags.find((t: string[]) => t[0] === 'd') || [])[1];

          if (idr){
            try {
              const naddr = nip19.naddrEncode({ kind: Kind.LongForm, pubkey: content.pubkey, identifier: idr });

              setEvId(() => naddr);
            } catch (e) {
              logWarning('Failed to encode naddr with: ', Kind.LongForm, content.pubkey, idr);
              setEvId('NONE');
            }
          } else {
            setEvId('NONE');
          }

          setComponent(() => 'read');
          return;
        }

        if (content.kind === Kind.Text) {
          const eventPointer: nip19.EventPointer ={
            id: content.id,
            author: content.pubkey,
            kind: content.kind,
            relays: content.tags.reduce((acc, t) => t[0] === 'r' && (t[1].startsWith('wss://' ) || t[1].startsWith('ws://')) ? [ ...acc, t[1]] : acc, []).slice(0,3),
          }
          try {
            setEvId(() => nip19.neventEncode(eventPointer));
          } catch (e) {
            logWarning('Failed to decode note id: ', content.id)
            setEvId(() => 'NONE');
          }

          setComponent(() => 'note');
          return;
        }
      },
      onEose: () => {
        if (evId().length === 0) {
          setEvId(() => '');
          setComponent(() => 'not_found');
        }
        unsub();
      }
    });

    getEvents(accountStore.publicKey, [id], subId, false);
  }


  const resolveFromNaddr = async (id: string) => {
    try {
      const decoded = nip19.decode(id);

      const data = decoded.data as nip19.AddressPointer;

      const pubkey = data.pubkey;
      const identifier = data.identifier;
      const kind = data.kind;

      if (kind === Kind.LongForm) {
        // await fetchUserProfile(account?.publicKey, pubkey, `thred_profile_info_${APP_ID}`);

        const vanityName = app?.verifiedUsers[pubkey];

        if (vanityName) {
          navigate(`/${vanityName}/${identifier}`);
          return;
        }

        batch(() => {
          setComponent(() => 'read');
          setEvId(() => id);
        });
        return;
      }

      if (kind === Kind.LiveEvent) {
        const stream = await getStreamingEvent(identifier, pubkey);

        const host = stream.hosts?.[0] || stream.pubkey;

        if (!host) throw new Error('no-pubkey');

        const vanityName = app?.verifiedUsers[host];

        if (vanityName) {
          navigate(`/${vanityName}/live/${identifier}`);
          return;
        }

        batch(() => {
          setComponent(() => 'live');
          setEvId(() => id);
        });
        return;
      }
    }
    catch (e) {
      logError(`Failed to load stream: ${e}`);
      navigate('/404');
    }
  }

  const [component, setComponent] = createSignal<'note' | 'read' | 'live' | 'none' | 'not_found'>('none');

  createEffect(() => {
    render(params.id, params.identifier);
  })


  const render = async (id: string | undefined, identifier: string | undefined) => {
    // const { id, identifier } = params;

    if (!id && !identifier) {
      setComponent(() => 'not_found');
      return;
    }

    if (identifier) {
      const name = params.vanityName.toLowerCase();

      if (!name) {
        setComponent(() => 'not_found');
        return;
      }

      const vanityProfile = await fetchKnownProfiles(name);

      const pubkey = vanityProfile.names[name];
      const kind = Kind.LongForm;

      try {
        const naddr = nip19.naddrEncode({ pubkey, kind, identifier: decodeURIComponent(identifier) });

        setEvId(() => naddr);
        setComponent(() => 'read');
        return;
      } catch (e) {
        logError('Error encoding naddr: ', e);
        setComponent(() => 'not_found');
        return;
      }

    }

    if (id) {
      if (id.startsWith('naddr')) {

        resolveFromNaddr(id);
        // const decoded = nip19.decode(id);

        // const data = decoded.data as nip19.AddressPointer;

        // const pubkey = data.pubkey;
        // const identifier = data.identifier;

        // await fetchUserProfile(account?.publicKey, pubkey, `thred_profile_info_${APP_ID}`);

        // const vanityName = app?.verifiedUsers[pubkey];

        // if (vanityName) {
        //   navigate(`/${vanityName}/${identifier}`);
        //   return;
        // }

        // batch(() => {
        //   setComponent(() => 'read');
        //   setEvId(() => id);
        // });
        // return;
      }

      if (id.startsWith('note')) {
        batch(() => {
          setComponent(() => 'note');
          setEvId(() => id);
        });
        return;
      }

      if (id.startsWith('nevent')) {
        try {
          const decoded = nip19.decode(id);

          // @ts-ignore
          resolveFromId(decoded.data.id);
          return;
        } catch (e) {
          logWarning('Failed to decode nevent: ', id)
          setComponent(() => 'not_found');
          return;
        }
      }

      resolveFromId(id);
      return;
    }

  };

  return <>
    <Switch>
      <Match when={component() === 'not_found'}>
        <NotFound />
      </Match>
      <Match when={component() === 'read'}>
        <Longform naddr={evId()} />
      </Match>
      <Match when={component() === 'note'}>
        <NoteThread noteId={evId()} />
      </Match>
    </Switch>
  </>;
}

export default EventPage;
