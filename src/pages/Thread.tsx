import { Component, createEffect, createSignal, Match, onMount, Resource, Switch } from 'solid-js';
import Branding from '../components/Branding/Branding';
import Wormhole from '../components/Wormhole/Wormhole';
import Search from '../components/Search/Search';

import appstoreImg from '../assets/images/appstore_download.svg';
import playstoreImg from '../assets/images/playstore_download.svg';

import gitHubLight from '../assets/icons/github_light.svg';
import gitHubDark from '../assets/icons/github.svg';

import primalDownloads from '../assets/images/primal_downloads.png';

import styles from './Downloads.module.scss';
import { downloads as t } from '../translations';
import { useIntl } from '@cookbook/solid-intl';
import StickySidebar from '../components/StickySidebar/StickySidebar';
import { appStoreLink, playstoreLink, apkLink, Kind, contentScope } from '../constants';
import ExternalLink from '../components/ExternalLink/ExternalLink';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import { useSettingsContext } from '../contexts/SettingsContext';
import { RouteDataFuncArgs, useParams, useRouteData } from '@solidjs/router';
import NotFound from './NotFound';
import NoteThread from './NoteThread';
import { nip19 } from '../lib/nTools';
import Longform from './Longform';
import { VanityProfiles } from '../types/primal';
import { logError, logWarning } from '../lib/logger';
import { APP_ID } from '../App';
import { subsTo } from '../sockets';
import { getEvents } from '../lib/feed';
import { useAccountContext } from '../contexts/AccountContext';
import { hexToNpub } from '../lib/keys';

const EventPage: Component = () => {

  const account = useAccountContext();
  const params = useParams();

  const routeData = useRouteData<(opts: RouteDataFuncArgs) => Resource<VanityProfiles>>();

  const [evId, setEvId] = createSignal<string>();

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
          return;
        }

        if (content.kind === Kind.Text) {
          try {
            setEvId(() => nip19.noteEncode(content.id));
          } catch (e) {
            logWarning('Failed to decode note id: ', content.id)
            setEvId(() => 'NONE');
          }
          return;
        }
      },
      onEose: () => {
        if (!evId()) setEvId(() => 'NONE');
        unsub();
      }
    });

    getEvents(account?.publicKey, [id], subId, false);

    return (
      <Switch>
        <Match when={evId() === 'NONE'}>
          <NotFound />
        </Match>
        <Match when={evId()?.startsWith('naddr')}>
          <Longform naddr={evId() || ''} />
        </Match>
        <Match when={evId()?.startsWith('note')}>
          <NoteThread noteId={evId() || ''} />
        </Match>
      </Switch>
    )
  }

  const render = () => {
    console.log('NIP19: ', nip19)
    const { id, identifier } = params;

    if (!id && !identifier) return <NotFound />;

    if (id) {
      if (id.startsWith('naddr')) {
        return <Longform naddr={id} />
      }

      if (id.startsWith('note')) {
        return <NoteThread noteId={id} />
      }

      if (id.startsWith('nevent')) {
        try {
          const decoded = nip19.decode(id);

          return resolveFromId(decoded.data.id);
        } catch (e) {
          logWarning('Failed to decode nevent: ', id)
          return <NotFound />;
        }
      }

      return resolveFromId(id);
    }

    if (identifier) {
      const name = params.vanityName.toLowerCase();

      if (!name) return <NotFound />;

      const pubkey = routeData()?.names[name];
      const kind = Kind.LongForm;

      try {
        const naddr = nip19.naddrEncode({ pubkey, kind, identifier });
        return <Longform naddr={naddr} />
      } catch (e) {
        logError('Error encoding naddr: ', e);
        return <NotFound />;
      }

    }

  };

  return <>{render()}</>;
}

export default EventPage;
