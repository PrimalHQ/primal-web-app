import { Tabs } from '@kobalte/core/tabs';
import { Component, createEffect, createSignal, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import HelpTip from '../../components/HelpTip/HelpTip';

import styles from './Premium.module.scss';
import { A, useNavigate } from '@solidjs/router';
import ButtonLink from '../../components/Buttons/ButtonLink';

export type FetureComparison = {
  name: string,
  free: string,
  premium: string,
  help?: string,
}

const premiumFeatures = [
  {
    name: 'Apps for Web, iOS, Android',
    free: 'true',
    premium: 'true',
  },
  {
    name: 'Built-in bitcoin lightning wallet',
    free: 'true',
    premium: 'true',
  },
  {
    name: 'Global Nostr text and user search',
    free: 'true',
    premium: 'true',
  },
  {
    name: 'Media storage capacity',
    free: '1 GB',
    premium: '10 GB',
  },
  {
    name: 'Media maximum file size',
    free: '100 mb',
    premium: '1 GB',
  },
  {
    name: 'Verified Nostr Address',
    free: 'false',
    premium: 'true',
    help: 'e. g. alice@primal.net',
  },
  {
    name: 'Custom Lightning Address',
    free: 'false',
    premium: 'true',
    help: 'e. g. alice@primal.net',
  },
  {
    name: 'VIP Profile on primal.net',
    free: 'false',
    premium: 'true',
    help: 'e. g. primal.net/alice',
  },
  {
    name: 'Advanced Nostr search',
    free: 'false',
    premium: 'true',
    help: 'Advanced search is available on web, iOS, and android. It includes searching by [complete]',
  },
  {
    name: 'Premium paid relay',
    free: 'false',
    premium: 'true',
    help: 'wss://premium.primal.net',
  },
  {
    name: 'Nostr contact list backup',
    free: 'false',
    premium: 'true',
    help: 'Primal creates a backup of 100+ most recent versions of your Nostr follow list. If your follow list gets erased or corrupted by another Nostr app, you will be able to restore it using the Contact List Backup tool in the Nostr Tools section for Primal Premium users.',
  },
  {
    name: 'Nostr account content backup',
    free: 'false',
    premium: 'true',
    help: 'Primal archives the complete history of all your Nostr content. You can rebroadcast any subset of your content to your selected set of relays at any time using the Content Backup tool in the Nostr Tools section for Primal Premium users.',
  },
  // {
  //   name: 'Premium feeds',
  //   free: 'false',
  //   premium: 'true',
  //   help: 'Some advanced feeds will be accessible only to Primal Premium users. You will be able to access these feeds through other Nostr clients that support DVM feeds.',
  // },
  // {
  //   name: 'Private beta access',
  //   free: 'false',
  //   premium: 'true',
  //   help: 'Get early exclusive access to Primal Beta releases.',
  // },
  {
    name: 'Much more to come!',
    free: 'false',
    premium: 'true',
    help: 'We are working on a ton of new and exciting features for Primal Premium. We will announce them as we get closer to releasing them. In the meantime, please feel free to reach out and let us know what you would like to see included in Primal Premium. All suggestions are welcome!',
  },
]

const faq = [
  {
    question: 'How do I get support?',
    answer: 'Simply email us at support@primal.net and include your Primal Name in the message. Support requests from Premium users are prioritized and typically handled on the same business day.',
  },
  {
    question: 'Can I change my Primal Name?',
    answer: 'Yes! If you wish to change your Primal Name, simply use the “Change your Primal Name” option in the Manage Premium section of any Primal app. Your new name will be functional immediately and your old name will be released and available to other users to register.',
  },
  {
    question: 'Do I have to use my Primal verified name and lightning address?',
    answer: 'No. As a Primal Premium user you are able to reserve a Primal Name, but you are not required to use it as your nostr verified address (NIP-05), nor the bitcoin lightning address. Simply set any nostr verified address and/or the bitcoin lightning address you wish to use in your Nostr account profile settings.',
  },
  {
    question: 'Do I own my Primal Name indefinitely?',
    answer: 'You have the right to use your Primal Name for the duration of your Primal Premium subscription. After the subscription expires, there is a grace period of 30 days during which your Primal Name will not be available to others to register. Primal Legend users have non-expiring subscriptions, so they can use their Primal Names indefinitely. Please note that all Primal Names are owned by Primal and rented to users. Primal reserves the right to revoke any name if we determine that the name is trademarked by somebody else, that there is a possible case of impersonation, or for any other case of abuse, as determined by Primal. Please refer to our <a data-link="terms">Terms_of_Service</a> for details.',
  },
  {
    question: 'Can I buy multiple Primal Names?',
    answer: 'We are working on adding the capability to manage multiple Primal Names. In the meantime, feel free to reach out to us via support@primal.net and we will try to accommodate.',
  },
  {
    question: 'Is my payment information associated with my Nostr account?',
    answer: 'No. Primal Premium can be purchased via an iOS App Store in-app purchase, Google Play in-app purchase, or directly over bitcoin lightning via the Primal web app. Regardless of the method of payment, your payment information is not associated with your Nostr account.',
  },
  {
    question: 'Can I extend my subscription? How does that work?',
    answer: 'Yes, you can extend your subscription using any of the payment methods we support: iOS App Store in-app purchase, Google Play in-app purchase, or directly over bitcoin lightning via the Primal web app. Any payment will extend your subscription by the number of months purchased. For example, if you purchase 3 Months of Primal Premium using the Primal web app, and then subscribe again via your mobile device, your subscription expiry date will be four months in the future, and it will continue to be pushed out with every subsequent monthly payment.',
  },
  {
    question: 'If I buy Primal Premium on my phone, will I have access to it on the web?',
    answer: 'Yes. Your Primal Premium subscription is assigned to your Nostr account. Therefore, regardless of the way you choose to subscribe, your Primal Premium subscription will be available to you in all Primal apps: web, iOS, Android.',
  },
  {
    question: 'How does the Nostr contact list backup feature work?',
    answer: 'Primal creates a backup of 100+ most recent versions of your Nostr follow list. If your follow list gets erased or corrupted by another Nostr app, you will be able to restore it using the Contact List Backup tool in the Nostr Tools section for Primal Premium users.',
  },
  {
    question: 'How does the Nostr account content backup feature work?',
    answer: 'Primal archives the complete history of all your Nostr content. You can rebroadcast any subset of your content to your selected set of relays at any time using the Content Backup tool in the Nostr Tools section for Primal Premium users.',
  },
  {
    question: 'What other Premium features are coming in the future?',
    answer: 'We are working on a ton of new and exciting features for Primal Premium. We will announce them as we get closer to releasing them. In the meantime, please feel free to reach out and let us know what you would like to see included in Primal Premium. All suggestions are welcome!',
  },
  {
    question: 'I’d like to support Primal. Can I do more?',
    answer: 'At Primal, we don’t rely on advertising. We don’t monetize user data. We open source all our work to help the Nostr ecosystem flourish. If you wish to help us continue doing this work, please see how you can <a data-link="support">support_us</a>. Thank you from the entire Primal Team! 🙏❤️',
  },
]

const PremiumFeaturesDialog: Component<{
  open: 'features' | 'faq' | undefined,
  setOpen: (v: boolean) => void,
}> = (props) => {

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = createSignal<'features' | 'faq'>('features');

  const onClick = (e: MouseEvent) => {
    const t = e.target;

    // @ts-ignore
    const link = t?.getAttribute('data-link');

    if (!link) return;

    if (link === 'support') {
      props.setOpen(false);
      navigate('/premium/support');
      return;
    }

    if (link === 'terms') {
      props.setOpen(false);
      // @ts-ignore
      window.open(`${location.origin}/terms`, '_blank').focus();
      return;
    }
  };

  onMount(() => {
    window.addEventListener('click', onClick);
  });

  onCleanup(() => {
    window.removeEventListener('click', onClick);
  })

  createEffect(() => {
    const open = props.open;

    if (open !== undefined) {
      setActiveTab(() => open);
    }
  })

  const featureInfo = (featureTik: string) => {
    if (featureTik === 'true') {
      return <div class={styles.checkIcon}></div>
    }

    if (featureTik === 'false') return <></>;

    return <>{featureTik}</>;
  }

  return (
    <AdvancedSearchDialog
      open={props.open !== undefined}
      setOpen={props.setOpen}
      triggerClass="hidden"
      title={
        <Tabs value={activeTab()} onChange={setActiveTab}>
          <Tabs.List class={styles.premiumFeaturesTabs}>
            <Tabs.Trigger class={styles.premiumFeaturesTab} value="features">
              Premium Features
            </Tabs.Trigger>
            <Tabs.Trigger class={styles.premiumFeaturesTab} value="faq">
              Premium FAQ
            </Tabs.Trigger>
            <Tabs.Indicator class={styles.premiumFeaturesTabIndicator} />
          </Tabs.List>
        </Tabs>
      }
    >
      <div class={styles.premiumFeatures}>

        <Tabs value={activeTab()} >
          <Tabs.Content value="features" >
            <div class={styles.tabContentPremiumFeatures}>
              <div class={styles.whyPremium}>
                <div class={styles.caption}>Why Premium</div>
                <div class={styles.description}>
                  Become a Nostr power user and help shape the future! Open protocols like Nostr give us the opportunity to regain control over our online lives.
                  At Primal, we don’t rely on advertising. We don’t monetize user data. Our users are our customers. Our sole focus is to make the best possible product for our users. We open source all our work to help the Nostr ecosystem flourish. By signing up for Primal Premium, you are enabling us to continue building for Nostr.
                  Be the change you want to see in the world. If you don’t want to be the product, consider being the customer.
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Primal Free</th>
                    <th>Primal Premium</th>
                  </tr>
                </thead>

                <tbody>
                  <For each={premiumFeatures}>
                    {(feature, index) => (
                      <tr>
                        <td class={styles.fname}>
                          <span>{feature.name}</span>
                          <Show when={feature.help}>
                            <HelpTip above={true} zIndex={index() + 1}>
                              <span>{feature.help}</span>
                            </HelpTip>
                          </Show>
                        </td>
                        <td class={styles.ftick}>{featureInfo(feature.free)}</td>
                        <td class={styles.ftick}>{featureInfo(feature.premium)}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Tabs.Content>
          <Tabs.Content value="faq" >
            <div class={styles.tabContentPremiumFeatures}>
                <For each={faq}>
                  {q => (
                    <div class={styles.faq}>
                      <div class={styles.question}>
                        {q.question}
                      </div>
                      <div class={styles.answer} innerHTML={q.answer}>
                      </div>
                    </div>
                  )}
                </For>
              </div>
          </Tabs.Content>
        </Tabs>

        <div class={styles.premiumFeaturesFooter}>
          <ButtonSecondary
            light={true}
            onClick={() => props.setOpen(false)}
          >
            Close
          </ButtonSecondary>
        </div>
      </div>
    </AdvancedSearchDialog>
  );
}

export default PremiumFeaturesDialog
