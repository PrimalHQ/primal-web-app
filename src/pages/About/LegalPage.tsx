import { Component, For } from 'solid-js';

import styles from './LegalPage.module.scss';

// A numbered sub-clause, e.g. "4.3 Maximum Wallet Balance". Its number is
// derived from its position so it always tracks the section numbering that
// the documents cross-reference.
export type LegalClause = {
  heading: string,
  body: string[],
};

export type LegalSection = {
  heading: string,
  body?: string[],
  clauses?: LegalClause[],
};

export type LegalPageProps = {
  index: string,
  kicker: string,
  title: string,
  updated: string,
  intro: string[],
  sections: LegalSection[],
};

const pad = (i: number) => `${i + 1}`.padStart(2, '0');

const LegalPage: Component<LegalPageProps> = (props) => {

  return (
      <div class={styles.legal}>

        {/* Header */}
        <header class={styles.header}>
          <div class={styles.kicker}>
            <span class={styles.kickerRule}></span>
            {props.kicker}
          </div>
          <h1 class={styles.title}>{props.title}</h1>
          <p class={styles.meta}>
            {props.index} · LAST UPDATED {props.updated}
          </p>
          <div class={styles.intro}>
            <For each={props.intro}>
              {paragraph => <p>{paragraph}</p>}
            </For>
          </div>
        </header>

        {/* Body: index rail + prose */}
        <div class={styles.body}>
          <nav class={styles.rail}>
            <div class={styles.railInner}>
              <For each={props.sections}>
                {(s, i) => (
                  <a href={`#s-${i()}`} class={styles.railLink}>
                    <span class={styles.railIndex}>{pad(i())}</span>
                    {s.heading}
                  </a>
                )}
              </For>
            </div>
          </nav>

          <div class={styles.prose}>
            <For each={props.sections}>
              {(s, i) => (
                <section id={`s-${i()}`} class={styles.section}>
                  <div class={styles.sectionHead}>
                    <span class={styles.sectionIndex}>{pad(i())}</span>
                    <h2>{s.heading}</h2>
                  </div>
                  <div class={styles.sectionBody}>
                    <For each={s.body || []}>
                      {paragraph => <p>{paragraph}</p>}
                    </For>
                    <For each={s.clauses || []}>
                      {(c, j) => (
                        <div class={styles.clause}>
                          <div class={styles.clauseHead}>
                            <span class={styles.clauseIndex}>{i() + 1}.{j() + 1}</span>
                            <h3>{c.heading}</h3>
                          </div>
                          <For each={c.body}>
                            {paragraph => <p>{paragraph}</p>}
                          </For>
                        </div>
                      )}
                    </For>
                  </div>
                </section>
              )}
            </For>
          </div>
        </div>

      </div>
  );
}

export default LegalPage;
