import { createStore } from 'solid-js/store';
import hljs from 'highlight.js';

export type CodeBlock = {
  placeholder: string;
  code: string;
  language?: string;
};

export type ParsedContent = {
  tokens: string[];
  codeBlocks: Record<string, { code: string; language?: string }>;
};

/**
 * Custom hook for extracting and processing code blocks from content
 * @param content The content to parse
 * @param ignoreLinebreaks Whether to ignore line breaks
 * @returns Parsed content with tokens and code blocks
 */
export const useCodeBlockHighlight = () => {
  const extractCodeBlocks = (
    content: string,
    ignoreLinebreaks: boolean = false,
    linebreakRegex?: RegExp
  ): ParsedContent => {
    // Extract code blocks before tokenization
    // Matches ```language\ncode``` or ```\ncode``` or ```code```
    // Language can contain letters, numbers, +, #, -, and other common characters
    // The language part stops at whitespace or newline
    const codeBlockRegex = /```([a-zA-Z0-9+#\-_.]+)?\s*\n?([\s\S]*?)```/g;
    const blocks: Record<string, { code: string; language?: string }> = {};
    let codeBlockIndex = 0;
    const allTokens: string[] = [];
    let lastIndex = 0;

    // Decode HTML entities in code (e.g., &gt; -> >, &lt; -> <)
    const decodeHtmlEntities = (text: string): string => {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = text;
      return textarea.value;
    };

    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add tokens before the code block
      const beforeBlock = content.substring(lastIndex, match.index);
      if (beforeBlock.trim().length > 0) {
        const beforeContent = ignoreLinebreaks
          ? beforeBlock.replace(/\s+/g, ' __SP__ ')
          : beforeBlock.replace(linebreakRegex || /\n/g, ' __LB__ ').replace(/\s+/g, ' __SP__ ');
        allTokens.push(...beforeContent.split(/[\s]+/).filter((t) => t.length > 0));
      }

      // Add code block placeholder
      const placeholder = `__CODEBLOCK_${codeBlockIndex}__`;
      let codeContent = match[2].trim();
      let language = match[1]?.trim();

      // Normalize language aliases (e.g., c++ -> cpp)
      if (language) {
        const languageMap: Record<string, string> = {
          'c++': 'cpp',
          'c#': 'csharp',
          'f#': 'fsharp',
          'js': 'javascript',
          'ts': 'typescript',
          'py': 'python',
          'rb': 'ruby',
          'sh': 'bash',
          'yml': 'yaml',
        };
        language = languageMap[language.toLowerCase()] || language;
      }

      blocks[placeholder] = {
        code: decodeHtmlEntities(codeContent),
        language: language || undefined,
      };
      allTokens.push(placeholder);

      lastIndex = match.index + match[0].length;
      codeBlockIndex++;
    }

    // Add remaining content after last code block
    if (lastIndex < content.length) {
      const afterContent = content.substring(lastIndex);
      if (afterContent.trim().length > 0) {
        const processed = ignoreLinebreaks
          ? afterContent.replace(/\s+/g, ' __SP__ ')
          : afterContent.replace(linebreakRegex || /\n/g, ' __LB__ ').replace(/\s+/g, ' __SP__ ');
        allTokens.push(...processed.split(/[\s]+/).filter((t) => t.length > 0));
      }
    }

    // If no code blocks found, process normally
    if (codeBlockIndex === 0) {
      const processed = ignoreLinebreaks
        ? content.replace(/\s+/g, ' __SP__ ')
        : content.replace(linebreakRegex || /\n/g, ' __LB__ ').replace(/\s+/g, ' __SP__ ');
      return {
        tokens: processed.split(/[\s]+/).filter((t) => t.length > 0),
        codeBlocks: {},
      };
    }

    return {
      tokens: allTokens,
      codeBlocks: blocks,
    };
  };

  const highlightCode = (code: string, language?: string): string => {
    // Decode HTML entities that might have been encoded
    const textarea = document.createElement('textarea');
    textarea.innerHTML = code;
    const decodedCode = textarea.value;

    try {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(decodedCode, { language }).value;
      } else {
        // Auto-detect language
        const result = hljs.highlightAuto(decodedCode);
        return result.value;
      }
    } catch (e) {
      // Fallback to plain text if highlighting fails
      return decodedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  };

  const isCodeBlockPlaceholder = (token: string): boolean => {
    return token.startsWith('__CODEBLOCK_') && token.endsWith('__');
  };

  return {
    extractCodeBlocks,
    highlightCode,
    isCodeBlockPlaceholder,
  };
};

