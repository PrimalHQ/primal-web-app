import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { shortDate } from '../../lib/dates';

import { premium as t } from '../../translations';
import { formatStorage } from '../../utils';
import { PremiumStore } from './Premium';

import styles from './Premium.module.scss';


const PremiumSidebarInactve: Component<{
  altCaption?: string,
  onOpenFAQ?: () => void,
}> = (props) => {

  return (

    <div class={styles.premiumSidebar}>
    <div class={styles.premiumSidebarTitle}>
      {props.altCaption || 'Why Get Primal Premium?'}
    </div>

    <div class={styles.premiumSidebarDescription}>
      <p>
        Become a Nostr power user and help shape the future! Open protocols like Nostr give us the opportunity to regain control over our online lives.
      </p>

      <p>
        At Primal, we don’t rely on advertising. We don’t monetize user data. Our users are our customers. Our sole focus is to make the best possible product for our users. We open source all our work to help the Nostr ecosystem flourish. By signing up for Primal Premium, you are enabling us to continue building for Nostr.
      </p>

      <p>
        Be the change you want to see in the world. If you don’t want to be the product, consider being the customer.
      </p>

      <p>
        Have a question?&nbsp;
        <ButtonLink onClick={props.onOpenFAQ}>Check out our FAQ.</ButtonLink>
      </p>
    </div>
  </div>
  );
}

export default PremiumSidebarInactve;
