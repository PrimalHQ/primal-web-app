import { useIntl } from '@cookbook/solid-intl';
import { Component, Match, Show, Switch } from 'solid-js';
import ButtonLink from '../../components/Buttons/ButtonLink';
import ButtonPremium from '../../components/Buttons/ButtonPremium';

import { premium as t } from '../../translations';

import styles from './Premium.module.scss';
import { PrimalUser } from '../../types/primal';


const PremiumHighlights: Component<{
  onStart?: (product: string) => void,
  onMore?: () => void,
  pubkey?: string | undefined,
  user?: PrimalUser | undefined,
  isOG?: boolean,
}> = (props) => {
  const intl = useIntl();

  const isGuest = () => !props.pubkey;

  const hasNoMetadata = () => props.pubkey && !props.user;

  return (
    <div class={styles.premiumHighlights}>
      <div class={styles.premiumHighlightsTitle}>
        <h1>Primal Premium and Pro</h1>
        <p>Upgrade your Primal experience today.</p>
      </div>

      <div class={styles.productList}>
        <div class={styles.primalProduct}>
          <div class={styles.productName}>
            Primal <span class={styles.productFree}>Free</span>
          </div>

          <div class={styles.productPrice}>Free</div>

          <div class={styles.productFeatures}>
            <div class={styles.featureList}>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>Apps for iOS, Android, Web</div>
              </div>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>Nostr text & user search</div>
              </div>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>Built-in bitcoin wallet</div>
              </div>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>1GB media storage</div>
              </div>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>100MB max file size</div>
              </div>
            </div>
          </div>
        </div>

        <div class={styles.primalProduct}>
          <div class={styles.productName}>
            Primal <span class={styles.productPremium}>Premium</span>
          </div>

          <div class={styles.productPrice}>
            <div>$7 <span>/month</span></div>
            <div class={styles.annual}>
              <div class={styles.annoPrice}>USD$75 billed annually</div>
              <div class={styles.savingsPremium}>Save 10%</div>
            </div>
          </div>

          <div class={styles.productFeatures}>
            <div class={styles.caption}>
              Everything in Free, and
            </div>

            <div class={styles.featureList}>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>Verified Nostr Address</div>
              </div>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>Custom Lightning Address</div>
              </div>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>VIP profile on primal.net</div>
              </div>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>Advanced Nostr search</div>
              </div>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>Premium paid relay</div>
              </div>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>10GB media storage</div>
              </div>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>1GB max file size</div>
              </div>
            </div>
          </div>
          <button
            class={styles.buttonPremium}
            onClick={() => props.onStart && props.onStart('premium')}
          >
            Buy Now
          </button>
        </div>

        <div class={styles.primalProduct}>
          <div class={styles.productName}>
            Primal <span class={styles.productPro}>Pro</span>
          </div>

          <div class={styles.productPrice}>
            <div>$69.99 <span>/month</span></div>
            <div class={styles.annual}>
              <div class={styles.annoPrice}>USD$750 billed annually</div>
              <div class={styles.savingsPro}>Save 10%</div>
            </div>
          </div>

          <div class={styles.productFeatures}>
            <div class={styles.caption}>
              Everything in Premium, and
            </div>

            <div class={styles.featureList}>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>Primal Studio</div>
              </div>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>Legend Status on Primal</div>
              </div>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>100GB media storage</div>
              </div>
              <div class={styles.featureItem}>
                <div class={styles.checkIcon}></div>
                <div class={styles.label}>10GB max file size</div>
              </div>
            </div>
          </div>
          <button
            class={styles.buttonPro}
            onClick={() => props.onStart && props.onStart('pro')}
          >
            Buy Now
          </button>
        </div>
      </div>

      <div class={styles.moreInfo}>
        Learn more about <button onClick={props.onMore}>Primal Pro tier</button>.
      </div>

    </div>
  );
}

export default PremiumHighlights;
