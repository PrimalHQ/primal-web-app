import { Component, For } from 'solid-js';

import styles from './About.module.scss';

import primalVisual from '../../assets/images/about/primal_visual.png';
import studioVisual from '../../assets/images/about/studio_visual.png';

const primalLinks = [
  { href: 'https://primal.net/', label: 'primal.net' },
  { href: 'https://apps.apple.com/ca/app/primal/id1673134518', label: 'Download on the App Store' },
  { href: 'https://play.google.com/store/apps/details?id=net.primal.android', label: 'Get it on Google Play' },
];

const studioLinks = [
  { href: 'https://studio.primal.net/', label: 'studio.primal.net' },
];

const ProductLink: Component<{ href: string, label: string }> = (props) => (
  <a
    href={props.href}
    target="_blank"
    rel="noopener noreferrer"
    class={styles.productLink}
  >
    <span class={styles.productLinkArrow}>→</span>
    <span class={styles.productLinkLabel}>{props.label}</span>
  </a>
);

const About: Component = () => {

  return (
      <div class={styles.about}>

        {/* Hero */}
        <section class={styles.hero}>
          <div class={styles.heroGlow} aria-hidden="true"></div>
          <div class={styles.heroContent}>
            <div class={`${styles.kicker} ${styles.heroKicker}`}>
              <span class={styles.kickerRule}></span>
              BUILDING FOR NOSTR
            </div>
            <h1 class={styles.heroTitle}>
              Primal builds products for <span class={styles.heroAccent}>Nostr</span>, an open protocol for decentralized communication and publishing.
            </h1>
            <p class={styles.heroLead}>
              We make Nostr simple, powerful, and accessible to individuals, creators, teams, and companies. Our products are used by tens of thousands of people worldwide, and the best is yet to come.
            </p>
          </div>
        </section>

        {/* Products */}
        <section class={styles.products}>
          <div class={styles.sectionHead}>
            <h2>OUR PRODUCTS</h2>
            <span>02 — 01</span>
          </div>

          {/* Primal Consumer Apps */}
          <div class={`${styles.product} ${styles.productPrimal}`}>
            <div class={styles.productCopy}>
              <h3>Primal Consumer Apps</h3>
              <p>
                Next generation social media powered by Nostr and Bitcoin. Primal brings social feeds, long-form reading, content discovery, and a fully-featured bitcoin wallet together in one app, available on web, iOS, and Android.
              </p>
              <div class={styles.productLinks}>
                <For each={primalLinks}>
                  {link => <ProductLink href={link.href} label={link.label} />}
                </For>
              </div>
            </div>
            <div class={styles.productVisual}>
              <img
                src={primalVisual}
                alt="Primal consumer apps showing social feeds, a bitcoin wallet, and Nostr Reads on iPhone"
              />
            </div>
          </div>

          {/* Primal Studio */}
          <div class={`${styles.product} ${styles.productStudio}`}>
            <div class={styles.productVisual}>
              <img
                src={studioVisual}
                alt="Primal Studio publishing suite showing an article editor, analytics dashboard, and media files"
              />
            </div>
            <div class={styles.productCopy}>
              <h3>Primal Studio</h3>
              <p>
                A professional publishing suite for Nostr, empowering content creators, teams, and companies. Studio covers the full publishing workflow, including authoring, media, scheduling, collaboration, and analytics, for everything you post to the network.
              </p>
              <div class={styles.productLinks}>
                <For each={studioLinks}>
                  {link => <ProductLink href={link.href} label={link.label} />}
                </For>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section class={styles.contact}>
          <div class={styles.contactInner}>
            <div>
              <div class={styles.contactLabel}>PRIMAL INC.</div>
              <p class={styles.contactAddress}>
                2001 NW 107th Avenue, Suite 450
                <br />
                Doral, FL, 33172, USA
              </p>
            </div>
            <a href="mailto:support@primal.net" class={styles.contactEmail}>
              support@primal.net
            </a>
          </div>
        </section>

      </div>
  );
}

export default About;
