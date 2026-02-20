import { useIntl } from '@cookbook/solid-intl';
// @ts-ignore
import { decode } from 'light-bolt11-decoder';
import { Component, createEffect, Show } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { emptyInvoice } from '../../constants';
import { date, dateFuture } from '../../lib/dates';
import { hookForDev } from '../../lib/devTools';
import { humanizeNumber } from '../../lib/stats';
import { cashuInvoice } from '../../translations';
import { LnbcInvoice } from '../../types/primal';
import { getDecodedToken, Token } from "@cashu/cashu-ts";

import styles from './Premium.module.scss';
import { Dialog } from '@kobalte/core/dialog';

import proLogo from '../../assets/icons/logo_gold.svg';
import preston from '../../assets/images/preston.png';
import ButtonPremium from '../../components/Buttons/ButtonPremium';

const PrimalProInfoDialog: Component<{
  id?: string,
  open?: boolean,
  setOpen?: (open: boolean) => void,
  onBuy?: () => void,
}> = (props) => {

  return (
    <Dialog open={props.open} onOpenChange={props.setOpen} preventScroll={false}>
      <Dialog.Portal>
        <Dialog.Overlay class={styles.dialogProOverlay} />
        <div class={styles.dialogPro}>
          <Dialog.Content class={styles.dialogContent} >
            <Dialog.Description class={styles.dialogDescription}>
              <div class={styles.primalProInfoDialog}>
                <div class={styles.productExplain}>
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
                  </div>

                  <div class={styles.proOverview}>
                    <div class={styles.proOverviewItem}>
                      <img src={proLogo} />
                      <div class={styles.proDescription}>
                        <h3>Primal Studio</h3>
                        <p>
                          A professional publishing suite for Nostr.
                          Includes authoring tools, media management,
                          smart scheduling, content imports, team collaboration,
                          and content analytics.
                        </p>
                        <a href="https://studio.primal.net" target='_blank'>studio.primal.net</a>
                      </div>
                    </div>

                    <div class={styles.proOverviewItem}>
                      <img src={preston} />
                      <div class={styles.proDescription}>
                        <h3>Legend Status</h3>
                        <p>
                          Customizable Legend avatar ring, Legend profile
                          badge and banner, along with the highest level of
                          features, visibility and recognition on Primal.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
                <div class={styles.buyButton}>
                  <ButtonPremium
                    onClick={() => {
                      props.setOpen && props.setOpen(false);
                      props.onBuy && props.onBuy();
                    }}
                    pro={true}
                  >
                    Subscribe to Primal Pro
                  </ButtonPremium>
                </div>
              </div>
            </Dialog.Description>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

export default hookForDev(PrimalProInfoDialog);
