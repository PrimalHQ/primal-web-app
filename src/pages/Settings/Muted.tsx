import { Component, createEffect, createSignal, For, on, Show } from 'solid-js';
import styles from './Settings.module.scss';

import { useIntl } from '@cookbook/solid-intl';
import { settings as t, actions as tActions } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import { A } from '@solidjs/router';
import { useAccountContext } from '../../contexts/AccountContext';
import { getUserProfiles } from '../../lib/profile';
import { APP_ID } from '../../App';
import { subsTo } from '../../sockets';
import { convertToUser, nip05Verification, userName } from '../../stores/profile';
import { Kind } from '../../constants';
import { createStore } from 'solid-js/store';
import { PrimalUser } from '../../types/primal';
import Avatar from '../../components/Avatar/Avatar';
import { hexToNpub } from '../../lib/keys';
import PageTitle from '../../components/PageTitle/PageTitle';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import { useAppContext } from '../../contexts/AppContext';

const Muted: Component = () => {

  const intl = useIntl();
  const account = useAccountContext();
  const app = useAppContext();

  const [mutedUsers, setMutedUsers] = createStore<Record<string,PrimalUser>>({});

  const mutedMetadataSubId = `muted_metadata_${APP_ID}`;

  const [isFetching, setIsFetching] = createSignal(true);

  const user = (pubkey: string) => mutedUsers[pubkey] || { pubkey, npub: hexToNpub(pubkey) };

  createEffect(on(() => account?.muted, (muted, prev) => {
    if (!muted || muted.length === 0) return;

    let diff: boolean = prev === undefined;

    if (!diff) {
      diff = muted.length !== (prev!.length || 0);
    }

    if (!diff) {
      diff = muted.some((pk) => !prev!.includes(pk));
    }

    if (!diff) return;

    let pubkeys: string[] = [];
    let users: Record<string, PrimalUser> = {};

    const unsub = subsTo(mutedMetadataSubId, {
      onEvent: (_, content) => {
        if (content && [Kind.MuteList].includes(content?.kind || 0)) {
          // @ts-ignore
          pubkeys = content.tags.reduce((acc, t) => t[0] === 'p' ? [...acc, t[1]] : acc, []);
        }
        if (content?.kind === Kind.Metadata) {
          users[content.pubkey] = convertToUser(content, content.pubkey);
        }
      },
      onEose: () => {
        console.log('USERS: ', users)
        setMutedUsers(() => ({ ...users }));
        setIsFetching(false);
        unsub();
      },
    });

    getUserProfiles(muted, mutedMetadataSubId);
  }));

  const unMuteUser = (user: PrimalUser) => {
    account?.actions.removeFromMuteList(user.pubkey);
  };

  return (
    <div>
      <PageTitle title={`${intl.formatMessage(t.muted.title)} ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings' >{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>{intl.formatMessage(t.muted.title)}</div>
      </PageCaption>

      <div class={styles.settingsContentFull}>
        <For
          each={account?.muted}
          fallback={
            <Show when={!isFetching()}>
              <div class={styles.emptyListBanner}>
                {intl.formatMessage(t.muted.empty)}
              </div>
            </Show>
          }
        >
          {pubkey => (
            <div class={styles.mutedUser}>
              <Show
                when={user(pubkey)}
                fallback={
                  <>
                    <A class={styles.userInfo} href={app?.actions.profileLink(pubkey) || ''}>
                      <div class={styles.userName}>
                        <div class={styles.verification}>{hexToNpub(pubkey)}</div>
                      </div>
                    </A>
                    <button onClick={() => unMuteUser(user(pubkey))}>
                      {intl.formatMessage(tActions.unmute)}
                    </button>
                  </>
                }
              >
                <A class={styles.userInfo} href={app?.actions.profileLink(pubkey) || ''}>
                  <Avatar user={user(pubkey)} size='vvs' />
                  <div class={styles.userName}>
                    <div class={styles.title}>{userName(user(pubkey))}</div>
                    <div class={styles.verification}>{nip05Verification(user(pubkey))}</div>
                  </div>
                </A>
                <ButtonSecondary onClick={() => unMuteUser(user(pubkey))}>
                  {intl.formatMessage(tActions.unmute)}
                </ButtonSecondary>
              </Show>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

export default Muted;
