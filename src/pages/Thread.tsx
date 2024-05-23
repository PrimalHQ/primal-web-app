import { Component, onMount } from 'solid-js';
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
import { appStoreLink, playstoreLink, apkLink } from '../constants';
import ExternalLink from '../components/ExternalLink/ExternalLink';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import { useSettingsContext } from '../contexts/SettingsContext';
import { useParams } from '@solidjs/router';
import NotFound from './NotFound';
import NoteThread from './NoteThread';
import { nip19 } from 'nostr-tools';
import Longform from './Longform';

const EventPage: Component = () => {

  const params = useParams();

  const render = () => {
    const { id } = params;

    if (!id) return <NotFound />;

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
  };

  return <>{render()}</>;
}

export default EventPage;
