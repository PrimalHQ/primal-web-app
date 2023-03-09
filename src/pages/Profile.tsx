import { useParams } from '@solidjs/router';
import { decode } from 'nostr-tools/nip19';
import { Component, createEffect, onCleanup, onMount, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import Branding from '../components/Branding/Branding';
import { APP_ID, useFeedContext } from '../contexts/FeedContext';
import { hexToNpub } from '../lib/keys';
import { getUserProfile } from '../lib/profile';
import { isConnected, socket } from '../sockets';
import { updateAvailableFeeds } from '../stores/home';
import { ProfileStoreData } from '../stores/profile';
import { NostrEvent, NostrEOSE, NostrEventContent } from '../types/primal';
import styles from './Profile.module.scss';

const pageId = `user_profile_page_${APP_ID}`;

const initialStore: ProfileStoreData = {
  publicKey: undefined,
  activeUser: undefined,
}


const Profile: Component = () => {

  const context = useFeedContext();

  const params = useParams();

  const [profile, setProfile] = createStore<ProfileStoreData>({ ...initialStore });

  const proccessUserProfile = (content: NostrEventContent) => {
    const user = JSON.parse(content.content);

    setProfile('activeUser', () => ({ ...user }));
  }

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === pageId) {
      content && proccessUserProfile(content);
    }

  };

  createEffect(() => {
    if (isConnected()) {
      socket()?.removeEventListener('message', onMessage);
      socket()?.addEventListener('message', onMessage);
      if (!params.npub) {
        return;
      }

      const hex = params.npub.startsWith('npub') ? decode(params.npub) : { data: params.npub};

      setProfile('publicKey', hex.data);

      getUserProfile(`${hex.data}`, pageId);
    }
  });

  onCleanup(() => {
    socket()?.removeEventListener('message', onMessage);
  });

  const addToHome = () => {
    const feed = {
      name: `${profile.activeUser?.name}'s feed`,
      hex: profile.publicKey,
      npub: hexToNpub(profile.publicKey),
    };
    console.log('')
    context?.actions?.setData('availableFeeds', (feeds) => updateAvailableFeeds(context?.data.publicKey, feed, feeds))
  };

  const hasFeedAtHome = () => {

    return !!context?.data.availableFeeds.find(f => f.hex === profile.publicKey);
  };

    return (
      <>
        <Portal
          mount={document.getElementById("branding_holder") as Node}
        >
          <Branding small={false} />
        </Portal>
        <div id="central_header" class={styles.fullHeader}>
          <div>
            Profile of {profile.activeUser?.name}
          </div>
        </div>
        <div class={styles.comingSoon}>
          Coming soon.
        </div>
        <div>
          <Show
            when={!hasFeedAtHome()}
            fallback={<div class={styles.noAdd}>
              This user's feed is available on your home page
            </div>}
          >
            <button
              class={styles.addButton}
              onClick={addToHome}
            >
              <span>+</span>
              add {profile.activeUser?.name}'s feed to home page
            </button>
          </Show>
        </div>
      </>
    )
}

export default Profile;
