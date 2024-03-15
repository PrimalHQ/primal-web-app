import { useIntl } from '@cookbook/solid-intl';
import { Tabs } from '@kobalte/core';
import { A } from '@solidjs/router';
import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { style } from 'solid-js/web';
import { APP_ID } from '../../App';
import { defaultZapOptions, Kind } from '../../constants';
import { useAccountContext } from '../../contexts/AccountContext';
import { ReactionStats } from '../../contexts/AppContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { hookForDev } from '../../lib/devTools';
import { hexToNpub } from '../../lib/keys';
import { getEventReactions } from '../../lib/notes';
import { truncateNumber } from '../../lib/notifications';
import { zapNote, zapProfile } from '../../lib/zap';
import { subscribeTo } from '../../sockets';
import { userName } from '../../stores/profile';
import { toastZapFail, zapCustomOption, actions as tActions, placeholders as tPlaceholders, zapCustomAmount } from '../../translations';
import { PrimalNote, PrimalUser, ZapOption } from '../../types/primal';
import { parseBolt11 } from '../../utils';
import Avatar from '../Avatar/Avatar';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import Loader from '../Loader/Loader';
import Modal from '../Modal/Modal';
import TextInput from '../TextInput/TextInput';
import { useToastContext } from '../Toaster/Toaster';
import VerificationCheck from '../VerificationCheck/VerificationCheck';

import styles from './ReactionsModal.module.scss';

