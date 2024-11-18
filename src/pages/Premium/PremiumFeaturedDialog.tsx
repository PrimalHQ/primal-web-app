import { Tabs } from '@kobalte/core/tabs';
import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import HelpTip from '../../components/HelpTip/HelpTip';

import styles from './Premium.module.scss';

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
    name: 'Nostr account backup',
    free: 'false',
    premium: 'true',
    help: 'Primal will backup 10 most recent versions of your profile, including your follow list. If your profile gets erased or corrupted by another nostr client, you will be able to restore it using Primal Nostr Tools. In addition, Primal will archive the complete history of all your posted notes, which you will be able to rebroadcast to your selected set of relays at any time.',
  },
  {
    name: 'Premium feeds',
    free: 'false',
    premium: 'true',
    help: 'Some advanced feeds will be accessible only to Primal Premium users. You will be able to access these feeds through other Nostr clients that support DVM feeds.',
  },
  {
    name: 'Private beta access',
    free: 'false',
    premium: 'true',
    help: 'Get early exclusive access to Primal Beta releases.',
  },
  {
    name: 'More premium features to come!',
    free: 'false',
    premium: 'true',
    help: 'We are working on a ton of new and exciting features for Primal Premium. Also feel free to reach out and let us know what you would like to see included.',
  },
]

const faq = [
  {
    question: 'Become a Nostr power user and help shape the future?',
    answer: 'At Primal, we don’t rely on advertising. We don’t monetize user data. Our users are our customers. Our sole focus is to make the best possible product for our users. We open source all our work to help the Nostr ecosystem flourish. By signing up for Primal Premium, you are enabling us to continue building for Nostr.',
  },
  {
    question: 'Open protocols like Nostr give us the opportunity to regain control over our online lives?',
    answer: 'At Primal, we don’t rely on advertising. We don’t monetize user data. Our users are our customers. Our sole focus is to make the best possible product for our users. We open source all our work to help the Nostr ecosystem flourish.',
  },
  {
    question: 'Become a Nostr power user and help shape the future?',
    answer: 'At Primal, we don’t rely on advertising. We don’t monetize user data. Our users are our customers. Our sole focus is to make the best possible product for our users. We open source all our work to help the Nostr ecosystem flourish. By signing up for Primal Premium, you are enabling us to continue building for Nostr.',
  },
  {
    question: 'Open protocols like Nostr give us the opportunity to regain control over our online lives?',
    answer: 'At Primal, we don’t rely on advertising. We don’t monetize user data. Our users are our customers. Our sole focus is to make the best possible product for our users. We open source all our work to help the Nostr ecosystem flourish.',
  },
]

const PremiumFeaturesDialog: Component<{
  open: 'features' | 'faq' | undefined,
  setOpen: (v: boolean) => void,
}> = (props) => {

  const [activeTab, setActiveTab] = createSignal<'features' | 'faq'>('features');

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
                    <div class={styles.answer}>
                      {q.answer}
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
