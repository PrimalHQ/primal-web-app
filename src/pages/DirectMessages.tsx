import { useBeforeLeave, useNavigate, useParams } from "@solidjs/router";
import { Component, createEffect, For, on, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { DMContact, fetchDMContacts } from "../megaFeeds";
import { APP_ID } from "../App";
import { useAccountContext } from "../contexts/AccountContext";
import { userName } from "../stores/profile";
import { useDMContext } from "../contexts/DMContext";
import DirectMessageContact from "../components/DirectMessages/DirectMessageContact";

import styles from './DirectMessages.module.scss';
import { Tabs } from "@kobalte/core/tabs";

import { placeholders, messages as tMessages } from "../translations";
import PageTitle from "../components/PageTitle/PageTitle";
import { useIntl } from "@cookbook/solid-intl";
import PageCaption from "../components/PageCaption/PageCaption";
import { loadLastDMConversations, loadLastDMRelation } from "../lib/localStore";
import { UserRelation } from "../types/primal";
import Wormhole from "../components/Wormhole/Wormhole";
import Search from "../components/Search/Search";
import DirectMessageConversation from "../components/DirectMessages/DirectMessageConversation";
import { TextField } from "@kobalte/core/text-field";
import DirectMessagesComposer from "../components/DirectMessages/DirectMessagesComposer";
import { Pagination } from "@kobalte/core/*";
import Paginator from "../components/Paginator/Paginator";

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

  const changeRelation = async (relation: string) => {
    if (!dms || !['any', 'follows', 'other'].includes(relation)) return;
    if (relation === dms.lastConversationRelation) return;

    dms.actions.setDmRelation2(relation as UserRelation);

    let list = dms?.dmContacts[relation as UserRelation];

    if (list.length > 0) {
      const first = list[0].pubkey;

      navigate(`/dms/${first}`);
      return;
    }

    await dms.actions.getContacts(relation as UserRelation);

    list = dms?.dmContacts[relation as UserRelation];

    const first = list[0].pubkey;

    navigate(`/dms/${first}`);
    // if (!isContactInTheList(dms.lastConversationContact?.pubkey, dms.lastConversationRelation)) {
    //   const first = dms?.dmContacts[relation as UserRelation][0].pubkey;

    //   first && dms.actions.selectContact(first)
    // }
  }

  const isFollowing = (pubkey: string) => {
    if (!account?.following) return false;

    return account.following.includes(pubkey);
  }

  const updateRelationOfContact = async (pubkey: string) => {
    if (!dms || !account || !account.following) return;

    if (isFollowing(pubkey)) {
      return await changeRelation('follows');
    }

    if (!isFollowing(pubkey)) {
      return await changeRelation('other');
    }
  };

  const setupContact = async (contact: string) => {
    await updateRelationOfContact(contact);

    dms?.actions.selectContact(contact);
  }

  const selectContact = (pubkey: string) => {
    navigate(`/dms/${pubkey}`);
  }

  const setupPageState = async (contact: string) => {
    const pubkey = account?.publicKey;

    if (!pubkey || !account.isKeyLookupDone) return;

    if (!contact) {
      const lastContact = dms?.lastConversationContact?.pubkey;

      if (lastContact) {
        await updateRelationOfContact(lastContact);
        selectContact(lastContact);
        return;
      }

      changeRelation(dms?.lastConversationRelation || 'follows')
      return;
    }

    setupContact(contact);
  }

  const markAllAsRead = () => {
    dms?.actions.resetAllMessages();
  };

  createEffect(on(() => [account?.isKeyLookupDone, params.contact], (next) => {
    const [ isDone, contact ] = next;

    if (isDone) {
      setupPageState(contact as string);
    }
  }));

  createEffect(on(() => dms?.dmCount, (v, p) => {
    if (!v || v === p) return;

    const count = v;

    if (count > 0) {
      dms?.actions.refreshContacts(dms.lastConversationRelation);
    }
  }, { defer: true }));

  return (
    <div class={styles.dmLayout}>
      <PageTitle title={intl.formatMessage(tMessages.title)} />

      <div class={styles.dmHeader}>
        <PageCaption title={intl.formatMessage(tMessages.title)} />
      </div>

      <Wormhole
        to="search_section"
      >
        <Search
          placeholder={
            intl.formatMessage(placeholders.findUser)
          }
          onInputConfirm={() => {}}
          noLinks={true}
          hideDefault={true}
          onUserSelect={dms?.actions.addContact}
        />
      </Wormhole>

      <div class={styles.dmContent}>
        <div class={styles.dmSidebar}>
          <Tabs
            value={dms?.lastConversationRelation}
            onChange={changeRelation}
          >
            <div class={styles.dmControls}>
              <div>
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
              <button
                class={styles.markAsRead}
                disabled={dms?.dmCount === 0}
                onClick={markAllAsRead}
              >
                {intl.formatMessage(tMessages.markAsRead)}
              </button>
            </div>

            <div class={styles.dmContactsList}>
              <For each={['follows', 'other']}>
                {relation => (
                  <Tabs.Content class={styles.dmContactsTabContent} value={relation}>
                    <For each={contacts(relation as UserRelation)}>
                      {contact => (
                        <DirectMessageContact
                          dmContact={contact}
                          onSelect={selectContact}
                          isSelected={params.contact === contact.pubkey}
                        />
                      )}
                    </For>
                    <Paginator
                      isSmall={true}
                      loadNextPage={() => dms?.actions.getContactsNextPage(relation as UserRelation)}
                    />
                  </Tabs.Content>
                )}
              </For>
            </div>
          </Tabs>
        </div>

        <div class={styles.dmConversation}>
          <DirectMessagesComposer
            pubkey={dms?.lastConversationContact?.pubkey}
            messageCount={dms?.messages.length}
          />
          <DirectMessageConversation
            contact={dms?.lastConversationContact}
            messages={dms?.messages}
          />
        </div>
      </div>
    </div>
  );
}

export default DirectMessages;