const ReactionsModal: Component<{
  id?: string,
  noteId: string | undefined,
  stats: ReactionStats;
  onClose?: () => void,
}> = (props) => {

  const intl = useIntl();

  const [selectedTab, setSelectedTab] = createSignal('likes');

  const [likeList, setLikeList] = createStore<any[]>([]);
  const [zapList, setZapList] = createStore<any[]>([]);
  const [repostList, setRepostList] = createStore<any[]>([]);

  const [isFetching, setIsFetching] = createSignal(false)

  createEffect(() => {
    switch (selectedTab()) {
      case 'likes':
        getLikes();
        break;
      case 'zaps':
        getZaps();
        break;
      case 'reposts':
        getReposts();
        break;
    }
  });

  createEffect(() => {
    if (!props.noteId) {
      setLikeList(() => []);
      setZapList(() => []);
      setRepostList(() => []);
      setSelectedTab(() => 'likes');
    }
  });

  const getLikes = () => {
    if (!props.noteId) return;

    const subId = `nr_l_${props.noteId}_${APP_ID}`;

    const users: any[] = [];

    const unsub = subscribeTo(subId, (type,_, content) => {
      if (type === 'EOSE') {
        setLikeList(() => [...users]);
        setIsFetching(() => false);
        unsub();
      }

      if (type === 'EVENT') {
        if (content?.kind === Kind.Metadata) {
          let user = JSON.parse(content.content);

          if (!user.displayName || typeof user.displayName === 'string' && user.displayName.trim().length === 0) {
            user.displayName = user.display_name;
          }
          user.pubkey = content.pubkey;
          user.npub = hexToNpub(content.pubkey);
          user.created_at = content.created_at;

          users.push(user);

          return;
        }
      }
    });

    setIsFetching(() => true);
    getEventReactions(props.noteId, Kind.Reaction, subId);
  };

  const getZaps = () => {
    if (!props.noteId) return;

    const subId = `nr_z_${props.noteId}_${APP_ID}`;

    const users: Record<string, any> = {};
    const zaps: any[] = [];

    const unsub = subscribeTo(subId, (type,_, content) => {
      if (type === 'EOSE') {
        const zapData = zaps.map((zap => ({
          ...zap,
          sender: users[zap.pubkey],
        })));

        setZapList(() => [ ...zapData ]);
        setIsFetching(() => false);
        unsub();
      }

      if (type === 'EVENT') {
        if (content?.kind === Kind.Metadata) {
          let user = JSON.parse(content.content);

          if (!user.displayName || typeof user.displayName === 'string' && user.displayName.trim().length === 0) {
            user.displayName = user.display_name;
          }
          user.pubkey = content.pubkey;
          user.npub = hexToNpub(content.pubkey);
          user.created_at = content.created_at;

          users[content.pubkey] = { ...user };

          return;
        }

        if (content?.kind === Kind.Zap) {
          const zapTag = content.tags.find(t => t[0] === 'description');

          if (!zapTag) return;

          const zapInfo = JSON.parse(zapTag[1] || '{}');

          let amount = '0';

          let bolt11Tag = content?.tags?.find(t => t[0] === 'bolt11');

          if (bolt11Tag) {
            try {
              amount = `${parseBolt11(bolt11Tag[1]) || 0}`;
            } catch (e) {
              const amountTag = zapInfo.tags.find((t: string[]) => t[0] === 'amount');

              amount = amountTag ? amountTag[1] : '0';
            }
          }

          zaps.push({
            amount,
            pubkey: zapInfo.pubkey,
            message: zapInfo.content,
          })

          return;
        }
      }
    });

    setIsFetching(() => true);
    getEventReactions(props.noteId, Kind.Zap, subId);
  };

  const getReposts = () => {
    if (!props.noteId) return;

    const subId = `nr_r_${props.noteId}_${APP_ID}`;

    const users: any[] = [];

    const unsub = subscribeTo(subId, (type,_, content) => {
      if (type === 'EOSE') {
        setRepostList(() => [...users]);
        setIsFetching(() => false);
        unsub();
      }

      if (type === 'EVENT') {
        if (content?.kind === Kind.Metadata) {
          let user = JSON.parse(content.content);

          if (!user.displayName || typeof user.displayName === 'string' && user.displayName.trim().length === 0) {
            user.displayName = user.display_name;
          }
          user.pubkey = content.pubkey;
          user.npub = hexToNpub(content.pubkey);
          user.created_at = content.created_at;

          users.push(user);

          return;
        }
      }
    });

    setIsFetching(() => true);
    getEventReactions(props.noteId, Kind.Repost, subId);
  };

  const totalCount = () => props.stats.likes + props.stats.quotes + props.stats.reposts + props.stats.zaps;

  return (
    <Modal
      open={props.noteId !== undefined}
      onClose={props.onClose}
    >
      <div id={props.id} class={styles.ReactionsModal}>
        <div class={styles.header}>
          <div class={styles.title}>
            <div class={styles.caption}>
              {intl.formatMessage(tActions.reactions, { count: totalCount() })}
            </div>
          </div>
          <button class={styles.close} onClick={props.onClose}>
          </button>
        </div>

        <div class={styles.description}>
          <Tabs.Root value={selectedTab()} onChange={setSelectedTab}>
            <Tabs.List class={styles.tabs}>
              <Show when={props.stats.likes > 0}>
                <Tabs.Trigger class={styles.tab} value={'likes'} >
                  Likes ({props.stats.likes})
                </Tabs.Trigger>
              </Show>
              <Show when={props.stats.zaps > 0}>
                <Tabs.Trigger class={styles.tab} value={'zaps'} >
                  Zaps ({props.stats.zaps})
                </Tabs.Trigger>
              </Show>
              <Show when={props.stats.reposts > 0}>
                <Tabs.Trigger class={styles.tab} value={'reposts'} >
                  Reposts ({props.stats.reposts})
                </Tabs.Trigger>
              </Show>
              <Show when={props.stats.quotes > 0}>
                <Tabs.Trigger class={styles.tab} value={'quotes'} >
                  Quotes ({props.stats.quotes})
                </Tabs.Trigger>
              </Show>

              <Tabs.Indicator class={styles.tabIndicator} />
            </Tabs.List>

            <Tabs.Content class={styles.tabContent} value={'likes'}>
              <Show
                when={!isFetching()}
                fallback={<Loader />}
              >
                <For
                  each={likeList}
                >
                  {admirer =>
                    <A
                      href={`/p/${admirer.npub}`}
                      class={styles.likeItem}
                      onClick={props.onClose}
                    >
                      <div class={styles.likeIcon}></div>
                      <Avatar src={admirer.picture} size="vs" />
                      <div class={styles.userName}>
                        <div class={styles.name}>
                          {userName(admirer)}
                        </div>
                        <VerificationCheck user={admirer} />
                      </div>
                    </A>
                  }
                </For>
              </Show>
            </Tabs.Content>

            <Tabs.Content class={styles.tabContent} value={'zaps'}>
              <Show
                when={!isFetching()}
                fallback={<Loader />}
              >
                <For
                  each={zapList}
                >
                  {zap =>
                    <A
                      href={`/p/${zap.npub}`}
                      class={styles.zapItem}
                      onClick={props.onClose}
                    >
                      <div class={styles.zapAmount}>
                        <div class={styles.zapIcon}></div>
                        <div class={styles.amount}>{truncateNumber(zap.amount)}</div>
                      </div>
                      <Avatar src={zap.sender?.picture} size="vs" />
                      <div class={styles.zapInfo}>
                        <div class={styles.userName}>
                          <div class={styles.name}>
                            {userName(zap.sender)}
                          </div>
                          <VerificationCheck user={zap} />
                        </div>
                        <div class={styles.zapMessage}>
                          {zap.message}
                        </div>
                      </div>
                    </A>
                  }
                </For>
              </Show>
            </Tabs.Content>
            <Tabs.Content class={styles.tabContent} value={'reposts'}>
              <Show
                when={!isFetching()}
                fallback={<Loader />}
              >
                <For
                  each={repostList}
                >
                  {reposter =>
                    <A
                      href={`/p/${reposter.npub}`}
                      class={styles.repostItem}
                      onClick={props.onClose}
                    >
                      <div class={styles.repostIcon}></div>
                      <Avatar src={reposter.picture} size="vs" />
                      <div class={styles.userName}>
                        <div class={styles.name}>
                          {userName(reposter)}
                        </div>
                        <VerificationCheck user={reposter} />
                      </div>
                    </A>
                  }
                </For>
              </Show>
            </Tabs.Content>
            <Tabs.Content class={styles.tabContent} value={'quotes'}>
              All the quotes
            </Tabs.Content>
          </Tabs.Root>
        </div>
      </div>
    </Modal>
  );
}

export default hookForDev(ReactionsModal);
