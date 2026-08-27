import { Component, createEffect, createMemo, createSignal, For, JSXElement, onCleanup, onMount } from 'solid-js';
import { A, useLocation } from '@solidjs/router';

import styles from './MiniSite.module.scss';
import logo from '../../assets/images/about/primal_logo.png';

export type MiniSitePage = 'about' | 'terms' | 'privacy';

const NAV: { key: MiniSitePage, label: string, index: string, href: string }[] = [
  { key: 'about', label: 'About', index: '01', href: '/about' },
  { key: 'terms', label: 'Terms of Service', index: '02', href: '/terms' },
  { key: 'privacy', label: 'Privacy Policy', index: '03', href: '/privacy' },
];

const MiniSiteLayout: Component<{ children?: JSXElement }> = (props) => {

  const location = useLocation();

  const [menuOpen, setMenuOpen] = createSignal(false);

  const page = createMemo<MiniSitePage>(() => {
    const item = NAV.find(n => location.pathname.startsWith(n.href));
    return item ? item.key : 'about';
  });

  onMount(() => {
    const container = document.querySelector('#root');
    container && container.setAttribute('style', 'background-color: black');

    document.documentElement.style.scrollBehavior = 'smooth';

    // Pico scales the root font-size up to 20px on wide viewports; this design
    // is laid out in rem against the browser default, so neutralize it here.
    document.documentElement.style.fontSize = '100%';
  });

  onCleanup(() => {
    document.documentElement.style.removeProperty('scroll-behavior');
    document.documentElement.style.removeProperty('font-size');
  });

  // Close the mobile menu whenever the active page changes.
  createEffect(() => {
    page();
    setMenuOpen(false);
  });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  return (
    <div class={styles.miniSite}>
      {/* Desktop: fixed left sidebar */}
      <aside class={styles.sidebar}>
        <div>
          <A href="/about" class={styles.sidebarLogo} aria-label="Primal home" onClick={scrollToTop}>
            <img src={logo} alt="Primal" />
          </A>
          <nav class={styles.sidebarNav}>
            <For each={NAV}>
              {item => (
                <A
                  href={item.href}
                  class={`${styles.navLink} ${page() === item.key ? styles.navLinkActive : ''}`}
                  onClick={scrollToTop}
                >
                  <span class={styles.navIndex}>{item.index}</span>
                  <span class={styles.navLabel}>{item.label}</span>
                </A>
              )}
            </For>
          </nav>
        </div>
        <div class={styles.sidebarFooter}>
          <div class={styles.footerRule}></div>
          PRIMAL INC.
          <br />
          Doral, FL · USA
          <br />
          <a href="mailto:support@primal.net">support@primal.net</a>
        </div>
      </aside>

      {/* Mobile: top bar */}
      <header class={styles.mobileHeader}>
        <A href="/about" aria-label="Primal home" onClick={scrollToTop}>
          <img src={logo} alt="Primal" />
        </A>
        <button
          type="button"
          class={`${styles.burger} ${menuOpen() ? styles.burgerOpen : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen()}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </header>

      {/* Mobile menu overlay */}
      <div class={`${styles.mobileMenu} ${menuOpen() ? styles.mobileMenuOpen : ''}`}>
        <nav class={styles.mobileNav}>
          <For each={NAV}>
            {item => (
              <A
                href={item.href}
                class={`${styles.mobileNavLink} ${page() === item.key ? styles.mobileNavLinkActive : ''}`}
                onClick={() => { setMenuOpen(false); scrollToTop(); }}
              >
                <span class={styles.mobileNavText}>
                  <span class={styles.mobileNavIndex}>{item.index}</span>
                  <span class={styles.mobileNavLabel}>{item.label}</span>
                </span>
                <span class={styles.mobileNavArrow}>→</span>
              </A>
            )}
          </For>
        </nav>
        <div class={styles.mobileFooter}>
          PRIMAL INC. · Doral, FL, USA
          <br />
          <a href="mailto:support@primal.net">support@primal.net</a>
        </div>
      </div>

      {/* Main content */}
      <main class={styles.main}>
        {props.children}
      </main>
    </div>
  );
}

export default MiniSiteLayout;
