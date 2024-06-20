import { Component, onMount, Resource } from 'solid-js';
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
import { appStoreLink, playstoreLink, apkLink, Kind } from '../constants';
import ExternalLink from '../components/ExternalLink/ExternalLink';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import { useSettingsContext } from '../contexts/SettingsContext';
import { RouteDataFuncArgs, useParams, useRouteData } from '@solidjs/router';
import NotFound from './NotFound';
import NoteThread from './NoteThread';
import { nip19 } from 'nostr-tools';
import Longform from './Longform';
import { VanityProfiles } from '../types/primal';
import { logError } from '../lib/logger';

const EventPage: Component = () => {

  const params = useParams();

  const routeData = useRouteData<(opts: RouteDataFuncArgs) => Resource<VanityProfiles>>();

  const render = () => {
    const { id, identifier } = params;

    if (!id && !identifier) return <NotFound />;

    if (id) {
      if (id.startsWith('naddr1')) {
        return <Longform naddr={id} />
      }

      if (id.startsWith('note1')) {
        return <NoteThread noteId={id} />
      }

      if (id.startsWith('nevent1')) {
        const noteId =  nip19.noteEncode(nip19.decode(id).data.id);

        return <NoteThread noteId={noteId} />
      }

      const noteId = nip19.noteEncode(id);

      return <NoteThread noteId={noteId} />
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
