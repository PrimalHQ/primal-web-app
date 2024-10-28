import { useBeforeLeave, useNavigate, useParams } from "@solidjs/router";
import { Component, createEffect, For, on, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { DMContact, fetchDMContacts } from "../megaFeeds";
import { APP_ID } from "../App";
import { useAccountContext } from "../contexts/AccountContext";
import { userName } from "../stores/profile";
import { useDMContext } from "../contexts/DMContext";
import DirectMessageContact from "../components/DirectMessages/DirectMessageContact";

import styles from './DirectMessages.module.scss';
import { Tabs } from "@kobalte/core/tabs";

import { messages as tMessages } from "../translations";
import PageTitle from "../components/PageTitle/PageTitle";
import { useIntl } from "@cookbook/solid-intl";
import PageCaption from "../components/PageCaption/PageCaption";
import { loadLastDMConversations, loadLastDMRelation } from "../lib/localStore";
import { UserRelation } from "../types/primal";

const DirectMessages: Component = () => {

  const params = useParams();
  const account = useAccountContext();
  const dms = useDMContext();
  const intl = useIntl();
  const navigate = useNavigate();

  const contacts = (relation: UserRelation) => {
    if (!dms) return [];

    return dms.dmContacts[relation] || [];
  }

  const changeRelation = (relation: string) => {
    if (!dms || !['any', 'follows', 'other'].includes(relation)) return;
    if (relation === dms.lastConversationRelation) return;

    dms.actions.setDmRelation(relation as UserRelation);
  }

  const isFollowing = (pubkey: string) => {
    if (!account?.following) return false;

    return account.following.includes(pubkey);
  }

  const updateRelationOfContact = (pubkey: string) => {
    if (!dms || !account || !account.following) return;

    if (isFollowing(pubkey)) {
      changeRelation('follows');
    }

    if (!isFollowing(pubkey)) {
      changeRelation('other');
    }
  };

  const setupContact = (contact: string) => {
    updateRelationOfContact(contact);

    dms?.actions.selectContact(contact);
  }

  const selectContact = (pubkey: string) => {
    navigate(`/dms/${pubkey}`);
  }

  const setupPageState = (contact: string) => {
    const pubkey = account?.publicKey;

    if (!pubkey || !account.isKeyLookupDone) return;

    if (!contact) {
      const lastContact = loadLastDMConversations(pubkey);
      // const lastRelation = loadLastDMRelation(pubkey);

      // dms?.actions.setDmRelation(lastRelation || 'follows');

      if (lastContact) {
        selectContact(lastContact);
        return;
      }

      return;
    }

    setupContact(contact);
  }

  createEffect(on(() => [account?.isKeyLookupDone, params.contact], (next) => {
    const [ isDone, contact ] = next;

    if (isDone) {
      setupPageState(contact as string);
    }
  }))

  return (
    <div class={styles.dmLayout}>
      <PageTitle title={intl.formatMessage(tMessages.title)} />

      <div class={styles.dmHeader}>
        <PageCaption title={intl.formatMessage(tMessages.title)} />
      </div>

      <div class={styles.dmContent}>
        <div class={styles.dmSidebar}>
          <Tabs
            value={dms?.lastConversationRelation}
            onChange={changeRelation}
          >
            <div class={styles.dmControls}>
              <Tabs.List class={styles.dmContactsTabs}>
                <Tabs.Trigger
                  class={styles.dmContactTab}
                  value={'follows'}
                >
                  {intl.formatMessage(tMessages.follows)}
                </Tabs.Trigger>
                <Tabs.Trigger
                  class={styles.dmContactTab}
                  value={'other'}
                >
                  {intl.formatMessage(tMessages.other)}
                </Tabs.Trigger>

                <Tabs.Indicator class={styles.dmContactsTabIndicator} />
              </Tabs.List>
            </div>

            <div class={styles.dmContactsList}>
              <Tabs.Content class={styles.dmContactsTabContent} value={'follows'}>
                <For each={contacts('follows')}>
                  {contact => (
                    <DirectMessageContact
                      dmContact={contact}
                      onSelect={selectContact}
                      isSelected={params.contact === contact.pubkey}
                    />
                  )}
                </For>
              </Tabs.Content>

              <Tabs.Content class={styles.dmContactsTabContent} value={'other'}>
                <For each={contacts('other')}>
                    {contact => (
                      <DirectMessageContact
                        dmContact={contact}
                        onSelect={selectContact}
                        isSelected={params.contact === contact.pubkey}
                      />
                    )}
                </For>
              </Tabs.Content>
            </div>
          </Tabs>
        </div>

        <div class={styles.dmConversation}>
          <div class={styles.dmMessages}></div>
          <div class={styles.dmCompose}></div>
        </div>
      </div>
    </div>
  );
}

export default DirectMessages;
