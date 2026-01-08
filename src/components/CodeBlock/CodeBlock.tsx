import { Component } from 'solid-js';
import { useCodeBlockHighlight } from '../../lib/useCodeBlockHighlight';
import styles from './CodeBlock.module.scss';

export type CodeBlockProps = {
  code: string;
  language?: string;
  class?: string;
};

const CodeBlock: Component<CodeBlockProps> = (props) => {
  const { highlightCode } = useCodeBlockHighlight();

  const highlightedCode = () => highlightCode(props.code, props.language);

  return (
    <div class={`${styles.codeBlock} ${props.class || ''}`}>
      {props.language && (
        <div class={styles.codeBlockHeader}>
          <span class={styles.codeBlockLanguage}>{props.language}</span>
        </div>
      )}
      <pre class={styles.codeBlockPre}>
        <code class={`hljs ${styles.codeBlockCode}`} innerHTML={highlightedCode()} />
      </pre>
    </div>
  );
};

export default CodeBlock;

